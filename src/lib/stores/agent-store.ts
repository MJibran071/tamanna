import { create } from 'zustand';
import type {
  AgentState,
  ChatMessage,
  PlanStep,
  StepState,
  Attachment,
} from '@/types/agent';

export interface ConversationSummary {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface AgentStore {
  // State
  isConnected: boolean;
  conversationId: string | null;
  messages: ChatMessage[];
  agentState: AgentState;
  transcription: string;
  transcriptionIsFinal: boolean;
  currentPlan: PlanStep[];
  stepStates: StepState[];
  ttsQueue: string[];
  isPlaying: boolean;
  error: string | null;
  activeTab: string;
  conversations: ConversationSummary[];

  // Streaming state
  streamingText: string;
  streamingLatencyMs: number;
  
  // Pending attachments
  pendingAttachments: Attachment[];
  addPendingAttachment: (attachment: Attachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;
  
  // UI state
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  // Actions
  flushTTSQueue: () => void;
  clearAudioState: () => void;
  setIsConnected: (v: boolean) => void;
  setConversationId: (id: string | null) => void;
  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (content: string, latencyMs?: number) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setAgentState: (state: AgentState) => void;
  setTranscription: (text: string, isFinal: boolean) => void;
  setPlan: (steps: PlanStep[]) => void;
  updateStep: (stepIndex: number, update: Partial<StepState>) => void;
  enqueueTTS: (chunks: string[]) => void;
  dequeueTTS: () => string | undefined;
  setIsPlaying: (v: boolean) => void;
  setError: (msg: string | null) => void;
  resetInteraction: () => void;
  clearAll: () => void;
  setActiveTab: (tab: string) => void;
  setStreamingText: (text: string) => void;
  setStreamingLatencyMs: (ms: number) => void;
  setMessageReaction: (messageId: string, reaction: 'up' | 'down' | null) => void;
  toggleMessagePin: (messageId: string) => void;

  // Conversation history
  saveCurrentConversation: () => void;
  deleteConversation: (id: string) => void;
  loadConversation: (id: string) => void;
  startNewConversation: () => void;
  updateConversationTitle: (id: string, title: string) => void;
  loadPersistedConversations: () => void;
}

function persistConversations(conversations: ConversationSummary[]) {
  try {
    localStorage.setItem('tamanna_conversations', JSON.stringify(conversations));
  } catch { /* storage full or unavailable */ }
}

function loadPersistedConversationsFromStorage(): ConversationSummary[] {
  try {
    const raw = localStorage.getItem('tamanna_conversations');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch { return []; }
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New Conversation';
  const text = firstUserMsg.content;
  return text.length > 40 ? text.substring(0, 40) + '…' : text;
}

const initialState = {
  isConnected: false,
  conversationId: null,
  messages: [] as ChatMessage[],
  agentState: 'idle' as AgentState,
  transcription: '',
  transcriptionIsFinal: false,
  currentPlan: [] as PlanStep[],
  stepStates: [] as StepState[],
  ttsQueue: [] as string[],
  isPlaying: false,
  error: null as string | null,
  activeTab: 'talk' as string,
  conversations: [] as ConversationSummary[],
  streamingText: '',
  streamingLatencyMs: 0,
  pendingAttachments: [],
  settingsOpen: false,
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  ...initialState,

  flushTTSQueue: () => set({ ttsQueue: [] }),

  clearAudioState: () => {
    const { ttsQueue } = get();
    if (ttsQueue.length > 0) {
      console.log(`[Store] Flushing ${ttsQueue.length} TTS chunk(s) — user interrupted`);
    }
    set({ ttsQueue: [], isPlaying: false });
  },

  setIsConnected: (v) => set({ isConnected: v }),

  setConversationId: (id) => set({ conversationId: id }),

  addMessage: (msg) =>
    set((state) => {
      const messages = [...state.messages, msg];
      const hasUser = messages.some((m) => m.role === 'user');
      return { messages };
    }),

  setMessages: (msgs) => set({ messages: msgs }),

  updateLastAssistantMessage: (content, latencyMs) =>
    set((state) => {
      const messages = [...state.messages];
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          messages[i] = { ...messages[i], content, latencyMs: latencyMs ?? messages[i].latencyMs };
          break;
        }
      }
      return { messages };
    }),

  setAgentState: (state) => set({ agentState: state }),

  setTranscription: (text, isFinal) =>
    set({ transcription: text, transcriptionIsFinal: isFinal }),

