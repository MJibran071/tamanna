'use client';

import { useState, useEffect, useRef, useCallback, lazy, Suspense, Component, ReactNode } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useAudioRecorder } from '@/hooks/use-audio-recorder';
import { useTTSSlider } from '@/hooks/use-tts-player';
import { useAgentStore } from '@/lib/stores/agent-store';
import TopBar from '@/components/top-bar';
import BottomNav from '@/components/bottom-nav';
import MessageHistory from '@/components/message-history';
import TextInputBar from '@/components/text-input-bar';
import WelcomeGreeting from '@/components/welcome-greeting';
import { useKeyboardShortcuts } from '@/components/keyboard-shortcuts';
import { useFileUpload } from '@/components/file-upload';
import {
  TalkStatusBar,
  TalkSuggestionChips,
  TalkSocialConnect,
  TalkStepProgress,
  TalkAudioWaveform,
} from '@/components/talk-widgets';
import type { Attachment } from '@/types/agent';
import { DEFAULT_VOICE_SPEED, DEFAULT_LANGUAGE } from '@/lib/constants';
import { motion, AnimatePresence } from 'framer-motion';

// Only 5 lazy imports
const HistoryPanel = lazy(() => import('@/components/history-panel'));
const ToolsPanel = lazy(() => import('@/components/tools-panel'));
const TaskDashboard = lazy(() => import('@/components/task-dashboard'));
const FileWorkspace = lazy(() => import('@/components/file-workspace'));
const UltraModeDashboard = lazy(() => import('@/components/god-mode-dashboard'));
const AgentTabContent = lazy(() => import('@/components/agent-tab-content'));
const VoiceOrb = lazy(() => import('@/components/voice-orb'));
const KeyboardShortcutsPanel = lazy(() => import('@/components/keyboard-shortcuts'));
const OnboardingModal = lazy(() => import('@/components/onboarding-modal'));
const FileDropZone = lazy(() => import('@/components/file-upload').then(m => ({ default: m.FileDropZone })));

function PanelLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-lumina-primary/30 border-t-lumina-primary animate-spin" />
    </div>
  );
}

function PanelError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-12 h-12 rounded-full bg-lumina-error/10 flex items-center justify-center">
        <span className="text-lumina-error text-lg font-bold">!</span>
      </div>
      <p className="text-sm text-lumina-on-surface-variant/70 text-center max-w-[280px]">
        Failed to load. The server may be restarting.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="glass-pill px-4 py-1.5 text-xs font-medium text-lumina-primary hover:bg-lumina-primary/10 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/** Error boundary that catches chunk-load and render errors, showing a retry button */
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <PanelError onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

function OrbSkeleton() {
  return (
    <div className="orb-container mx-auto mb-12 flex justify-center items-center">
      <div className="w-48 h-48 md:w-64 md:h-64 rounded-full bg-gradient-to-br from-lumina-primary/30 to-lumina-primary-container/20 animate-pulse blur-sm" />
    </div>
  );
}

/**
 * Send text via streaming SSE.
 */
async function sendTextStreaming(
  text: string,
  attachments: Attachment[] | undefined,
  onToken: (token: string) => void,
  onChunk: (audioBase64: string, index: number) => void,
  onDone: (fullText: string, latencyMs: number) => void,
  onError: (err: string) => void,
  abortSignal: AbortSignal,
  conversationId?: string | null,
  agentId?: string,
): Promise<boolean> {
  const controller = new AbortController();
  const combinedSignal = AbortSignal.any([abortSignal, controller.signal]);

  try {
    const settings = typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('tamanna_settings') || '{}')
      : {};
    const voiceSpeed = settings.voiceSpeed || DEFAULT_VOICE_SPEED;
    const language = settings.language || DEFAULT_LANGUAGE;

    const payload: Record<string, unknown> = { text: text || '', voiceSpeed, language };
    if (attachments?.length) {
      payload.attachments = attachments.map((a) => ({
        type: a.type, name: a.name, mimeType: a.mimeType, size: a.size, base64Data: a.base64Data,
      }));
    }
    if (conversationId) payload.conversationId = conversationId;
    if (agentId) payload.agentId = agentId;

    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: combinedSignal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }

    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let audioIndex = 0;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              fullText += parsed.token;
              onToken(parsed.token);
            }
            if (parsed.audio) {
              onChunk(parsed.audio, audioIndex++);
            }
          } catch { /* skip */ }
        }
      }
    }

    onDone(fullText, performance.now() - performance.now());
    return true;
  } catch (err) {
    if (err instanceof Error && (err.message.includes('abort') || err.message.includes('AbortError'))) return false;
    onError(err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function sendTextDirect(
  text: string,
  attachments: Attachment[] | undefined,
  conversationId?: string | null,
  agentId?: string,
) {
  const settings = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('tamanna_settings') || '{}')
    : {};
  const voiceSpeed = settings.voiceSpeed || DEFAULT_VOICE_SPEED;
  const language = settings.language || DEFAULT_LANGUAGE;

  const payload: Record<string, unknown> = { text: text || '', voiceSpeed, language };
  if (attachments?.length) {
    payload.attachments = attachments.map((a) => ({
      type: a.type, name: a.name, mimeType: a.mimeType, size: a.size, base64Data: a.base64Data,
    }));
  }
  if (conversationId) payload.conversationId = conversationId;
  if (agentId) payload.agentId = agentId;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    if (res.status === 502) {
      try {
        await fetch('/api/gateway/restart', { method: 'POST' });
        const retry = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (retry.ok) return retry.json() as Promise<{ text: string; ttsChunks?: string[] }>;
      } catch { /* ok */ }
    }
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ text: string; ttsChunks?: string[] }>;
}

