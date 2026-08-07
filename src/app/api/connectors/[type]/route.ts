import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getConfigSchema } from '@/lib/plugin-config-schemas';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const schema = getConfigSchema(type);
    if (!schema) {
      return NextResponse.json({ error: `Unknown connector type: ${type}` }, { status: 404 });
    }

    const plugin = await db.plugin.findFirst({
      where: { type, category: 'connector' },
    });

    return NextResponse.json({
      schema,
      plugin: plugin ? {
        id: plugin.id,
        name: plugin.name,
        type: plugin.type,
        category: plugin.category,
        config: plugin.config ? JSON.parse(plugin.config) : {},
        status: plugin.status,
        enabled: plugin.enabled,
        lastSyncAt: plugin.lastSyncAt?.toISOString() ?? null,
      } : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const body = await req.json();
    const { config, test: shouldTest, name, description } = body as {
      config: Record<string, unknown>;
      test?: boolean;
      name?: string;
      description?: string;
    };

    const schema = getConfigSchema(type);
    if (!schema) {
      return NextResponse.json({ error: `Unknown connector type: ${type}` }, { status: 404 });
    }

    const pluginName = name || schema.type;
    const pluginDesc = description || schema.fields.map((f) => f.label).join(', ');

    const existing = await db.plugin.findFirst({ where: { type, category: 'connector' } });

    let plugin;
    if (existing) {
      plugin = await db.plugin.update({
        where: { id: existing.id },
        data: {
          name: pluginName,
          description: pluginDesc,
          config: config ? JSON.stringify(config) : null,
          status: 'disconnected',
          enabled: true,
        },
      });
    } else {
      plugin = await db.plugin.create({
        data: {
          name: pluginName,
          description: pluginDesc,
          category: 'connector',
          type,
          config: config ? JSON.stringify(config) : null,
          status: 'disconnected',
          enabled: true,
        },
      });
    }

    let testResult: { success: boolean; message: string; latencyMs: number; details?: Record<string, unknown> } | null = null;
    if (shouldTest && config) {
      try {
        const testRes = await fetch('/api/plugins/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, category: 'connector', config }),
        });
        testResult = await testRes.json();

        if (testResult && testResult.success) {
          await db.plugin.update({ where: { id: plugin.id }, data: { status: 'connected', lastSyncAt: new Date() } });
        } else {
          await db.plugin.update({ where: { id: plugin.id }, data: { status: 'error' } });
        }
      } catch {
        testResult = { success: false, message: 'Test request failed', latencyMs: 0 };
      }
    }

    return NextResponse.json({
      id: plugin.id,
      name: plugin.name,
      type: plugin.type,
      category: plugin.category,
      config,
      status: plugin.status,
      enabled: plugin.enabled,
      testResult,
    }, { status: existing ? 200 : 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const { type } = await params;
    const existing = await db.plugin.findFirst({ where: { type, category: 'connector' } });
    if (!existing) {
      return NextResponse.json({ error: 'Connector not found' }, { status: 404 });
    }
    await db.plugin.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, deleted: type });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
