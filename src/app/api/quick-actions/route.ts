import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/quick-actions
 * Returns enabled actions sorted by sortOrder.
 */
export async function GET() {
  try {
    const actions = await db.quickAction.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('[API] GET /api/quick-actions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quick actions', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/quick-actions
 * Create a new quick action.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, prompt, icon = 'Sparkles', color = '#6366f1', sortOrder = 0 } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const action = await db.quickAction.create({
      data: {
        title: title.trim(),
        prompt: prompt.trim(),
        icon,
        color,
        sortOrder,
        isEnabled: true,
      },
    });

    return NextResponse.json({ action }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/quick-actions error:', error);
    return NextResponse.json(
      { error: 'Failed to create quick action', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
