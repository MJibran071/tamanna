import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plugin = await db.plugin.findUnique({ where: { id } });
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }
    return NextResponse.json({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      category: plugin.category,
      type: plugin.type,
      config: plugin.config ? JSON.parse(plugin.config) : null,
      status: plugin.status,
      enabled: plugin.enabled,
      lastSyncAt: plugin.lastSyncAt?.toISOString() ?? null,
      metadata: plugin.metadata ? JSON.parse(plugin.metadata) : null,
      createdAt: plugin.createdAt.toISOString(),
      updatedAt: plugin.updatedAt.toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const existing = await db.plugin.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.config !== undefined) data.config = JSON.stringify(body.config);
    if (body.metadata !== undefined) data.metadata = JSON.stringify(body.metadata);
    if (body.status !== undefined && ['connected', 'disconnected', 'error', 'connecting'].includes(body.status)) {
      data.status = body.status;
      if (body.status === 'connected') data.lastSyncAt = new Date();
    }
    if (body.enabled !== undefined) data.enabled = Boolean(body.enabled);
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const plugin = await db.plugin.update({ where: { id }, data });
    return NextResponse.json({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      category: plugin.category,
      type: plugin.type,
      config: plugin.config ? JSON.parse(plugin.config) : null,
      status: plugin.status,
      enabled: plugin.enabled,
      lastSyncAt: plugin.lastSyncAt?.toISOString() ?? null,
      metadata: plugin.metadata ? JSON.parse(plugin.metadata) : null,
      updatedAt: plugin.updatedAt.toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.plugin.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }
    await db.plugin.delete({ where: { id } });
    return NextResponse.json({ success: true, deleted: id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
