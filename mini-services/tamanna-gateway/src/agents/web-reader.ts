import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

export default class WebReaderAgent implements SubAgent {
  name = 'web_reader';
  description = 'Reads and extracts clean text content from a web page URL. Strips HTML tags and returns readable text, truncated to 4000 characters.';

  private static stripHtml(html: string): string {
    let text = html;
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
    text = text.replace(/<\/(p|div|br|h[1-6]|li|tr|blockquote|pre|hr)[^>]*>/gi, '\n');
    text = text.replace(/<li[^>]*>/gi, '- ');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    return text;
  }

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const url: string = input?.url || '';
    const maxLength: number = input?.maxLength ?? 4000;

    if (!url.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No URL provided. Please provide a valid URL to read.',
        metadata: { duration_ms: Date.now() - startTime, agent: this.name },
        error: 'MISSING_URL',
      };
      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'MISSING_URL',
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

      const pageResult = await zai.functions.invoke('page_reader', { url });

      if (context.abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      let rawContent = '';
      let title = '';

      if (typeof pageResult === 'string') {
        rawContent = pageResult;
      } else if (pageResult) {
        rawContent = pageResult.content || pageResult.text || pageResult.html || JSON.stringify(pageResult);
        title = pageResult.title || '';
      }

      const cleanText = WebReaderAgent.stripHtml(rawContent);
      const truncated = cleanText.length > maxLength
        ? cleanText.substring(0, maxLength) + '\n\n[... content truncated]'
        : cleanText;

      const header = title ? `**${title}**\nSource: ${url}\n\n` : `Source: ${url}\n\n`;
      const response = header + truncated;

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response,
        artifacts: { url, title, totalChars: cleanText.length, truncated: cleanText.length > maxLength },
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
        response: isAborted ? 'Page reading was cancelled.' : `Failed to read page: ${errorMsg}`,
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

export { WebReaderAgent };
