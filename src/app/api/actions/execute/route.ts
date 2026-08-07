import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

type IntentResult = {
  actionType: string;
  searchQuery?: string;
  targetUrl?: string;
  recipient?: string;
  serviceType?: string;
  reminderTitle?: string;
  reminderDetails?: string;
  scheduledFor?: string;
  items?: string[];
  compareType?: string;
};

const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for an AI assistant called Tamanna. Given the user's command, classify it into EXACTLY ONE of these action types and extract parameters.

Action types:
- web_search: User wants to search the web for information
- web_browse: User provides a URL and wants to read/browse its content
- send_message: User wants to send a message to someone (via WhatsApp, Telegram, Email, Discord, etc.)
- create_reminder: User wants to set a reminder, alarm, or schedule something
- book_service: User wants to book a service (appointment, table, ticket, etc.)
- compare_prices: User wants to compare prices or options for multiple items
- general_chat: General conversation, questions, or anything not covered above

Respond with ONLY valid JSON (no markdown, no backticks). Example:
{"actionType": "web_search", "searchQuery": "best laptops 2025"}
{"actionType": "web_browse", "targetUrl": "https://example.com/article"}
{"actionType": "send_message", "recipient": "Mom", "serviceType": "whatsapp"}
{"actionType": "create_reminder", "reminderTitle": "Team meeting", "scheduledFor": "2025-01-20T10:00:00Z"}
{"actionType": "book_service", "serviceType": "restaurant", "searchQuery": "Italian restaurant near me"}
{"actionType": "compare_prices", "items": ["iPhone 16", "Samsung Galaxy S25"], "compareType": "prices"}
{"actionType": "general_chat"}

Important:
- For create_reminder, parse natural language dates into ISO 8601 format (use current time context if relative). If no time specified, set 1 hour from now.
- For send_message, extract recipient name and optionally which service/platform.
- For compare_prices, extract the list of items being compared.
- For web_browse, extract the URL from the command.
- For web_search, extract the search query.
- Default to general_chat if unsure.

