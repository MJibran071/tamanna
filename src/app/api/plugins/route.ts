import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/** GET /api/plugins — list all plugins from DB, optionally filtered */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const enabled = searchParams.get('enabled');
    const search = searchParams.get('search');

    // Build where clause
    const where: Record<string, unknown> = {};

    if (category && category !== 'all' && ['connector', 'skill', 'data_source'].includes(category)) {
      where.category = category;
    }
    if (status && ['connected', 'disconnected', 'error', 'connecting'].includes(status)) {
      where.status = status;
    }
    if (enabled !== null && enabled !== undefined && enabled !== '') {
      where.enabled = enabled === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { type: { contains: search } },
      ];
    }

    const plugins = await db.plugin.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      total: plugins.length,
      plugins: plugins.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        type: p.type,
        config: p.config ? JSON.parse(p.config) : null,
        status: p.status,
        enabled: p.enabled,
        lastSyncAt: p.lastSyncAt?.toISOString() ?? null,
        metadata: p.metadata ? JSON.parse(p.metadata) : null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/plugins — create a new plugin */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, category, type, config, status, enabled, metadata } = body;

    if (!name?.trim() || !category || !type) {
      return NextResponse.json(
        { error: 'name, category, and type are required' },
        { status: 400 }
      );
    }

    if (!['connector', 'skill', 'data_source'].includes(category)) {
      return NextResponse.json(
        { error: 'category must be connector, skill, or data_source' },
        { status: 400 }
      );
    }

    // Check for type uniqueness
    const existing = await db.plugin.findUnique({ where: { type } });
    if (existing) {
      return NextResponse.json(
        { error: `Plugin with type "${type}" already exists (id: ${existing.id}). Use PUT /api/plugins/${existing.id}/config to update configuration.` },
        { status: 409 }
      );
    }

    const validStatuses = ['connected', 'disconnected', 'error', 'connecting'];
    const pluginStatus = status && validStatuses.includes(status) ? status : 'disconnected';

    const plugin = await db.plugin.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        category,
        type,
        config: config ? JSON.stringify(config) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        status: pluginStatus,
        enabled: enabled !== undefined ? Boolean(enabled) : true,
        lastSyncAt: pluginStatus === 'connected' ? new Date() : null,
      },
    });

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
    }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
