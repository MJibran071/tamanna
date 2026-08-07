import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** POST /api/workspaces/[id]/join — join a workspace using access code */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { accessCode, userId, displayName } = body;

    if (!accessCode?.trim()) {
      return NextResponse.json({ error: 'accessCode is required' }, { status: 400 });
    }

    if (!userId?.trim()) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    if (!displayName?.trim()) {
      return NextResponse.json({ error: 'displayName is required' }, { status: 400 });
    }

    const workspace = await db.teamWorkspace.findUnique({ where: { id } });
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Verify access code
    if (workspace.accessCode !== accessCode.trim().toUpperCase()) {
      return NextResponse.json({ error: 'Invalid access code' }, { status: 403 });
    }

    // Check member limit
    if (workspace.memberCount >= workspace.maxMembers) {
      return NextResponse.json(
        { error: 'Workspace is full' },
        { status: 400 }
      );
    }

    // Check if already a member
    const existingMember = await db.teamMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: userId.trim() } },
    });

    if (existingMember) {
      // Update last active
      await db.teamMember.update({
        where: { id: existingMember.id },
        data: { lastActiveAt: new Date() },
      });

      return NextResponse.json({
        id: existingMember.id,
        workspaceId: id,
        userId: existingMember.userId,
        displayName: existingMember.displayName,
        role: existingMember.role,
        message: 'Already a member, updated last active',
      });
    }

    // Random avatar colors
    const avatars = ['🟢', '🔵', '🟡', '🟣', '🟠', '🔴', '🩷', '🩵'];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];

    const member = await db.teamMember.create({
      data: {
        workspaceId: id,
        userId: userId.trim(),
        displayName: displayName.trim(),
        role: 'member',
        avatar,
      },
    });

    // Increment member count
    await db.teamWorkspace.update({
      where: { id },
      data: { memberCount: { increment: 1 } },
    });

    return NextResponse.json({
      id: member.id,
      workspaceId: id,
      userId: member.userId,
      displayName: member.displayName,
      role: member.role,
      avatar: member.avatar,
      message: 'Joined workspace successfully',
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
