'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAgentStore } from '@/lib/stores/agent-store';
import { formatRelativeTime } from '@/lib/time-utils';
import { showCopyToast, showPinToast } from '@/lib/toast';
import {
  Zap,
  Copy,
  Check,
  ImageIcon,
  FileVideo,
  FileAudio,
  FileText,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Pin,
  PinOff,
  Pencil,
  ClipboardCopy,
} from 'lucide-react';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Attachment, AttachmentType, ChatMessage } from '@/types/agent';

// ─── Props ───────────────────────────────────────────────────────

interface MessageHistoryProps {
  onRegenerate?: () => void;
  onEditMessage?: (messageId: string) => void;
}

// ─── Context Menu Types ───────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  message: ChatMessage;
}

interface ContextMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

// ─── Typing Indicator ─────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-lumina-primary/15 flex items-center justify-center shrink-0 mt-0.5">
        <span className="font-[family-name:var(--font-body)] font-bold text-xs text-lumina-primary">T</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-lumina-surface-container-low/60 border-l-2 border-l-lumina-primary/20">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-lumina-primary/60 typing-dot" />
            <div className="w-2 h-2 rounded-full bg-lumina-primary/60 typing-dot" />
            <div className="w-2 h-2 rounded-full bg-lumina-primary/60 typing-dot" />
          </div>
        </div>
        <p className="font-[family-name:var(--font-body)] text-[11px] text-lumina-on-surface-variant/50 ml-1">
          Tamanna is thinking...
        </p>
      </div>
    </div>
  );
}

// ─── Markdown Rendering ───────────────────────────────────────────

function renderInlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const inlinePattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = inlinePattern.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{remaining.slice(lastIndex, match.index)}</span>);
    }

    if (match[2]) {
      parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code
          key={key++}
          className="glass-pill bg-lumina-surface-container-high/60 px-1.5 py-0.5 rounded text-[13px] font-mono"
        >
          {match[4]}
        </code>
      );
    } else if (match[5] && match[6]) {
      parts.push(
        <a
          key={key++}
          href={match[6]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lumina-primary hover:underline underline-offset-2"
        >
          {match[5]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) {
    parts.push(<span key={key++}>{remaining.slice(lastIndex)}</span>);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre
          key={i}
          className="glass-pill bg-lumina-surface-container-low/80 rounded-xl p-3 my-1.5 overflow-x-auto text-[13px]"
        >
          <code className="font-mono text-lumina-on-surface">{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Bullet list
    if (line.match(/^(\s*)[-*]\s/)) {
      const content = line.replace(/^(\s*)[-*]\s/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-lumina-primary shrink-0">•</span>
          <span>{renderInlineMarkdown(content)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const content = line.replace(/^\d+\.\s/, '');
      elements.push(
        <div key={i} className="flex gap-2 ml-2 my-0.5">
          <span className="text-lumina-primary shrink-0 font-mono text-xs">
            {line.match(/^\d+/)?.[0]}.
          </span>
          <span>{renderInlineMarkdown(content)}</span>
        </div>
      );
      i++;
      continue;
    }

    // Regular line
    if (line.trim()) {
      elements.push(<p key={i} className="my-0.5">{renderInlineMarkdown(line)}</p>);
    } else {
      elements.push(<div key={i} className="h-2" />);
    }
    i++;
  }

  return elements;
}

// ─── Copy Button ──────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      showCopyToast();
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [text]);

  if (!text || text.length < 10) return null;

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-lumina-surface-variant/50"
      aria-label="Copy message"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-lumina-on-surface-variant/40" />
      )}
    </button>
  );
}

// ─── Attachment Helpers ───────────────────────────────────────────

function getAttachmentIcon(type: AttachmentType) {
  switch (type) {
    case 'image': return <ImageIcon className="w-4 h-4" />;
    case 'video': return <FileVideo className="w-4 h-4" />;
    case 'audio': return <FileAudio className="w-4 h-4" />;
    case 'document': return <FileText className="w-4 h-4" />;
  }
}

function getAttachmentColor(type: AttachmentType) {
  switch (type) {
    case 'image': return 'border-emerald-500/20 bg-emerald-500/5';
    case 'video': return 'border-purple-500/20 bg-purple-500/5';
    case 'audio': return 'border-amber-500/20 bg-amber-500/5';
    case 'document': return 'border-sky-500/20 bg-sky-500/5';
  }
}

function getAttachmentTextColor(type: AttachmentType) {
  switch (type) {
    case 'image': return 'text-emerald-500';
    case 'video': return 'text-purple-500';
    case 'audio': return 'text-amber-500';
    case 'document': return 'text-sky-500';
  }
}

