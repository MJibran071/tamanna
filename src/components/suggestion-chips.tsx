'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types ────────────────────────────────────────────────────────

interface SuggestionChip {
  id: string;
  icon: React.ElementType;
  label: string;
}

interface SuggestionChipsProps {
  onSelect: (label: string) => void;
  disabled?: boolean;
}

// ─── All Suggestions (12 total) ───────────────────────────────────

const allSuggestions: SuggestionChip[] = [
  { id: 'greet', icon: Sparkles, label: 'Hello, what can you do?' },
  { id: 'email', icon: Mail, label: 'Draft an email' },
  { id: 'brainstorm', icon: Lightbulb, label: 'Brainstorm ideas' },
  { id: 'search', icon: Search, label: 'Search the web' },
  { id: 'image', icon: Image, label: 'Generate an image' },
  { id: 'translate', icon: Languages, label: 'Translate text' },
  { id: 'code', icon: Code, label: 'Help me code' },
  { id: 'summarize', icon: BookOpen, label: 'Summarize text' },
  { id: 'math', icon: Calculator, label: 'Solve a math problem' },
  { id: 'write', icon: PenTool, label: 'Write a story' },
  { id: 'research', icon: FlaskConical, label: 'Research a topic' },
  { id: 'explain', icon: GraduationCap, label: 'Explain a concept' },
];

// ─── Animation Variants ───────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.95,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

// ─── Component ────────────────────────────────────────────────────

export default function SuggestionChips({ onSelect, disabled }: SuggestionChipsProps) {
  const isMobile = useIsMobile();
  const [rotationIndex, setRotationIndex] = useState(0);
  const [shimmerKey, setShimmerKey] = useState(0);

  const visibleCount = isMobile ? 6 : 8;

  // Rotate suggestions every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationIndex((prev) => (prev + 1) % Math.ceil(allSuggestions.length / visibleCount));
    }, 10000);
    return () => clearInterval(interval);
  }, [visibleCount]);

  // Shimmer sweep every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setShimmerKey((prev) => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const visibleSuggestions = useMemo(() => {
    const startIndex = rotationIndex * visibleCount;
    return allSuggestions.slice(startIndex, startIndex + visibleCount);
  }, [rotationIndex, visibleCount]);

  const handleSelect = useCallback(
    (label: string) => {
      if (!disabled) onSelect(label);
    },
    [disabled, onSelect]
  );

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-4 -mx-6 px-6 md:mx-0 md:px-0">
      {/* Shimmer sweep overlay */}
      <div className="relative">
        <motion.div
          key={shimmerKey}
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(96,99,238,0.06) 40%, rgba(96,99,238,0.10) 50%, rgba(96,99,238,0.06) 60%, transparent 100%)',
            width: '50%',
          }}
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-row md:flex-wrap justify-start md:justify-center gap-2.5 md:gap-3 min-w-max md:min-w-0"
        >
          <AnimatePresence mode="popLayout">
            {visibleSuggestions.map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <motion.button
                  key={suggestion.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  whileHover={{
                    boxShadow: '0 0 20px rgba(96, 99, 238, 0.15)',
                    transition: { duration: 0.2 },
                  }}
                  whileTap={{ scale: 0.97 }}
                  disabled={disabled}
                  className={
                    'glass-pill rounded-full px-4 py-2.5 md:px-5 md:py-3 flex items-center gap-2 ' +
                    'hover:bg-lumina-surface-variant/80 transition-all group disabled:opacity-40 disabled:cursor-not-allowed ' +
                    'relative overflow-hidden'
                  }
                  style={{
                    // subtle gradient border on hover via background-clip trick on a pseudo-element isn't
                    // easily doable inline, so we use a border + gradient background approach:
                    border: '1px solid transparent',
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                  }}
                  onClick={() => handleSelect(suggestion.label)}
                >
                  {/* Gradient border overlay on hover */}
                  <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, rgba(96,99,238,0.3), rgba(168,85,247,0.2), rgba(96,99,238,0.1))',
                      zIndex: -1,
                      margin: '-1px',
                      borderRadius: 'inherit',
                    }}
                  />
                  <Icon className="w-4 h-4 text-lumina-primary shrink-0 transition-transform duration-200 group-hover:-translate-y-[1px]" />
                  <span className="font-[family-name:var(--font-body)] text-[14px] md:text-[15px] font-normal text-lumina-on-surface whitespace-nowrap">
                    {suggestion.label}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
