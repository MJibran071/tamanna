'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  useAgentStore,
  type ConversationSummary,
} from '@/lib/stores/agent-store';
import {
  MessageSquare,
  Plus,
  Search,
  X,
  Clock,
  Hash,
  Zap,
  Trash2,
  Pencil,
  Download,
} from 'lucide-react';
import { showExportToast, showDeleteToast } from '@/lib/toast';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Animation Variants ───────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.04,
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
  exit: {
    opacity: 0,
    x: -80,
    scale: 0.95,
    transition: { duration: 0.25, ease: 'easeInOut' },
  },
};

const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const staggerContainer = {
  visible: {
    transition: { staggerChildren: 0.04 },
  },
};

// ─── Export Helpers ─────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function exportConversationMarkdown(conv: ConversationSummary) {
  let md = `# ${conv.title}\n\n`;
  md += `*Exported from Tamanna — ${new Date().toLocaleString()}*\n\n---\n\n`;

  for (const msg of conv.messages) {
    const role = msg.role === 'user' ? 'You' : 'Tamanna';
    const time = new Date(msg.timestamp).toLocaleString();
    md += `### ${role} — ${time}\n\n`;
    md += `${msg.content}\n\n`;
    if (msg.attachments?.length) {
      for (const att of msg.attachments) {
        md += `📎 [${att.name}] (${att.type}, ${formatFileSize(att.size)})\n`;
      }
      md += '\n';
    }
    md += '---\n\n';
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${conv.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAllConversations(convs: ConversationSummary[]) {
  let md = `# Tamanna — All Conversations\n\n`;
  md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

  for (const conv of convs) {
    md += `## ${conv.title}\n\n`;
    md += `*Created: ${new Date(conv.createdAt).toLocaleString()} | Updated: ${new Date(conv.updatedAt).toLocaleString()}*\n\n---\n\n`;

    for (const msg of conv.messages) {
      const role = msg.role === 'user' ? 'You' : 'Tamanna';
      const time = new Date(msg.timestamp).toLocaleString();
      md += `### ${role} — ${time}\n\n`;
      md += `${msg.content}\n\n`;
      if (msg.attachments?.length) {
        for (const att of msg.attachments) {
          md += `📎 [${att.name}] (${att.type}, ${formatFileSize(att.size)})\n`;
        }
        md += '\n';
      }
      md += '---\n\n';
    }
  }

  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tamanna-all-conversations-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────

export default function HistoryPanel() {
  const conversations = useAgentStore((s) => s.conversations);
  const messages = useAgentStore((s) => s.messages);
  const deleteConversation = useAgentStore((s) => s.deleteConversation);
  const loadConversation = useAgentStore((s) => s.loadConversation);
  const startNewConversation = useAgentStore((s) => s.startNewConversation);
  const saveCurrentConversation = useAgentStore((s) => s.saveCurrentConversation);
  const loadPersistedConversations = useAgentStore((s) => s.loadPersistedConversations);
  const setActiveTab = useAgentStore((s) => s.setActiveTab);
  const updateConversationTitle = useAgentStore((s) => s.updateConversationTitle);

  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPersistedConversations();
  }, [loadPersistedConversations]);

  // ── Filtering ──────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const q = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, search]);

  // ── Stats ──────────────────────────────────────────────────────

  const totalMessages = useMemo(
    () =>
      conversations.reduce((sum, c) => sum + c.messages.length, 0) +
      messages.length,
    [conversations, messages]
  );

  const avgResponseTime = useMemo(() => {
    const allMessages = conversations.flatMap((c) => c.messages);
    const latencies = allMessages
      .filter((m) => m.role === 'assistant' && m.latencyMs != null)
      .map((m) => m.latencyMs as number);
    if (latencies.length === 0) return 0;
    return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  }, [conversations]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleStartNew = () => {
    saveCurrentConversation();
    startNewConversation();
    setActiveTab('talk');
  };

  const handleSelect = (conv: ConversationSummary) => {
    saveCurrentConversation();
    loadConversation(conv.id);
    setActiveTab('talk');
  };

  const handleClearSearch = () => {
    setSearch('');
    searchInputRef.current?.focus();
  };

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-lumina-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-lumina-primary" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
              Conversations
            </h2>
          </div>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-1 ml-[42px]">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              exportAllConversations(conversations);
              showExportToast();
            }}
            disabled={conversations.length === 0}
            className="glass-pill rounded-full px-3 py-2 text-sm font-medium text-lumina-on-surface-variant flex items-center gap-1.5 hover:bg-lumina-primary/10 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Export all conversations"
            title="Export all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export All</span>
          </button>
          <button
            onClick={handleStartNew}
            className="glass-pill rounded-full px-4 py-2 text-sm font-medium text-lumina-primary flex items-center gap-2 hover:bg-lumina-primary/15 transition-all active:scale-95"
            aria-label="New conversation"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </motion.div>

      {/* ── Stats Cards ────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-3 gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeIn}>
          <StatCard
            label="Total Conversations"
            value={conversations.length}
            icon={MessageSquare}
            gradient="from-lumina-primary/10 to-lumina-primary/5"
          />
        </motion.div>
        <motion.div variants={fadeIn}>
          <StatCard
            label="Total Messages"
            value={totalMessages}
            icon={Hash}
            gradient="from-amber-500/10 to-amber-500/5"
          />
        </motion.div>
        <motion.div variants={fadeIn}>
          <StatCard
            label="Avg Response"
            value={avgResponseTime > 0 ? `${(avgResponseTime / 1000).toFixed(1)}s` : '—'}
            icon={Zap}
            gradient="from-emerald-500/10 to-emerald-500/5"
          />
        </motion.div>
      </motion.div>

      {/* ── Search ─────────────────────────────────────────────── */}
      <motion.div
        className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        <Search className="w-4 h-4 text-lumina-on-surface-variant/50 shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conversations..."
          className="flex-1 bg-transparent outline-none text-lumina-on-surface placeholder:text-lumina-on-surface-variant/40 font-[family-name:var(--font-body)] text-sm"
        />
        <AnimatePresence>
          {search.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={handleClearSearch}
              className="shrink-0 p-1 rounded-full text-lumina-on-surface-variant/50 hover:text-lumina-on-surface hover:bg-lumina-surface-variant/50 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Search result count ────────────────────────────────── */}
      <AnimatePresence>
        {search.trim().length > 0 && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant/60 -mt-3"
          >
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Conversation List ──────────────────────────────────── */}
      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1 lumina-scrollbar">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <EmptyState
              hasConversations={conversations.length > 0}
              search={search}
              onNewChat={handleStartNew}
            />          ) : (
            filtered.map((conv, i) => (
              <ConversationCard
                key={conv.id}
                index={i}
                conv={conv}
                onSelect={() => handleSelect(conv)}
                onDelete={() => setDeleteConfirmId(conv.id)}
                isDeleting={deleteConfirmId === conv.id}
                onConfirmDelete={() => {
                  deleteConversation(conv.id);
                  setDeleteConfirmId(null);
                  showDeleteToast();
                }}
                onCancelDelete={() => setDeleteConfirmId(null)}
                onExport={() => {
                  exportConversationMarkdown(conv);
                  showExportToast();
                }}
                isEditing={editingId === conv.id}
                editTitle={editTitle}
                onStartEdit={() => {
                  setEditingId(conv.id);
                  setEditTitle(conv.title);
                }}
                onEditTitleChange={setEditTitle}
                onSaveEdit={() => {
                  if (editTitle.trim()) {
                    updateConversationTitle(conv.id, editTitle.trim());
                  }
                  setEditingId(null);
                }}
                onCancelEdit={() => setEditingId(null)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <div
      className={
        `glass-card rounded-2xl p-4 flex flex-col items-center gap-2 ` +
        `bg-gradient-to-br ${gradient} ` +
        `hover:-translate-y-0.5 hover:shadow-lg hover:shadow-lumina-primary/5 ` +
        `transition-all duration-300 cursor-default`
      }
    >
      <Icon className="w-5 h-5 text-lumina-primary/70" />
      <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-lumina-on-surface leading-none">
        {value}
      </span>
      <span className="font-[family-name:var(--font-body)] text-[10px] font-medium uppercase tracking-[0.05em] text-lumina-on-surface-variant text-center leading-tight">
        {label}
      </span>
    </div>
  );
}

// ─── Conversation Card ────────────────────────────────────────────

function ConversationCard({
  index,
  conv,
  onSelect,
  onDelete,
  isDeleting,
  onConfirmDelete,
  onCancelDelete,
  onExport,
  isEditing,
  editTitle,
  onStartEdit,
  onEditTitleChange,
  onSaveEdit,
  onCancelEdit,
}: {
  index: number;
  conv: ConversationSummary;
  onSelect: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onExport: () => void;
  isEditing: boolean;
  editTitle: string;
  onStartEdit: () => void;
  onEditTitleChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
}) {
  const lastMsg = conv.messages[conv.messages.length - 1];
  const timeStr = formatRelativeTime(new Date(conv.updatedAt));
  const previewText = lastMsg
    ? `${lastMsg.role === 'user' ? 'You: ' : 'Tamanna: '}${lastMsg.content}`
    : '';

  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  return (
    <motion.div
      layout
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={
        `glass-card rounded-2xl overflow-hidden relative group ` +
        `hover:-translate-y-0.5 hover:shadow-lg hover:shadow-lumina-primary/8 ` +
        `transition-all duration-300 border-l-[3px] border-l-lumina-primary/60`
      }
    >
      <button
        onClick={onSelect}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-lumina-surface-variant/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            {isEditing ? (
              <input
                ref={editInputRef}
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit();
                  if (e.key === 'Escape') onCancelEdit();
                }}
                onBlur={onSaveEdit}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-lumina-surface-container-high/60 rounded-lg px-2 py-0.5 text-sm font-[family-name:var(--font-display)] font-bold text-lumina-on-surface outline-none border border-lumina-primary/40 focus:border-lumina-primary"
              />
            ) : (
              <h3
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                className="font-[family-name:var(--font-display)] text-sm font-bold text-lumina-on-surface truncate flex items-center gap-1.5 group/title cursor-default"
              >
                {conv.title}
                <Pencil className="w-3 h-3 opacity-0 group-hover/title:opacity-40 text-lumina-on-surface-variant shrink-0 transition-opacity" />
              </h3>
            )}
            <span className="font-[family-name:var(--font-body)] text-[11px] text-lumina-on-surface-variant/50 whitespace-nowrap shrink-0">
              {timeStr}
            </span>
          </div>
          {previewText && (
            <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant/60 mt-1.5 truncate">
              {previewText.length > 80
                ? previewText.slice(0, 80) + '…'
                : previewText}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] text-lumina-on-surface-variant/40 font-medium">
              <Hash className="w-3 h-3" />
              {conv.messages.length} message{conv.messages.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </button>

      {/* Delete bar */}
      <AnimatePresence>
        {isDeleting && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-lumina-outline-variant/30 px-4 py-2.5 flex items-center justify-between bg-red-500/5"
          >
            <span className="font-[family-name:var(--font-body)] text-xs text-red-600 dark:text-red-400 font-medium">
              Delete this conversation?
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelDelete();
                }}
                className="text-xs px-3 py-1 rounded-full text-lumina-on-surface-variant hover:bg-lumina-surface-variant/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmDelete();
                }}
                className="text-xs px-3 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors active:scale-95"
              >
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      {!isDeleting && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport();
            }}
            className="p-1.5 rounded-full text-lumina-on-surface-variant/30 hover:text-lumina-primary hover:bg-lumina-primary/10 transition-all"
            aria-label="Export conversation"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-full text-lumina-on-surface-variant/30 hover:text-red-500 hover:bg-red-500/10 transition-all"
            aria-label="Delete conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────

function EmptyState({
  hasConversations,
  search,
  onNewChat,
}: {
  hasConversations: boolean;
  search: string;
  onNewChat: () => void;
}) {
  if (hasConversations) {
    // No search results
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center min-h-[200px]"
      >
        <div className="w-12 h-12 rounded-2xl bg-lumina-surface-variant/50 flex items-center justify-center mb-4">
          <Search className="w-6 h-6 text-lumina-on-surface-variant/30" />
        </div>
        <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant font-medium">
          No results for &quot;{search}&quot;
        </p>
        <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant/50 mt-1">
          Try a different search term
        </p>
      </motion.div>
    );
  }

  // No conversations at all
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={
        `rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[280px] ` +
        `bg-gradient-to-br from-lumina-surface-variant/40 via-lumina-surface-variant/20 to-transparent `
        + `border border-lumina-outline-variant/20`
      }
    >
      {/* Illustration area */}
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-lumina-primary/15 to-lumina-primary/5 flex items-center justify-center mb-5 shadow-inner">
        <Clock className="w-10 h-10 text-lumina-primary/40" />
      </div>
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
        No conversations yet
      </p>
      <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-2 mb-6 max-w-[280px]">
        Start chatting with Tamanna to see your conversation history here.
      </p>
      <button
        onClick={onNewChat}
        className="glass-pill rounded-full px-5 py-2.5 text-sm font-medium text-lumina-primary flex items-center gap-2 hover:bg-lumina-primary/15 transition-all active:scale-95"
      >
        <Plus className="w-4 h-4" />
        Start a conversation
      </button>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}