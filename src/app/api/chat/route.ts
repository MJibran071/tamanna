import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_VOICE_SPEED, DEFAULT_LANGUAGE } from '@/lib/constants';

const GATEWAY_PORT = 3003;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat
 *
 * Sends a text message (with optional attachments) to the Tamanna gateway.
 * Includes retry logic — if the gateway is down, it waits and retries.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, attachments, conversationId, voiceSpeed, language, agentId } = body;

    if (!text?.trim() && !(attachments?.length > 0)) {
      return NextResponse.json({ error: 'Text or attachment is required' }, { status: 400 });
    }

    console.log(`[API] /api/chat: "${text?.substring(0, 80) || '[no text]'}" ${attachments?.length ? `+ ${attachments.length} attachment(s)` : ''}`);

    const payload: Record<string, unknown> = { text: text || '' };
    if (attachments?.length > 0) {
      payload.attachments = attachments.map((a: any) => ({
        type: a.type,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
        base64Data: a.base64Data,
      }));
    }
    if (conversationId) {
      payload.conversationId = conversationId;
    }
    payload.voiceSpeed = voiceSpeed || DEFAULT_VOICE_SPEED;
    payload.language = language || DEFAULT_LANGUAGE;

    if (agentId) {
      payload.agentId = agentId;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[API] Retry ${attempt}/${MAX_RETRIES} after ${RETRY_DELAY_MS}ms...`);
        // Try to kick-start the gateway
        try {
          const { execSync } = await import('child_process');
          execSync(
            `cd /home/z/my-project/mini-services/tamanna-gateway && nohup node dist/index.js > /home/z/my-project/gateway.log 2>&1 &`,
            { timeout: 2000 }
          );
        } catch { /* ignore restart errors */ }

        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60s for multimodal

        const response = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          return NextResponse.json(data, {
            status: 200,
            headers: { 'Cache-Control': 'no-store' },
          });
        }

        lastError = new Error(`HTTP ${response.status}`);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[API] Attempt ${attempt + 1} failed: ${lastError.message}`);
      }
    }

    return NextResponse.json(
      { error: 'Gateway unavailable', message: lastError?.message || 'All retries failed' },
      { status: 502 },
    );
  } catch (error) {
    console.error('[API] /api/chat error:', error);
    return NextResponse.json(
      { error: 'Gateway unavailable', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
