/**
 * ZAI SDK Worker — isolated child process with streaming + multimodal support
 * 
 * This worker handles ONE request at a time using the ZAI SDK.
 * It communicates with the parent via stdin/stdout JSON messages.
 * This isolation prevents segfaults from crashing the main gateway.
 * 
 * Protocol (streaming mode):
 *   Parent → stdin:  { type: "chat", text: "...", attachments?: [...] }
 *   Worker → stdout: { type: "token", text: "word" }           — progressive text
 *   Worker → stdout: { type: "chunk", audioBase64: "...", index: N } — audio chunk per sentence
 *   Worker → stdout: { type: "done", text: "full response" }  — final signal
 *   Worker → stdout: { type: "error", message: "..." }         — error
 */

import { getZAI } from './services/zai.js';
import { buildRegistry } from './agents/registry.js';
import type { SubAgentResult } from './agents/types.js';

const TTS_VOICE = 'tongtong';
const DEFAULT_TTS_SPEED = 1.15;
const SYSTEM_PROMPT = `You are Tamanna, a friendly voice assistant. Respond concisely:
- Keep responses to 2-3 short sentences maximum
- Be conversational, warm, and natural
- Plain text only, no markdown, no code blocks
- Do NOT wrap your answer in JSON`;

const MULTIMODAL_SYSTEM_PROMPT = `You are Tamanna, a friendly voice assistant that can understand images, videos, audio, and documents. Respond concisely:
- Keep responses to 2-3 short sentences maximum
- Be conversational, warm, and natural
- Describe what you see/understand from the attached files clearly
- Plain text only, no markdown, no code blocks
- Do NOT wrap your answer in JSON`;

/**
 * Split text into sentences at natural boundaries.
 * Returns an array of sentence strings.
 */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end of string
  const raw = text.match(/[^.!?]*[.!?]+[\s]*/g) || [];
  
  if (raw.length > 0 && raw.join('').trim().length >= text.trim().length * 0.8) {
    return raw.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  // Fallback: split on commas or semicolons for long text
  if (text.length > 100) {
    const parts = text.split(/[,;]\s*/);
    return parts.map(s => s.trim()).filter(s => s.length > 0);
  }
  
  // Very short text: return as single chunk
  return text.trim() ? [text.trim()] : [];
}

/**
 * Detect the type of attachment from mimeType.
 */
function getAttachmentCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

// Maps agent names to their primary input key
const AGENT_INPUT_KEYS: Record<string, string> = {
  web_search: 'query',
  web_reader: 'url',
  image_gen: 'prompt',
  vlm: 'question',
  analysis: 'question',
  code_assistant: 'task',
  translator: 'text',
  summarizer: 'text',
  math: 'expression',
  research: 'topic',
  writing: 'task',
};

// ─── Main ──────────────────────────────────────────────────────────

