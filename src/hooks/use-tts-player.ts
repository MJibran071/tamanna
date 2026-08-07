'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAgentStore } from '@/lib/stores/agent-store';

function base64ToBlob(base64: string, mimeType = 'audio/wav'): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes.buffer], { type: mimeType });
}

// Detect if audio playback is supported (headless browsers won't support it)
let audioSupported: boolean | null = null;
function canPlayAudio(): boolean {
  if (audioSupported !== null) return audioSupported;
  try {
    const a = new Audio();
    audioSupported = typeof a.play === 'function';
  } catch {
    audioSupported = false;
  }
  return audioSupported;
}

export function useTTSSlider() {
  const ttsQueue = useAgentStore((s) => s.ttsQueue);
  const isPlaying = useAgentStore((s) => s.isPlaying);
  const dequeueTTS = useAgentStore((s) => s.dequeueTTS);
  const setIsPlaying = useAgentStore((s) => s.setIsPlaying);
  const setAgentState = useAgentStore((s) => s.setAgentState);
  const flushTTSQueue = useAgentStore((s) => s.flushTTSQueue);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const isPlayingRef = useRef(false);
  const interruptedRef = useRef(false);
  const drainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Cleanup blob URL to avoid memory leak
  const releaseBlob = useCallback(() => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }
  }, []);

  // Fast idle reset — clears stuck speaking state
  const resetToIdle = useCallback(() => {
    if (drainTimerRef.current) {
      clearTimeout(drainTimerRef.current);
      drainTimerRef.current = null;
    }
    releaseBlob();
    flushTTSQueue();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setAgentState('idle');
  }, [releaseBlob, flushTTSQueue, setIsPlaying, setAgentState]);

  // Core playback loop — triggered when queue has items and nothing is playing
  useEffect(() => {
    if (isPlayingRef.current || ttsQueue.length === 0) return;

    // If audio playback is not supported, drain immediately
    if (!canPlayAudio()) {
      resetToIdle();
      return;
    }

    const chunk = dequeueTTS();
    if (!chunk) return;

    interruptedRef.current = false;
    const blob = base64ToBlob(chunk, 'audio/wav');
    const blobUrl = URL.createObjectURL(blob);
    currentBlobUrlRef.current = blobUrl;

    const audio = new Audio(blobUrl);
    currentAudioRef.current = audio;

    setIsPlaying(true);
    setAgentState('speaking');

    const handleDone = () => {
      if (interruptedRef.current) return;
      releaseBlob();
      setIsPlaying(false);
    };

    audio.onended = handleDone;

    audio.onerror = () => {
      console.warn('[TTS] Audio playback error');
      handleDone();
    };

    // Safety timeout: if audio doesn't end within 3s, force drain
    const safetyTimer = setTimeout(() => {
      if (!interruptedRef.current && isPlayingRef.current) {
        console.warn('[TTS] Safety drain — audio did not complete in 3s');
        try { audio.pause(); } catch {}
        releaseBlob();
        flushTTSQueue();
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }, 3000);

    audio.play().catch((err) => {
      console.warn('[TTS] Play failed:', err?.message);
      clearTimeout(safetyTimer);
      // If play fails, drain entire queue immediately
      releaseBlob();
      flushTTSQueue();
      setIsPlaying(false);
      isPlayingRef.current = false;
    });

    const origHandleDone = handleDone;
    audio.onended = () => {
      clearTimeout(safetyTimer);
      origHandleDone();
    };

    return () => {
      interruptedRef.current = true;
      clearTimeout(safetyTimer);
    };
  }, [ttsQueue, dequeueTTS, setIsPlaying, setAgentState, releaseBlob, flushTTSQueue, resetToIdle]);

  // When queue empties and not playing, go idle
  useEffect(() => {
    if (ttsQueue.length === 0 && !isPlaying) {
      setAgentState('idle');
    }
  }, [ttsQueue.length, isPlaying, setAgentState]);

  // Expose interrupt function for external use
  const interruptPlayback = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    releaseBlob();
    flushTTSQueue();
    setIsPlaying(false);
    isPlayingRef.current = false;
    setAgentState('idle');
  }, [releaseBlob, flushTTSQueue, setIsPlaying, setAgentState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      releaseBlob();
    };
  }, [releaseBlob]);

  return { interruptPlayback };
}
