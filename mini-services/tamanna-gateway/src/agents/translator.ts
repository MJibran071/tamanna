import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

const TRANSLATOR_SYSTEM_PROMPT = `You are a professional translator with native-level fluency in dozens of languages. Your expertise covers:

1. **Accurate Translation** — Preserve the original meaning, tone, nuance, and intent. Never translate word-for-word when the result would sound unnatural.
2. **Language Detection** — Automatically detect the source language if not specified.
3. **Cultural Context** — Adapt idioms, expressions, and cultural references appropriately for the target audience.
4. **Formality Levels** — Match the formality level of the original text (formal, informal, business, casual).
5. **Multiple Formats** — Translate prose, poetry, technical documents, conversations, UI text, and more.

Rules:
- If the target language is not specified, translate to English.
- Always state: [Source Language] -> [Target Language] at the top.
- If the text is ambiguous, provide the most likely translation and note alternatives.
- For technical terms, keep the original term in parentheses if there's no standard translation.
- Preserve formatting (paragraphs, lists) from the original.
- Only output the translation and any necessary translator notes — no meta-commentary.`;

export default class TranslatorAgent implements SubAgent {
  name = 'translator';
  description = 'Translates text between languages with high accuracy. Auto-detects the source language. Supports formal, informal, and technical translation.';

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const text: string = input?.text || '';
    const targetLanguage: string = input?.targetLanguage || '';

    if (!text.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No text provided for translation.',
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

      const userMessage = targetLanguage
        ? `Translate the following text to ${targetLanguage}:\n\n${text}`
        : `Translate the following text (auto-detect source language and translate to English):\n\n${text}`;

      const completion = await zai.chat.completions.create({
        model: 'default',
        messages: [
          { role: 'system', content: TRANSLATOR_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      });

      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const responseText = completion?.choices?.[0]?.message?.content
        || completion?.content
        || 'Translation completed but no result was generated.';

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: responseText,
        artifacts: { sourceText: text, targetLanguage: targetLanguage || 'auto', charCount: text.length },
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
        response: isAborted ? 'Translation was cancelled.' : `Translation failed: ${errorMsg}`,
        metadata: { duration_ms: durationMs, agent: this.name },
        error: isAborted ? 'ABORTED' : errorMsg,
      };
      context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: false, input, output: result, durationMs, error: errorMsg });
      return result;
    }
  }
}

export { TranslatorAgent };
