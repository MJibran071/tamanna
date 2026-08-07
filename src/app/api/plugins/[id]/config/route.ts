import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

/**
 * PUT /api/plugins/[id]/config
 *
 * Updates plugin configuration:
 * - Validates config against the plugin's configSchema from metadata
 * - Updates the config field on the plugin
 * - If all required fields are present, sets status to "connected"
 * - Otherwise sets status to "configured" (partially configured)
 */

const configPayloadSchema = z.object({
  config: z.record(z.unknown()).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plugin = await db.plugin.findUnique({ where: { id } });
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    const body = await req.json();
    const parsed = configPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const newConfig = parsed.data.config;
    if (!newConfig || Object.keys(newConfig).length === 0) {
      return NextResponse.json(
        { error: 'config object is required and must not be empty' },
        { status: 400 }
      );
    }

    // Merge with existing config
    let existingConfig: Record<string, unknown> = {};
    if (plugin.config) {
      try {
        existingConfig = JSON.parse(plugin.config) as Record<string, unknown>;
      } catch {
        existingConfig = {};
      }
    }

    const mergedConfig = { ...existingConfig, ...newConfig };

    // Validate required fields from metadata configSchema
    const metadata = plugin.metadata ? JSON.parse(plugin.metadata) : {};
    const configSchema: Array<{ key: string; label: string; type: string; required: boolean }> =
      metadata.configSchema ?? [];

    const validationErrors: string[] = [];
    const missingRequired: string[] = [];

    for (const field of configSchema) {
      if (field.required) {
        const value = mergedConfig[field.key];
        if (value === undefined || value === null || value === '') {
          missingRequired.push(field.label);
        }
      }
      // Basic type validation
      const value = mergedConfig[field.key];
      if (value !== undefined && value !== null) {
        if (field.type === 'number' && typeof value !== 'number') {
          validationErrors.push(`${field.label} must be a number`);
        }
        if (field.type === 'url' && typeof value === 'string' && !value.match(/^https?:\/\/.+/)) {
          validationErrors.push(`${field.label} must be a valid URL`);
        }
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // Determine status based on required fields
    const allRequiredPresent = missingRequired.length === 0;
    const newStatus = allRequiredPresent ? 'connected' : 'connecting';

    const updated = await db.plugin.update({
      where: { id },
      data: {
        config: JSON.stringify(mergedConfig),
        status: newStatus,
        lastSyncAt: allRequiredPresent ? new Date() : plugin.lastSyncAt,
      },
    });

    return NextResponse.json({
      success: true,
      pluginId: updated.id,
      pluginType: updated.type,
      status: updated.status,
      config: updated.config ? JSON.parse(updated.config) : null,
      missingRequiredFields: missingRequired.length > 0 ? missingRequired : undefined,
      message: allRequiredPresent
        ? `${updated.name} configured and connected successfully`
        : `${updated.name} partially configured. Missing: ${missingRequired.join(', ')}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
