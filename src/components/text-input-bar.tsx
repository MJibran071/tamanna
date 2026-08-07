'use client';

import { useState, useCallback, useRef, type RefObject } from 'react';
import { Send, Mic, MicOff, StopCircle } from 'lucide-react';
import { useAgentStore } from '@/lib/stores/agent-store';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploadTrigger, PendingAttachments } from '@/components/file-upload';
import { useFileUpload } from '@/components/file-upload';
import type { Socket } from 'socket.io-client';

interface TextInputBarProps {
  socketRef: RefObject<Socket | null>;
  onSubmit: (text: string, attachments?: any[]) => void;
  onInterrupt?: () => void;
  isLoading?: boolean;
  startRecording: (socket: Socket) => Promise<void>;
  stopRecording: (socket: Socket) => void;
}

const MAX_CHARS = 500;

export default function TextInputBar({ socketRef, onSubmit, onInterrupt, isLoading, startRecording, stopRecording }: TextInputBarProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const agentState = useAgentStore((s) => s.agentState);
  const setAgentState = useAgentStore((s) => s.setAgentState);
  const setError = useAgentStore((s) => s.setError);
  const pendingAttachments = useAgentStore((s) => s.pendingAttachments);
  const clearPendingAttachments = useAgentStore((s) => s.clearPendingAttachments);

  const { processFiles } = useFileUpload();

  const isRecording = agentState === 'listening';
  const isProcessing = agentState === 'planning' || agentState === 'executing' || agentState === 'speaking';
  const isDisabled = isLoading || isProcessing;

  const charCount = value.length;
  const charRatio = charCount / MAX_CHARS;
  const isNearLimit = charRatio > 0.8;
  const isAtLimit = charRatio > 0.95;

  const hasContent = value.trim().length > 0 || pendingAttachments.length > 0;

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!hasContent || isDisabled) return;
    onSubmit(trimmed, pendingAttachments.length > 0 ? pendingAttachments : undefined);
    setValue('');
    clearPendingAttachments();
    // Refocus input after submit
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [value, hasContent, isDisabled, onSubmit, pendingAttachments, clearPendingAttachments]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      // Prevent typing beyond max characters
      const input = e.target as HTMLInputElement;
      if (input.value.length >= MAX_CHARS && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
      }
    },
    [handleSubmit]
  );

  const handleMicToggle = useCallback(async () => {
    const sock = socketRef.current;
    if (!sock) return;

    try {
      if (!isRecording) {
        setError(null);
        setAgentState('listening');
        await startRecording(sock);
      } else {
        stopRecording(sock);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    }
  }, [isRecording, socketRef, startRecording, stopRecording, setAgentState, setError]);

  return (
    <div className="w-full max-w-[640px] mx-auto">
      {/* Pending attachments preview */}
      <AnimatePresence>
        {pendingAttachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="mb-2 glass-card rounded-2xl p-2"
          >
            <PendingAttachments />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card rounded-2xl md:rounded-full flex items-center px-3 py-2 md:px-4 md:py-2 gap-2">
        {/* Mic button — larger touch target on mobile */}
        <button
          type="button"
          onClick={handleMicToggle}
          disabled={isDisabled}
          className={`shrink-0 p-2.5 md:p-2 rounded-xl md:rounded-full transition-all duration-200 ${
            isRecording
              ? 'text-red-500 bg-red-500/15 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
              : 'text-lumina-primary hover:bg-lumina-surface-variant/50'
          } ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          <AnimatePresence mode="wait">
            {isRecording ? (
              <motion.div
                key="stop"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <MicOff className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div
                key="mic"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Mic className="w-5 h-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        {/* Text input — optimized for mobile */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
          placeholder="Type a message..."
          className="flex-1 bg-transparent outline-none text-lumina-on-surface placeholder:text-lumina-on-surface-variant/40 font-[family-name:var(--font-body)] text-[15px] min-w-0 py-1"
          autoComplete="off"
          autoCorrect="on"
          spellCheck
        />

        {/* File attach button */}
        <FileUploadTrigger
          onFilesSelected={processFiles}
          disabled={isDisabled || pendingAttachments.length >= 4}
        />

        {/* Send button — animated appearance */}
        <AnimatePresence>
          {hasContent && !isDisabled && (
            <motion.button
              type="button"
              onClick={handleSubmit}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="shrink-0 p-2.5 md:p-2 rounded-xl md:rounded-full text-lumina-on-primary bg-lumina-primary hover:bg-lumina-primary/90 shadow-[0_2px_12px_rgba(70,72,212,0.2)] transition-colors"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          )}
        </AnimatePresence>
        
        {/* Stop button when processing */}
        <AnimatePresence>
          {isProcessing && !hasContent && (
            <motion.button
              type="button"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="shrink-0 p-2.5 md:p-2 rounded-xl md:rounded-full text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors"
              aria-label="Stop"
              onClick={onInterrupt}
            >
              <StopCircle className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Character counter & shortcuts hint */}
      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[11px] text-lumina-on-surface-variant/30 select-none">
          Press <kbd className="glass-pill inline-flex items-center justify-center h-4 px-1 rounded text-[10px] font-mono font-medium text-lumina-on-surface-variant/40 border border-lumina-outline-variant/20 mx-0.5">?</kbd> for shortcuts
        </span>
        {charCount > 0 && (
          <span
            className={`text-[11px] tabular-nums font-mono select-none transition-colors duration-200 ${
              isAtLimit
                ? 'text-red-400'
                : isNearLimit
                  ? 'text-lumina-primary/50'
                  : 'text-lumina-on-surface-variant/30'
            }`}
          >
            {charCount} / {MAX_CHARS}
          </span>
        )}
      </div>
    </div>
  );
}
