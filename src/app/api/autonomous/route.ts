import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_STATUSES = ['draft', 'planning', 'executing', 'paused', 'completed', 'failed'];
const VALID_MODES = ['fast', 'balanced', 'thorough'];

function serializeProject(p: Record<string, unknown>) {
  return {
    ...p,
    startedAt: (p.startedAt as Date | null)?.toISOString() ?? null,
    completedAt: (p.completedAt as Date | null)?.toISOString() ?? null,
    createdAt: (p.createdAt as Date).toISOString(),
    updatedAt: (p.updatedAt as Date).toISOString(),
  };
}

/** GET /api/autonomous — list autonomous projects, optional ?status= filter */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const where = status ? { status: status as string } : {};

    const projects = await db.autonomousProject.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(projects.map(serializeProject));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/autonomous — create a new autonomous project */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, goal, mode, maxSteps, autoExecute } = body;

    if (!goal?.trim()) {
      return NextResponse.json({ error: 'goal is required' }, { status: 400 });
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (mode && !VALID_MODES.includes(mode)) {
      return NextResponse.json(
        { error: 'mode must be fast, balanced, or thorough' },
        { status: 400 }
      );
    }

    const project = await db.autonomousProject.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        goal: goal.trim(),
        mode: mode || 'balanced',
        maxSteps: maxSteps || 10,
        autoExecute: autoExecute ?? false,
      },
    });

    return NextResponse.json(serializeProject(project as unknown as Record<string, unknown>), { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
