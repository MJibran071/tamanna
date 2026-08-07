import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';
import WebSearchAgent from './web-search';
import WebReaderAgent from './web-reader';

const RESEARCH_SYNTHESIS_PROMPT = `You are a research synthesis expert. Your job is to take multiple sources of information and produce a coherent, well-structured research summary.

Guidelines:
1. **Synthesize, don't just list** — Combine information from multiple sources into a unified narrative.
2. **Cite sources** — Reference which source each piece of information comes from using [Source N] notation.
3. **Identify consensus and disagreement** — Note where sources agree and where they conflict.
4. **Highlight key findings** — Start with the most important discoveries.
5. **Note gaps** — Identify what's still unknown or needs further research.
6. **Be objective** — Present facts, not opinions.
7. **Structure clearly** — Use headings and subheadings for organization.

Produce a comprehensive yet readable research summary.`;

type ResearchDepth = 'quick' | 'standard' | 'deep';

interface DepthConfig {
  searchResults: number;
  pagesToRead: number;
  recencyDays: number;
}

const DEPTH_CONFIGS: Record<ResearchDepth, DepthConfig> = {
  quick:    { searchResults: 5,  pagesToRead: 1, recencyDays: 30 },
  standard: { searchResults: 8,  pagesToRead: 3, recencyDays: 14 },
  deep:     { searchResults: 12, pagesToRead: 5, recencyDays: 365 },
};

export default class ResearchAgent implements SubAgent {
  name = 'research';
  description = 'Composite research agent that searches the web, reads top results, and synthesizes a comprehensive research summary. Supports quick, standard, and deep research depth levels.';

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const topic: string = input?.topic || '';
    const depth: ResearchDepth = ['quick', 'standard', 'deep'].includes(input?.depth)
      ? (input.depth as ResearchDepth)
      : 'standard';

    if (!topic.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No research topic provided.',
        metadata: { duration_ms: Date.now() - startTime, agent: this.name },
        error: 'MISSING_TOPIC',
      };
      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'MISSING_TOPIC',
      });
      return result;
    }

    try {
      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const config = DEPTH_CONFIGS[depth];
      const searchAgent = new WebSearchAgent();
      const readerAgent = new WebReaderAgent();

      // Step 1: Search the web
      const searchResult = await searchAgent.execute(
        { query: topic, num: config.searchResults, recency_days: config.recencyDays },
        context,
      );

      if (!searchResult.success) {
        const durationMs = Date.now() - startTime;
        const result: SubAgentResult = {
          success: false,
          response: `Research search failed: ${searchResult.error || 'unknown error'}`,
          metadata: { duration_ms: durationMs, agent: this.name, phase: 'search' },
          error: searchResult.error || 'SEARCH_FAILED',
        };
        context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: false, input, output: result, durationMs, error: result.error });
        return result;
      }

      // Extract links from search results
      const links: string[] = searchResult.artifacts?.links || [];

      if (links.length === 0) {
        const durationMs = Date.now() - startTime;
        const result: SubAgentResult = {
          success: false,
          response: `No usable links found for topic: "${topic}". Try rephrasing your research topic.`,
          metadata: { duration_ms: durationMs, agent: this.name, phase: 'search' },
          error: 'NO_RESULTS',
        };
        context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: false, input, output: result, durationMs, error: 'NO_RESULTS' });
        return result;
      }

      // Step 2: Read top pages
      const pagesToReadCount = Math.min(config.pagesToRead, links.length);
      const pageContents: { url: string; title: string; content: string }[] = [];
      const readErrors: string[] = [];

      for (let i = 0; i < pagesToReadCount; i++) {
        if (context.abortSignal?.aborted) throw new Error('ABORTED');

        try {
          const readerResult = await readerAgent.execute({ url: links[i] }, context);

          if (readerResult.success) {
            pageContents.push({
              url: links[i],
              title: readerResult.artifacts?.title || links[i],
              content: readerResult.response,
            });
          } else {
            readErrors.push(`Source ${i + 1} (${links[i]}): ${readerResult.error || 'read failed'}`);
          }
        } catch (err: any) {
          readErrors.push(`Source ${i + 1} (${links[i]}): ${err?.message || 'error'}`);
        }
      }

      if (pageContents.length === 0) {
        const durationMs = Date.now() - startTime;
        const errorDetail = readErrors.length > 0 ? ` Errors: ${readErrors.join('; ')}` : '';
        const result: SubAgentResult = {
          success: false,
          response: `Could not read any of the search results for "${topic}".${errorDetail}`,
          metadata: { duration_ms: durationMs, agent: this.name, phase: 'read' },
          error: 'ALL_READS_FAILED',
        };
        context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: false, input, output: result, durationMs, error: 'ALL_READS_FAILED' });
        return result;
      }

      // Step 3: Synthesize using LLM
      if (context.abortSignal?.aborted) throw new Error('ABORTED');
      const zai = await getZAI();
      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const sourceSections = pageContents.map((page, idx) => {
        return `--- Source ${idx + 1}: ${page.title} ---\nURL: ${page.url}\n${page.content}\n`;
      }).join('\n');

      const synthesisUserMessage = `Research Topic: "${topic}"
Research Depth: ${depth}
Number of Sources: ${pageContents.length}

${sourceSections}

Please synthesize these sources into a comprehensive research summary on "${topic}".`;

      const completion = await zai.chat.completions.create({
        model: 'default',
        messages: [
          { role: 'system', content: RESEARCH_SYNTHESIS_PROMPT },
          { role: 'user', content: synthesisUserMessage },
        ],
      });

      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const synthesis = completion?.choices?.[0]?.message?.content
        || completion?.content
        || 'Research synthesis completed but no result was generated.';

      const sourceList = pageContents
        .map((p, i) => `${i + 1}. ${p.title} -- ${p.url}`)
        .join('\n');

      const fullResponse = `${synthesis}\n\n---\n\n**Sources:**\n${sourceList}`;

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: fullResponse,
        artifacts: {
          topic,
          depth,
          searchResults: links.length,
          pagesRead: pageContents.length,
          readErrors,
          sourceUrls: pageContents.map(p => p.url),
        },
        metadata: { duration_ms: durationMs, agent: this.name },
      };

      context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: true, input, output: result, durationMs });
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      const isAborted = errorMsg === 'ABORTED';
      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: false,
        response: isAborted ? 'Research was cancelled.' : `Research failed: ${errorMsg}`,
        metadata: { duration_ms: durationMs, agent: this.name },
        error: isAborted ? 'ABORTED' : errorMsg,
      };
      context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: false, input, output: result, durationMs, error: errorMsg });
      return result;
    }
  }
}

export { ResearchAgent };