async function processChat(text: string, attachments?: any[], voiceSpeed?: number, _language?: string): Promise<void> {
  const ttsSpeed = voiceSpeed || DEFAULT_TTS_SPEED;
  const start = performance.now();
  const zai = await getZAI();
  
  const hasAttachments = attachments && attachments.length > 0;
  const systemPrompt = hasAttachments ? MULTIMODAL_SYSTEM_PROMPT : SYSTEM_PROMPT;
  
  // ── Pre-process attachments: transcribe audio files ──
  let attachmentDescriptions: string[] = [];
  
  if (hasAttachments) {
    console.error(`[Worker] Processing ${attachments.length} attachment(s)...`);
    
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      const category = getAttachmentCategory(att.mimeType);
      
      if (category === 'audio' && att.base64Data) {
        // Transcribe audio using ASR
        try {
          console.error(`[Worker] Transcribing audio: ${att.name}`);
          const asrResponse = await zai.audio.asr.create({
            file_base64: att.base64Data,
          });
          const transcription = asrResponse?.text || '[Could not transcribe audio]';
          attachmentDescriptions.push(`Audio file "${att.name}" transcription: ${transcription}`);
          console.error(`[Worker] Audio transcription done: "${transcription.substring(0, 100)}..."`);
        } catch (asrErr: any) {
          console.error(`[Worker] ASR error: ${asrErr?.message || asrErr}`);
          attachmentDescriptions.push(`Audio file "${att.name}" (could not transcribe)`);
        }
      }
    }
  }
  
  // ── Build message content for LLM ──
  let messages: any[];
  
  if (hasAttachments) {
    // Build multimodal content array for VLM
    const content: any[] = [];
    
    // Add text prompt
    let promptText = text.trim() || 'Please describe what you see in these files.';
    
    // Include audio transcriptions in the prompt
    if (attachmentDescriptions.length > 0) {
      promptText += '\n\n' + attachmentDescriptions.join('\n');
    }
    
    content.push({ type: 'text', text: promptText });
    
    // Add image/video/document attachments as visual content
    let hasVisualContent = false;
    
    for (const att of attachments) {
      if (!att.base64Data) continue;
      const category = getAttachmentCategory(att.mimeType);
      
      if (category === 'audio') continue; // Already transcribed above
      
      hasVisualContent = true;
      const dataUrl = `data:${att.mimeType};base64,${att.base64Data}`;
      
      if (category === 'image') {
        content.push({
          type: 'image_url',
          image_url: { url: dataUrl },
        });
      } else if (category === 'video') {
        content.push({
          type: 'video_url',
          video_url: { url: dataUrl },
        });
      } else if (category === 'document') {
        content.push({
          type: 'file_url',
          file_url: { url: dataUrl },
        });
      }
    }
    
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content },
    ];
    
    console.error(`[Worker] Multimodal message: ${content.length} content parts, visual=${hasVisualContent}`);
  } else {
    messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ];
  }
  
  // ── LLM Call ──
  const llmStart = performance.now();
  
  let fullText = '';
  let usedStreaming = false;
  
  const useVision = hasAttachments && attachments.some(
    (att) => getAttachmentCategory(att.mimeType) !== 'audio'
  );
  
  // Try streaming LLM for progressive token delivery
  try {
    const createFn = useVision ? zai.chat.completions.createVision : zai.chat.completions.create;
    
    const stream = await createFn.call(zai.chat.completions, {
      messages: messages as any,
      temperature: 0.7,
      stream: true,
    });
    
    usedStreaming = true;
    
    if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
      for await (const chunk of stream as AsyncIterable<any>) {
        const token = chunk?.choices?.[0]?.delta?.content || '';
        if (!token) continue;
        
        fullText += token;
        
        // Emit token for progressive text display
        process.stdout.write(JSON.stringify({ type: 'token', text: token }) + '\n');
      }
    } else {
      // Stream object doesn't support async iteration, treat as regular response
      const content = stream?.choices?.[0]?.message?.content || '';
      fullText = content;
      process.stdout.write(JSON.stringify({ type: 'token', text: fullText }) + '\n');
    }
  } catch {
    // Streaming not supported or failed, fall back to non-streaming
    usedStreaming = false;
    const createFn = useVision ? zai.chat.completions.createVision : zai.chat.completions.create;
    
    const llmResponse = await createFn.call(zai.chat.completions, {
      messages: messages as any,
      temperature: 0.7,
    });
    
    fullText = llmResponse?.choices?.[0]?.message?.content ?? '';
    // Emit full text as a single token event
    process.stdout.write(JSON.stringify({ type: 'token', text: fullText }) + '\n');
  }
  
  const llmMs = performance.now() - llmStart;
  console.error(`[Worker] LLM done in ${llmMs.toFixed(0)}ms (streaming: ${usedStreaming}, vision: ${useVision})`);
  
  if (!fullText.trim()) {
    fullText = hasAttachments 
      ? "I can see the file you shared, but I'm not sure what to say about it. Could you ask me a specific question?"
      : "I understand, but I'm not sure how to respond to that.";
    process.stdout.write(JSON.stringify({ type: 'token', text: fullText }) + '\n');
  }
  
  // Clean response (remove any JSON wrapper if LLM ignored instructions)
  let cleanText = fullText.trim();
  if (cleanText.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleanText);
      if (typeof parsed.response === 'string') { cleanText = parsed.response; fullText = cleanText; }
      else if (typeof parsed.text === 'string') { cleanText = parsed.text; fullText = cleanText; }
    } catch {}
  }
  cleanText = cleanText.replace(/^```(?:json)?\s*\n?/gm, '').replace(/```\s*$/gm, '').trim();
  if (cleanText !== fullText) fullText = cleanText;
  
  // ── TTS: Split into sentences and TTS each one progressively ──
  const sentences = splitSentences(fullText);
  const ttsStart = performance.now();
  
  console.error(`[Worker] Split into ${sentences.length} sentence(s), starting TTS...`);
  
  // GC hint before TTS
  try { if (typeof (global as any).gc === 'function') (global as any).gc(); } catch { /* ignore */ }
  
  let totalAudioBytes = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    if (sentence.length < 2) continue;
    
    try {
      const sentenceTtsStart = performance.now();
      const ttsResponse = await zai.audio.tts.create({
        input: sentence,
        voice: TTS_VOICE,
        speed: ttsSpeed,
        response_format: 'wav',
        stream: false,
      });
      
      const arrayBuffer = await ttsResponse.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));
      const audioData = buffer.toString('base64');
      totalAudioBytes += buffer.length;
      
      const sentenceMs = performance.now() - sentenceTtsStart;
      console.error(`[Worker] TTS sentence ${i + 1}/${sentences.length}: ${sentenceMs.toFixed(0)}ms (${buffer.length} bytes)`);
      
      // Emit audio chunk immediately
      process.stdout.write(JSON.stringify({
        type: 'chunk',
        audioBase64: audioData,
        index: i,
        total: sentences.length,
        sentence: sentence,
      }) + '\n');
      
      const firstAudioMs = performance.now() - start;
      if (i === 0) {
        console.error(`[Worker] First audio chunk emitted in ${(firstAudioMs / 1000).toFixed(1)}s`);
      }
    } catch (ttsErr: any) {
      console.error(`[Worker] TTS error for sentence ${i + 1}: ${ttsErr?.message || ttsErr}`);
    }
  }
  
  const ttsMs = performance.now() - ttsStart;
  const totalMs = performance.now() - start;
  
  console.error(`[Worker] All TTS done in ${ttsMs.toFixed(0)}ms, total: ${totalMs.toFixed(0)}ms (${totalAudioBytes} bytes audio, ${sentences.length} chunks)`);
  
  // ── Done signal ──
  process.stdout.write(JSON.stringify({
    type: 'done',
    text: fullText,
    latencyMs: Math.round(totalMs),
  }) + '\n');
}

