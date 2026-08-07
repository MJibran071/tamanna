import { getZAI } from '../services/zai.js';
import type { SubAgent, SubAgentResult, AgentContext } from './types';

const MATH_EXPERT_SYSTEM_PROMPT = `You are a mathematics expert with deep knowledge spanning:

1. **Arithmetic & Algebra** — Equations, inequalities, polynomials, factoring, systems of equations.
2. **Calculus** — Derivatives, integrals, limits, series, multivariable calculus.
3. **Statistics & Probability** — Descriptive stats, distributions, hypothesis testing, Bayes' theorem, combinatorics.
4. **Geometry & Trigonometry** — Areas, volumes, angles, trigonometric identities, coordinate geometry.
5. **Number Theory** — Primes, modular arithmetic, divisibility.
6. **Unit Conversions** — Between metric, imperial, and other measurement systems.
7. **Financial Math** — Interest, amortization, compound growth, annuities.

Rules:
- Show your work step by step so the user can follow the logic.
- For calculations, always show the intermediate steps.
- If the user wants just the answer (explanation=false), provide a concise answer with the final result prominently displayed.
- Use clear mathematical notation. For complex expressions, use LaTeX-style formatting where appropriate.
- Double-check all calculations before responding.
- If a problem is ambiguous, state your assumptions clearly.
- For approximations, note the precision level.`;

export default class MathAgent implements SubAgent {
  name = 'math';
  description = 'Math expert that solves equations, performs calculations, handles statistics, probability, unit conversions, and explains mathematical concepts step by step.';

  async execute(input: any, context: AgentContext): Promise<SubAgentResult> {
    const startTime = Date.now();
    const expression: string = input?.expression || '';
    const explanation: boolean = input?.explanation !== false;

    if (!expression.trim()) {
      const result: SubAgentResult = {
        success: false,
        response: 'No mathematical expression or question provided.',
        metadata: { duration_ms: Date.now() - startTime, agent: this.name },
        error: 'MISSING_EXPRESSION',
      };
      context.memoryEngine?.recordAgentOutcome({
        agent: this.name, success: false, input, output: result, durationMs: result.metadata.duration_ms, error: 'MISSING_EXPRESSION',
      });
      return result;
    }

    try {
      if (context.abortSignal?.aborted) throw new Error('ABORTED');
      const zai = await getZAI();
      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const userMessage = explanation
        ? `Solve this step by step and explain your reasoning:\n\n${expression}`
        : `Give me the answer directly (minimal explanation):\n\n${expression}`;

      const completion = await zai.chat.completions.create({
        model: 'default',
        messages: [
          { role: 'system', content: MATH_EXPERT_SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
      });

      if (context.abortSignal?.aborted) throw new Error('ABORTED');

      const responseText = completion?.choices?.[0]?.message?.content
        || completion?.content
        || 'Calculation completed but no result was generated.';

      const durationMs = Date.now() - startTime;
      const result: SubAgentResult = {
        success: true,
        response: responseText,
        artifacts: { expression, showExplanation: explanation },
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
        response: isAborted ? 'Calculation was cancelled.' : `Calculation failed: ${errorMsg}`,
        metadata: { duration_ms: durationMs, agent: this.name },
        error: isAborted ? 'ABORTED' : errorMsg,
      };
      context.memoryEngine?.recordAgentOutcome({ agent: this.name, success: false, input, output: result, durationMs, error: errorMsg });
      return result;
    }
  }
}

export { MathAgent };
