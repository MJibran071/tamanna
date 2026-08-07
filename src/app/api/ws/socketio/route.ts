import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_PORT = 3003;

export const dynamic = 'force-dynamic';

/**
 * Proxies socket.io polling requests to the Tamanna gateway on port 3003.
 * Socket.io client uses path: '/api/ws/socketio' so requests arrive here.
 * We forward them to the gateway's standard /socket.io/ path.
 */
async function proxyRequest(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const subPath = request.nextUrl.pathname.replace('/api/ws/socketio', '');
  const search = searchParams.toString();
  const query = search ? `?${search}` : '';

  const gatewayUrl = `http://127.0.0.1:${GATEWAY_PORT}/socket.io${subPath}${query}`;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const skip = ['host', 'connection', 'keep-alive', 'transfer-encoding', 'te', 'trailer', 'upgrade'];
    if (!skip.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  try {
    const fetchOptions: RequestInit = { method: request.method, headers };

    if (request.method === 'POST' || request.method === 'PUT') {
      const body = await request.arrayBuffer();
      fetchOptions.body = body;
      headers.set('Content-Length', body.byteLength.toString());
    }

    const response = await fetch(gatewayUrl, fetchOptions);

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });
    responseHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    responseHeaders.set('X-Accel-Buffering', 'no');

    const responseBody = await response.arrayBuffer();
    return new NextResponse(responseBody, { status: response.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Gateway unavailable' }, { status: 502 });
  }
}

export async function GET(request: NextRequest) { return proxyRequest(request); }
export async function POST(request: NextRequest) { return proxyRequest(request); }

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
