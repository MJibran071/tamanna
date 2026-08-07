/**
 * Tamanna Agent Orchestrator — Core Brain
 *
 * This is the central intelligence of the Tamanna voice agent. It:
 *
 *   1. Lazily initializes the ZAI SDK singleton on first request.
 *   2. Receives user input → plans via LLM → executes sub-agents in parallel
 *      respecting a dependency graph → synthesises final answer → streams TTS.
 *   3. Integrates with the MemoryEngine at multiple points (context retrieval,
 *      memory extraction) so Tamanna learns from every interaction.
 *   4. Supports cancellation via AbortController and emits structured events
 *      through the caller-provided `emit` callback.
 *
 * Design principles:
 *   - BLAZING FAST: Lazy SDK init, parallel step execution, TTS chunked.
 *   - ZERO stubs / ZERO TODOs: every code path fully implemented.
 *   - Observable: every phase emits events for real-time client updates.
 */

import { getZAI } from "./services/zai.js";
import { buildRegistry } from "./agents/registry";
import type {
  SubAgent,
  SubAgentResult,
  PlanStep,
  EmitFn,
  ConversationTurn,
  LLMPlanResponse,
} from "./agents/types";
import type { Session } from "./session.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LLM_RETRIES = 2;
const TTS_CHUNK_SIZE = 100;
const TTS_VOICE = "tongtong";
const TTS_SPEED = 1.15;

// Memory safety: limit TTS buffer size to prevent OOM
const MAX_TTS_BUFFER_BYTES = 5 * 1024 * 1024; // 5MB max per response

const ORCHESTRATOR_SYSTEM_PROMPT = `You are Tamanna, a voice assistant. Respond with JSON:
{"reasoning":"brief","needsTools":bool,"plan":[{"stepIndex":0,"agent":"name","description":"task","input":{},"dependsOn":[]}],"response":"answer if no tools needed"}

Agents: web_search, web_reader, image_gen, vlm, analysis, code_assistant, translator, summarizer, math, research, writing

Rules: needsTools=false for chat. Keep response under 2 sentences. No markdown. Plain text only.`;

const SYNTHESIS_SYSTEM_PROMPT = `You are Tamanna, an AI voice assistant. Based on the tool results below, provide a clear, concise final answer to the user.

Rules:
- Respond with plain text ONLY — never JSON, never markdown, never code blocks
- Keep it conversational and natural for voice
- If tools failed, explain briefly and suggest what the user can provide
- Under 3 sentences unless the user asked for detail`;

