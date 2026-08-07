import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/workflows/[id]/execute
 * Manually trigger a workflow execution.
 * For now, updates lastRunAt and increments runCount.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const workflow = await db.workflow.findUnique({ where: { id } });

    if (!workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    if (!workflow.enabled && workflow.status !== 'active') {
      return NextResponse.json(
        { error: 'Workflow is not enabled. Enable it first before executing.' },
        { status: 400 },
      );
    }

    const now = new Date();
    const updated = await db.workflow.update({
      where: { id },
      data: {
        lastRunAt: now,
        runCount: { increment: 1 },
        status: 'active',
        lastError: null,
      },
    });

    // TODO: In a future iteration, actually execute the workflow steps
    // using the ActionRouter. For now, we just record the execution.

    return NextResponse.json({
      success: true,
      workflow: updated,
      message: `Workflow "${workflow.name}" executed successfully (recorded).`,
      executedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[API] POST /api/workflows/[id]/execute error:', error);
    return NextResponse.json(
      { error: 'Workflow execution failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
