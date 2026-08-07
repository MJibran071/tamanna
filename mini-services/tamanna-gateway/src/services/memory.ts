/**
 * MemoryEngine — DAG memory system with three layers: Global, User, Agent.
 *
 * Lightweight in-memory implementation (no Prisma) for the gateway.
 * Uses a Map-based store for nodes and edges.
 */

interface MemoryNode {
  id: string;
  scope: string;
  scopeId: string | null;
  content: string;
  category: string;
  tags: string[];
  level: number;
  weight: number;
  accessCount: number;
  lastAccessed: Date | null;
  createdAt: Date;
}

interface MemoryEdge {
  id: string;
  fromId: string;
  toId: string;
  scope: string;
  scopeId: string | null;
  relation: string;
  weight: number;
}

const nodes = new Map<string, MemoryNode>();
const edges = new Map<string, MemoryEdge>();
let idCounter = 0;

function genId(): string {
  return 'mn_' + (++idCounter) + '_' + Math.random().toString(36).substring(2, 8);
}

export default class MemoryEngine {
  // ─── Orchestrator Interface ───────────────────────────────────────

  async getContext(query: string, scopeId: string = 'default'): Promise<string> {
    const relevantNodes: MemoryNode[] = [];
    const lowerQuery = query.toLowerCase();

    for (const node of nodes.values()) {
      if (node.scope === 'user' && node.scopeId === scopeId) {
        relevantNodes.push(node);
      } else if (node.content.toLowerCase().includes(lowerQuery)) {
        relevantNodes.push(node);
      }
    }

    if (relevantNodes.length === 0) return '';

    // Sort by weight desc, take top 10
    relevantNodes.sort((a, b) => b.weight - a.weight);
    const topNodes = relevantNodes.slice(0, 10);

    return topNodes
      .map((n) => `[${n.category}] ${n.content}${n.tags.length > 0 ? ` (${n.tags.join(', ')})` : ''}`)
      .join('\n');
  }

  async extractMemories(userText: string, agentText: string, scopeId: string = 'default'): Promise<void> {
    // Simple keyword-based extraction (no LLM call to save resources)
    const keywords = this._extractKeywords(userText + ' ' + agentText);
    if (keywords.length === 0) return;

    for (const keyword of keywords) {
      // Check for duplicate
      let exists = false;
      for (const node of nodes.values()) {
        if (node.scope === 'user' && node.scopeId === scopeId && node.content.includes(keyword)) {
          exists = true;
          node.weight += 0.3;
          node.accessCount++;
          node.lastAccessed = new Date();
          break;
        }
      }

      if (!exists) {
        const node: MemoryNode = {
          id: genId(),
          scope: 'user',
          scopeId,
          content: keyword,
          category: 'fact',
          tags: [keyword.split(' ')[0]],
          level: 0,
          weight: 1.0,
          accessCount: 0,
          lastAccessed: null,
          createdAt: new Date(),
        };
        nodes.set(node.id, node);
      }
    }
  }

  async recordAgentOutcome(params: {
    agent: string;
    success: boolean;
    input: any;
    output: any;
    durationMs: number;
    error?: string;
  }): Promise<void> {
    const content = params.success
      ? `Agent "${params.agent}" completed task in ${params.durationMs}ms`
      : `Agent "${params.agent}" failed: ${params.error || 'unknown'} (${params.durationMs}ms)`;

    const node: MemoryNode = {
      id: genId(),
      scope: 'agent',
      scopeId: params.agent,
      content,
      category: params.success ? 'outcome' : 'correction',
      tags: [params.agent, params.success ? 'success' : 'failure'],
      level: 0,
      weight: params.success ? 0.5 : 1.5,
      accessCount: 0,
      lastAccessed: null,
      createdAt: new Date(),
    };
    nodes.set(node.id, node);
  }

  // ─── Simple keyword extraction ────────────────────────────────────

  private _extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    // Extract potential facts (sentences that look like facts)
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
    const results: string[] = [];

    // Take up to 3 meaningful phrases
    for (let i = 0; i < Math.min(sentences.length, 3); i++) {
      const sentence = sentences[i].trim();
      if (sentence.length > 15 && sentence.length < 200) {
        results.push(sentence);
      }
    }

    return results;
  }
}
