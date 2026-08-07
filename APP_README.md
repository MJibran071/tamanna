# Tamanna — AI Voice Assistant

A sophisticated AI voice assistant with real-time streaming, glassmorphic design, and autonomous agent orchestration. Built with Next.js 16, Three.js, and the ZAI SDK.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start the web app (port 3000)
bun run dev

# Start the gateway (port 3003) — in a separate terminal
cd mini-services/tamanna-gateway && npx tsc && node dist/index.js
```

## 📱 Deployment Options

### Option 1: Web App (Current)
The app runs as a web application at `http://localhost:3000`. It's fully responsive and works on any browser.

### Option 2: Progressive Web App (PWA)
The web app is **already a PWA**. Users can install it directly from the browser:
- **Chrome/Edge**: Click "Install" in the browser address bar or the install banner
- **Safari (iOS)**: Tap Share → "Add to Home Screen"
- **Samsung Internet**: Menu → "Add to PWA"

PWA features:
- ✅ Offline caching with service worker
- ✅ Installable with custom icon
- ✅ Standalone mode (no browser chrome)
- ✅ Theme color matching
- ✅ Safe area support

### Option 3: Tauri Desktop App
Native desktop application for Windows, macOS, and Linux.

```bash
cd desktop-app
npm install
npm run tauri:dev      # Development
npm run tauri:build    # Production
```

Features:
- 🖥️ Native window (480×800, resizable)
- 📌 System tray with Open/Quit
- 🎨 System theme integration
- ⚡ < 10MB binary size

### Option 4: Capacitor Mobile App
Native iOS and Android apps.

```bash
cd mobile-app
npm install
npx cap add android    # or: npx cap add ios
npm run build:mobile
npm run cap:open:android  # or: npm run cap:open:ios
```

Features:
- 📱 Native status bar
- 🎬 Branded splash screen
- 📐 Portrait lock
- ⌨️ Keyboard handling
- 🔒 Safe area support

## 🏗️ Architecture

```
tamanna/
├── src/                          # Next.js frontend
│   ├── app/                      # App Router pages & API routes
│   │   ├── api/
│   │   │   ├── chat/             # Chat API (streaming + fallback)
│   │   │   └── gateway/          # Gateway management
│   │   └── page.tsx              # Main UI
│   ├── components/                # UI components
│   │   ├── voice-orb.tsx         # Three.js fluid orb
│   │   ├── pwa-register.tsx      # PWA install prompt
│   │   ├── message-history.tsx   # Chat messages
│   │   ├── text-input-bar.tsx    # Input with mic/send
│   │   └── ...                   # 20+ components
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-tts-player.ts     # Audio playback engine
│   │   └── use-audio-recorder.ts # Microphone recording
│   ├── lib/stores/agent-store.ts # Zustand state management
│   └── types/agent.ts            # TypeScript types
├── mini-services/
│   └── tamanna-gateway/          # Backend gateway (Bun/Node)
│       ├── src/index.ts          # HTTP server with SSE streaming
│       ├── src/worker.ts         # Isolated SDK worker (fork)
│       └── src/services/         # ZAI SDK services
├── desktop-app/                  # Tauri desktop wrapper
│   └── src-tauri/                # Rust source
├── mobile-app/                   # Capacitor mobile wrapper
│   └── capacitor.config.json     # Capacitor config
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   └── icons/                    # App icons (all sizes)
└── package.json
```

## 🧠 Key Features

- **Real-time Streaming**: LLM tokens stream to client as they generate; TTS audio plays sentence by sentence
- **Worker-Isolated Gateway**: Each request spawns an isolated child process — SDK segfaults can't crash the server
- **11 AI Agents**: Web search, image gen, VLM, translator, code assistant, math, research, writing, summarizer, analysis, web reader
- **Glassmorphic UI**: Lumina design system with glass-card/glass-pill components
- **Three.js Voice Orb**: Fluid animated orb with state-dependent effects (idle/listening/thinking/speaking)
- **Auto-Recovery**: Gateway auto-restarts on crash; frontend retries with exponential backoff
- **Dark Mode**: Full theme support via next-themes

## 🔧 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, shadcn/ui, Framer Motion |
| 3D | Three.js + GLSL shaders |
| State | Zustand |
| Audio | HTMLAudioElement, Web Audio API |
| Backend | Node.js HTTP server |
| AI | z-ai-web-dev-sdk (LLM, TTS, ASR, VLM, Image Gen) |
| Desktop | Tauri (Rust) |
| Mobile | Capacitor |

## 📊 Performance

- **Time-to-first-token**: ~700-1000ms (LLM streaming start)
- **Time-to-first-audio**: ~1.5-3s (first sentence TTS)
- **Full response latency**: ~2-4s (complete text + all audio)
- **Gateway stability**: Worker-isolated, auto-restart, no crash propagation
