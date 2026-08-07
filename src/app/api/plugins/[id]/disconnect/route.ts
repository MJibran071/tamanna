import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/plugins/[id]/disconnect
 *
 * Disconnects a plugin:
 * - Sets status to "disconnected"
 * - Clears sensitive config fields (tokens, secrets, passwords)
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plugin = await db.plugin.findUnique({ where: { id } });
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    // Parse existing config and strip sensitive fields
    let cleanConfig: Record<string, unknown> | null = null;
    if (plugin.config) {
      try {
        const currentConfig = JSON.parse(plugin.config) as Record<string, unknown>;
        cleanConfig = stripSensitiveFields(currentConfig);
      } catch {
        cleanConfig = null;
      }
    }

    const updated = await db.plugin.update({
      where: { id },
      data: {
        status: 'disconnected',
        config: cleanConfig ? JSON.stringify(cleanConfig) : null,
        lastSyncAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      pluginId: updated.id,
      pluginType: updated.type,
      status: updated.status,
      message: `${updated.name} disconnected successfully`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Sensitive field key patterns to strip on disconnect */
const SENSITIVE_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /api_key/i,
  /access_token/i,
  /refresh_token/i,
  /client_secret/i,
  /credentials/i,
  /auth_token/i,
  /signing_secret/i,
];

function stripSensitiveFields(config: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
    if (isSensitive) {
      // Replace with a masked indicator but keep the key
      clean[key] = value ? '***REDACTED***' : null;
    } else {
      clean[key] = value;
    }
  }
  return clean;
}
