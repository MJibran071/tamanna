import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/workspaces/[id]/sessions — list sessions in workspace */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const workspace = await db.teamWorkspace.findUnique({ where: { id } });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const sessions = await db.sharedSession.findMany({
      where: { workspaceId: id },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(
      sessions.map((s) => ({
        id: s.id,
        workspaceId: s.workspaceId,
        title: s.title,
        description: s.description,
        status: s.status,
        createdBy: s.createdBy,
        updatedBy: s.updatedBy,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }))
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/workspaces/[id]/sessions — create a new shared session */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, createdBy, agentConfig } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const workspace = await db.teamWorkspace.findUnique({ where: { id } });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const session = await db.sharedSession.create({
      data: {
        workspaceId: id,
        title: title.trim(),
        description: description?.trim() || null,
        createdBy: createdBy || 'anonymous',
        agentConfig: agentConfig ? JSON.stringify(agentConfig) : null,
        messagesJson: '[]',
        artifacts: '[]',
      },
    });

    return NextResponse.json({
      id: session.id,
      workspaceId: session.workspaceId,
      title: session.title,
      description: session.description,
      status: session.status,
      createdBy: session.createdBy,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
