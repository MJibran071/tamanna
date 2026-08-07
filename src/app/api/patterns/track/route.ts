import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export type PatternEventType =
  | 'chat_topic'
  | 'tool_used'
  | 'query_type'
  | 'time_activity'
  | 'feature_used';

interface TrackPatternBody {
  eventType: PatternEventType;
  key: string;
  value?: string | null;
  weight?: number;
}

const VALID_EVENT_TYPES = new Set<string>([
  'chat_topic',
  'tool_used',
  'query_type',
  'time_activity',
  'feature_used',
]);

export async function POST(request: NextRequest) {
  try {
    const body: TrackPatternBody = await request.json();
    const { eventType, key, value, weight = 1.0 } = body;

    // --- Validate ---
    if (!eventType || !VALID_EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing eventType' },
        { status: 400 },
      );
    }

    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing key' },
        { status: 400 },
      );
    }

    if (typeof weight !== 'number' || weight < 0) {
      return NextResponse.json(
        { success: false, error: 'weight must be a non-negative number' },
        { status: 400 },
      );
    }

    // --- Upsert ---
    const pattern = await db.userPattern.upsert({
      where: {
        patternType_key: {
          patternType: eventType,
          key,
        },
      },
      update: {
        frequency: {
          increment: 1,
        },
        confidence: {
          increment: 0.05,
        },
        lastSeen: new Date(),
        ...(value !== undefined && value !== null ? { value } : {}),
      },
      create: {
        patternType: eventType,
        key,
        value: value ?? null,
        weight,
        confidence: 0.5,
        frequency: 1,
      },
    });

    // Cap confidence at 0.99
    const capped = pattern.confidence > 0.99;
    if (capped) {
      await db.userPattern.update({
        where: { id: pattern.id },
        data: { confidence: 0.99 },
      });
    }

    return NextResponse.json({
      success: true,
      pattern: {
        id: pattern.id,
        patternType: pattern.patternType,
        key: pattern.key,
        frequency: pattern.frequency,
        confidence: capped ? 0.99 : pattern.confidence,
        lastSeen: pattern.lastSeen,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
