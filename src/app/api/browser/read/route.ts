import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

/**
 * POST /api/browser/read
 * { url: string }
 * Uses page_reader SDK, returns page content + LLM summary.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url?.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const zai = await ZAI.create();
    const result = await zai.functions.invoke('page_reader', { url: url.trim() });

    const title = result.data?.title || 'Untitled';
    const html = result.data?.html || '';
    const pageUrl = result.data?.url || url.trim();
    const publishedTime = result.data?.publishedTime || '';

    // Strip HTML tags for text content
    const textContent = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000);

    // LLM summary
    const summaryCompletion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: 'You are a helpful research assistant. Summarize the following web page content in 3-4 concise sentences. Highlight key facts, figures, and takeaways.',
        },
        {
          role: 'user',
          content: `Page: "${title}" (${pageUrl})${publishedTime ? ` - Published: ${publishedTime}` : ''}\n\nContent:\n${textContent}`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const summary = summaryCompletion.choices[0].message.content.trim();

    return NextResponse.json({
      url: pageUrl,
      title,
      publishedTime: publishedTime || null,
      content: textContent,
      summary,
    });
  } catch (error) {
    console.error('[API] POST /api/browser/read error:', error);
    return NextResponse.json(
      { error: 'Failed to read page', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
