import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

/**
 * POST /api/browser/search
 * { query: string, num?: number }
 * Uses web_search SDK, returns results + LLM summary.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, num = 8 } = body;

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const zai = await ZAI.create();
    const raw = await zai.functions.invoke('web_search', { query: query.trim(), num });
    // web_search returns an array directly
    const results = Array.isArray(raw) ? raw : (raw as Record<string, unknown>).data
      ? ((raw as Record<string, unknown>).data as Record<string, unknown>).results as unknown[]
      : [raw];

    // Generate LLM summary of the top results
    const topResults = results.slice(0, 5);
    const resultText = JSON.stringify(topResults, null, 2);

    const summaryCompletion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: 'You are a helpful research assistant. Summarize the following web search results in 2-3 concise, informative sentences. Focus on the most relevant and actionable findings.',
        },
        { role: 'user', content: `Search query: "${query.trim()}"\n\nResults:\n${resultText}` },
      ],
      thinking: { type: 'disabled' },
    });

    const summary = summaryCompletion.choices[0].message.content.trim();

    return NextResponse.json({
      query: query.trim(),
      results: topResults,
      summary,
      totalResults: results.length,
    });
  } catch (error) {
    console.error('[API] POST /api/browser/search error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
