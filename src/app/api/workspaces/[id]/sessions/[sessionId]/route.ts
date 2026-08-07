import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string; sessionId: string }>;
}

/** GET /api/workspaces/[id]/sessions/[sessionId] — get session with messages */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id, sessionId } = await params;

    const session = await db.sharedSession.findFirst({
      where: { id: sessionId, workspaceId: id },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    let messages: unknown[] = [];
    let artifacts: unknown[] = [];
    let agentConfig: unknown = null;

    try {
      messages = session.messagesJson ? JSON.parse(session.messagesJson) : [];
    } catch {
      messages = [];
    }
    try {
      artifacts = session.artifacts ? JSON.parse(session.artifacts) : [];
    } catch {
      artifacts = [];
    }
    try {
      agentConfig = session.agentConfig ? JSON.parse(session.agentConfig) : null;
    } catch {
      agentConfig = null;
    }

    return NextResponse.json({
      id: session.id,
      workspaceId: session.workspaceId,
      title: session.title,
      description: session.description,
      messages,
      artifacts,
      agentConfig,
      status: session.status,
      createdBy: session.createdBy,
      updatedBy: session.updatedBy,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH /api/workspaces/[id]/sessions/[sessionId] — update session */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id, sessionId } = await params;
    const body = await req.json();
    const { title, description, messages, artifacts, agentConfig, status, updatedBy } = body;

    const existing = await db.sharedSession.findFirst({
      where: { id: sessionId, workspaceId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (messages !== undefined) updateData.messagesJson = JSON.stringify(messages);
    if (artifacts !== undefined) updateData.artifacts = JSON.stringify(artifacts);
    if (agentConfig !== undefined) updateData.agentConfig = JSON.stringify(agentConfig);
    if (status !== undefined) {
      if (!['active', 'archived', 'completed'].includes(status)) {
        return NextResponse.json(
          { error: 'status must be active, archived, or completed' },
          { status: 400 }
        );
      }
      updateData.status = status;
    }
    if (updatedBy) updateData.updatedBy = updatedBy;

    const session = await db.sharedSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    return NextResponse.json({
      id: session.id,
      workspaceId: session.workspaceId,
      title: session.title,
      description: session.description,
      status: session.status,
      createdBy: session.createdBy,
      updatedBy: session.updatedBy,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/workspaces/[id]/sessions/[sessionId] — archive session */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id, sessionId } = await params;

    const existing = await db.sharedSession.findFirst({
      where: { id: sessionId, workspaceId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await db.sharedSession.update({
      where: { id: sessionId },
      data: { status: 'archived' },
    });

    return NextResponse.json({ success: true, message: 'Session archived' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
