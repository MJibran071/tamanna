import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_STATUSES = ['draft', 'planning', 'executing', 'paused', 'completed', 'failed'];

function serializeProject(p: Record<string, unknown>) {
  return {
    ...p,
    startedAt: (p.startedAt as Date | null)?.toISOString() ?? null,
    completedAt: (p.completedAt as Date | null)?.toISOString() ?? null,
    createdAt: (p.createdAt as Date).toISOString(),
    updatedAt: (p.updatedAt as Date).toISOString(),
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/autonomous/[id] — get project details */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const project = await db.autonomousProject.findUnique({
      where: { id },
      include: { conversations: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(
      serializeProject({
        ...project,
        conversations: project.conversations.map((c) => ({
          id: c.id,
          title: c.title,
          createdAt: c.createdAt.toISOString(),
        })),
      })
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH /api/autonomous/[id] — update project */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, status, progress, currentPhase, currentStep, totalSteps, error, outputJson, planJson } = body;

    const existing = await db.autonomousProject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;

      // Auto-set timestamps
      if (status === 'executing' && !existing.startedAt) {
        updateData.startedAt = new Date();
      }
      if (['completed', 'failed'].includes(status)) {
        updateData.completedAt = new Date();
        if (existing.startedAt) {
          updateData.durationMs = Date.now() - existing.startedAt.getTime();
        }
      }
    }
    if (progress !== undefined) updateData.progress = Math.min(100, Math.max(0, progress));
    if (currentPhase !== undefined) updateData.currentPhase = currentPhase;
    if (currentStep !== undefined) updateData.currentStep = currentStep;
    if (totalSteps !== undefined) updateData.totalSteps = totalSteps;
    if (error !== undefined) updateData.error = error;
    if (outputJson !== undefined) updateData.outputJson = outputJson;
    if (planJson !== undefined) updateData.planJson = planJson;

    const project = await db.autonomousProject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(serializeProject(project as unknown as Record<string, unknown>));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/autonomous/[id] — delete project */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await db.autonomousProject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await db.autonomousProject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
