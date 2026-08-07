import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

const CODE_EXPERT_SYSTEM_PROMPT = `You are an expert software engineer and coding assistant with deep knowledge across all major programming languages, frameworks, and paradigms.

Your capabilities:
1. **Code Generation** — Write clean, efficient, well-documented code for any task. Always follow best practices and idiomatic patterns for the specified language.
2. **Code Explanation** — Explain code clearly, breaking down complex logic into understandable parts. Use analogies when helpful.
3. **Debugging** — Identify bugs, explain why they occur, and provide fixes. Include the corrected code.
4. **Code Review** — Review code for quality, performance, security, and maintainability. Provide specific, actionable suggestions.
5. **Architecture** — Suggest appropriate design patterns, data structures, and algorithms.

Rules:
- Always wrap code in proper markdown code blocks with language tags.
- If a language is specified, use that language. Otherwise, infer from context.
- Explain your reasoning before providing code.
- For debugging, always explain the root cause, not just the fix.
- Consider edge cases, error handling, and performance.
- Keep explanations clear but thorough — the user should learn, not just get an answer.`;

export default class CodeAssistantAgent implements SubAgent {
  name = 'code_assistant';
  description = 'Expert coding assistant that can generate code, explain code, debug issues, and review code quality across all major programming languages.';

  private buildUserMessage(input: any): string {
    const parts: string[] = [];
    const task: string = input?.task || '';
    const language: string = input?.language || '';
    const code: string = input?.code || '';
    const question: string = input?.question || '';

    if (task) parts.push(`Task: ${task}`);
    if (language) parts.push(`Language: ${language}`);
    if (code) parts.push(`\nCode:\n${code}`);
    if (question) parts.push(`\nQuestion: ${question}`);
    return parts.join('\n');
  }

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const task: string = input?.task || '';
    const question: string = input?.question || '';
    const code: string = input?.code || '';

    if (!task.trim() && !question.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No coding task or question provided. Please describe what you need help with.',
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
          { role: 'system', content: CODE_EXPERT_SYSTEM_PROMPT },
          { role: 'user', content: this.buildUserMessage(input) },
        ],
      });

      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const responseText = completion?.choices?.[0]?.message?.content
        || completion?.content
        || 'Code assistance completed but no response was generated.';

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: responseText,
        artifacts: {
          language: input?.language || null,
          hadCode: !!code,
          taskType: task ? 'generation' : (code ? 'review/debug' : 'question'),
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
        response: isAborted ? 'Code assistance was cancelled.' : `Code assistance failed: ${errorMsg}`,
        metadata: { duration_ms: durationMs, agent: this.name },
        error: isAborted ? 'ABORTED' : errorMsg,
      };
      context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: false, input, output: result, durationMs, error: errorMsg });
      return result;
    }
  }
}

export { CodeAssistantAgent };
