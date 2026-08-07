import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({ where: { id } });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    return NextResponse.json({ workflow });
  } catch (error) {
    console.error('[API] GET /api/workflows/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/workflows/[id]
 * Update status, enabled, stepsJson, name, description, etc.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({ where: { id } });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }
    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }
    if (body.trigger !== undefined) {
      const validTriggers = ['schedule', 'event', 'manual', 'webhook'];
      if (!validTriggers.includes(body.trigger)) {
        return NextResponse.json(
          { error: `Invalid trigger. Must be one of: ${validTriggers.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.trigger = body.trigger;
    }
    if (body.triggerConfig !== undefined) {
      updateData.triggerConfig = body.triggerConfig ? JSON.stringify(body.triggerConfig) : null;
    }
    if (body.stepsJson !== undefined) {
      const parsed = typeof body.stepsJson === 'string' ? body.stepsJson : JSON.stringify(body.stepsJson);
      if (!Array.isArray(JSON.parse(parsed))) {
        return NextResponse.json({ error: 'stepsJson must be a valid JSON array' }, { status: 400 });
      }
      updateData.stepsJson = parsed;
    }
    if (body.status !== undefined) {
      const validStatuses = ['draft', 'active', 'paused', 'archived'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.status = body.status;
    }
    if (body.enabled !== undefined) {
      updateData.enabled = body.enabled;
      // Auto-set status based on enabled
      if (body.enabled && !['active'].includes(workflow.status)) {
        updateData.status = 'active';
      } else if (!body.enabled && workflow.status === 'active') {
        updateData.status = 'paused';
      }
    }
    if (body.lastError !== undefined) {
      updateData.lastError = body.lastError || null;
    }

    const updated = await db.workflow.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ workflow: updated });
  } catch (error) {
    console.error('[API] PATCH /api/workflows/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/workflows/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({ where: { id } });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    await db.workflow.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('[API] DELETE /api/workflows/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
