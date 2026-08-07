import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/services/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = await db.serviceConnection.findUnique({ where: { id } });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error('[API] GET /api/services/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/services/[id]
 * Update status, capabilities, config, displayName.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = await db.serviceConnection.findUnique({ where: { id } });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      const validStatuses = ['connected', 'disconnected', 'error', 'pending'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 },
        );
      }
      updateData.status = body.status;
      if (body.status === 'connected') {
        updateData.lastActivity = new Date();
      }
    }

    if (body.capabilities !== undefined) {
      updateData.capabilities = JSON.stringify(body.capabilities);
    }

    if (body.config !== undefined) {
      updateData.config = JSON.stringify(body.config);
    }

    if (body.displayName !== undefined) {
      updateData.displayName = body.displayName.trim();
    }

    const updated = await db.serviceConnection.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ service: updated });
  } catch (error) {
    console.error('[API] PATCH /api/services/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update service', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/services/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const service = await db.serviceConnection.findUnique({ where: { id } });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await db.serviceConnection.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('[API] DELETE /api/services/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete service', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
