import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gateway/restart
 * Restarts the Tamanna gateway mini-service.
 */
export async function POST() {
  try {
    // Kill any existing gateway
    try {
      execSync('pkill -f "node.*mini-services/tamanna-gateway" || true', { timeout: 2000 });
    } catch { /* no process to kill */ }

    // Wait briefly for port to free
    await new Promise((r) => setTimeout(r, 1000));

    // Start new gateway
    execSync(
      'cd /home/z/my-project/mini-services/tamanna-gateway && nohup node dist/index.js > /home/z/my-project/gateway.log 2>&1 &',
      { timeout: 2000 }
    );

    // Wait for it to be ready
    await new Promise((r) => setTimeout(r, 3000));

    // Check health
    try {
      const health = await fetch('http://127.0.0.1:3003/health', { signal: AbortSignal.timeout(3000) });
      if (health.ok) {
        const data = await health.json();
        return NextResponse.json({ status: 'restarted', gateway: data });
      }
    } catch {
      // Gateway might still be starting
    }

    return NextResponse.json({ status: 'restarting' });
  } catch (error) {
    console.error('[API] /api/gateway/restart error:', error);
    return NextResponse.json(
      { error: 'Failed to restart gateway' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/gateway/restart
 * Checks gateway health.
 */
export async function GET() {
  try {
    const health = await fetch('http://127.0.0.1:3003/health', { signal: AbortSignal.timeout(3000) });
    if (health.ok) {
      const data = await health.json();
      return NextResponse.json({ status: 'online', gateway: data });
    }
    return NextResponse.json({ status: 'unhealthy' }, { status: 503 });
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 503 });
  }
}
