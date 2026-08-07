/**
 * Tamanna Gateway — Resilient HTTP Gateway with Streaming Support
 *
 * Uses child_process.fork() to isolate ZAI SDK calls in short-lived worker processes.
 * This prevents segfaults in the native SDK from crashing the main gateway.
 *
 * Endpoints:
 *   GET  /health          — health check
 *   POST /chat            — text → response + TTS audio (single response)
 *   POST /chat/stream     — text → SSE stream of tokens + audio chunks
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { fork, type ChildProcess } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = join(__dirname, 'worker.js');

// Simple agent registry for health display
const AGENTS = ['web_search', 'web_reader', 'image_gen', 'vlm', 'analysis', 'code_assistant', 'translator', 'summarizer', 'math', 'research', 'writing'];

// ─── Active workers pool ───────────────────────────────────────────

const activeWorkers = new Map<string, ChildProcess>();
const pendingRequests = new Map<string, {
  resolve: (data: any) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}>();

function getWorkerId(): string {
  return 'w_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
}

/**
 * Spawn a worker to handle one chat request (non-streaming).
 * Returns full result when complete.
 */
function spawnWorker(text: string, attachments?: any[], voiceSpeed?: number, language?: string, agentId?: string): Promise<{ text: string; ttsChunks: string[] }> {
  return new Promise((resolve, reject) => {
    const id = getWorkerId();
    const timeout = setTimeout(() => {
      cleanupWorker(id);
      reject(new Error('Worker timeout after 45s'));
    }, 45000);

    pendingRequests.set(id, { resolve, reject, timer: timeout });

    const child = fork(WORKER_PATH, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env },
      detached: false,
    });

    activeWorkers.set(id, child);

    let outputBuffer = '';

    child.stdout.on('data', (data: Buffer) => {
      outputBuffer += data.toString();
      const lines = outputBuffer.split('\n');
      outputBuffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          if (msg.type === 'done') {
            cleanupWorker(id);
            // Collect all chunks from the session
            const chunks: string[] = [];
            resolve({ text: msg.text || '', ttsChunks: chunks });
          } else if (msg.type === 'error') {
            cleanupWorker(id);
            reject(new Error(msg.message));
          }
        } catch { /* incomplete JSON, skip */ }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log(`[Worker:${id}] ${msg}`);
    });

    child.on('exit', (code, signal) => {
      console.log(`[Worker:${id}] exited code=${code} signal=${signal}`);
      activeWorkers.delete(id);
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        clearTimeout(pending.timer);
        reject(new Error(`Worker exited unexpectedly (code ${code}, signal ${signal})`));
      }
    });

    child.on('error', (err) => {
      console.error(`[Worker:${id}] error:`, err.message);
      cleanupWorker(id);
      reject(err);
    });

    const msgType = agentId ? 'tool' : 'chat';
    const msgPayload: Record<string, unknown> = { type: msgType, text, attachments: attachments || [], voiceSpeed: voiceSpeed || 1.15, language: language || 'en' };
    if (agentId) msgPayload.agentId = agentId;
    child.stdin.write(JSON.stringify(msgPayload) + '\n');
  });
}

/**
 * Spawn a worker for streaming — forwards stdout events to HTTP response as SSE.
 */
