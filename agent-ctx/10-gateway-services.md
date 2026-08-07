# Task 10: Tamanna Gateway Services & Entry Point

## Status: ✅ COMPLETED

## Files Created/Updated

### Service Layer (`src/services/`)

| File | Description |
|------|-------------|
| `zai.ts` | ZAI SDK singleton — pre-warmed, reused everywhere. `getZAI()` lazy-initializes once, `resetZAI()` clears the instance. |
| `asr.ts` | ASR wrapper — converts base64 audio to text. 3 retries with exponential backoff (500ms × 2^attempt). |
| `tts.ts` | TTS wrapper — splits text on sentence boundaries (max 1000 chars/chunk), falls back to word-boundary splitting. Each chunk synthesized to WAV base64. Voice: `tongtong`, speed: 1.0. |
| `cache.ts` | In-memory LRU cache with TTL. Map-based with re-insertion on `get()` for LRU ordering. `cleanup()` removes expired entries. |
| `memory.ts` | MemoryEngine — CRUD wrapper over Prisma MemoryNode/MemoryEdge tables. LRU-cached node lookups. `buildContext()` for query-time retrieval. |

### Core Infrastructure

| File | Description |
|------|-------------|
| `session.ts` | `SessionManager` — per-socket state: audio chunk buffering, agent state machine (idle→listening→transcribing→planning→executing→speaking→error), AbortController management. |
| `orchestrator.ts` | `AgentOrchestrator` — the brain. Pipeline: Plan (LLM) → Execute (sequential LLM calls per step) → Respond (final synthesis) → Speak (TTS). Emits granular events. Supports cancellation via AbortSignal. LRU-cached final responses. |

### Entry Point

| File | Description |
|------|-------------|
| `src/index.ts` | Socket.io server on port 3003. CORS: allow all. Path: `/` for Caddy. Handles: `connection`, `disconnect`, `session:start`, `audio:chunk`, `audio:stop`, `text:send`, `cancel`, `conversation:load`. Graceful shutdown on SIGTERM/SIGINT. |

### Config

| File | Description |
|------|-------------|
| `package.json` | Dependencies: socket.io, @prisma/client, z-ai-web-dev-sdk, prisma. Scripts: `dev` (bun --hot), `start` (bun). |
| `tsconfig.json` | ES2022 target, bundler module resolution, strict mode. |
| `.env` | `DATABASE_URL="file:../../db/custom.db"` — points to the root project's SQLite database. |
| `prisma/schema.prisma` | Copied from root — needed for local `prisma generate`. |

## Socket Event Protocol

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `session:start` | `{ conversationId?: string }` | Start new or resume existing conversation. |
| `audio:chunk` | `{ base64: string }` | Buffer a base64 audio chunk during recording. |
| `audio:stop` | — | End recording → transcribe → orchestrate → TTS. |
| `text:send` | `{ text: string }` | Direct text input (bypasses ASR). |
| `cancel` | — | Cancel in-flight processing. |
| `conversation:load` | `{ conversationId: string }` | Load messages for a conversation. |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `status` | `{ state: AgentState }` | Agent state change. |
| `session:started` | `{ conversationId, messages[] }` | Session initialized. |
| `audio:ack` | `{ chunkSize: number }` | Audio chunk buffered. |
| `transcription` | `{ text, isFinal }` | ASR result. |
| `plan:started` | — | Planning phase started. |
| `plan:completed` | `{ steps[] }` | Plan ready. |
| `step:started` | `{ index, agentType }` | Agent step execution started. |
| `step:completed` | `{ index, agentType, durationMs }` | Agent step done. |
| `tts:started` | — | TTS synthesis started. |
| `tts:progress` | `{ chunkIndex, totalChunks }` | TTS progress. |
| `audio:response` | `{ base64, chunkIndex, totalChunks, isLast }` | Audio chunk for playback. |
| `tts:completed` | `{ totalChunks }` | All audio sent. |
| `message:saved` | `{ role, content }` | Message persisted to DB. |
| `cancelled` | `{ message }` | Processing was cancelled. |
| `error` | `{ message }` | Error occurred. |

## Verification

- Service starts on port 3003 ✅
- Prisma client generated locally ✅
- Database path resolves to root `db/custom.db` ✅
- Graceful shutdown tested ✅
