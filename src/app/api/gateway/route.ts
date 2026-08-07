import { NextRequest } from 'next/server';

/**
 * API Route: /api/gateway
 * Proxies socket.io polling requests to the tamanna-gateway mini-service on port 3003.
 * This avoids relying on Caddy's XTransformPort dynamic routing for WebSocket traffic.
 */

const GATEWAY_PORT = 3003;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '/socket.io/';

  // Build params, excluding our custom ones
  const params = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'path') params.set(key, value);
  }

  const upstreamUrl = `http://127.0.0.1:${GATEWAY_PORT}${path}?${params.toString()}`;

  try {
    const response = await fetch(upstreamUrl, {
      headers: {
        host: `127.0.0.1:${GATEWAY_PORT}`,
      },
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-cache, no-store',
      },
    });
  } catch (error) {
    console.error('[Gateway Proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Gateway unavailable' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '/socket.io/';

  const params = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (key !== 'path') params.set(key, value);
  }

  const upstreamUrl = `http://127.0.0.1:${GATEWAY_PORT}${path}?${params.toString()}`;

  try {
    const body = await request.text();
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': 'application/json',
        host: `127.0.0.1:${GATEWAY_PORT}`,
      },
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Gateway unavailable' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    },
  });
}
