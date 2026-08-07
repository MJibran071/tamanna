import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reminders/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reminder = await db.reminder.findUnique({ where: { id } });

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    return NextResponse.json({ reminder });
  } catch (error) {
    console.error('[API] GET /api/reminders/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminder', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/reminders/[id]
 * Supports special actions: complete, snooze, dismiss.
 * Also supports standard field updates: title, description, scheduledFor, category, priority.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reminder = await db.reminder.findUnique({ where: { id } });

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    // Handle special actions
    if (body.action) {
      switch (body.action) {
        case 'complete':
          updateData.status = 'completed';
          updateData.completedAt = new Date();
          break;
        case 'snooze': {
          const snoozeMinutes = body.snoozeMinutes || 15;
          const snoozedUntil = new Date(Date.now() + snoozeMinutes * 60 * 1000);
          updateData.status = 'snoozed';
          updateData.snoozedUntil = snoozedUntil;
          updateData.scheduledFor = snoozedUntil;
          updateData.snoozeCount = { increment: 1 };
          break;
        }
        case 'dismiss':
          updateData.status = 'dismissed';
          break;
        default:
          return NextResponse.json(
            { error: `Invalid action: ${body.action}. Use 'complete', 'snooze', or 'dismiss'.` },
            { status: 400 },
          );
      }
    } else {
      // Standard field updates
      if (body.title !== undefined) updateData.title = body.title.trim();
      if (body.description !== undefined) updateData.description = body.description?.trim() || null;
      if (body.scheduledFor !== undefined) {
        const d = new Date(body.scheduledFor);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'scheduledFor must be a valid ISO 8601 datetime' }, { status: 400 });
        }
        updateData.scheduledFor = d;
      }
      if (body.category !== undefined) {
        const valid = ['general', 'meeting', 'task', 'health', 'learning', 'social'];
        if (!valid.includes(body.category)) {
          return NextResponse.json({ error: `Invalid category. Must be one of: ${valid.join(', ')}` }, { status: 400 });
        }
        updateData.category = body.category;
      }
      if (body.priority !== undefined) {
        const valid = ['low', 'medium', 'high', 'urgent'];
        if (!valid.includes(body.priority)) {
          return NextResponse.json({ error: `Invalid priority. Must be one of: ${valid.join(', ')}` }, { status: 400 });
        }
        updateData.priority = body.priority;
      }
    }

    const updated = await db.reminder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ reminder: updated });
  } catch (error) {
    console.error('[API] PATCH /api/reminders/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update reminder', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/reminders/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const reminder = await db.reminder.findUnique({ where: { id } });

    if (!reminder) {
      return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
    }

    await db.reminder.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('[API] DELETE /api/reminders/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reminder', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
