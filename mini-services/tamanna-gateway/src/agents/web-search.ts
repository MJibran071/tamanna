import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

export default class WebSearchAgent implements SubAgent {
  name = 'web_search';
  description = 'Searches the web for up-to-date information using web search. Returns a formatted summary of search results with source links.';

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const query: string = input?.query || '';
    const num: number = input?.num ?? 8;
    const recencyDays: number = input?.recency_days ?? 7;

    if (!query.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No search query provided. Please provide a query to search for.',
        metadata: { duration_ms: Date.now() - startTime, agent: this.name },
        error: 'MISSING_QUERY',
      };
      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'MISSING_QUERY',
      });
      return result;
    }

    try {
      if (context.abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      const zai = await getZAI();

      if (context.abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      const searchResult = await zai.functions.invoke('web_search', {
        query,
        num,
        recency_days: recencyDays,
      });

      if (context.abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      const links: string[] = [];
      let summary = '';

      if (searchResult && Array.isArray(searchResult.results)) {
        const results = searchResult.results;
        const parts: string[] = ["Here are the top results for \"${query}\":\n"];

        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const title = r.title || 'Untitled';
          const snippet = r.snippet || r.description || '';
          const url = r.url || r.link || '';

          parts.push(`${i + 1}. **${title}**\n`);
          if (snippet) {
            parts.push(`   ${snippet}\n`);
          }
          if (url) {
            parts.push(`   Link: ${url}\n`);
            links.push(url);
          }
          parts.push('');
        }

        summary = parts.join('\n');
      } else if (typeof searchResult === 'string') {
        summary = searchResult;
      } else if (searchResult) {
        summary = JSON.stringify(searchResult, null, 2);
      } else {
        summary = `No results found for "${query}".`;
      }

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: summary,
        artifacts: { links, query, num_results: links.length },
        metadata: { duration_ms: durationMs, agent: this.name },
      };

      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: true, input, output: result, durationMs,
      });

      return result;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const isAborted = errorMsg === 'ABORTED';
      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: false,
        response: isAborted ? 'Search was cancelled.' : `Search failed: ${errorMsg}`,
        metadata: { duration_ms: durationMs, agent: this.name },
        error: isAborted ? 'ABORTED' : errorMsg,
      };

      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs, error: errorMsg,
      });

      return result;
    }
  }
}

export { WebSearchAgent };