async function processTool(agentId: string, text: string, voiceSpeed?: number): Promise<void> {
  const ttsSpeed = voiceSpeed || DEFAULT_TTS_SPEED;
  const start = performance.now();
  
  try {
    const registry = buildRegistry();
    
    if (!registry.has(agentId)) {
      const available = registry.names().join(', ');
      process.stdout.write(JSON.stringify({
        type: 'token',
        text: `Unknown tool "${agentId}". Available: ${available}`,
      }) + '\n');
      process.stdout.write(JSON.stringify({ type: 'done', text: '', latencyMs: 0 }) + '\n');
      return;
    }
    
    const agent = registry.get(agentId);
    const inputKey = AGENT_INPUT_KEYS[agentId] || 'query';
    const agentInput: Record<string, unknown> = { [inputKey]: text };
    
    console.error(`[Worker] Executing tool "${agentId}" with ${inputKey}="${text.substring(0, 80)}..."`);
    
    const result: SubAgentResult = await agent.execute(agentInput, { abortSignal: AbortSignal.timeout(45000) });
    
    const elapsed = performance.now() - start;
    console.error(`[Worker] Tool "${agentId}" done in ${elapsed.toFixed(0)}ms (success: ${result.success})`);
    
    // Build response text
    let responseText = '';
    if (result.success) {
      responseText = result.response || result.summary || 'Tool completed successfully.';
      
      // If image was generated, include the data URL
      const artifacts = result.artifacts;
      if (artifacts && typeof artifacts === 'object' && !Array.isArray(artifacts)) {
        const arts = artifacts as Record<string, any>;
        if (arts.image_data_url) {
          responseText = `[Image generated] ${responseText} \n\n![Generated Image](${arts.image_data_url})`;
        } else if (arts.image_url && !arts.image_base64) {
          responseText = `[Image generated] ${responseText} \n\n![Generated Image](${arts.image_url})`;
        }
      }
    } else {
      responseText = result.error || result.response || 'Tool execution failed.';
    }
    
    // Emit text
    process.stdout.write(JSON.stringify({ type: 'token', text: responseText }) + '\n');
    
    // TTS for the response
    const sentences = splitSentences(responseText);
    console.error(`[Worker] Tool TTS: ${sentences.length} sentence(s)`);
    
    const zai = await getZAI();
    let totalAudioBytes = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (sentence.length < 2) continue;
      
      // Skip TTS for markdown image syntax
      if (sentence.startsWith('![')) continue;
      
      try {
        const ttsResponse = await zai.audio.tts.create({
          input: sentence,
          voice: TTS_VOICE,
          speed: ttsSpeed,
          response_format: 'wav',
          stream: false,
        });
        
        const arrayBuffer = await ttsResponse.arrayBuffer();
        const buffer = Buffer.from(new Uint8Array(arrayBuffer));
        totalAudioBytes += buffer.length;
        
        process.stdout.write(JSON.stringify({
          type: 'chunk',
          audioBase64: buffer.toString('base64'),
          index: i,
          total: sentences.length,
        }) + '\n');
      } catch (ttsErr: any) {
        console.error(`[Worker] Tool TTS error: ${ttsErr?.message || ttsErr}`);
      }
    }
    
    const totalMs = performance.now() - start;
    process.stdout.write(JSON.stringify({
      type: 'done',
      text: responseText,
      latencyMs: Math.round(totalMs),
    }) + '\n');
    
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error(`[Worker] Tool error: ${msg}`);
    process.stdout.write(JSON.stringify({ type: 'error', message: msg }) + '\n');
    process.stdout.write(JSON.stringify({ type: 'done', text: `Tool error: ${msg}`, latencyMs: 0 }) + '\n');
  }
}

