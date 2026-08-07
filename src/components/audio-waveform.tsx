'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAgentStore } from '@/lib/stores/agent-store';

const BAR_COUNT = 16;

// Pre-generate deterministic random values so bars don't re-randomize every render
const barConfigs = Array.from({ length: BAR_COUNT }, (_, i) => ({
  height1: 4 + ((i * 7 + 3) % 17),
  height2: 4 + ((i * 13 + 7) % 13),
  duration: 0.8 + ((i * 5 + 2) % 5) * 0.08,
  opacity: 0.4 + ((i * 3 + 1) % 6) * 0.1,
}));

export default function AudioWaveform() {
  const isPlaying = useAgentStore((s) => s.isPlaying);

  return (
    <AnimatePresence>
      {isPlaying && (
        <motion.div
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0, scaleX: 0.8 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="flex items-center justify-center"
        >
          <div className="glass-card rounded-full flex items-center justify-center gap-[3px] h-8 px-4">
            {barConfigs.map((cfg, i) => (
              <motion.div
                key={i}
                className="w-[3px] rounded-full bg-lumina-primary"
                style={{ opacity: cfg.opacity }}
                animate={{
                  height: [4, cfg.height1, cfg.height2, 4],
                }}
                transition={{
                  duration: cfg.duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.05,
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