Current time context: ${new Date().toISOString()}`;

async function classifyIntent(command: string): Promise<IntentResult> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: 'assistant', content: INTENT_CLASSIFICATION_PROMPT },
      { role: 'user', content: command },
    ],
    thinking: { type: 'disabled' },
  });

  const raw = completion.choices[0].message.content.trim();
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleaned) as IntentResult;
  return parsed;
}

async function handleWebSearch(searchQuery: string): Promise<{ results: unknown[]; summary: string }> {
  const zai = await ZAI.create();
  const raw = await zai.functions.invoke('web_search', { query: searchQuery, num: 8 });
  // web_search returns an array directly
  const results = Array.isArray(raw) ? raw : (raw as any).data?.results || [raw];

  // Generate a summary of results using LLM
  const topResults = results.slice(0, 5).map((r: any) => ({
    title: r.name || r.title,
    snippet: r.snippet || r.description,
    url: r.url,
  }));
  const resultText = JSON.stringify(topResults, null, 2);
  const summaryCompletion = await zai.chat.completions.create({
    messages: [
      {
        role: 'assistant',
        content: 'You are a helpful assistant. Summarize the following web search results in 2-3 concise sentences. Focus on the most relevant findings.',
      },
      { role: 'user', content: `Search query: "${searchQuery}"\n\nResults:\n${resultText}` },
    ],
    thinking: { type: 'disabled' },
  });

  return {
    results,
    summary: summaryCompletion.choices[0].message.content.trim(),
  };
}

async function handleWebBrowse(targetUrl: string): Promise<{ title: string; content: string; url: string; summary: string }> {
  const zai = await ZAI.create();
  const result = await zai.functions.invoke('page_reader', { url: targetUrl });

  const title = result.data?.title || 'Untitled';
  const html = result.data?.html || '';
  const url = result.data?.url || targetUrl;
  const publishedTime = result.data?.publishedTime || '';

  // Summarize the page content
  const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 4000);
  const summaryCompletion = await zai.chat.completions.create({
    messages: [
      {
        role: 'assistant',
        content: 'You are a helpful assistant. Summarize the following web page content in 3-4 concise sentences. Focus on the key information.',
      },
      { role: 'user', content: `Page: "${title}" (${url})${publishedTime ? ` - Published: ${publishedTime}` : ''}\n\nContent:\n${textContent}` },
    ],
    thinking: { type: 'disabled' },
  });

  return {
    title,
    content: textContent,
    url,
    summary: summaryCompletion.choices[0].message.content.trim(),
  };
}

async function handleComparePrices(items: string[], compareType: string): Promise<{ items: string[]; comparisons: unknown[]; summary: string }> {
  const zai = await ZAI.create();
  const comparisons: unknown[] = [];

  for (const item of items) {
    const query = compareType === 'reviews'
      ? `${item} reviews and ratings 2025`
      : `${item} price comparison best deal 2025`;
    const raw = await zai.functions.invoke('web_search', { query, num: 5 });
    const searchRes = Array.isArray(raw) ? raw : (raw as any).data?.results || [raw];
    comparisons.push({ item, results: searchRes });
  }

  // LLM comparison summary
  const compText = JSON.stringify(comparisons, null, 2);
  const summaryCompletion = await zai.chat.completions.create({
    messages: [
      {
        role: 'assistant',
        content: `You are a helpful assistant. Compare the following items based on ${compareType || 'general'} information. Provide a concise comparison highlighting key differences, pros/cons, and a recommendation.`,
      },
      { role: 'user', content: `Items to compare: ${items.join(', ')}\n\nData:\n${compText}` },
    ],
    thinking: { type: 'disabled' },
  });

  return {
    items,
    comparisons,
    summary: summaryCompletion.choices[0].message.content.trim(),
  };
}

async function handleCreateReminder(data: {
  reminderTitle?: string;
  reminderDetails?: string;
  scheduledFor?: string;
}): Promise<{ reminder: unknown; summary: string }> {
  const title = data.reminderTitle || 'Reminder';
  const scheduledFor = data.scheduledFor
    ? new Date(data.scheduledFor)
    : new Date(Date.now() + 60 * 60 * 1000); // Default: 1 hour from now

  const reminder = await db.reminder.create({
    data: {
      title,
      description: data.reminderDetails || null,
      scheduledFor,
      category: 'general',
      priority: 'medium',
    },
  });

  return {
    reminder,
    summary: `Reminder set: "${title}" at ${scheduledFor.toISOString()}`,
  };
}

function handleSendMessage(data: { recipient?: string; serviceType?: string }): { status: string; summary: string } {
  const recipient = data.recipient || 'Unknown';
  const service = data.serviceType || 'default';
  return {
    status: 'would_send',
    summary: `Would send message to ${recipient} via ${service}. (Real messaging integration coming soon.)`,
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { command } = body;

    if (!command?.trim()) {
      return NextResponse.json({ error: 'Command is required' }, { status: 400 });
    }

    // Step 1: Classify intent
    const intent = await classifyIntent(command.trim());
    const actionType = intent.actionType;

    // Step 2: Execute the appropriate handler
    let result: unknown;
    let summary = '';
    let status = 'completed';
    let sourceUrl: string | null = null;
    let error: string | null = null;

    try {
      switch (actionType) {
        case 'web_search': {
          const res = await handleWebSearch(intent.searchQuery || command);
          result = res;
          summary = res.summary;
          break;
        }
        case 'web_browse': {
          const url = intent.targetUrl || command;
          sourceUrl = url;
          const res = await handleWebBrowse(url);
          result = res;
          summary = res.summary;
          break;
        }
        case 'send_message': {
          const msgResult = handleSendMessage({ recipient: intent.recipient, serviceType: intent.serviceType });
          result = msgResult;
          summary = msgResult.summary;
          break;
        }
        case 'create_reminder': {
          const res = await handleCreateReminder({
            reminderTitle: intent.reminderTitle,
            reminderDetails: intent.reminderDetails,
            scheduledFor: intent.scheduledFor,
          });
          result = res;
          summary = res.summary;
          break;
        }
        case 'book_service': {
          const bookResult = {
            actionType: 'book_service',
            serviceType: intent.serviceType,
            searchQuery: intent.searchQuery,
            status: 'would_book' as const,
          };
          result = bookResult;
          summary = `Would book ${intent.serviceType || 'service'}. (Real booking integration coming soon.)`;
          break;
        }
        case 'compare_prices': {
          const items = intent.items?.length ? intent.items : [command];
          const res = await handleComparePrices(items, intent.compareType || 'prices');
          result = res;
          summary = res.summary;
          break;
        }
        case 'general_chat':
        default: {
          result = { actionType: 'general_chat' };
          summary = 'General chat - handled by normal conversation flow';
          break;
        }
      }
    } catch (handlerError) {
      status = 'failed';
      error = handlerError instanceof Error ? handlerError.message : String(handlerError);
      summary = `Action failed: ${error}`;
      result = { error };
    }

    const durationMs = Date.now() - startTime;

    // Step 3: Log the action
    const actionLog = await db.actionLog.create({
      data: {
        actionType,
        command: command.trim(),
        intent: actionType,
        status,
        resultJson: JSON.stringify(result),
        summary,
        sourceUrl: sourceUrl || undefined,
        durationMs,
        error: error || undefined,
        completedAt: new Date(),
      },
    });

    // Step 4: Return structured result
    return NextResponse.json({
      actionType,
      status,
      result,
      summary,
      actionLogId: actionLog.id,
      durationMs,
    });
  } catch (error) {
    console.error('[API] /api/actions/execute error:', error);
    return NextResponse.json(
      { error: 'Action execution failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
