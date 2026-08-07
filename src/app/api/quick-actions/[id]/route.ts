import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quick-actions/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const action = await db.quickAction.findUnique({ where: { id } });

    if (!action) {
      return NextResponse.json({ error: 'Quick action not found' }, { status: 404 });
    }

    return NextResponse.json({ action });
  } catch (error) {
    console.error('[API] GET /api/quick-actions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick action', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/quick-actions/[id]
 * Update any field. Special: { incrementUsage: true } to bump usageCount.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const action = await db.quickAction.findUnique({ where: { id } });

    if (!action) {
      return NextResponse.json({ error: 'Quick action not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Special: increment usage count
    if (body.incrementUsage) {
      updateData.usageCount = { increment: 1 };
      updateData.lastUsedAt = new Date();
    }

    // Standard field updates
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.prompt !== undefined) updateData.prompt = body.prompt.trim();
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.isEnabled !== undefined) updateData.isEnabled = body.isEnabled;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const updated = await db.quickAction.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ action: updated });
  } catch (error) {
    console.error('[API] PATCH /api/quick-actions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update quick action', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/quick-actions/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const action = await db.quickAction.findUnique({ where: { id } });

    if (!action) {
      return NextResponse.json({ error: 'Quick action not found' }, { status: 404 });
    }

    await db.quickAction.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('[API] DELETE /api/quick-actions/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete quick action', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
