import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

/**
 * POST /api/browser/compare
 * { items: string[], type: "prices" | "reviews" | "general" }
 * Multiple searches + LLM comparison.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, type = 'general' } = body;

    if (!items?.length || items.length < 2) {
      return NextResponse.json({ error: 'At least 2 items are required for comparison' }, { status: 400 });
    }

    const validTypes = ['prices', 'reviews', 'general'];
    const compareType = validTypes.includes(type) ? type : 'general';

    const zai = await ZAI.create();
    const comparisons: Array<{ item: string; query: string; results: unknown }> = [];

    // Search for each item
    for (const item of items) {
      let query: string;
      switch (compareType) {
        case 'prices':
          query = `${item} price comparison best deal 2025`;
          break;
        case 'reviews':
          query = `${item} reviews ratings 2025`;
          break;
        default:
          query = `${item} detailed information review 2025`;
          break;
      }

      const raw = await zai.functions.invoke('web_search', { query, num: 5 });
      const searchResults = Array.isArray(raw) ? raw : [raw];
      comparisons.push({
        item,
        query,
        results: searchResults,
      });
    }

    // LLM comparison
    const compText = JSON.stringify(comparisons, null, 2);
    const comparisonCompletion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are an expert analyst. Compare the following items based on ${compareType}. Provide a structured comparison with:
1. A brief overview of each item
2. Key differences highlighted
3. Pros and cons for each
4. A clear recommendation

Be concise but thorough.`,
        },
        { role: 'user', content: `Items to compare: ${items.join(' vs ')}\n\nComparison type: ${compareType}\n\nData:\n${compText}` },
      ],
      thinking: { type: 'disabled' },
    });

    const summary = comparisonCompletion.choices[0].message.content.trim();

    return NextResponse.json({
      items,
      compareType,
      comparisons,
      summary,
    });
  } catch (error) {
    console.error('[API] POST /api/browser/compare error:', error);
    return NextResponse.json(
      { error: 'Comparison failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
