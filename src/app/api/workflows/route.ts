import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_TRIGGERS = ['schedule', 'event', 'manual', 'webhook'];

/**
 * GET /api/workflows
 * List all workflows.
 */
export async function GET() {
  try {
    const workflows = await db.workflow.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ workflows });
  } catch (error) {
    console.error('[API] GET /api/workflows error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/workflows
 * Create a new workflow.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, trigger, triggerConfig, stepsJson, enabled = false } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (trigger && !VALID_TRIGGERS.includes(trigger)) {
      return NextResponse.json(
        { error: `Invalid trigger. Must be one of: ${VALID_TRIGGERS.join(', ')}` },
        { status: 400 },
      );
    }

    if (!stepsJson || !Array.isArray(JSON.parse(stepsJson))) {
      return NextResponse.json({ error: 'stepsJson must be a valid JSON array' }, { status: 400 });
    }

    const workflow = await db.workflow.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        trigger: trigger || 'manual',
        triggerConfig: triggerConfig ? JSON.stringify(triggerConfig) : null,
        stepsJson: typeof stepsJson === 'string' ? stepsJson : JSON.stringify(stepsJson),
        enabled,
        status: enabled ? 'active' : 'draft',
      },
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/workflows error:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
