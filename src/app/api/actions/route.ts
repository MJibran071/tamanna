import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/actions
 * List recent action logs with optional filters.
 * Query params: type, status, limit (default 20), offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const where: Record<string, unknown> = {};
    if (type) where.actionType = type;
    if (status) where.status = status;

    const [actions, total] = await Promise.all([
      db.actionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          actionType: true,
          command: true,
          intent: true,
          status: true,
          summary: true,
          sourceUrl: true,
          durationMs: true,
          createdAt: true,
          completedAt: true,
          // Omit resultJson for list view (can be large)
        },
      }),
      db.actionLog.count({ where }),
    ]);

    return NextResponse.json({ actions, total, limit, offset });
  } catch (error) {
    console.error('[API] GET /api/actions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch actions', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
