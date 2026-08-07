import { NextRequest } from 'next/server';

import { DEFAULT_VOICE_SPEED, DEFAULT_LANGUAGE } from '@/lib/constants';

const GATEWAY_PORT = 3003;

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat/stream
 *
 * Proxies streaming SSE from the Tamanna gateway to the client.
 * Supports multimodal requests with image/video/audio/document attachments.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, attachments, conversationId, voiceSpeed, language, agentId } = body;

    if (!text?.trim() && !(attachments?.length > 0)) {
      return new Response(JSON.stringify({ error: 'Text or attachment is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Strip base64 from attachments before logging (too large)
    const logAttachments = attachments?.map((a: any) => ({
      type: a.type,
      name: a.name,
      mimeType: a.mimeType,
      size: a.size,
    }));
    console.log(`[API] /api/chat/stream: "${text?.substring(0, 80) || '[no text]'}" ${logAttachments?.length ? `+ ${logAttachments.length} attachment(s)` : ''}`);

    const payload: Record<string, unknown> = { text: text || '' };
    if (attachments?.length > 0) {
      // Forward attachment data with base64 for gateway processing
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

    // Try to connect to gateway streaming endpoint
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for multimodal

    try {
      const upstream = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!upstream.ok) {
        const errText = await upstream.text().catch(() => '');
        console.error(`[API] Gateway stream error: ${upstream.status} — ${errText}`);
        return new Response(JSON.stringify({ error: 'Gateway unavailable' }), {
          status: upstream.status === 502 ? 502 : 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Stream the response directly to client
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      
      // If gateway is down, try to restart
      console.warn('[API] Gateway down for stream, attempting restart...');
      try {
        const { execSync } = await import('child_process');
        execSync(
          `cd /home/z/my-project/mini-services/tamanna-gateway && nohup node dist/index.js > /home/z/my-project/gateway.log 2>&1 &`,
          { timeout: 2000 }
        );
      } catch { /* ignore restart errors */ }

      await new Promise((r) => setTimeout(r, 3000));

      // Retry once after restart
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 60000);
      
      try {
        const retry = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: retryController.signal,
        });

        clearTimeout(retryTimeout);

        if (retry.ok) {
          return new Response(retry.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache, no-transform',
              'Connection': 'keep-alive',
              'X-Accel-Buffering': 'no',
            },
          });
        }
      } catch {
        clearTimeout(retryTimeout);
      }

      return new Response(JSON.stringify({ error: 'Gateway unavailable after restart' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('[API] /api/chat/stream error:', error);
    return new Response(
      JSON.stringify({ error: 'Stream failed', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
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
