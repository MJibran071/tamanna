import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const VALID_SERVICE_TYPES = [
  'whatsapp', 'telegram', 'email', 'discord', 'slack', 'twitter', 'instagram', 'custom',
];

/**
 * GET /api/services
 * List all service connections. Optional ?status= filter.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const services = await db.serviceConnection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('[API] GET /api/services error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/services
 * Create a new service connection.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceType, displayName, config, capabilities } = body;

    if (!serviceType || !displayName?.trim()) {
      return NextResponse.json({ error: 'serviceType and displayName are required' }, { status: 400 });
    }

    if (!VALID_SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json(
        { error: `Invalid serviceType. Must be one of: ${VALID_SERVICE_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    // Check for duplicate serviceType
    const existing = await db.serviceConnection.findUnique({ where: { serviceType } });
    if (existing) {
      return NextResponse.json(
        { error: `Service connection for '${serviceType}' already exists` },
        { status: 409 },
      );
    }

    const service = await db.serviceConnection.create({
      data: {
        serviceType,
        displayName: displayName.trim(),
        config: config ? JSON.stringify(config) : null,
        capabilities: capabilities ? JSON.stringify(capabilities) : '[]',
        status: 'disconnected',
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/services error:', error);
    return NextResponse.json(
      { error: 'Failed to create service', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
