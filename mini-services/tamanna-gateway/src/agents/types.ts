/**
 * Tamanna Agent Orchestrator — Sub-Agent Type Definitions
 *
 * These interfaces define the contract between the orchestrator and its
 * pluggable sub-agents.  Every agent must implement `SubAgent` and return
 * a `SubAgentResult`.
 *
 * The result supports both legacy and modern conventions:
 *   - Legacy: `response` + `metadata.duration_ms` + `artifacts: Record<string, any>`
 *   - Modern: `summary` + `durationMs` + `artifacts?: Array<AgentArtifact>`
 *
 * The orchestrator normalises both via helper functions.
 */

// ---------------------------------------------------------------------------
// Agent Artefact (modern convention)
// ---------------------------------------------------------------------------

export interface AgentArtifact {
  type: string;
  url?: string;
  title?: string;
  contentBase64?: string;
}

// ---------------------------------------------------------------------------
// Sub-Agent Result
// ---------------------------------------------------------------------------

export interface SubAgentResult {
  success: boolean;
  /** Modern: concise text output. */
  summary?: string;
  /** Legacy: primary text output. */
  response: string;
  /** Full detailed output (optional). */
  detailed?: string;
  /** Modern: typed artefacts array. */
  artifacts?: Array<AgentArtifact> | Record<string, any>;
  /** Modern: wall-clock execution time in ms. */
  durationMs?: number;
  /** Legacy: structured metadata. */
  metadata?: {
    duration_ms: number;
    agent: string;
    [key: string]: any;
  };
  error?: string;
  raw?: unknown;
}

// ---------------------------------------------------------------------------
// Agent Context
// ---------------------------------------------------------------------------

export interface AgentContext {
  memoryEngine?: {
    recordAgentOutcome: (params: {
      agent: string;
      success: boolean;
      input: any;
      output: any;
      durationMs: number;
      error?: string;
    }) => Promise<void> | void;
  };
  abortSignal?: AbortSignal;
  conversationHistory?: ConversationTurn[];
  priorResults?: Map<number, SubAgentResult>;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Conversation Turn
// ---------------------------------------------------------------------------

export interface ConversationTurn {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: number;
}

// ---------------------------------------------------------------------------
// Sub-Agent Contract
// ---------------------------------------------------------------------------

export interface SubAgent {
  name: string;
  description: string;
  execute(input: any, context: AgentContext): Promise<SubAgentResult>;
}

// ---------------------------------------------------------------------------
// Plan Step
// ---------------------------------------------------------------------------

export interface PlanStep {
  stepIndex: number;
  agent: string;
  description: string;
  input: Record<string, unknown>;
  dependsOn: number[];
}

// ---------------------------------------------------------------------------
// Orchestrator Events
// ---------------------------------------------------------------------------

export type OrchestratorEvent =
  | { type: "status"; status: string; message?: string }
  | { type: "plan:created"; steps: PlanStep[] }
  | { type: "step:started"; stepIndex: number; agent: string; description: string }
  | { type: "step:completed"; stepIndex: number; result: SubAgentResult }
  | { type: "step:failed"; stepIndex: number; error: string }
  | { type: "response:text"; text: string }
  | { type: "tts:chunk"; chunk: string; index: number; total: number }
  | { type: "response:done"; totalDurationMs: number }
  | { type: "error"; message: string }
  | { type: "cancelled" };

export type EmitFn = (event: OrchestratorEvent) => void;

// ---------------------------------------------------------------------------
// LLM Plan Response
// ---------------------------------------------------------------------------

export interface LLMPlanResponse {
  reasoning: string;
  needsTools: boolean;
  plan: PlanStep[];
  response?: string;
}

// ---------------------------------------------------------------------------
// Memory Engine
// ---------------------------------------------------------------------------

export interface MemoryEngine {
  getContext(query: string, scopeId: string): Promise<string>;
  extractMemories(userText: string, agentText: string, scopeId: string): Promise<void>;
}
