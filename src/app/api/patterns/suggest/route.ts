import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { createHash } from 'crypto';

// ─── Helpers ────────────────────────────────────────────────────────

/** Simple deterministic hash of title+action to use as a pseudo-id for dedup. */
function suggestionHash(title: string, action: string): string {
  return createHash('sha256').update(`${title}::${action}`).digest('hex').slice(0, 24);
}

interface RawSuggestion {
  title: string;
  description: string;
  actionType: string;
  triggerPatternKey?: string;
  relevanceScore?: number;
  urgencyScore?: number;
  actionData?: Record<string, unknown>;
}

// ─── GET /api/patterns/suggest ─────────────────────────────────────
// Returns existing proactive suggestions from DB (unchanged)

export async function GET() {
  try {
    const now = new Date();

    // Get active, valid suggestions sorted by relevance
    const suggestions = await db.proactiveSuggestion.findMany({
      where: {
        status: 'active',
        shownCount: { lt: 5 }, // Don't show suggestions too many times
        OR: [
          { validUntil: null },
          { validUntil: { gt: now } },
        ],
        validFrom: { lte: now },
      },
      include: {
        triggerPattern: {
          select: { patternType: true, key: true, frequency: true },
        },
      },
      orderBy: [{ relevanceScore: 'desc' }, { urgencyScore: 'desc' }],
      take: 10,
    });

    // Increment shownCount for each suggestion
    const ids = suggestions.map((s) => s.id);
    if (ids.length > 0) {
      await db.proactiveSuggestion.updateMany({
        where: { id: { in: ids } },
        data: { shownCount: { increment: 1 } },
      });
    }

    return NextResponse.json(
      suggestions.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        action: s.action,
        actionData: s.actionData,
        relevanceScore: s.relevanceScore,
        urgencyScore: s.urgencyScore,
        triggerPattern: s.triggerPattern,
        validFrom: s.validFrom.toISOString(),
        validUntil: s.validUntil?.toISOString() ?? null,
      }))
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST /api/patterns/suggest ────────────────────────────────────
// Generates new proactive suggestions via LLM based on top patterns

export async function POST() {
  try {
    // 1. Fetch the top 10 most frequent patterns
    const topPatterns = await db.userPattern.findMany({
      orderBy: { frequency: 'desc' },
      take: 10,
    });

    if (topPatterns.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message: 'No patterns found to generate suggestions from.',
      });
    }

    // 2. Build the patterns summary for the LLM prompt
    const patternsSummary = topPatterns
      .map(
        (p, i) =>
          `${i + 1}. [${p.patternType}] key="${p.key}" frequency=${p.frequency} confidence=${p.confidence}${p.value ? ` value="${p.value}"` : ''}${p.metadata ? ` metadata=${p.metadata}` : ''}`
      )
      .join('\n');

    const systemPrompt =
      'You are an AI assistant analyzing user behavior patterns. Based on these patterns, suggest 3-5 proactive actions the user might want to take. Return as JSON array.';

    const userPrompt = `Here are the user's top behavior patterns (sorted by frequency):

${patternsSummary}

For each suggestion, provide a JSON object with these fields:
- "title": A short, actionable title (e.g., "Schedule Weekly Review")
- "description": A 1-2 sentence explanation of why this suggestion is relevant
- "actionType": The type of action (e.g., "navigate", "create_reminder", "start_workflow", "configure", "explore")
- "triggerPatternKey": The key of the pattern from the list above that most triggered this suggestion
- "relevanceScore": A number from 0.0 to 1.0 indicating how relevant this is
- "urgencyScore": A number from 0.0 to 1.0 indicating how urgent this is
- "actionData": An optional object with any extra data needed for the action (e.g., {"target": "some value"})

Respond ONLY with a valid JSON array. No markdown, no explanation, just the JSON array.`;

    // 3. Call the LLM
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      model: 'default',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });

    const rawContent = completion?.choices?.[0]?.message?.content || completion?.content || '';

    // 4. Parse the LLM response — strip markdown code fences if present
    const jsonStr = rawContent
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim();

    let rawSuggestions: RawSuggestion[];
    try {
      rawSuggestions = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse LLM response as JSON.', raw: rawContent.slice(0, 500) },
        { status: 502 }
      );
    }

    if (!Array.isArray(rawSuggestions) || rawSuggestions.length === 0) {
      return NextResponse.json(
        { error: 'LLM did not return a non-empty JSON array.', raw: rawContent.slice(0, 500) },
        { status: 502 }
      );
    }

    // 5. Upsert each suggestion into the DB
    const now = new Date();
    const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Build a lookup from pattern key → pattern id for trigger linking
    const patternKeyToId = new Map<string, string>();
    for (const p of topPatterns) {
      patternKeyToId.set(p.key, p.id);
    }

    const createdSuggestions: Array<{
      id: string;
      title: string;
      description: string;
      action: string;
      relevanceScore: number;
      urgencyScore: number;
      triggerPatternId: string | null;
      validFrom: string;
      validUntil: string;
    }> = [];

    for (const raw of rawSuggestions) {
      const title = String(raw.title ?? '').trim();
      const action = String(raw.actionType ?? raw.action ?? '').trim();

      if (!title || !action) continue; // skip invalid entries

      const hash = suggestionHash(title, action);
      const triggerPatternId = raw.triggerPatternKey
        ? (patternKeyToId.get(raw.triggerPatternKey) ?? null)
        : null;

      const upserted = await db.proactiveSuggestion.upsert({
        where: { id: hash },
        create: {
          id: hash,
          title,
          description: String(raw.description ?? ''),
          action,
          actionData: raw.actionData ? JSON.stringify(raw.actionData) : null,
          relevanceScore: Number(raw.relevanceScore) || 0.5,
          urgencyScore: Number(raw.urgencyScore) || 0.3,
          triggerPatternId,
          status: 'active',
          shownCount: 0,
          validFrom: now,
          validUntil,
        },
        update: {
          title,
          description: String(raw.description ?? ''),
          action,
          actionData: raw.actionData ? JSON.stringify(raw.actionData) : undefined,
          relevanceScore: Number(raw.relevanceScore) || 0.5,
          urgencyScore: Number(raw.urgencyScore) || 0.3,
          triggerPatternId,
          status: 'active',
          shownCount: 0, // reset shown count on refresh
          validFrom: now,
          validUntil,
        },
      });

      createdSuggestions.push({
        id: upserted.id,
        title: upserted.title,
        description: upserted.description,
        action: upserted.action,
        relevanceScore: upserted.relevanceScore,
        urgencyScore: upserted.urgencyScore,
        triggerPatternId: upserted.triggerPatternId,
        validFrom: upserted.validFrom.toISOString(),
        validUntil: upserted.validUntil?.toISOString() ?? null,
      });
    }

    return NextResponse.json({
      suggestions: createdSuggestions,
      generatedFromPatternCount: topPatterns.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/patterns/suggest] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
