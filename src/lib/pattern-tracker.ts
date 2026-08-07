import { db } from '@/lib/db';

type PatternEventType =
  | 'chat_topic'
  | 'tool_used'
  | 'query_type'
  | 'time_activity'
  | 'feature_used';

/**
 * Track a user behavioral pattern — async, non-blocking, never throws.
 *
 * @example
 * await trackPattern('chat_topic', 'topic_nextjs', 'User asked about Next.js');
 * await trackPattern('tool_used', 'tool_image_generation');
 * await trackPattern('feature_used', 'autonomous_mode');
 */
export async function trackPattern(
  patternType: PatternEventType,
  key: string,
  value?: string | null,
  weight: number = 1.0,
): Promise<void> {
  try {
    await db.userPattern.upsert({
      where: {
        patternType_key: {
          patternType,
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
        patternType,
        key,
        value: value ?? null,
        weight,
        confidence: 0.5,
        frequency: 1,
      },
    });

    // Cap confidence at 0.99 — run as a best-effort follow-up so the upsert
    // above always succeeds even if this extra query fails.
    try {
      await db.userPattern.updateMany({
        where: {
          patternType,
          key,
          confidence: { gt: 0.99 },
        },
        data: {
          confidence: 0.99,
        },
      });
    } catch {
      // silently ignore — confidence cap is non-critical
    }
  } catch {
    // Non-blocking: never propagate errors to the caller
  }
}
