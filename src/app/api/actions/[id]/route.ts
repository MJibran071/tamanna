import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/actions/[id]
 * Get a single action log with full resultJson.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const action = await db.actionLog.findUnique({ where: { id } });

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    return NextResponse.json({ action });
  } catch (error) {
    console.error('[API] GET /api/actions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch action', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/actions/[id]
 * Delete an action log entry.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const action = await db.actionLog.findUnique({ where: { id } });

    if (!action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    await db.actionLog.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('[API] DELETE /api/actions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete action', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
