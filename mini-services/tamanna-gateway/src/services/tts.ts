import { getZAI } from './zai';

/**
 * Synthesize text to speech, splitting into sentence-boundary chunks
 * that stay under maxLen characters. Returns an array of base64-encoded
 * audio chunks (WAV format).
 */
export async function synthesize(text: string): Promise<string[]> {
  const zai = await getZAI();
  const chunks = chunkText(text, 1000);
  const audioChunks: string[] = [];

  console.log(`[TTS] Synthesizing ${chunks.length} chunk(s) from ${text.length} chars`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const response = await zai.audio.tts.create({
        input: chunk,
        voice: 'tongtong',
        speed: 1.0,
        response_format: 'wav',
        stream: false,
      });
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(new Uint8Array(arrayBuffer));
      audioChunks.push(buffer.toString('base64'));
      console.log(`[TTS] Chunk ${i + 1}/${chunks.length} synthesized (${buffer.length} bytes)`);
    } catch (err: any) {
      console.error(`[TTS] Failed to synthesize chunk ${i + 1}: ${err?.message || err}`);
      throw err;
    }
  }

  return audioChunks;
}

/**
 * Split text on sentence boundaries, keeping each chunk under maxLen.
 * Falls back to splitting on word boundaries if a single sentence exceeds maxLen.
 */
function chunkText(text: string, maxLen: number): string[] {
  if (!text || text.length === 0) return [];
  if (text.length <= maxLen) return [text];

  // Try sentence-boundary splitting first
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+/g) || [];

  if (sentences.length === 0) {
    // No sentence boundaries found — split on word boundaries
    return splitOnWordBoundary(text, maxLen);
  }

  // Check for remaining text after last punctuation
  const lastSentenceEnd = sentences.reduce((maxEnd, s) => {
    const idx = text.indexOf(s, maxEnd);
    return idx + s.length;
  }, 0);
  const remaining = text.substring(lastSentenceEnd).trim();
  if (remaining.length > 0) {
    sentences.push(remaining);
  }

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    // If a single sentence is longer than maxLen, split it on word boundary
    if (sentence.length > maxLen) {
      // Flush current buffer first
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      const subChunks = splitOnWordBoundary(sentence, maxLen);
      chunks.push(...subChunks);
      continue;
    }

    if ((current + sentence).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Split text on whitespace/word boundaries so each chunk stays under maxLen.
 */
function splitOnWordBoundary(text: string, maxLen: number): string[] {
  const words = text.split(/(\s+)/);
  const chunks: string[] = [];
  let current = '';

  for (const word of words) {
    if ((current + word).length > maxLen && current.trim().length > 0) {
      chunks.push(current.trim());
      current = word;
    } else {
      current += word;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
