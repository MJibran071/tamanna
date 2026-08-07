import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** PATCH /api/suggestions/[id] — accept or dismiss a suggestion */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!['accepted', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be "accepted" or "dismissed"' },
        { status: 400 }
      );
    }

    const existing = await db.proactiveSuggestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    if (existing.status !== 'active') {
      return NextResponse.json(
        { error: `Suggestion is already ${existing.status}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
    };

    if (status === 'accepted') {
      updateData.acceptedAt = new Date();
    } else {
      updateData.dismissedAt = new Date();
    }

    const updated = await db.proactiveSuggestion.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      acceptedAt: updated.acceptedAt?.toISOString() ?? null,
      dismissedAt: updated.dismissedAt?.toISOString() ?? null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
