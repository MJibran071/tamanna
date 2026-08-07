import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

const WRITER_SYSTEM_PROMPT = `You are a professional writer and communication expert with mastery across all forms of written content.

Your expertise includes:
1. **Emails** — Professional, persuasive, and well-structured emails for any context (business, personal, follow-ups, cold outreach).
2. **Articles** — Engaging, well-researched articles with strong hooks, clear structure, and compelling conclusions.
3. **Stories & Creative Writing** — Vivid narratives with well-developed characters, dialogue, and immersive descriptions.
4. **Reports** — Clear, structured reports with executive summaries, findings, and recommendations.
5. **Social Media Posts** — Platform-appropriate content with hooks, hashtags, and engagement optimization.
6. **Documentation** — Clear technical documentation, user guides, and how-to articles.
7. **Copywriting** — Marketing copy, product descriptions, landing pages, and ad content.

Writing principles:
- Always match the requested tone (professional, casual, friendly, formal, persuasive, etc.).
- Structure content appropriately for the format.
- Use active voice and strong verbs.
- Be concise but complete — every word should serve a purpose.
- Adapt to the target audience.
- Proofread mentally before outputting — no typos, grammatical errors, or awkward phrasing.
- If no format is specified, use the most appropriate format for the task described.`;

export default class WritingAgent implements SubAgent {
  name = 'writing';
  description = 'Professional writing agent for emails, articles, stories, reports, social media posts, and any other written content. Adapts tone, format, and style to match requirements.';

  private buildUserMessage(input: any): string {
    const parts: string[] = [];
    const task: string = input?.task || '';
    const tone: string = input?.tone || '';
    const format: string = input?.format || '';
    const contextStr: string = input?.context || '';

    if (format) parts.push(`Format: ${format}`);
    if (tone) parts.push(`Tone: ${tone}`);
    if (contextStr) parts.push(`Context/Background: ${contextStr}`);
    parts.push(`\nTask: ${task}`);
    return parts.join('\n');
  }

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const task: string = input?.task || '';

    if (!task.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No writing task provided. Please describe what you would like me to write.',
        metadata: { duration_ms: Date.now() - startTime, agent: this.name },
        error: 'MISSING_TASK',
      };
      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'MISSING_TASK',
      });
      return result;
    }

    try {
      if (context.abortSignal?.aborted) throw new Error('ABORTED');
      const zai = await getZAI();
      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const completion = await zai.chat.completions.create({
        model: 'default',
        messages: [
          { role: 'system', content: WRITER_SYSTEM_PROMPT },
          { role: 'user', content: this.buildUserMessage(input) },
        ],
      });

      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const responseText = completion?.choices?.[0]?.message?.content
        || completion?.content
        || 'Writing completed but no content was generated.';

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: responseText,
        artifacts: {
          format: input?.format || 'auto',
          tone: input?.tone || 'auto',
          wordCount: responseText.split(/\s+/).filter(Boolean).length,
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
        response: isAborted ? 'Writing was cancelled.' : `Writing failed: ${errorMsg}`,
        metadata: { duration_ms: durationMs, agent: this.name },
        error: isAborted ? 'ABORTED' : errorMsg,
      };
      context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: false, input, output: result, durationMs, error: errorMsg });
      return result;
    }
  }
}

export { WritingAgent };