// Listen for messages from parent via stdin
let inputBuffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk: string) => {
  inputBuffer += chunk;
  
  const lines = inputBuffer.split('\n');
  inputBuffer = lines.pop() || '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    try {
      const msg = JSON.parse(trimmed);
      
      if (msg.type === 'chat') {
        try {
          await processChat(msg.text, msg.attachments, msg.voiceSpeed, msg.language);
        } catch (err: any) {
          process.stdout.write(JSON.stringify({ type: 'error', message: err?.message || String(err) }) + '\n');
        }
        
        // Close stdin to signal completion
        try { process.stdin.destroy(); } catch {}
        setTimeout(() => {
          try { process.exit(0); } catch {}
        }, 5000);
      } else if (msg.type === 'tool') {
        try {
          await processTool(msg.agentId, msg.text || '', msg.voiceSpeed);
        } catch (err: any) {
          process.stdout.write(JSON.stringify({ type: 'error', message: err?.message || String(err) }) + '\n');
        }
        
        try { process.stdin.destroy(); } catch {}
        setTimeout(() => {
          try { process.exit(0); } catch {}
        }, 5000);
      }
    } catch {
      // Not valid JSON, skip
    }
  }
});

process.stdin.on('end', () => {
  setTimeout(() => process.exit(0), 200);
});

// Timeout: exit if no message within 120s
setTimeout(() => {
  console.error('[Worker] Timeout — no message received in 120s');
  process.exit(0);
}, 120000);
