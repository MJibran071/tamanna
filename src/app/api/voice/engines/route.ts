import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VOICE_STACK_URL = process.env.VOICE_STACK_URL || 'http://localhost:3010';

/**
 * GET /api/voice/engines
 * List all available TTS engines with status.
 */
export async function GET() {
  try {
    const res = await fetch(`${VOICE_STACK_URL}/engines`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Voice stack offline' }, { status: 503 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Voice stack offline', engines: [] },
      { status: 503 },
    );
  }
}
