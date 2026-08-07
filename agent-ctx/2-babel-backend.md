# Task 2: Babel Backend — Universal Real-Time Voice Translator API

## Completed

### 1. Prisma Schema — TranslationLog model
- Added `TranslationLog` model to `prisma/schema.prisma`
- Fields: id, sourceText, translatedText, sourceLang, targetLang, engineUsed, mode, durationMs, audioSize, createdAt
- Indexes on [sourceLang, targetLang], [createdAt], [engineUsed]
- Ran `bun run db:push` — schema synced and Prisma client regenerated

### 2. `/api/babel/translate` — Main Translation Pipeline (POST)
- Accepts `{ text, sourceLang, targetLang, mode?, speak? }`
- Translates via `z-ai-web-dev-sdk` LLM (qwen3-1.7b, temp=0.3)
- Strips qwen3  &#10;think blocks from output
- If `speak: true`, proxies to voice stack TTS and returns base64 audio
- Logs every translation to TranslationLog via Prisma
- Returns `{ translatedText, sourceLang, targetLang, engineUsed?, audioBase64?, latencyMs }`

### 3. `/api/babel/languages` — Supported Languages (GET)
- Returns 18 languages with name, native name, flag emoji, engine, ttsReady
- Includes 12 popular language pairs for quick access
- Includes 10 quick travel/help phrases
- Returns `totalLanguages` and `ttsReadyCount` metadata

### 4. `/api/babel/speak` — Translate + Speak (POST)
- Accepts `{ text, sourceLang, targetLang, voice?, speed? }`
- Translates via LLM, then generates TTS audio via voice stack
- Always returns audio (unlike /translate which has optional speak)
- Logs with `mode: 'voice'`
- Returns `{ translatedText, audioBase64, engineUsed, latencyMs }`

### 5. `/api/babel/history` — Translation History (GET)
- Accepts `?limit=20&offset=0&sourceLang=en&targetLang=ur`
- Paginated results with `hasMore` flag
- Can filter by single language (searches both source and target)
- Or filter by specific language pair
- Returns `{ logs[], pagination: { total, limit, offset, hasMore } }`

### Notes
- All routes have `export const dynamic = 'force-dynamic'`
- Voice stack proxied via `VOICE_STACK_URL` env (default `http://localhost:3010`)
- TTS calls have 30s timeout with AbortController
- Lint passes clean, dev server compiles successfully