function MessageAttachment({ attachment }: { attachment: Attachment }) {
  const colorClass = getAttachmentColor(attachment.type);
  const textColor = getAttachmentTextColor(attachment.type);

  // Image preview
  if (attachment.type === 'image' && attachment.thumbnailUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl overflow-hidden border border-lumina-outline-variant/15 shadow-sm max-w-[200px]"
      >
        <img
          src={attachment.thumbnailUrl}
          alt={attachment.name}
          className="w-full h-auto object-cover"
        />
        <div className="px-2 py-1 bg-lumina-surface-container-low/80">
          <p className="text-[10px] text-lumina-on-surface-variant/60 font-[family-name:var(--font-body)] truncate">
            {attachment.name}
          </p>
        </div>
      </motion.div>
    );
  }

  // Video preview
  if (attachment.type === 'video' && attachment.thumbnailUrl) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl overflow-hidden border border-lumina-outline-variant/15 shadow-sm max-w-[200px] relative"
      >
        <img
          src={attachment.thumbnailUrl}
          alt={attachment.name}
          className="w-full h-auto object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-lumina-surface-container-high/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-lumina-primary ml-0.5" />
          </div>
        </div>
        <div className="px-2 py-1 bg-lumina-surface-container-low/80">
          <p className="text-[10px] text-lumina-on-surface-variant/60 font-[family-name:var(--font-body)] truncate">
            {attachment.name}
          </p>
        </div>
      </motion.div>
    );
  }

  // Generic file pill
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClass}`}
    >
      <span className={textColor}>{getAttachmentIcon(attachment.type)}</span>
      <span className="text-xs text-lumina-on-surface font-[family-name:var(--font-body)] max-w-[140px] truncate">
        {attachment.name}
      </span>
      <span className="text-[10px] text-lumina-on-surface-variant/50 font-[family-name:var(--font-body)]">
        {formatSize(attachment.size)}
      </span>
    </motion.div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ─── Context Menu ─────────────────────────────────────────────────

function MessageContextMenu({
  x,
  y,
  message,
  onClose,
  onCopy,
  onRegenerate,
  onPin,
  onEditMessage,
}: {
  x: number;
  y: number;
  message: ChatMessage;
  onClose: () => void;
  onCopy: () => void;
  onRegenerate?: () => void;
  onPin?: () => void;
  onEditMessage?: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // Clamp menu position to viewport on mount and resize
  useEffect(() => {
    const clamp = () => {
      if (!menuRef.current) return;
      const rect = menuRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let cx = x;
      let cy = y;
      if (x + rect.width > vw - 8) cx = vw - rect.width - 8;
      if (y + rect.height > vh - 8) cy = vh - rect.height - 8;
      if (cx < 8) cx = 8;
      if (cy < 8) cy = 8;
      setPosition({ x: cx, y: cy });
    };
    clamp();
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, [x, y]);

  // Dismiss on click outside
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use a small delay so the right-click itself doesn't dismiss immediately
    const timer = setTimeout(() => {
      document.addEventListener('pointerdown', handlePointerDown);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [onClose]);

  // Dismiss on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isUser = message.role === 'user';
  const isPinned = message.pinned === true;

  const items: ContextMenuItem[] = [
    {
      icon: <ClipboardCopy className="w-3.5 h-3.5" />,
      label: 'Copy Text',
      onClick: onCopy,
    },
  ];

  if (!isUser) {
    if (onRegenerate) {
      items.push({
        icon: <RotateCcw className="w-3.5 h-3.5" />,
        label: 'Regenerate',
        onClick: onRegenerate,
      });
    }
    if (onPin) {
      items.push({
        icon: isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />,
        label: isPinned ? 'Unpin' : 'Pin',
        onClick: onPin,
      });
    }
  } else {
    if (onEditMessage) {
      items.push({
        icon: <Pencil className="w-3.5 h-3.5" />,
        label: 'Edit',
        onClick: onEditMessage,
      });
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.92, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -4 }}
        transition={{ duration: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed z-[9999] min-w-[160px] glass-card rounded-xl py-1.5 shadow-lg shadow-black/10 border border-lumina-outline-variant/20 backdrop-blur-xl"
        style={{ left: position.x, top: position.y }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-[13px] font-[family-name:var(--font-body)] transition-colors ${
              item.danger
                ? 'text-red-500 hover:bg-red-500/10'
                : 'text-lumina-on-surface hover:bg-lumina-surface-variant/50'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export default function MessageHistory({ onRegenerate, onEditMessage }: MessageHistoryProps) {
  const messages = useAgentStore((s) => s.messages);
  const agentState = useAgentStore((s) => s.agentState);
  const scrollRef = useRef<HTMLDivElement>(null);

  const showTyping = agentState === 'planning' || agentState === 'executing';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, showTyping]);

  if (messages.length === 0 && !showTyping) return null;

  return (
    <div className="w-full max-w-xl mx-auto">
      <div ref={scrollRef} className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 space-y-3 overflow-y-auto max-h-96">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <MessageBubble
                  message={msg}
                  onRegenerate={onRegenerate}
                  onEditMessage={onEditMessage}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {showTyping && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────

function MessageBubble({
  message,
  onRegenerate,
  onEditMessage,
}: {
  message: ChatMessage;
  onRegenerate?: () => void;
  onEditMessage?: (messageId: string) => void;
}) {
  const isUser = message.role === 'user';
  const setMessageReaction = useAgentStore((s) => s.setMessageReaction);
  const toggleMessagePin = useAgentStore((s) => s.toggleMessagePin);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timeAgo = formatRelativeTime(message.timestamp);
  const showRelative = new Date(message.timestamp).getTime() > Date.now() - 60 * 60 * 1000;
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const displayTime = showRelative ? timeAgo : time;

  const latencySeconds = message.latencyMs ? (message.latencyMs / 1000).toFixed(1) : null;
  const hasAttachments = message.attachments && message.attachments.length > 0;

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, message });
  }, [message]);

  const handleLongPressStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      // Use a central position on mobile since there's no cursor
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setContextMenu({ x: cx, y: cy, message });
    }, 500);
  }, [message]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleCopy = useCallback(() => {
    if (message.content) {
      navigator.clipboard.writeText(message.content).then(() => {
        showCopyToast();
      }).catch(() => {});
    }
  }, [message.content]);

  const handlePin = useCallback(() => {
    const isCurrentlyPinned = message.pinned === true;
    toggleMessagePin(message.id);
    showPinToast(!isCurrentlyPinned);
  }, [toggleMessagePin, message.id, message.pinned]);

  const handleEdit = useCallback(() => {
    if (onEditMessage) onEditMessage(message.id);
  }, [onEditMessage, message.id]);

  return (
    <>
      <div
        className={`flex items-start gap-2.5 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar circle */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
            isUser
              ? 'bg-lumina-surface-container-high text-lumina-on-surface-variant'
              : 'bg-lumina-primary/15 text-lumina-primary'
          }`}
        >
          <span className="font-[family-name:var(--font-body)] font-bold text-xs">
            {isUser ? 'U' : 'T'}
          </span>
        </div>

        <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Attachment previews */}
          {hasAttachments && (
            <div className={`flex flex-wrap gap-2 mb-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {message.attachments!.map((attachment) => (
                <MessageAttachment key={attachment.id} attachment={attachment} />
              ))}
            </div>
          )}

          {/* Message bubble */}
          {message.content && (
            <div
              onContextMenu={handleContextMenu}
              onTouchStart={handleLongPressStart}
              onTouchEnd={handleLongPressEnd}
              onTouchCancel={handleLongPressEnd}
              className={`select-text px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                isUser
                  ? 'glass-pill rounded-br-md border border-lumina-primary/20 bg-gradient-to-br from-lumina-surface-container-low to-lumina-surface-container text-lumina-on-surface'
                  : 'bg-lumina-surface-container-low/60 text-lumina-on-surface rounded-bl-md border-l-2 border-l-lumina-primary/15'
              }`}
            >
              {isUser ? (
                <p className="font-[family-name:var(--font-body)] whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="font-[family-name:var(--font-body)] whitespace-pre-wrap">
                  {renderMarkdown(message.content)}
                </div>
              )}
            </div>
          )}

          {/* Timestamp + optional latency badge + pinned indicator */}
          <div className={`flex items-center gap-1.5 mt-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {!isUser && message.pinned && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-lumina-primary/70 font-[family-name:var(--font-body)]">
                <Pin className="w-2.5 h-2.5" />
                Pinned
              </span>
            )}
            <p className="font-[family-name:var(--font-body)] text-[10px] text-lumina-on-surface-variant/40">
              {displayTime}
            </p>
            {latencySeconds && !isUser && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-lumina-primary/8 text-lumina-primary/60 px-1.5 py-0.5 text-[10px] font-[family-name:var(--font-body)]">
                <Zap className="w-2.5 h-2.5" />
                {latencySeconds}s
              </span>
            )}
            {!isUser && message.content && <CopyButton text={message.content} />}
          </div>

          {/* Reactions row for assistant messages */}
          {!isUser && message.content && (
            <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity">
              <button
                onClick={() =>
                  setMessageReaction(
                    message.id,
                    message.reaction === 'up' ? null : 'up'
                  )
                }
                className={`p-1 rounded transition-colors ${
                  message.reaction === 'up'
                    ? 'text-lumina-primary'
                    : 'text-lumina-on-surface-variant/30 hover:text-lumina-on-surface-variant/60'
                }`}
                aria-label="Thumbs up"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  setMessageReaction(
                    message.id,
                    message.reaction === 'down' ? null : 'down'
                  )
                }
                className={`p-1 rounded transition-colors ${
                  message.reaction === 'down'
                    ? 'text-lumina-primary'
                    : 'text-lumina-on-surface-variant/30 hover:text-lumina-on-surface-variant/60'
                }`}
                aria-label="Thumbs down"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Context menu overlay */}
      <AnimatePresence>
        {contextMenu && (
          <>
            {/* Invisible backdrop to catch outside clicks on touch devices */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998]"
              onPointerDown={closeContextMenu}
              onContextMenu={(e) => e.preventDefault()}
            />
            <MessageContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              message={contextMenu.message}
              onClose={closeContextMenu}
              onCopy={handleCopy}
              onRegenerate={isUser ? undefined : onRegenerate}
              onPin={isUser ? undefined : handlePin}
              onEditMessage={isUser ? handleEdit : undefined}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}