function cleanResponseText(text: string): string {
  let cleaned = text.trim();
  // Strip JSON wrapper if the LLM returned JSON instead of plain text
  if (cleaned.startsWith('{')) {
    try {
      const parsed = JSON.parse(cleaned);
      if (typeof parsed.response === 'string') return parsed.response;
      if (typeof parsed.text === 'string') return parsed.text;
      if (typeof parsed.answer === 'string') return parsed.answer;
      if (typeof parsed.content === 'string') return parsed.content;
    } catch { /* not valid JSON, keep original */ }
  }
  // Strip markdown code fences
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, '').replace(/```\s*$/gm, '').trim();
  return cleaned;
}

function getResultText(result: SubAgentResult): string {
  if ((result as any).summary) return (result as any).summary;
  return result.response ?? "";
}

function getResultDuration(result: SubAgentResult): number {
  if ((result as any).durationMs) return (result as any).durationMs;
  return result.metadata?.duration_ms ?? 0;
}

// ---------------------------------------------------------------------------
// Orchestrator Class
// ---------------------------------------------------------------------------

export class AgentOrchestrator {
  private memoryEngine: any;
  private registry: ReturnType<typeof buildRegistry>;
  private abortController: AbortController | null = null;
  private _cancelled = false;

  constructor(memoryEngine: any) {
    this.memoryEngine = memoryEngine;
    this.registry = buildRegistry();
  }

  async init(): Promise<void> {
    try {
      await getZAI();
      console.log("[Orchestrator] SDK pre-warmed and ready.");
    } catch (err: any) {
      console.error("[Orchestrator] Failed to pre-warm SDK:", err?.message || err);
    }
  }

  async processUserInput(text: string, session: Session, emit: EmitFn): Promise<void> {
    const pipelineStart = performance.now();
    const scopeId = session.conversationId || session.socketId;

    this._cancelled = false;
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const throwIfCancelled = () => {
      if (signal.aborted || this._cancelled) {
        emit({ type: "cancelled" });
        throw new Error("Orchestrator cancelled");
      }
    };

    try {
      // ── Phase 1: Planning ─────────────────────────────────────────
      emit({ type: "status", status: "planning", message: "Analysing your request…" });
      throwIfCancelled();

      let memoryContext = "";
      try {
        memoryContext = await this.memoryEngine.getContext(text, scopeId);
      } catch (memErr: unknown) {
        console.warn("[Orchestrator] Memory retrieval failed");
      }

      const enrichedSystemPrompt = memoryContext
        ? `${ORCHESTRATOR_SYSTEM_PROMPT}\n\n---\nRelevant memories about this user:\n${memoryContext}`
        : ORCHESTRATOR_SYSTEM_PROMPT;

      const llmMessages = [
        { role: "system" as const, content: enrichedSystemPrompt },
        { role: "user" as const, content: text },
      ];

      emit({ type: "status", status: "planning", message: "Creating execution plan…" });
      const planResponse = await this._callLLMForPlan(llmMessages);
      throwIfCancelled();

      // ── Phase 2: Direct Response ──────────────────────────────────
      if (!planResponse.needsTools) {
        const responseText = cleanResponseText(planResponse.response ?? "I understand, but I'm not sure how to respond.");
        await this._handleDirectResponse(responseText, emit, text, scopeId, pipelineStart, signal);
        return;
      }

      // ── Phase 3: Execute Steps ───────────────────────────────────
      const steps = planResponse.plan ?? [];
      const planDone = performance.now();
      console.log(`[Orchestrator] Planning done in ${(planDone - pipelineStart).toFixed(0)}ms`);

      emit({ type: "plan:created", steps });
      emit({ type: "status", status: "executing", message: `Executing ${steps.length} step(s)…` });

      const stepResults = await this._executePlanGraph(steps, emit, signal);
      throwIfCancelled();

      // ── Phase 4: Synthesize ───────────────────────────────────────
      emit({ type: "status", status: "synthesizing", message: "Synthesizing results…" });

      const finalAnswer = await this._synthesizeFinalAnswer(text, steps, stepResults, llmMessages, signal);
      throwIfCancelled();

      // ── Phase 5: Stream Response + TTS ──────────────────────────
      const textDone = performance.now();
      console.log(`[Orchestrator] Text ready in ${(textDone - pipelineStart).toFixed(0)}ms`);
      emit({ type: "response:text", text: finalAnswer });
      await this._streamTTS(finalAnswer, emit, signal, pipelineStart);

      // ── Phase 6: Post-Processing ────────────────────────────────
      const totalDuration = performance.now() - pipelineStart;
      emit({ type: "response:done", totalDurationMs: totalDuration });

      try {
        await this.memoryEngine.extractMemories(text, finalAnswer, scopeId);
      } catch {
        console.warn("[Orchestrator] Memory extraction failed");
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "Orchestrator cancelled") return;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Orchestrator] Pipeline error: ${msg}`);
      emit({ type: "error", message: msg });
    } finally {
      this.abortController = null;
    }
  }

  cancelExecution(_session?: Session, emit?: EmitFn): void {
    this._cancelled = true;
    if (this.abortController) this.abortController.abort();
    if (emit) emit({ type: "cancelled" });
  }

  // -----------------------------------------------------------------------
  // Private: LLM Plan
  // -----------------------------------------------------------------------

  private async _callLLMForPlan(messages: Array<{ role: string; content: string }>): Promise<LLMPlanResponse> {
    let lastError = "";
    for (let attempt = 0; attempt <= MAX_LLM_RETRIES; attempt++) {
      try {
        const zai = await getZAI();
        const response = await zai.chat.completions.create({ messages: messages as any, temperature: 0.1 });
        const content = response?.choices?.[0]?.message?.content ?? "";
        const jsonStr = this._extractJSON(content);
        const parsed: LLMPlanResponse = JSON.parse(jsonStr);
        if (typeof parsed.needsTools !== "boolean") throw new Error("Missing needsTools");
        if (parsed.needsTools && !Array.isArray(parsed.plan)) throw new Error("Missing plan");
        return parsed;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt < MAX_LLM_RETRIES) {
          messages.push({ role: "system", content: `Invalid JSON. Error: ${lastError}. Respond with ONLY valid JSON.` });
        }
      }
    }
    return { reasoning: "Failed", needsTools: false, plan: [], response: "I'm having trouble right now. Could you try again?" };
  }

  private _extractJSON(text: string): string {
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fenceMatch) return fenceMatch[1].trim();
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) return braceMatch[0].trim();
    return text.trim();
  }

  // -----------------------------------------------------------------------
  // Private: Direct Response
  // -----------------------------------------------------------------------

  private async _handleDirectResponse(responseText: string, emit: EmitFn, userText: string, scopeId: string, pipelineStart: number, signal: AbortSignal): Promise<void> {
    emit({ type: "status", status: "responding", message: "Generating response…" });
    if (signal.aborted) { emit({ type: "cancelled" }); return; }
    emit({ type: "response:text", text: responseText });
    await this._streamTTS(responseText, emit, signal, pipelineStart);
    const totalDuration = performance.now() - pipelineStart;
    emit({ type: "response:done", totalDurationMs: totalDuration });
    try { await this.memoryEngine.extractMemories(userText, responseText, scopeId); } catch { /* best-effort */ }
  }

  // -----------------------------------------------------------------------
  // Private: Parallel Plan Execution
  // -----------------------------------------------------------------------

  private async _executePlanGraph(steps: PlanStep[], emit: EmitFn, signal: AbortSignal): Promise<Map<number, SubAgentResult>> {
    const results = new Map<number, SubAgentResult>();
    const completed = new Set<number>();
    const failed = new Set<number>();
    const normalizedSteps = steps.map((s) => ({ ...s, dependsOn: Array.isArray(s.dependsOn) ? s.dependsOn : [] }));
    let iteration = 0;

    while (completed.size + failed.size < normalizedSteps.length && iteration < normalizedSteps.length + 1) {
      iteration++;
      const readySteps = normalizedSteps.filter((s) => !completed.has(s.stepIndex) && !failed.has(s.stepIndex) && s.dependsOn.every((d) => completed.has(d)));

      if (readySteps.length === 0) {
        for (const s of normalizedSteps.filter((s) => !completed.has(s.stepIndex) && !failed.has(s.stepIndex))) {
          failed.add(s.stepIndex);
          emit({ type: "step:failed", stepIndex: s.stepIndex, error: "Dependency not resolved" });
        }
        break;
      }

      if (signal.aborted) break;

      await Promise.all(readySteps.map(async (step) => {
        emit({ type: "step:started", stepIndex: step.stepIndex, agent: step.agent, description: step.description });
        try {
          const agent = this.registry.get(step.agent);
          const result = await agent.execute(step.input, { memoryEngine: this.memoryEngine, abortSignal: signal, priorResults: new Map(results) });
          results.set(step.stepIndex, result);
          completed.add(step.stepIndex);
          emit({ type: "step:completed", stepIndex: step.stepIndex, result });
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          results.set(step.stepIndex, { success: false, response: `Failed: ${errorMsg}`, error: errorMsg, metadata: { duration_ms: 0, agent: step.agent } });
          failed.add(step.stepIndex);
          emit({ type: "step:failed", stepIndex: step.stepIndex, error: errorMsg });
        }
      }));
    }
    return results;
  }

  // -----------------------------------------------------------------------
  // Private: Synthesis
  // -----------------------------------------------------------------------

  private async _synthesizeFinalAnswer(userText: string, steps: PlanStep[], stepResults: Map<number, SubAgentResult>, originalMessages: Array<{ role: string; content: string }>, _signal: AbortSignal): Promise<string> {
    const toolResults = steps.map((s) => {
      const r = stepResults.get(s.stepIndex);
      return `[Step ${s.stepIndex} - ${s.agent}]: ${r?.success ? getResultText(r) : "Failed"}`;
    }).join("\n");

    const synthesisMessages = [
      { role: "system" as const, content: SYNTHESIS_SYSTEM_PROMPT },
      { role: "user" as const, content: `Tool results:\n${toolResults}\n\nOriginal question: ${userText}\n\nBased on the above, give me a clear spoken answer.` },
    ];

    try {
      const zai = await getZAI();
      const response = await zai.chat.completions.create({ messages: synthesisMessages as any, temperature: 0.7 });
      const raw = response?.choices?.[0]?.message?.content?.trim() || "I processed your request but couldn't generate a response.";
      return cleanResponseText(raw);
    } catch {
      const fallback: string[] = [];
      for (const [, r] of stepResults) { if (r?.success) fallback.push(getResultText(r)); }
      return fallback.length > 0 ? fallback.join(". ") : "I ran into issues. Please try again.";
    }
  }

  // -----------------------------------------------------------------------
  // Private: TTS Streaming
  // -----------------------------------------------------------------------

  private async _streamTTS(text: string, emit: EmitFn, signal: AbortSignal, pipelineStart?: number): Promise<void> {
    if (!text || signal.aborted) return;
    const zai = await getZAI();
    const chunks = this._splitTextForTTS(text);

    console.log(`[Orchestrator] TTS: synthesizing ${chunks.length} chunk(s) for ${text.length} chars (voice=${TTS_VOICE})`);

    for (let i = 0; i < chunks.length; i++) {
      if (signal.aborted) break;
      const chunk = chunks[i];
      if (!chunk.trim()) continue;

      try {
        // Force GC hint before TTS to reduce memory pressure
        if (global.gc) { try { global.gc(); } catch { /* ignore */ } }
        
        // SDK returns a standard Response object — use arrayBuffer() to get raw audio
        const ttsResponse = await zai.audio.tts.create({
          input: chunk,
          voice: TTS_VOICE,
          speed: TTS_SPEED,
          response_format: "wav",
          stream: false,
        });
        const arrayBuffer = await ttsResponse.arrayBuffer();
        
        // Memory guard: skip oversized chunks
        if (arrayBuffer.byteLength > MAX_TTS_BUFFER_BYTES) {
          console.warn(`[Orchestrator] TTS chunk ${i + 1} too large (${arrayBuffer.byteLength} bytes), skipping`);
          continue;
        }
        
        const buffer = Buffer.from(new Uint8Array(arrayBuffer));
        const audioData = buffer.toString("base64");
        
        // Null out references to help GC
        const elapsed = pipelineStart != null ? (performance.now() - pipelineStart).toFixed(0) : '?';
        console.log(`[Orchestrator] TTS chunk ${i + 1}/${chunks.length} done in ${elapsed}ms total (${buffer.length} bytes)`);
        emit({ type: "tts:chunk", chunk: audioData, index: i, total: chunks.length });
      } catch (err: unknown) {
        console.warn(`[Orchestrator] TTS chunk ${i + 1} failed:`, err instanceof Error ? err.message : err);
      }
    }
  }

  private _splitTextForTTS(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    const chunks: string[] = [];
    let current = "";
    for (const s of sentences) {
      if (current.length + s.length > TTS_CHUNK_SIZE && current.length > 0) { chunks.push(current.trim()); current = s; }
      else current += s;
    }
    if (current.trim()) chunks.push(current.trim());
    if (chunks.length === 1 && chunks[0].length > TTS_CHUNK_SIZE * 2) {
      const words = chunks[0].split(" ");
      const fb: string[] = [];
      let fc = "";
      for (const w of words) {
        if (fc.length + w.length + 1 > TTS_CHUNK_SIZE && fc.length > 0) { fb.push(fc.trim()); fc = w; }
        else fc += (fc ? " " : "") + w;
      }
      if (fc.trim()) fb.push(fc.trim());
      return fb;
    }
    return chunks;
  }

  isReady(): boolean { return true; }
  listAgents(): string[] { return this.registry.names(); }
}

export default AgentOrchestrator;
