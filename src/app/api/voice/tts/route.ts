import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VOICE_STACK_URL = process.env.VOICE_STACK_URL || 'http://localhost:3010';
const TIMEOUT_MS = 30_000;

/**
 * POST /api/voice/tts
 * Proxies to local voice stack TTS endpoint.
 * Returns audio/wav bytes directly.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { text, engine, voice, speed, language, speed_hint, quality_hint } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(`${VOICE_STACK_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.trim(),
        engine: engine || undefined,
        voice: voice || 'default',
        speed: speed || 1.0,
        language: language || undefined,
        speed_hint: speed_hint || undefined,
        quality_hint: quality_hint || undefined,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Voice stack error: ${err}` },
        { status: res.status },
      );
    }

    const audioBuffer = await res.arrayBuffer();
    const usedEngine = res.headers.get('X-Engine') || 'unknown';
    const latency = Date.now() - startTime;

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'X-Engine': usedEngine,
        'X-Latency-Ms': String(latency),
        'X-Audio-Size': String(audioBuffer.byteLength),
      },
    });
  } catch (error) {
    console.error('[API] /api/voice/tts error:', error);
    return NextResponse.json(
      { error: 'Local TTS failed — try cloud fallback', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 },
    );
  }
}

/**
 * GET /api/voice/tts
 * Health check for local TTS.
 */
export async function GET() {
  try {
    const res = await fetch(`${VOICE_STACK_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      return NextResponse.json({ status: 'online', provider: 'local' });
    }
    return NextResponse.json({ status: 'error' }, { status: 503 });
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 503 });
  }
}
