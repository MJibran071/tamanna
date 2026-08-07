'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Time-of-day helpers ───────────────────────────────────────────

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ─── Content data (all local, no API) ──────────────────────────────

interface TimeContent {
  greeting: string;
  tips: string[];
}

const timeContent: Record<TimeOfDay, TimeContent> = {
  morning: {
    greeting: 'Good morning! Start your day with Tamanna',
    tips: [
      'Try asking Tamanna to summarize your overnight emails and highlight priorities.',
      'Start with a quick brainstorm — ask for 3 ideas on your top project.',
      'Ask Tamanna to draft your daily agenda based on your calendar.',
    ],
  },
  afternoon: {
    greeting: 'Good afternoon! Keep the momentum going',
    tips: [
      'Feeling sluggish? Ask Tamanna to break your next task into small steps.',
      'Use Tamanna to quickly draft that email you\'ve been putting off.',
      'Ask for a focused summary of a long article before your next meeting.',
    ],
  },
  evening: {
    greeting: 'Good evening! Time to reflect and plan',
    tips: [
      'Ask Tamanna to help you write a quick recap of what you accomplished today.',
      'Plan tomorrow: ask for a prioritized to-do list based on your goals.',
      'Wind down by asking Tamanna to explain something you\'ve been curious about.',
    ],
  },
  night: {
    greeting: 'Still up? Let me help you wind down',
    tips: [
      'Ask Tamanna for a bedtime story or a calming visualization exercise.',
      'Jot down lingering thoughts — let Tamanna organize them for tomorrow.',
      'Ask for a quick summary of tomorrow\'s weather and news highlights.',
    ],
  },
};

const dailyQuotes: string[] = [
  '\u201cThe secret of getting ahead is getting started.\u201d \u2014 Mark Twain',
  '\u201cIt does not matter how slowly you go as long as you do not stop.\u201d \u2014 Confucius',
  '\u201cThe only way to do great work is to love what you do.\u201d \u2014 Steve Jobs',
  '\u201cBelieve you can and you\u2019re halfway there.\u201d \u2014 Theodore Roosevelt',
  '\u201cIn the middle of difficulty lies opportunity.\u201d \u2014 Albert Einstein',
  '\u201cWhat you get by achieving your goals is not as important as what you become.\u201d \u2014 Zig Ziglar',
  '\u201cThe best time to plant a tree was 20 years ago. The second best time is now.\u201d \u2014 Chinese Proverb',
];

function getDailyQuote(): string {
  // One quote per day of the week (0 = Sunday)
  const day = new Date().getDay();
  return dailyQuotes[day];
}

// ─── Animation variants ────────────────────────────────────────────

const tipVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.35, ease: 'easeIn' } },
};

// ─── Component ──────────────────────────────────────────────────────

export default function DailyInsights() {
  const [tipIndex, setTipIndex] = useState(0);
  const timeOfDay = getTimeOfDay();
  const content = timeContent[timeOfDay];
  const quote = getDailyQuote();

  const nextTip = useCallback(() => {
    setTipIndex((prev) => (prev + 1) % content.tips.length);
  }, [content.tips.length]);

  useEffect(() => {
    const interval = setInterval(nextTip, 8000);
    return () => clearInterval(interval);
  }, [nextTip]);

  return (
    <div className="glass-card rounded-2xl p-4 md:p-5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-lumina-primary/10">
          {timeOfDay === 'night' ? (
            <Lightbulb className="w-4 h-4 text-amber-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-lumina-primary" />
          )}
        </div>
        <span className="font-[family-name:var(--font-body)] text-[13px] text-lumina-on-surface-variant">
          {content.greeting}
        </span>
      </div>

      {/* Rotating tip */}
      <div className="relative min-h-[36px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            variants={tipVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="font-[family-name:var(--font-body)] text-[14px] leading-relaxed text-lumina-on-surface/80 absolute inset-0"
          >
            {content.tips[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Daily quote */}
      <p className="font-[family-name:var(--font-body)] text-[12px] italic text-lumina-on-surface-variant/70 leading-relaxed border-t border-lumina-outline-variant/20 pt-3">
        {quote}
      </p>
    </div>
  );
}
