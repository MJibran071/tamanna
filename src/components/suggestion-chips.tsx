'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Sparkles,
  Mail,
  Lightbulb,
  Search,
  Image,
  Languages,
  Code,
  BookOpen,
  Calculator,
  PenTool,
  FlaskConical,
  GraduationCap,
  Calendar,
  Target,
  Newspaper,
  Zap,
  ClipboardList,
  TrendingUp,
  Moon,
  StickyNote,
  Bell,
  Wind,
  CheckSquare,
  Brain,
  Coffee,
  Music,
  Palette,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types ────────────────────────────────────────────────────────

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

type Category =
  | 'productivity'
  | 'news'
  | 'planning'
  | 'learning'
  | 'creativity'
  | 'break'
  | 'review'
  | 'reflection'
  | 'entertainment'
  | 'relaxation'
  | 'quick-task'
  | 'wind-down'
  | 'general';

interface SuggestionChip {
  id: string;
  icon: React.ElementType;
  label: string;
  category: Category;
}

interface SuggestionChipsProps {
  onSelect: (label: string) => void;
  disabled?: boolean;
}

// ─── Category Config ──────────────────────────────────────────────

const categoryConfig: Record<
  Category,
  { label: string; color: string; bg: string }
> = {
  productivity: { label: 'Productivity', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  news: { label: 'News', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  planning: { label: 'Planning', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' },
  learning: { label: 'Learning', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/40' },
  creativity: { label: 'Creativity', color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-pink-950/40' },
  break: { label: 'Break', color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40' },
  review: { label: 'Review', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  reflection: { label: 'Reflection', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
  entertainment: { label: 'Fun', color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40' },
  relaxation: { label: 'Relax', color: 'text-indigo-400 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  'quick-task': { label: 'Quick', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-950/40' },
  'wind-down': { label: 'Wind Down', color: 'text-purple-400 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  general: { label: '', color: 'text-lumina-primary', bg: '' },
};

// ─── Time-based Suggestion Pools ───────────────────────────────────

const morningSuggestions: SuggestionChip[] = [
  { id: 'm-plan', icon: Calendar, label: 'Plan my day', category: 'planning' },
  { id: 'm-news', icon: Newspaper, label: "What's happening today?", category: 'news' },
  { id: 'm-email', icon: Mail, label: 'Summarize my emails', category: 'productivity' },
  { id: 'm-priorities', icon: Target, label: 'Set my priorities', category: 'productivity' },
  { id: 'm-draft', icon: Mail, label: 'Draft a morning email', category: 'productivity' },
  { id: 'm-briefing', icon: Newspaper, label: 'Quick news briefing', category: 'news' },
  { id: 'm-meetings', icon: Calendar, label: 'What meetings do I have?', category: 'planning' },
  { id: 'm-focus', icon: Zap, label: 'Help me focus', category: 'productivity' },
  { id: 'm-hello', icon: Sparkles, label: 'Hello, what can you do?', category: 'general' },
  { id: 'm-code', icon: Code, label: 'Help me code', category: 'productivity' },
  { id: 'm-search', icon: Search, label: 'Search the web', category: 'news' },
  { id: 'm-explain', icon: GraduationCap, label: 'Explain a concept', category: 'learning' },
];

const afternoonSuggestions: SuggestionChip[] = [
  { id: 'a-teach', icon: GraduationCap, label: 'Teach me something new', category: 'learning' },
  { id: 'a-image', icon: Image, label: 'Generate an image', category: 'creativity' },
  { id: 'a-brainstorm', icon: Lightbulb, label: 'Brainstorm ideas', category: 'creativity' },
  { id: 'a-code', icon: Code, label: 'Help me code', category: 'learning' },
  { id: 'a-explain', icon: GraduationCap, label: 'Explain a concept', category: 'learning' },
  { id: 'a-story', icon: PenTool, label: 'Write a story', category: 'creativity' },
  { id: 'a-math', icon: Calculator, label: 'Solve a math problem', category: 'learning' },
  { id: 'a-research', icon: FlaskConical, label: 'Research a topic', category: 'learning' },
  { id: 'a-coffee', icon: Coffee, label: 'Suggest a break activity', category: 'break' },
  { id: 'a-palette', icon: Palette, label: 'Color palette ideas', category: 'creativity' },
  { id: 'a-summarize', icon: BookOpen, label: 'Summarize text', category: 'learning' },
  { id: 'a-translate', icon: Languages, label: 'Translate text', category: 'learning' },
];

const eveningSuggestions: SuggestionChip[] = [
  { id: 'e-review', icon: ClipboardList, label: 'Review my day', category: 'review' },
  { id: 'e-learned', icon: BookOpen, label: 'What did I learn today?', category: 'reflection' },
  { id: 'e-read', icon: BookOpen, label: 'What should I read?', category: 'entertainment' },
  { id: 'e-translate', icon: Languages, label: 'Translate text', category: 'learning' },
  { id: 'e-story', icon: PenTool, label: 'Generate a creative story', category: 'creativity' },
  { id: 'e-reflect', icon: Brain, label: 'Help me reflect', category: 'reflection' },
  { id: 'e-trending', icon: TrendingUp, label: "What's trending?", category: 'entertainment' },
  { id: 'e-plan', icon: Calendar, label: 'Plan tomorrow', category: 'planning' },
  { id: 'e-music', icon: Music, label: 'Music recommendations', category: 'entertainment' },
  { id: 'e-hello', icon: Sparkles, label: 'Hello, what can you do?', category: 'general' },
  { id: 'e-image', icon: Image, label: 'Generate an image', category: 'creativity' },
  { id: 'e-brainstorm', icon: Lightbulb, label: 'Brainstorm ideas', category: 'creativity' },
];

const nightSuggestions: SuggestionChip[] = [
  { id: 'n-relax', icon: Moon, label: 'Help me relax', category: 'relaxation' },
  { id: 'n-notes', icon: StickyNote, label: 'Quick notes for tomorrow', category: 'quick-task' },
  { id: 'n-reminder', icon: Bell, label: 'Set a reminder', category: 'quick-task' },
  { id: 'n-summarize', icon: BookOpen, label: 'Summarize my day briefly', category: 'wind-down' },
  { id: 'n-dream', icon: Sparkles, label: 'What should I dream about?', category: 'relaxation' },
  { id: 'n-journal', icon: PenTool, label: 'Journal entry helper', category: 'wind-down' },
  { id: 'n-breathe', icon: Wind, label: 'Calm breathing exercise', category: 'relaxation' },
  { id: 'n-task', icon: CheckSquare, label: 'Quick task before bed', category: 'quick-task' },
  { id: 'n-hello', icon: Sparkles, label: 'Hello, what can you do?', category: 'general' },
  { id: 'n-search', icon: Search, label: 'Quick search', category: 'quick-task' },
  { id: 'n-explain', icon: GraduationCap, label: 'Explain something briefly', category: 'learning' },
  { id: 'n-translate', icon: Languages, label: 'Translate a phrase', category: 'quick-task' },
];

const timePools: Record<TimePeriod, SuggestionChip[]> = {
  morning: morningSuggestions,
  afternoon: afternoonSuggestions,
  evening: eveningSuggestions,
  night: nightSuggestions,
};

// ─── Helpers ──────────────────────────────────────────────────────

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ─── Animation Variants ───────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: i * 0.05 + 0.1,
    },
  }),
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.92,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// ─── Component ────────────────────────────────────────────────────

export default function SuggestionChips({ onSelect, disabled }: SuggestionChipsProps) {
  const isMobile = useIsMobile();
  const [shimmerKey, setShimmerKey] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const isVisibleRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleCount = isMobile ? 6 : 8;

  // Get time-based pool (stable for the session)
  const timePeriod = useMemo(() => getTimePeriod(new Date().getHours()), []);
  const pool = timePools[timePeriod];

  // Shuffle pool once on mount
  const [shuffledPool, setShuffledPool] = useState<SuggestionChip[]>(() => {
    const s = [...pool];
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
    return s;
  });

  // Re-shuffle on rotation to provide variety
  const [rotationOffset, setRotationOffset] = useState(0);

  // Use IntersectionObserver to pause rotation when hidden
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rotate suggestions every 30 seconds with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isVisibleRef.current) return;
      setIsRotating(true);
      setTimeout(() => {
        // Re-shuffle pool for variety on each rotation
        setShuffledPool((prev) => {
          const s = [...prev];
          for (let k = s.length - 1; k > 0; k--) {
            const j = Math.floor(Math.random() * (k + 1));
            [s[k], s[j]] = [s[j], s[k]];
          }
          return s;
        });
        setRotationOffset((prev) => prev + visibleCount);
        setFadeKey((prev) => prev + 1);
        setTimeout(() => {
          setIsRotating(false);
        }, 50);
      }, 300);
    }, 30000);
    return () => clearInterval(interval);
  }, [visibleCount]);

  // Shimmer sweep every 6 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShimmerKey((prev) => prev + 1);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const visibleSuggestions = useMemo(() => {
    if (shuffledPool.length === 0) return pool.slice(0, visibleCount);
    const result: SuggestionChip[] = [];
    for (let i = 0; i < visibleCount; i++) {
      result.push(shuffledPool[(rotationOffset + i) % shuffledPool.length]);
    }
    return result;
  }, [rotationOffset, visibleCount, pool, shuffledPool]);

  const handleSelect = useCallback(
    (label: string) => {
      if (!disabled) onSelect(label);
    },
    [disabled, onSelect],
  );

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto no-scrollbar py-4 -mx-6 px-6 md:mx-0 md:px-0"
      aria-label="Suggested actions"
      role="list"
    >
      {/* Shimmer sweep overlay */}
      <div className="relative">
        <motion.div
          key={shimmerKey}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(96,99,238,0.05) 40%, rgba(96,99,238,0.09) 50%, rgba(96,99,238,0.05) 60%, transparent 100%)',
            width: '50%',
          }}
        />

        <motion.div
          className="flex flex-row md:flex-wrap justify-start md:justify-center gap-2.5 md:gap-3 min-w-max md:min-w-0"
          style={{
            opacity: isRotating ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          <AnimatePresence mode="popLayout">
            {visibleSuggestions.map((suggestion, i) => {
              const Icon = suggestion.icon;
              const cat = categoryConfig[suggestion.category];
              return (
                <motion.button
                  key={`${fadeKey}-${suggestion.id}`}
                  custom={i}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: '0 0 24px rgba(96, 99, 238, 0.18), 0 0 8px rgba(168, 85, 247, 0.08)',
                    transition: { duration: 0.2, ease: 'easeOut' },
                  }}
                  whileTap={{ scale: 0.96 }}
                  disabled={disabled}
                  className={
                    'glass-pill rounded-full pl-3 pr-4 py-2.5 md:pl-3.5 md:pr-5 md:py-3 ' +
                    'flex items-center gap-2 hover:bg-lumina-surface-variant/80 transition-all group ' +
                    'disabled:opacity-40 disabled:cursor-not-allowed ' +
                    'relative overflow-hidden'
                  }
                  style={{
                    border: '1px solid transparent',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                  onClick={() => handleSelect(suggestion.label)}
                  aria-label={suggestion.label}
                  role="listitem"
                >
                  {/* Gradient border overlay on hover */}
                  <span
                    className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(96,99,238,0.35), rgba(168,85,247,0.2), rgba(96,99,238,0.12))',
                      zIndex: -1,
                      margin: '-1px',
                      borderRadius: 'inherit',
                    }}
                  />
                  {/* Category icon */}
                  <span
                    className={
                      'shrink-0 flex items-center justify-center w-6 h-6 rounded-full ' +
                      (cat.bg ? cat.bg + ' ' : '') +
                      'transition-transform duration-200 group-hover:scale-110'
                    }
                  >
                    <Icon className={'w-3.5 h-3.5 ' + cat.color} />
                  </span>
                  {/* Label */}
                  <span className="font-[family-name:var(--font-body)] text-[13px] md:text-[15px] font-normal text-lumina-on-surface whitespace-nowrap">
                    {suggestion.label}
                  </span>
                  {/* Category badge (hidden on mobile, visible on sm+) */}
                  {cat.label && (
                    <span
                      className={
                        'hidden sm:inline-flex text-[10px] leading-none font-medium px-1.5 py-0.5 rounded-full ' +
                        cat.bg + ' ' + cat.color +
                        ' opacity-60 group-hover:opacity-100 transition-opacity duration-200'
                      }
                    >
                      {cat.label}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