export default function HomePage() {
  const { socket } = useSocket();
  const { interruptPlayback } = useTTSSlider();
  const { startRecording, stopRecording } = useAudioRecorder();
  const chatAbortRef = useRef<AbortController | null>(null);
  const isSendingRef = useRef(false);
  const streamingTextRef = useRef('');

  const agentState = useAgentStore((s) => s.agentState);
  const conversationId = useAgentStore((s) => s.conversationId);
  const transcription = useAgentStore((s) => s.transcription);
  const transcriptionIsFinal = useAgentStore((s) => s.transcriptionIsFinal);
  const error = useAgentStore((s) => s.error);
  const messages = useAgentStore((s) => s.messages);
  const streamingText = useAgentStore((s) => s.streamingText);
  const activeTab = useAgentStore((s) => s.activeTab);
  const setAgentState = useAgentStore((s) => s.setAgentState);
  const addMessage = useAgentStore((s) => s.addMessage);
  const updateLastAssistantMessage = useAgentStore((s) => s.updateLastAssistantMessage);
  const enqueueTTS = useAgentStore((s) => s.enqueueTTS);
  const setError = useAgentStore((s) => s.setError);
  const setActiveTab = useAgentStore((s) => s.setActiveTab);
  const saveCurrentConversation = useAgentStore((s) => s.saveCurrentConversation);
  const loadPersistedConversations = useAgentStore((s) => s.loadPersistedConversations);
  const setStreamingText = useAgentStore((s) => s.setStreamingText);
  const clearPendingAttachments = useAgentStore((s) => s.clearPendingAttachments);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const isListening = agentState === 'listening';
  const isProcessing = agentState === 'planning' || agentState === 'executing' || agentState === 'speaking';
  const isThinking = agentState === 'planning';

  const lastAssistantMessage = messages.length > 0
    ? [...messages].reverse().find((m) => m.role === 'assistant')
    : null;

  useEffect(() => { loadPersistedConversations(); }, [loadPersistedConversations]);

  const handleTabChange = useCallback((tab: string) => {
    if (activeTab === 'talk' && tab !== 'talk' && messages.length > 0) {
      saveCurrentConversation();
    }
    setActiveTab(tab);
  }, [activeTab, messages.length, saveCurrentConversation, setActiveTab]);

  const startNewConversation = useAgentStore((s) => s.startNewConversation);
  useKeyboardShortcuts({
    isOpen: shortcutsOpen,
    onClose: () => setShortcutsOpen(false),
    onToggle: () => setShortcutsOpen((prev) => !prev),
    onNewChat: () => { startNewConversation(); },
    onTabSwitch: (tab: string) => { handleTabChange(tab); },
  });

  const interruptAll = useCallback(() => {
    if (chatAbortRef.current) { chatAbortRef.current.abort(); chatAbortRef.current = null; }
    interruptPlayback();
    isSendingRef.current = false;
    streamingTextRef.current = '';
    setStreamingText('');
  }, [interruptPlayback, setStreamingText]);

  const sendTextMessage = useCallback(async (text: string, attachments?: Attachment[], agentId?: string) => {
    if ((!text.trim() && !attachments?.length) || isSendingRef.current) return;
    interruptAll();
    isSendingRef.current = true;

    addMessage({ id: crypto.randomUUID(), role: 'user' as const, content: text, timestamp: new Date(), attachments: attachments?.length ? attachments : undefined });
    clearPendingAttachments();
    setAgentState('planning');
    setError(null);
    streamingTextRef.current = '';
    setStreamingText('');

    const assistantId = crypto.randomUUID();
    addMessage({ id: assistantId, role: 'assistant', content: '', timestamp: new Date() });

    const t0 = performance.now();
    const abortController = new AbortController();
    chatAbortRef.current = abortController;

    const hasAttachments = attachments && attachments.length > 0;
    const displayText = text || (hasAttachments ? 'Describe these files' : '');

    const streamed = await sendTextStreaming(
      displayText, attachments,
      (token) => {
        streamingTextRef.current += token;
        setStreamingText(streamingTextRef.current);
        updateLastAssistantMessage(streamingTextRef.current);
        const state = useAgentStore.getState().agentState;
        if (state === 'planning') setAgentState('executing');
      },
      (audio, idx) => { enqueueTTS([audio]); },
      (fullText) => { streamingTextRef.current = fullText; setStreamingText(''); updateLastAssistantMessage(fullText); },
      (errMsg) => { setError(errMsg); },
      abortController.signal, conversationId, agentId,
    );

    if (!streamed && !abortController.signal.aborted) {
      try {
        const result = await sendTextDirect(displayText, attachments, conversationId, agentId);
        if (result.text) { setStreamingText(''); updateLastAssistantMessage(result.text); }
        if (result.ttsChunks?.length) { enqueueTTS(result.ttsChunks); }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('abort')) return;
        setError(msg);
      }
    }
  }, [conversationId, addMessage, updateLastAssistantMessage, enqueueTTS, setAgentState, setError, interruptAll, setStreamingText, clearPendingAttachments]);

  const handleOrbClick = async () => {
    const sock = socket.current;
    try {
      if (agentState === 'idle' || agentState === 'error') {
        setError(null); setAgentState('listening'); await startRecording(sock);
      } else if (agentState === 'listening') { stopRecording(sock); }
      else if (agentState === 'speaking' || isProcessing) { interruptAll(); setAgentState('idle'); }
    } catch (err) { setError(err instanceof Error ? err.message : 'An unexpected error occurred.'); }
  };

  const handleSuggestionSelect = useCallback((label: string) => {
    if (!label.trim() || isProcessing) return;
    sendTextMessage(label);
  }, [isProcessing, sendTextMessage]);

  const handleAgentSelect = useCallback((query: string, agentId: string) => {
    if (!query.trim() || isProcessing) return;
    handleTabChange('talk');
    sendTextMessage(query, undefined, agentId);
  }, [isProcessing, handleTabChange, sendTextMessage]);

  const handleAgentCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    try {
      const res = await fetch('/api/actions/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command }) });
      const data = await res.json();
      if (data.summary) { useAgentStore.getState().addMessage({ role: 'assistant', content: data.summary, isFinal: true }); }
    } catch (err) { console.error('Agent command failed:', err); }
  }, []);

  const handleTextSubmit = useCallback((text: string, attachments?: any[]) => { sendTextMessage(text, attachments); }, [sendTextMessage]);

  const handleRegenerate = useCallback(() => {
    const msgs = useAgentStore.getState().messages;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        useAgentStore.getState().setMessages(msgs.slice(0, -1));
        sendTextMessage(msgs[i].content);
        break;
      }
    }
  }, [sendTextMessage]);

  const showThinking = agentState === 'transcribing' || isThinking;
  const showResponse = lastAssistantMessage && (agentState === 'idle' || agentState === 'executing' || agentState === 'speaking');
  const showStreaming = streamingText.length > 0 && (agentState === 'executing' || agentState === 'planning' || agentState === 'speaking');

  return (
    <Suspense fallback={null}>
      <FileDropZone onFilesDropped={useFileUpload().processFiles} disabled={isProcessing}>
        <div className="min-h-screen flex flex-col overflow-x-hidden">
          <TopBar activeTab={activeTab} onTabChange={handleTabChange} />

          <main className="flex-grow flex flex-col items-center px-6 md:px-16 pt-28 pb-36 md:pb-28 max-w-[800px] mx-auto w-full relative z-10 overflow-y-auto scroll-smooth">
            <AnimatePresence mode="wait">
              {activeTab === 'talk' && (
                <motion.div key="talk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full flex flex-col items-center">
                  <div className="flex justify-center mb-2">
                    <div className={`orb-glow ${isListening || agentState === 'speaking' ? 'listening' : ''} ${isThinking ? 'orb-thinking' : ''} ${agentState === 'speaking' ? 'orb-speaking' : ''}`}>
                      <Suspense fallback={<OrbSkeleton />}><VoiceOrb isListening={isListening} isThinking={isThinking} isSpeaking={agentState === 'speaking'} onClick={handleOrbClick} isProcessing={isProcessing} /></Suspense>
                    </div>
                  </div>

                  <WelcomeGreeting visible={agentState === 'idle' && !transcription && !lastAssistantMessage && !streamingText && messages.length === 0} />

                  <div className="w-full max-w-2xl text-center min-h-[100px] flex flex-col justify-end mb-6">
                    {error && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 mb-3">
                        <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center"><span className="text-red-500 text-xs">!</span></div>
                        <p className="text-sm text-red-500/80 max-w-xs">{error}</p>
                      </motion.div>
                    )}

                    {transcription && (
                      <motion.p key={transcription} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className={`text-2xl md:text-[48px] font-semibold leading-tight md:leading-[56px] ${isListening ? 'text-lumina-primary' : 'text-lumina-on-surface/80'} ${!transcriptionIsFinal ? 'opacity-60' : 'opacity-100'}`}>
                        {transcription}
                      </motion.p>
                    )}

                    {showStreaming && !transcription && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-lg leading-7 text-lumina-on-surface">
                        {streamingText}<span className="inline-block w-0.5 h-5 bg-lumina-primary ml-0.5 animate-pulse rounded-full" />
                      </motion.p>
                    )}

                    {showThinking && !transcription && !showStreaming && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl md:text-3xl font-medium text-lumina-on-surface-variant/60">
                        <span className="inline-flex items-center gap-2"><ThinkingDots />{agentState === 'transcribing' ? 'Transcribing...' : 'Thinking...'}</span>
                      </motion.p>
                    )}

                    {agentState === 'idle' && !transcription && !lastAssistantMessage && !streamingText && messages.length > 0 && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-2xl md:text-[48px] font-semibold text-lumina-on-surface/40">Tap to speak</motion.p>
                    )}

                    {showResponse && !transcription && !showStreaming && lastAssistantMessage && (
                      <motion.p key={lastAssistantMessage.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="text-lg leading-7 text-lumina-on-surface-variant">
                        {lastAssistantMessage.content}
                      </motion.p>
                    )}
                  </div>

                  <div className="w-full mb-4"><TalkStatusBar /></div>
                  <div className="flex justify-center mb-3"><TalkAudioWaveform /></div>
                  <div className="w-full mb-6">
                    <TextInputBar socketRef={socket} onSubmit={handleTextSubmit} onInterrupt={() => { interruptAll(); setAgentState('idle'); }} isLoading={isProcessing} startRecording={startRecording} stopRecording={stopRecording} />
                  </div>
                  <div className="w-full mb-6"><TalkStepProgress /></div>
                  {(agentState === 'idle' || agentState === 'error') && <TalkSuggestionChips onSelect={handleSuggestionSelect} disabled={isProcessing} />}
                  <div className="w-full mb-6"><TalkSocialConnect /></div>
                  <div className="w-full mt-6"><MessageHistory onRegenerate={handleRegenerate} /></div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full pt-2">
                  <ErrorBoundary><Suspense fallback={<PanelLoader />}><HistoryPanel /></Suspense></ErrorBoundary>
                </motion.div>
              )}

              {activeTab === 'tasks' && (
                <motion.div key="tasks" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full pt-2 space-y-6">
                  <ErrorBoundary><Suspense fallback={<PanelLoader />}><TaskDashboard /></Suspense></ErrorBoundary>
                  <ErrorBoundary><Suspense fallback={<PanelLoader />}><FileWorkspace /></Suspense></ErrorBoundary>
                </motion.div>
              )}


              {activeTab === 'tools' && (
                <motion.div key="tools" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full pt-2 space-y-6">
                  <ErrorBoundary><Suspense fallback={<PanelLoader />}><ToolsPanel onAgentSelect={handleAgentSelect} /></Suspense></ErrorBoundary>
                </motion.div>
              )}

              {activeTab === 'agent' && (
                <motion.div key="agent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="w-full pt-2 space-y-6">
                  <ErrorBoundary><Suspense fallback={<PanelLoader />}><UltraModeDashboard onSendCommand={handleAgentCommand} /></Suspense></ErrorBoundary>
                  <ErrorBoundary><Suspense fallback={<PanelLoader />}><AgentTabContent onSendCommand={handleAgentCommand} /></Suspense></ErrorBoundary>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        <Suspense fallback={null}><KeyboardShortcutsPanel open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} /></Suspense>
        <Suspense fallback={null}><OnboardingModal onSelectSuggestion={handleSuggestionSelect} /></Suspense>
      </FileDropZone>
    </Suspense>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-lumina-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-lumina-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-lumina-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
    </span>
  );
}
