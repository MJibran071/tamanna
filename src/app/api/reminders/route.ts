import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['general', 'meeting', 'task', 'health', 'learning', 'social'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

/**
 * GET /api/reminders
 * List reminders with optional ?status= and ?category= filters, ordered by scheduledFor asc.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;

    const reminders = await db.reminder.findMany({
      where,
      orderBy: { scheduledFor: 'asc' },
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error('[API] GET /api/reminders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reminders', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/reminders
 * Create a new reminder.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, scheduledFor, category = 'general', priority = 'medium', sourceMessage } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!scheduledFor) {
      return NextResponse.json({ error: 'scheduledFor is required (ISO 8601 datetime)' }, { status: 400 });
    }

    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json({ error: 'scheduledFor must be a valid ISO 8601 datetime' }, { status: 400 });
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      );
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` },
        { status: 400 },
      );
    }

    const reminder = await db.reminder.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        scheduledFor: scheduledDate,
        category,
        priority,
        sourceMessage: sourceMessage || null,
      },
    });

    return NextResponse.json({ reminder }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/reminders error:', error);
    return NextResponse.json(
      { error: 'Failed to create reminder', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
