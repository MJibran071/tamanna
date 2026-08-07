import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

const ANALYSIS_SYSTEM_PROMPT = `You are an expert analytical thinker and data analyst. Your role is to:

1. **Analyze data and information** — Break down complex information into key components, identify patterns, trends, and relationships.
2. **Compare and contrast** — Highlight similarities, differences, pros/cons between options, products, or ideas.
3. **Provide insights** — Go beyond surface-level observations to deliver actionable, deep insights.
4. **Structure your analysis** — Use clear headings, bullet points, and logical flow.
5. **Be objective** — Present balanced views, acknowledge uncertainties and limitations.
6. **Quantify when possible** — Use numbers, percentages, and metrics to support your analysis.

When given data, always:
- Summarize the key findings first
- Provide detailed analysis with supporting evidence
- Highlight any notable patterns or anomalies
- Draw conclusions and offer recommendations

Keep your analysis concise but thorough. Use clear, professional language.`;

export default class AnalysisAgent implements SubAgent {
  name = 'analysis';
  description = 'Analyzes data, compares information, and provides deep insights. Can work with structured data, text, or general questions requiring analytical thinking.';

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const question: string = input?.question || '';
    const data: any = input?.data;

    if (!question.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No question or topic provided for analysis.',
        metadata: { duration_ms: Date.now() - startTime, agent: this.name },
        error: 'MISSING_QUESTION',
      };
      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'MISSING_QUESTION',
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

      const userMessage = data
        ? `Question: ${question}\n\nData to analyze:\n${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`
        : question;

      const completion = await zai.chat.completions.create({
        model: 'default',
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      });

      if (context.abortSignal?.aborted) {
        throw new Error('ABORTED');
      }

      const responseText = completion?.choices?.[0]?.message?.content
        || completion?.content
        || 'Analysis completed but no response was generated.';

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: responseText,
        artifacts: { question, hasData: !!data },
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
        response: isAborted ? 'Analysis was cancelled.' : `Analysis failed: ${errorMsg}`,
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

export { AnalysisAgent };
