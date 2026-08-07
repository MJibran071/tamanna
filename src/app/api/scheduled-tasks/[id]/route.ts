import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/** PATCH /api/scheduled-tasks/[id] — update a task (toggle enabled, edit fields) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.scheduledTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = String(body.name).trim();
    if (body.description !== undefined) updateData.description = body.description ? String(body.description).trim() : null;
    if (body.prompt !== undefined) updateData.prompt = String(body.prompt).trim();
    if (body.cronExpr !== undefined) updateData.cronExpr = body.cronExpr || null;
    if (body.intervalSec !== undefined) updateData.intervalSec = body.intervalSec || null;
    if (body.runAt !== undefined) updateData.runAt = body.runAt ? new Date(body.runAt) : null;
    if (body.timezone !== undefined) updateData.timezone = String(body.timezone);
    if (body.enabled !== undefined) updateData.enabled = Boolean(body.enabled);
    if (body.lastRunAt !== undefined) updateData.lastRunAt = new Date(body.lastRunAt);
    if (body.runCount !== undefined) updateData.runCount = Number(body.runCount);
    if (body.lastError !== undefined) updateData.lastError = body.lastError || null;

    const updated = await db.scheduledTask.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      prompt: updated.prompt,
      scheduleType: updated.scheduleType,
      cronExpr: updated.cronExpr,
      intervalSec: updated.intervalSec,
      runAt: updated.runAt?.toISOString() ?? null,
      timezone: updated.timezone,
      enabled: updated.enabled,
      lastRunAt: updated.lastRunAt?.toISOString() ?? null,
      nextRunAt: updated.nextRunAt?.toISOString() ?? null,
      runCount: updated.runCount,
      lastError: updated.lastError,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/scheduled-tasks/[id] — delete a task */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.scheduledTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await db.scheduledTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
