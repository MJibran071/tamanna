import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

type SummaryStyle = 'brief' | 'detailed' | 'bullet';

const STYLE_INSTRUCTIONS: Record<SummaryStyle, string> = {
  brief: 'Provide a brief, concise summary in 2-3 sentences capturing the core message.',
  detailed: 'Provide a detailed summary covering all key points, maintaining depth and nuance. Use paragraphs.',
  bullet: 'Summarize using bullet points. Each bullet should capture one key idea or point.',
};

const SUMMARIZER_SYSTEM_PROMPT = `You are an expert summarizer with the ability to distill complex information into clear, accurate, and useful summaries.

Your principles:
1. **Accuracy** — Never add information not present in the original. Never distort the meaning.
2. **Completeness** — Cover all important points based on the requested detail level.
3. **Clarity** — Use clear, simple language. Avoid jargon unless it's in the original.
4. **Conciseness** — Eliminate redundancy. Every word should earn its place.
5. **Neutrality** — Maintain the original tone and perspective. Do not editorialize.

You can summarize: articles, documents, conversation transcripts, meeting notes, emails, research papers, and any other text content.`;

export default class SummarizerAgent implements SubAgent {
  name = 'summarizer';
  description = 'Summarizes text, articles, or conversation history. Supports brief, detailed, and bullet-point summary styles.';

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const text: string = input?.text || '';
    const style: SummaryStyle = ['brief', 'detailed', 'bullet'].includes(input?.style)
      ? (input.style as SummaryStyle)
      : 'detailed';
    const length: string = input?.length || '';

    if (!text.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No text provided for summarization.',
        metadata: { duration_ms: Date.now() - startTime, agent: this.name },
        error: 'MISSING_TEXT',
      };
      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'MISSING_TEXT',
      });
      return result;
    }

    try {
      if (context.abortSignal?.aborted) throw new Error('ABORTED');
      const zai = await getZAI();
      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const styleInstruction = STYLE_INSTRUCTIONS[style];
      let lengthNote = '';
      if (length) {
        lengthNote = `\n\nTarget length: approximately ${length}.`;
      }

      const userMessage = `${styleInstruction}${lengthNote}\n\nText to summarize:\n${text}`;

      const completion = await zai.chat.completions.create({
        model: 'default',
        messages: [
          { role: 'system', content: SUMMARIZER_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      });

      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const responseText = completion?.choices?.[0]?.message?.content
        || completion?.content
        || 'Summarization completed but no result was generated.';

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: responseText,
        artifacts: {
          style,
          sourceLength: text.length,
          summaryLength: responseText.length,
          compressionRatio: text.length > 0 ? (responseText.length / text.length).toFixed(2) : '0',
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
        response: isAborted ? 'Summarization was cancelled.' : `Summarization failed: ${errorMsg}`,
        metadata: { duration_ms: durationMs, agent: this.name },
        error: isAborted ? 'ABORTED' : errorMsg,
      };
      context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: false, input, output: result, durationMs, error: errorMsg });
      return result;
    }
  }
}

export { SummarizerAgent };