  setPlan: (steps) =>
    set({
      currentPlan: steps,
      stepStates: steps.map((step) => ({
        stepIndex: step.stepIndex,
        agent: step.agent,
        description: step.description,
        status: 'pending' as const,
      })),
    }),

  updateStep: (stepIndex, update) =>
    set((state) => ({
      stepStates: state.stepStates.map((s) =>
        s.stepIndex === stepIndex ? { ...s, ...update } : s
      ),
    })),

  enqueueTTS: (chunks) =>
    set((state) => ({ ttsQueue: [...state.ttsQueue, ...chunks] })),

  dequeueTTS: () => {
    const queue = get().ttsQueue;
    if (queue.length === 0) return undefined;
    const [first, ...rest] = queue;
    set({ ttsQueue: rest });
    return first;
  },

  setIsPlaying: (v) => set({ isPlaying: v }),

  setError: (msg) =>
    set({ error: msg, agentState: msg ? 'error' : 'idle' }),

  resetInteraction: () =>
    set({
      transcription: '',
      transcriptionIsFinal: false,
      currentPlan: [],
      stepStates: [],
      ttsQueue: [],
      isPlaying: false,
      agentState: 'idle',
      error: null,
      streamingText: '',
      streamingLatencyMs: 0,
    }),

  clearAll: () => set({ ...initialState, conversations: get().conversations }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  setStreamingText: (text) => set({ streamingText: text }),
  setStreamingLatencyMs: (ms) => set({ streamingLatencyMs: ms }),

  setMessageReaction: (messageId, reaction) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, reaction } : m
      ),
    })),

  toggleMessagePin: (messageId) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, pinned: !m.pinned } : m
      ),
    })),

  addPendingAttachment: (attachment) =>
    set((state) => ({ pendingAttachments: [...state.pendingAttachments, attachment] })),
  removePendingAttachment: (id) =>
    set((state) => ({ pendingAttachments: state.pendingAttachments.filter((a) => a.id !== id) })),
  clearPendingAttachments: () => set({ pendingAttachments: [] }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  // ─── Conversation History ────────────────────────────────────────────

  saveCurrentConversation: () => {
    const { messages, conversationId, conversations } = get();
    if (!conversationId || messages.length === 0) return;

    const now = new Date().toISOString();
    const title = generateTitle(messages);
    const existing = conversations.findIndex((c) => c.id === conversationId);

    const updatedConv: ConversationSummary = {
      id: conversationId,
      title,
      messages: [...messages],
      createdAt: existing >= 0 ? conversations[existing].createdAt : now,
      updatedAt: now,
    };

    let newConversations: ConversationSummary[];
    if (existing >= 0) {
      newConversations = [...conversations];
      newConversations[existing] = updatedConv;
    } else {
      newConversations = [updatedConv, ...conversations];
    }

    // Keep max 50 conversations
    if (newConversations.length > 50) {
      newConversations = newConversations.slice(0, 50);
    }

    set({ conversations: newConversations });
    persistConversations(newConversations);
  },

  deleteConversation: (id) => {
    const newConversations = get().conversations.filter((c) => c.id !== id);
    set({ conversations: newConversations });
    persistConversations(newConversations);
  },

  loadConversation: (id) => {
    const conv = get().conversations.find((c) => c.id === id);
    if (!conv) return;
    set({
      conversationId: conv.id,
      messages: [...conv.messages],
      agentState: 'idle',
      transcription: '',
      transcriptionIsFinal: false,
      currentPlan: [],
      stepStates: [],
      ttsQueue: [],
      isPlaying: false,
      error: null,
      activeTab: 'talk',
    });
  },

  startNewConversation: () => {
    const { messages, conversationId } = get();
    // Auto-save current before starting new
    if (messages.length > 0 && conversationId) {
      get().saveCurrentConversation();
    }
    const newId = 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    set({
      conversationId: newId,
      messages: [],
      agentState: 'idle',
      transcription: '',
      transcriptionIsFinal: false,
      currentPlan: [],
      stepStates: [],
      ttsQueue: [],
      isPlaying: false,
      error: null,
      activeTab: 'talk',
    });
  },

  updateConversationTitle: (id, title) => {
    const newConversations = get().conversations.map((c) =>
      c.id === id ? { ...c, title } : c
    );
    set({ conversations: newConversations });
    persistConversations(newConversations);
  },

  loadPersistedConversations: () => {
    const persisted = loadPersistedConversationsFromStorage();
    set({ conversations: persisted });
  },
}));
