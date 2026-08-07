/**
 * Tamanna Agent Orchestrator — Agent Registry
 *
 * Central registry that maps agent name strings to SubAgent instances.
 * Built once at start-up and shared across all orchestrator instances.
 */

import type { SubAgent } from "./types";
import WebSearchAgent from "./web-search";
import WebReaderAgent from "./web-reader";
import ImageGenAgent from "./image-gen";
import VLMAgent from "./vlm";
import AnalysisAgent from "./analysis";
import CodeAssistantAgent from "./code-assistant";
import TranslatorAgent from "./translator";
import SummarizerAgent from "./summarizer";
import MathAgent from "./math";
import ResearchAgent from "./research";
import WritingAgent from "./writing";

class AgentRegistry {
  private agents = new Map<string, SubAgent>();

  register(agent: SubAgent): void {
    if (this.agents.has(agent.name)) {
      console.warn(`[AgentRegistry] Overwriting duplicate agent "${agent.name}"`);
    }
    this.agents.set(agent.name, agent);
  }

  get(name: string): SubAgent {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(
        `[AgentRegistry] Unknown agent "${name}". Available: [${Array.from(this.agents.keys()).join(", ")}]`,
      );
    }
    return agent;
  }

  has(name: string): boolean {
    return this.agents.has(name);
  }

  list(): SubAgent[] {
    return Array.from(this.agents.values());
  }

  names(): string[] {
    return Array.from(this.agents.keys());
  }

  get size(): number {
    return this.agents.size;
  }
}

let _instance: AgentRegistry | null = null;

export function buildRegistry(): AgentRegistry {
  if (_instance) return _instance;

  const registry = new AgentRegistry();

  const agents: SubAgent[] = [
    new WebSearchAgent(),
    new WebReaderAgent(),
    new ImageGenAgent(),
    new VLMAgent(),
    new AnalysisAgent(),
    new CodeAssistantAgent(),
    new TranslatorAgent(),
    new SummarizerAgent(),
    new MathAgent(),
    new ResearchAgent(),
    new WritingAgent(),
  ];

  for (const agent of agents) {
    registry.register(agent);
  }

  console.log(
    `[AgentRegistry] Initialized with ${registry.size} agents: ${registry.names().join(", ")}`,
  );

  _instance = registry;
  return _instance;
}

export { AgentRegistry };
export default buildRegistry;
