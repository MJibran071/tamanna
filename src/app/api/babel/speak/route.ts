import { NextRequest, NextResponse } from 'next/server';
import Zai from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VOICE_STACK_URL = process.env.VOICE_STACK_URL || 'http://localhost:3010';
const TTS_TIMEOUT_MS = 30_000;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ur: 'Urdu',
  hi: 'Hindi',
  ar: 'Arabic',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ru: 'Russian',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  it: 'Italian',
  tr: 'Turkish',
  nl: 'Dutch',
  sv: 'Swedish',
  th: 'Thai',
  vi: 'Vietnamese',
};

async function translateViaLLM(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<string> {
  const zai = new Zai();
  const sourceName = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;

  const completion = await zai.chat.completions.create({
    model: 'qwen3-1.7b',
    messages: [
      {
        role: 'system',
        content: `You are a professional translator. Translate the following text from ${sourceName} (${sourceLang}) to ${targetName} (${targetLang}). Only return the translated text, nothing else. Preserve meaning, tone, and cultural nuances.`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.3,
  });

  let translated = completion.choices[0]?.message?.content || '';
  // Strip <think>...</think> blocks if present (qwen3 quirk)
  translated = translated.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  return translated;
}

async function generateTTS(
  text: string,
  language: string,
  voice?: string,
  speed?: number,
): Promise<{ audioBase64: string; engineUsed: string; audioSize: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);

  try {
    const res = await fetch(`${VOICE_STACK_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
        voice: voice || 'default',
        speed: speed || 1.0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`TTS error: ${err}`);
    }

    const audioBuffer = await res.arrayBuffer();
    const engineUsed = res.headers.get('X-Engine') || 'unknown';

    return {
      audioBase64: Buffer.from(audioBuffer).toString('base64'),
      engineUsed,
      audioSize: audioBuffer.byteLength,
    };
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { text, sourceLang, targetLang, voice, speed } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }
    if (!sourceLang?.trim() || !targetLang?.trim()) {
      return NextResponse.json(
        { error: 'Both sourceLang and targetLang are required' },
        { status: 400 },
      );
    }

    // 1. Translate via LLM
    const translatedText = await translateViaLLM(text.trim(), sourceLang, targetLang);

    // 2. Generate TTS audio of the translated text
    const ttsResult = await generateTTS(translatedText, targetLang, voice, speed);

    const durationMs = Date.now() - startTime;

    // 3. Persist to TranslationLog
    await db.translationLog.create({
      data: {
        sourceText: text.trim(),
        translatedText,
        sourceLang,
        targetLang,
        engineUsed: ttsResult.engineUsed,
        mode: 'voice',
        durationMs,
        audioSize: ttsResult.audioSize,
      },
    });

    // 4. Return response
    return NextResponse.json({
      translatedText,
      audioBase64: ttsResult.audioBase64,
      engineUsed: ttsResult.engineUsed,
      latencyMs: durationMs,
    });
  } catch (error) {
    console.error('[Babel] Speak error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Translation or TTS failed', message },
      { status: 500 },
    );
  }
}
