'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeGreetingProps {
  visible: boolean;
}

function getTimeGreeting(): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return { greeting: 'Good morning', subtitle: 'What can I help you with today?' };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: 'Good afternoon', subtitle: "How's your day going?" };
  } else if (hour >= 17 && hour < 21) {
    return { greeting: 'Good evening', subtitle: 'Ready to wind down?' };
  } else {
    return { greeting: 'Good night', subtitle: 'Still up? Let me help.' };
  }
}

function getUserName(): string {
  if (typeof window === 'undefined') return 'there';
  try {
    const profile = JSON.parse(localStorage.getItem('tamanna_profile') || '{}');
    return profile?.name || 'there';
  } catch {
    return 'there';
  }
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function WelcomeGreeting({ visible }: WelcomeGreetingProps) {
  const [timeData, setTimeData] = useState({ greeting: '', subtitle: '', date: '' });
  const [userName, setUserName] = useState('there');

  useEffect(() => {
    const update = () => {
      const { greeting, subtitle } = getTimeGreeting();
      setTimeData({ greeting, subtitle, date: getFormattedDate() });
      setUserName(getUserName());
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {visible && timeData.greeting && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center mb-2"
        >
          <p className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-medium text-lumina-on-surface/40 tracking-tight">
            {timeData.greeting},{' '}
            <span className="text-lumina-primary/50">{userName}</span>
          </p>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant/30 mt-1">
            {timeData.subtitle}
          </p>
          <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant/20 mt-0.5">
            {timeData.date}
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
