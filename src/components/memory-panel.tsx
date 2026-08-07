'use client';

import { useState } from 'react';
import {
  Brain,
  Lightbulb,
  Heart,
  Bookmark,
  Tag,
  Zap,
  CircleDot,
  ChevronDown,
  Eye,
  Clock,
  User,
  Globe,
  MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ──────────────── Types & Constants ──────────────── */

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  fact: Lightbulb,
  preference: Heart,
  skill: Zap,
  context: Bookmark,
  outcome: CircleDot,
  general: Tag,
};

const CATEGORY_COLORS: Record<string, string> = {
  fact: 'text-amber-500 bg-amber-500/10',
  preference: 'text-rose-500 bg-rose-500/10',
  skill: 'text-violet-500 bg-violet-500/10',
  context: 'text-sky-500 bg-sky-500/10',
  outcome: 'text-emerald-500 bg-emerald-500/10',
  general: 'text-lumina-primary bg-lumina-primary/10',
  correction: 'text-red-500 bg-red-500/10',
};

/** Fixed category filter list — always visible */
const FILTER_CATEGORIES = [
  { key: null, label: 'All', icon: Tag },
  { key: 'fact', label: 'Facts', icon: Lightbulb },
  { key: 'preference', label: 'Preferences', icon: Heart },
  { key: 'skill', label: 'Skills', icon: Zap },
  { key: 'context', label: 'Context', icon: Bookmark },
  { key: 'outcome', label: 'Outcomes', icon: CircleDot },
];

const NETWORK_COLORS = [
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-sky-500',
  'bg-emerald-500',
  'bg-lumina-primary',
];

interface MemoryNode {
  id: string;
  content: string;
  category: string;
  weight: number;
  accessCount: number;
  createdAt: string;
  scope: string;
}

/* ──────────────── Sub-components ──────────────── */

