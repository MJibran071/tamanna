import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/** Generate a 6-character alphanumeric access code */
function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function serializeWorkspace(w: Record<string, unknown>) {
  return {
    ...w,
    createdAt: (w.createdAt as Date).toISOString(),
    updatedAt: (w.updatedAt as Date).toISOString(),
  };
}

/** GET /api/workspaces — list user's workspaces */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'anonymous';

    // Find workspaces where user is a member
    const memberships = await db.teamMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });

    const workspaceIds = memberships.map((m) => m.workspaceId);

    const workspaces = await db.teamWorkspace.findMany({
      where: { id: { in: workspaceIds } },
      orderBy: { updatedAt: 'desc' },
      include: {
        members: {
          select: { id: true, userId: true, displayName: true, role: true, avatar: true, lastActiveAt: true },
        },
        _count: {
          select: { sharedSessions: true },
        },
      },
    });

    return NextResponse.json(
      workspaces.map((w) =>
        serializeWorkspace({
          ...w,
          memberCount: w.members.length,
          sessionCount: w._count.sharedSessions,
        })
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/workspaces — create a new workspace */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, createdBy, isPublic, maxMembers } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const userId = createdBy || 'anonymous';
    const accessCode = generateAccessCode();

    const workspace = await db.teamWorkspace.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: userId,
        accessCode,
        isPublic: isPublic ?? false,
        maxMembers: maxMembers || 5,
        memberCount: 1,
      },
    });

    // Auto-add creator as owner
    await db.teamMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        displayName: createdBy ? 'You' : 'Anonymous',
        role: 'owner',
        avatar: '🟢',
      },
    });

    return NextResponse.json(serializeWorkspace(workspace as unknown as Record<string, unknown>), {
      status: 201,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
