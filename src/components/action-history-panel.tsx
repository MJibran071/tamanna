'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History,
  Search,
  X,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Target,
  Timer,
  Loader2,
  Zap,
  Globe,
  MessageSquare,
  Clock,
  BookOpen,
  BarChart3,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ────────────────────────────────────────────────────────────────

interface Action {
  id: string;
  type: string;
  command: string;
  status: 'completed' | 'running' | 'failed' | 'pending';
  result?: string;
  duration?: number;
  createdAt: string;
}

// ─── Config ──────────────────────────────────────────────────────────────

const ACTION_TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  search: { icon: Search, color: 'text-sky-500', bg: 'bg-sky-500/10', label: 'Search' },
  browse: { icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Browse' },
  message: { icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-500/10', label: 'Message' },
  reminder: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Reminder' },
  booking: { icon: BookOpen, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Booking' },
  workflow: { icon: Zap, color: 'text-cyan-500', bg: 'bg-cyan-500/10', label: 'Workflow' },
  compare: { icon: BarChart3, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Compare' },
  general: { icon: Zap, color: 'text-lumina-primary', bg: 'bg-lumina-primary/10', label: 'General' },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  completed: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Completed' },
  running: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Running' },
  failed: { color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
  pending: { color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Pending' },
};

const FILTER_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'search', label: 'Search' },
  { value: 'browse', label: 'Browse' },
  { value: 'message', label: 'Message' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'booking', label: 'Booking' },
  { value: 'workflow', label: 'Workflow' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ─── Animation Variants ────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' },
  }),
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function ActionHistoryPanel() {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // ── Fetch ───────────────────────────────────────────────────────────

  const fetchActions = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('type', activeFilter);
      params.set('limit', '20');
      params.set('offset', String(currentOffset));

      const res = await fetch(`/api/actions?${params}`);
      if (res.ok) {
        const data = await res.json();
        const newActions = Array.isArray(data.actions) ? data.actions : Array.isArray(data) ? data : [];
        setActions(reset ? newActions : (prev) => [...prev, ...newActions]);
        setHasMore(newActions.length >= 20);
      }
    } catch {
      toast({ title: 'Failed to load actions', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [offset, activeFilter]);

  useEffect(() => { setOffset(0); fetchActions(true); }, [activeFilter]); // reset on filter change

  const loadMore = useCallback(() => {
    setOffset((prev) => prev + 20);
    fetchActions(false);
  }, [fetchActions]);

  // ── Filtered list ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return actions;
    const q = search.toLowerCase();
    return actions.filter((a) => a.command.toLowerCase().includes(q));
  }, [actions, search]);

  // ── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = actions.length;
    const completed = actions.filter((a) => a.status === 'completed').length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgDuration = actions.length > 0
      ? Math.round(actions.reduce((sum, a) => sum + (a.duration || 0), 0) / actions.length)
      : 0;
    return { total, successRate, avgDuration };
  }, [actions]);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-lumina-primary/10 flex items-center justify-center">
              <History className="w-4 h-4 text-lumina-primary" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
              Action History
            </h2>
          </div>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-1 ml-[42px]">
            Every action Tamanna has performed
          </p>
        </div>
        <button
          onClick={() => fetchActions(true)}
          className="p-2 rounded-lg text-lumina-on-surface-variant/40 hover:text-lumina-primary hover:bg-lumina-primary/10 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </motion.div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: 'Total Actions', value: stats.total, icon: Target, color: 'text-lumina-primary', bg: 'bg-lumina-primary/10' },
          { label: 'Success Rate', value: `${stats.successRate}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Avg Duration', value: formatDuration(stats.avgDuration), icon: Timer, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5 bg-gradient-to-br from-transparent to-transparent">
            <div className={`p-1.5 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <span className={`font-[family-name:var(--font-display)] text-lg font-semibold ${stat.color}`}>{stat.value}</span>
            <span className="text-[10px] text-lumina-on-surface-variant/50">{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Filter Chips ────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
      >
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setActiveFilter(chip.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeFilter === chip.value
                ? 'bg-lumina-primary text-lumina-on-primary shadow-sm'
                : 'glass-pill text-lumina-on-surface-variant hover:text-lumina-on-surface'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </motion.div>

      {/* ── Search ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3"
      >
        <Filter className="w-4 h-4 text-lumina-on-surface-variant/50 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by command text..."
          className="flex-1 bg-transparent outline-none text-lumina-on-surface placeholder:text-lumina-on-surface-variant/40 font-[family-name:var(--font-body)] text-sm"
        />
        <AnimatePresence>
          {search.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setSearch('')}
              className="shrink-0 p-1 rounded-full text-lumina-on-surface-variant/50 hover:text-lumina-on-surface hover:bg-lumina-surface-variant/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Action List ─────────────────────────────────────────────── */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {loading && actions.length === 0 ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center"
          >
            <History className="w-8 h-8 text-lumina-on-surface-variant/20 mx-auto mb-2" />
            <p className="text-xs text-lumina-on-surface-variant/50">
              {search || activeFilter !== 'all' ? 'No matching actions' : 'No actions yet'}
            </p>
            <p className="text-[10px] text-lumina-on-surface-variant/30 mt-1">
              {search || activeFilter !== 'all' ? 'Try different filters' : 'Use Ultra Mode to make Tamanna do things!'}
            </p>
          </motion.div>
        ) : (
          <>
            <AnimatePresence>
              {filtered.map((action, i) => {
                const typeConfig = ACTION_TYPE_CONFIG[action.type] || ACTION_TYPE_CONFIG.general;
                const statusConfig = STATUS_CONFIG[action.status] || STATUS_CONFIG.pending;
                const isExpanded = expandedId === action.id;

                return (
                  <motion.div
                    key={action.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className="glass-card rounded-xl border border-white/10 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : action.id)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-lumina-surface-variant/20 transition-colors"
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-lg ${typeConfig.bg} flex items-center justify-center`}>
                        <typeConfig.icon className={`w-4 h-4 ${typeConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-lumina-on-surface truncate">{action.command}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-lumina-on-surface-variant/40">
                          <span className={`px-1.5 py-0.5 rounded-full ${typeConfig.bg} ${typeConfig.color} text-[9px] font-medium`}>
                            {typeConfig.label}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color} text-[9px] font-medium`}>
                            {statusConfig.label}
                          </span>
                          {action.duration != null && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(action.duration)}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{formatTime(action.createdAt)}</span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-lumina-on-surface-variant/40" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-lumina-on-surface-variant/40" />
                        )}
                      </div>
                    </button>

                    {/* Expanded result */}
                    <AnimatePresence>
                      {isExpanded && action.result && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-lumina-outline-variant/20 px-4 py-3 bg-lumina-surface-variant/10"
                        >
                          <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant/70 leading-relaxed">
                            {action.result}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Load more */}
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full glass-card rounded-xl p-3 border border-dashed border-lumina-outline/20 flex items-center justify-center gap-2 text-xs text-lumina-on-surface-variant/50 hover:text-lumina-primary hover:border-lumina-primary/30 transition-all disabled:opacity-40"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {loading ? 'Loading...' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
