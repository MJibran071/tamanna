import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function serializeWorkspace(w: Record<string, unknown>) {
  return {
    ...w,
    createdAt: (w.createdAt as Date).toISOString(),
    updatedAt: (w.updatedAt as Date).toISOString(),
  };
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** GET /api/workspaces/[id] — get workspace with members and sessions */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const workspace = await db.teamWorkspace.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            id: true, userId: true, displayName: true, role: true, avatar: true,
            joinedAt: true, lastActiveAt: true,
          },
          orderBy: { joinedAt: 'asc' },
        },
        sharedSessions: {
          select: {
            id: true, title: true, description: true, status: true,
            createdBy: true, createdAt: true, updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    return NextResponse.json(
      serializeWorkspace({
        ...workspace,
        members: workspace.members.map((m) => ({
          ...m,
          joinedAt: m.joinedAt.toISOString(),
          lastActiveAt: m.lastActiveAt.toISOString(),
        })),
        sessions: workspace.sharedSessions.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        })),
      })
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** PATCH /api/workspaces/[id] — update workspace */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, isPublic, maxMembers } = body;

    const existing = await db.teamWorkspace.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (maxMembers !== undefined) updateData.maxMembers = maxMembers;

    const workspace = await db.teamWorkspace.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(serializeWorkspace(workspace as unknown as Record<string, unknown>));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** DELETE /api/workspaces/[id] — delete workspace */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const existing = await db.teamWorkspace.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    await db.teamWorkspace.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