/** CSS-only brain network illustration */
function BrainNetwork() {
  const nodes = [
    { top: '8%', left: '50%', transform: 'translateX(-50%)' },
    { top: '25%', left: '12%', transform: 'none' },
    { top: '25%', left: '88%', transform: 'translateX(-100%)' },
    { top: '60%', left: '8%', transform: 'none' },
    { top: '60%', left: '92%', transform: 'translateX(-100%)' },
    { top: '82%', left: '35%', transform: 'none' },
    { top: '82%', left: '65%', transform: 'translateX(-100%)' },
  ];

  return (
    <div className="relative w-48 h-40 mx-auto">
      {/* Rotating connection lines container */}
      <svg
        className="absolute inset-0 w-full h-full animate-[spin_30s_linear_infinite] pointer-events-none"
        viewBox="0 0 192 160"
        fill="none"
        style={{ opacity: 0.18 }}
      >
        {/* Lines from center (96, 56) to each outer node */}
        <line x1="96" y1="56" x2="24" y2="40" stroke="url(#lineGrad1)" strokeWidth="1" />
        <line x1="96" y1="56" x2="168" y2="40" stroke="url(#lineGrad2)" strokeWidth="1" />
        <line x1="96" y1="56" x2="16" y2="96" stroke="url(#lineGrad3)" strokeWidth="1" />
        <line x1="96" y1="56" x2="176" y2="96" stroke="url(#lineGrad4)" strokeWidth="1" />
        <line x1="96" y1="56" x2="64" y2="130" stroke="url(#lineGrad5)" strokeWidth="1" />
        <line x1="96" y1="56" x2="128" y2="130" stroke="url(#lineGrad6)" strokeWidth="1" />
        {/* Inter-node connections */}
        <line x1="24" y1="40" x2="16" y2="96" stroke="url(#lineGrad1)" strokeWidth="0.5" />
        <line x1="168" y1="40" x2="176" y2="96" stroke="url(#lineGrad2)" strokeWidth="0.5" />
        <line x1="16" y1="96" x2="64" y2="130" stroke="url(#lineGrad3)" strokeWidth="0.5" />
        <line x1="176" y1="96" x2="128" y2="130" stroke="url(#lineGrad4)" strokeWidth="0.5" />
        <line x1="64" y1="130" x2="128" y2="130" stroke="url(#lineGrad5)" strokeWidth="0.5" />
        {/* Gradient definitions */}
        <defs>
          <linearGradient id="lineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#4648d4" />
          </linearGradient>
          <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#4648d4" />
          </linearGradient>
          <linearGradient id="lineGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#4648d4" />
          </linearGradient>
          <linearGradient id="lineGrad4" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0ea5e9" /><stop offset="100%" stopColor="#4648d4" />
          </linearGradient>
          <linearGradient id="lineGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#4648d4" />
          </linearGradient>
          <linearGradient id="lineGrad6" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4648d4" /><stop offset="100%" stopColor="#c0c1ff" />
          </linearGradient>
        </defs>
      </svg>

      {/* Outer nodes (counter-rotate to stay upright) */}
      {nodes.map((pos, i) => (
        <div
          key={i}
          className="absolute animate-[spin_30s_linear_infinite_reverse]"
          style={{ top: pos.top, left: pos.left, transform: pos.transform }}
        >
          <div
            className={`w-4 h-4 rounded-full ${NETWORK_COLORS[i]} shadow-sm`}
            style={{ opacity: 0.7 }}
          />
        </div>
      ))}

      {/* Central brain node */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-lumina-primary/20 to-lumina-primary-container/10 backdrop-blur-sm border border-lumina-primary/20 flex items-center justify-center shadow-tinted">
          <Brain className="w-7 h-7 text-lumina-primary" />
        </div>
      </div>
    </div>
  );
}

/** Scope badge */
function ScopeBadge({ scope }: { scope: string }) {
  if (scope === 'global') return <Globe className="w-3 h-3 text-lumina-on-surface-variant/40" />;
  if (scope === 'user') return <User className="w-3 h-3 text-lumina-on-surface-variant/40" />;
  return <Tag className="w-3 h-3 text-lumina-on-surface-variant/40" />;
}

/* ──────────────── Main Component ──────────────── */

export default function MemoryPanel() {
  const [memories] = useState<MemoryNode[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hasMemories = memories.length > 0;

  // Derive categories from memories
  const categories = Array.from(new Set(memories.map((m) => m.category)));
  const grouped = categories.map((cat) => ({
    category: cat,
    count: memories.filter((m) => m.category === cat).length,
  }));

  const filtered = activeCategory
    ? memories.filter((m) => m.category === activeCategory)
    : memories;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* ── Header with brain network ── */}
      <div className="text-center space-y-3">
        <BrainNetwork />
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
          Memory
        </h2>
        <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant">
          What Tamanna remembers about you
        </p>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Memories */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-4 flex flex-col items-center gap-2 bg-gradient-to-br from-lumina-primary/8 to-lumina-primary-container/4 border border-lumina-primary/10"
        >
          <Brain className="w-5 h-5 text-lumina-primary" />
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-lumina-on-surface">
            {memories.length}
          </span>
          <span className="font-[family-name:var(--font-body)] text-[10px] font-medium uppercase tracking-[0.05em] text-lumina-on-surface-variant">
            Memories
          </span>
        </motion.div>

        {/* Categories */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-4 flex flex-col items-center gap-2 bg-gradient-to-br from-lumina-secondary/8 to-lumina-secondary-container/4 border border-lumina-secondary/10"
        >
          <Tag className="w-5 h-5 text-lumina-secondary" />
          <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-lumina-on-surface">
            {categories.length}
          </span>
          <span className="font-[family-name:var(--font-body)] text-[10px] font-medium uppercase tracking-[0.05em] text-lumina-on-surface-variant">
            Categories
          </span>
        </motion.div>
      </div>

      {/* ── Empty state ── */}
      {!hasMemories && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-card rounded-2xl p-6 flex flex-col items-center text-center space-y-3"
        >
          <div className="w-12 h-12 rounded-xl bg-lumina-primary/10 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-lumina-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-lumina-on-surface">
              No memories yet
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant leading-relaxed max-w-[280px]">
              Start chatting with Tamanna and she&apos;ll learn your preferences,
              facts, and habits over time.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center pt-1">
            {['Preferences', 'Facts', 'Skills', 'Context'].map((cat) => (
              <span
                key={cat}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-lumina-on-surface/5 text-lumina-on-surface-variant/50"
              >
                {cat}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Category filter chips (only when memories exist) ── */}
      {hasMemories && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2"
        >
          {FILTER_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = cat.key === null ? !activeCategory : activeCategory === cat.key;
            const count = cat.key === null
              ? memories.length
              : memories.filter((m) => m.category === cat.key).length;

            if (cat.key !== null && count === 0) return null;

            return (
              <motion.button
                key={cat.key ?? 'all'}
                onClick={() => setActiveCategory(cat.key === null ? null : (activeCategory === cat.key ? null : cat.key))}
                whileTap={{ scale: 0.94 }}
                animate={isActive ? { scale: 1.04 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-lumina-primary text-lumina-on-primary shadow-tinted'
                    : 'glass-pill text-lumina-on-surface-variant hover:text-lumina-primary'
                }`}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
                <span className={`${isActive ? 'opacity-70' : 'opacity-40'}`}>{count}</span>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* ── Memory list ── */}
      {hasMemories && (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-lumina-on-surface/5 flex items-center justify-center mb-3">
                <Tag className="w-5 h-5 text-lumina-on-surface-variant/40" />
              </div>
              <p className="font-[family-name:var(--font-display)] text-sm font-medium text-lumina-on-surface-variant">
                No memories in this category yet
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((memory, idx) => {
                const Icon = CATEGORY_ICONS[memory.category] || Tag;
                const color = CATEGORY_COLORS[memory.category] || CATEGORY_COLORS.general;
                const colorText = color.split(' ')[0];
                const colorBg = color.split(' ')[1];
                const isExpanded = expandedId === memory.id;
                const isTruncatable = memory.content.length > 60;

                return (
                  <motion.div
                    key={memory.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                    transition={{
                      layout: { type: 'spring', stiffness: 400, damping: 30 },
                      opacity: { duration: 0.2 },
                      y: { duration: 0.25, delay: idx * 0.04 },
                    }}
                    onClick={() => toggleExpand(memory.id)}
                    className="glass-card rounded-2xl px-4 py-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-lumina-surface-variant/10"
                  >
                    <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${colorBg}`}>
                      <Icon className={`w-4 h-4 ${colorText}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Collapsed row */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.06em] ${colorText}`}>
                          {memory.category}
                        </span>
                        <ScopeBadge scope={memory.scope} />
                        {isTruncatable && (
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                            className="ml-auto"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-lumina-on-surface-variant/40" />
                          </motion.div>
                        )}
                      </div>

                      <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface leading-relaxed">
                        {!isTruncatable || isExpanded
                          ? memory.content
                          : memory.content.slice(0, 60) + '…'}
                      </p>

                      {/* Expanded details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-lumina-on-surface/6">
                              <div className="flex items-center gap-1.5">
                                <Eye className="w-3 h-3 text-lumina-on-surface-variant/40" />
                                <span className="text-[10px] text-lumina-on-surface-variant/60">
                                  Accessed {memory.accessCount}x
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Zap className="w-3 h-3 text-lumina-on-surface-variant/40" />
                                <span className="text-[10px] text-lumina-on-surface-variant/60">
                                  Weight {memory.weight.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-lumina-on-surface-variant/40" />
                                <span className="text-[10px] text-lumina-on-surface-variant/60">
                                  {new Date(memory.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
