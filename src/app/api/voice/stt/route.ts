import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VOICE_STACK_URL = process.env.VOICE_STACK_URL || 'http://localhost:3010';

/**
 * POST /api/voice/stt
 * Transcribe audio to text using local Whisper.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audio_base64, language } = body;

    if (!audio_base64) {
      return NextResponse.json({ error: 'Audio data is required' }, { status: 400 });
    }

    const res = await fetch(`${VOICE_STACK_URL}/stt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_base64, language }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'STT failed' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] /api/voice/stt error:', error);
    return NextResponse.json(
      { error: 'Local STT failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 },
    );
  }
}
