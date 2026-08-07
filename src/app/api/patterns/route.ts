import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_TYPES = ['frequent_topic', 'time_preference', 'tool_usage', 'query_pattern', 'workflow'];

function serializePattern(p: Record<string, unknown>) {
  return {
    ...p,
    lastSeen: (p.lastSeen as Date).toISOString(),
    createdAt: (p.createdAt as Date).toISOString(),
    updatedAt: (p.updatedAt as Date).toISOString(),
    expiresAt: (p.expiresAt as Date | null)?.toISOString() ?? null,
  };
}

/** GET /api/patterns — list user patterns, optional ?type= filter */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const where = type ? { patternType: type as string } : {};

    const patterns = await db.userPattern.findMany({
      where,
      orderBy: { frequency: 'desc' },
    });

    return NextResponse.json(patterns.map(serializePattern));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST /api/patterns — record a new pattern observation (upsert) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patternType, key, value, metadata, tags, weight } = body;

    if (!patternType || !VALID_TYPES.includes(patternType)) {
      return NextResponse.json(
        { error: `patternType is required and must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!key?.trim()) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    // Upsert: if pattern exists, increment frequency and update confidence
    const existing = await db.userPattern.findUnique({
      where: { patternType_key: { patternType, key: key.trim() } },
    });

    if (existing) {
      const newFrequency = existing.frequency + 1;
      // Confidence increases with frequency, caps at 0.99
      const newConfidence = Math.min(0.99, existing.confidence + 0.05);

      const updated = await db.userPattern.update({
        where: { id: existing.id },
        data: {
          frequency: newFrequency,
          lastSeen: new Date(),
          confidence: newConfidence,
          value: value !== undefined ? value : existing.value,
          metadata: metadata !== undefined ? metadata : existing.metadata,
          tags: tags ? JSON.stringify(tags) : existing.tags,
          weight: weight !== undefined ? weight : existing.weight,
        },
      });

      return NextResponse.json(serializePattern(updated as unknown as Record<string, unknown>));
    }

    const pattern = await db.userPattern.create({
      data: {
        patternType,
        key: key.trim(),
        value: value || null,
        metadata: metadata || null,
        tags: tags ? JSON.stringify(tags) : '[]',
        weight: weight || 1.0,
        confidence: 0.5,
      },
    });

    return NextResponse.json(serializePattern(pattern as unknown as Record<string, unknown>), { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