function spawnStreamingWorker(text: string, res: ServerResponse, attachments?: any[], voiceSpeed?: number, language?: string, agentId?: string): void {
  const id = getWorkerId();

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  // Client abort handler
  let aborted = false;
  res.on('close', () => {
    aborted = true;
    cleanupWorker(id);
    console.log(`[Stream:${id}] Client disconnected`);
  });

  const timeout = setTimeout(() => {
    if (!aborted) {
      cleanupWorker(id);
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Worker timeout after 45s' })}\n\n`);
      res.end();
    }
  }, 45000);

  const child = fork(WORKER_PATH, [], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
    env: { ...process.env },
    detached: false,
  });

  activeWorkers.set(id, child);

  child.stdout.on('data', (data: Buffer) => {
    if (aborted) return;
    const text = data.toString();
    // Each stdout line is a JSON message — forward as SSE event
    // Worker already writes complete lines with \n, we add double \n for SSE
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        // Validate it's JSON before forwarding
        JSON.parse(trimmed);
        res.write(`data: ${trimmed}\n\n`);
      } catch {
        // Skip non-JSON lines
      }
    }
  });

  child.stderr.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[Stream:${id}] ${msg}`);
  });

  child.on('exit', (code, signal) => {
    console.log(`[Stream:${id}] exited code=${code} signal=${signal}`);
    activeWorkers.delete(id);
    clearTimeout(timeout);
    if (!aborted) {
      res.end();
    }
  });

  child.on('error', (err) => {
    console.error(`[Stream:${id}] error:`, err.message);
    cleanupWorker(id);
    clearTimeout(timeout);
    if (!aborted) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    }
  });

  const msgType = agentId ? 'tool' : 'chat';
  const msgPayload: Record<string, unknown> = { type: msgType, text, attachments: attachments || [], voiceSpeed: voiceSpeed || 1.15, language: language || 'en' };
  if (agentId) msgPayload.agentId = agentId;
  child.stdin.write(JSON.stringify(msgPayload) + '\n');
}

function cleanupWorker(id: string) {
  const pending = pendingRequests.get(id);
  if (pending) {
    pendingRequests.delete(id);
    clearTimeout(pending.timer);
  }
  const child = activeWorkers.get(id);
  if (child) {
    activeWorkers.delete(id);
    try { child.stdin.destroy(); } catch { /* ignore */ }
    try { child.stdout.destroy(); } catch { /* ignore */ }
    try { child.stderr.destroy(); } catch { /* ignore */ }
    try { child.disconnect(); } catch { /* ignore */ }
    try { child.kill('SIGKILL'); } catch { /* already dead */ }
    child.unref();
  }
}

// ─── JSON body parser ──────────────────────────────────────────────

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// ─── HTTP Handler ───────────────────────────────────────────────────

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  // Health
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/')) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({
      status: 'ok',
      agents: AGENTS,
      activeWorkers: activeWorkers.size,
      pendingRequests: pendingRequests.size,
      timestamp: Date.now(),
    }));
    return;
  }

  // POST /chat/stream — SSE streaming endpoint
  if (req.method === 'POST' && req.url === '/chat/stream') {
    try {
      const bodyStr = await parseBody(req);
      const body = JSON.parse(bodyStr);
      const text = body?.text;
      const attachments = body?.attachments;
      const voiceSpeed = body?.voiceSpeed;
      const language = body?.language;

      if (!text?.trim() && !(attachments?.length > 0)) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Text or attachment is required' }));
        return;
      }

      const displayText = text || '[multimodal request with attachments]';
      console.log(`[Gateway] /chat/stream: "${displayText.substring(0, 60)}..." (${attachments?.length || 0} attachment(s), speed=${voiceSpeed || 1.15})`);
      spawnStreamingWorker(text || '', res, attachments, voiceSpeed, language, body?.agentId);
    } catch (err: any) {
      console.error('[Gateway] /chat/stream error:', err?.message || err);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
    }
    return;
  }

  // POST /chat — single response endpoint
  if (req.method === 'POST' && req.url === '/chat') {
    try {
      const bodyStr = await parseBody(req);
      const body = JSON.parse(bodyStr);
      const text = body?.text;
      const attachments = body?.attachments;
      const voiceSpeed = body?.voiceSpeed;
      const language = body?.language;

      if (!text?.trim() && !(attachments?.length > 0)) {
        res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ error: 'Text or attachment is required' }));
        return;
      }

      const displayText = text || '[multimodal request with attachments]';
      console.log(`[Gateway] /chat: "${displayText.substring(0, 60)}..." (${attachments?.length || 0} attachment(s), speed=${voiceSpeed || 1.15})`);
      const start = performance.now();

      const result = await spawnWorker(text || '', attachments, voiceSpeed, language, body?.agentId);
      const elapsed = performance.now() - start;

      console.log(`[Gateway] Done in ${elapsed.toFixed(0)}ms — response: "${result.text.substring(0, 60)}..."`);

      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        text: result.text,
        ttsChunks: result.ttsChunks,
        latencyMs: Math.round(elapsed),
      }));
    } catch (err: any) {
      console.error('[Gateway] /chat error:', err?.message || err);
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: err?.message || 'Internal error' }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end('Not Found');
}

// ─── Server ─────────────────────────────────────────────────────────

const server = createServer(handleRequest);

process.on('uncaughtException', (err) => {
  console.error('[Gateway] UNCAUGHT:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Gateway] UNHANDLED:', reason);
});

const PORT = 3003;

server.listen(PORT, () => {
  console.log(`[Gateway] Tamanna gateway (worker-isolated + streaming) listening on port ${PORT}`);
  console.log(`[Gateway] Endpoints: GET /health, POST /chat, POST /chat/stream`);
});

// Heartbeat
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`[Gateway] Heartbeat — heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB, workers: ${activeWorkers.size}`);
}, 30000);

const shutdown = () => {
  console.log('[Gateway] Shutting down...');
  for (const [id] of activeWorkers) cleanupWorker(id);
  server.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
