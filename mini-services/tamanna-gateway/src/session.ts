export type AgentState =  'idle'  | 'listening'  | 'transcribing'  | 'planning'  | 'executing'  | 'speaking'  | 'error';export interface Session {
  socketId: string;
  conversationId: string | null;
  audioChunks: string[];
  isRecording: boolean;
  agentState: AgentState;
  abortController: AbortController | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Manages per-socket session state for the voice agent.
 * All state is in-memory; nothing is persisted to disk by this class.
 */
export class SessionManager {
  private sessions = new Map<string, Session>();

  // ─── Lifecycle ──────────────────────────────────────────────────

  create(socketId: string): Session {
    const now = new Date();
    const session: Session = {
      socketId,
      conversationId: null,
      audioChunks: [],
      isRecording: false,
      agentState: 'idle',
      abortController: null,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(socketId, session);
    console.log(`[Session] Created session for socket ${socketId}`);
    return session;
  }

  get(socketId: string): Session | undefined {
    return this.sessions.get(socketId);
  }

  getOrCreate(socketId: string): Session {
    let session = this.sessions.get(socketId);
    if (!session) {
      session = this.create(socketId);
    }
    return session;
  }

  delete(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (session) {
      // Abort any in-flight operation
      if (session.abortController) {
        session.abortController.abort();
      }
      this.sessions.delete(socketId);
      console.log(`[Session] Deleted session for socket ${socketId}`);
    }
  }

  /**
   * Merge partial updates into the session and bump `updatedAt`.
   */
  update(socketId: string, updates: Partial<Session>): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    Object.assign(session, updates, { updatedAt: new Date() });
  }

  // ─── Audio Buffering ────────────────────────────────────────────

  addAudioChunk(socketId: string, base64: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    session.audioChunks.push(base64);
    session.updatedAt = new Date();
  }

  getAudioChunks(socketId: string): string[] {
    const session = this.sessions.get(socketId);
    return session ? [...session.audioChunks] : [];
  }

  clearAudioChunks(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    session.audioChunks = [];
    session.updatedAt = new Date();
  }

  // ─── Abort Handling ─────────────────────────────────────────────

  createAbortController(socketId: string): AbortController {
    const session = this.sessions.get(socketId);
    if (!session) {
      throw new Error(`No session for socket ${socketId}`);
    }
    // Abort any previous controller
    if (session.abortController) {
      session.abortController.abort();
    }
    const controller = new AbortController();
    session.abortController = controller;
    session.updatedAt = new Date();
    return controller;
  }

  abort(socketId: string): void {
    const session = this.sessions.get(socketId);
    if (!session) return;
    if (session.abortController) {
      session.abortController.abort();
      session.abortController = null;
    }
    session.updatedAt = new Date();
    console.log(`[Session] Aborted in-flight operation for socket ${socketId}`);
  }

  // ─── Utilities ──────────────────────────────────────────────────

  get size(): number {
    return this.sessions.size;
  }

  getAllSocketIds(): string[] {
    return Array.from(this.sessions.keys());
  }
}