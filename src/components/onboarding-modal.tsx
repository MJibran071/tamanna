'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Mic, Paperclip, Zap, Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'What can you do?',
  'Search the web for AI news',
  'Help me write an email',
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 120 : -120,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -120 : 120,
    opacity: 0,
    scale: 0.95,
  }),
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 28,
    },
  },
  exit: {
    opacity: 0,
    y: 30,
    scale: 0.92,
    transition: { duration: 0.2 },
  },
};

export default function OnboardingModal({
  onSelectSuggestion,
}: {
  onSelectSuggestion?: (text: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  useEffect(() => {
    const done = localStorage.getItem('tamanna_onboarding_done');
    if (!done) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem('tamanna_onboarding_done', '1');
    }
    setShow(false);
  }, [dontShowAgain]);

  const handleNext = useCallback(() => {
    setDirection(1);
    if (step < 2) {
      setStep((s) => s + 1);
    } else {
      handleDismiss();
    }
  }, [step, handleDismiss]);

  const handleSuggestionClick = useCallback(
    (text: string) => {
      localStorage.setItem('tamanna_onboarding_done', '1');
      setShow(false);
      onSelectSuggestion?.(text);
    },
    [onSelectSuggestion],
  );

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
            onClick={handleDismiss}
            aria-hidden="true"
          />

          {/* Modal Card Overlay */}
          <motion.div
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.25 }}
            onClick={handleDismiss}
          >
            {/* Card */}
            <motion.div
              className="glass-card relative w-full max-w-md rounded-3xl p-6 md:p-8 shadow-tinted-strong overflow-visible"
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Skip button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-lumina-on-surface-variant/50 hover:text-lumina-on-surface hover:bg-lumina-surface-variant/20 transition-colors"
                aria-label="Skip onboarding"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Step content */}
              <AnimatePresence mode="popLayout" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    type: 'spring',
                    stiffness: 350,
                    damping: 30,
                    mass: 0.8,
                  }}
                  className="min-h-[320px] md:min-h-[340px] flex flex-col"
                >
                  {/* ── Step 1: Welcome ── */}
                  {step === 0 && (
                    <div className="flex flex-col items-center text-center flex-1 justify-center">
                      <div className="relative w-28 h-28 md:w-32 md:h-32 mb-6">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lumina-primary/20 to-lumina-primary-container/10 animate-pulse" />
                        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-lumina-primary via-lumina-primary-container to-lumina-secondary shadow-tinted-strong" />
                        <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-transparent via-white/20 to-white/40" />
                        <div className="absolute inset-0 rounded-full border-2 border-lumina-primary/15 animate-ping [animation-duration:2.5s]" />
                        <div className="absolute -inset-2 rounded-full border border-lumina-primary/8 animate-ping [animation-duration:3.5s] [animation-delay:0.5s]" />
                      </div>
                      <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-lumina-on-surface tracking-tight mb-1.5">
                        Welcome to Tamanna
                      </h1>
                      <p className="font-[family-name:var(--font-display)] text-sm md:text-base font-medium text-lumina-primary mb-4">
                        Your AI Voice Assistant
                      </p>
                      <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant leading-relaxed max-w-[280px]">
                        Tamanna understands your voice, text, and files. Get intelligent responses powered by multiple AI agents.
                      </p>
                    </div>
                  )}

                  {/* ── Step 2: How it works ── */}
                  {step === 1 && (
                    <div className="flex flex-col flex-1 justify-center">
                      <h2 className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-bold text-lumina-on-surface tracking-tight mb-6 text-center">
                        How it works
                      </h2>
                      <div className="space-y-3">
                        <div className="glass-card rounded-2xl p-4 flex items-start gap-4 hover:bg-lumina-surface-variant/15 transition-colors">
                          <div className="shrink-0 w-11 h-11 rounded-xl bg-lumina-primary/10 flex items-center justify-center">
                            <Mic className="w-5 h-5 text-lumina-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-lumina-on-surface">Voice</p>
                            <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant leading-relaxed">Tap the orb to speak, or type your message</p>
                          </div>
                        </div>
                        <div className="glass-card rounded-2xl p-4 flex items-start gap-4 hover:bg-lumina-surface-variant/15 transition-colors">
                          <div className="shrink-0 w-11 h-11 rounded-xl bg-lumina-primary/10 flex items-center justify-center">
                            <Paperclip className="w-5 h-5 text-lumina-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-lumina-on-surface">Files</p>
                            <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant leading-relaxed">Attach images, documents, or audio files</p>
                          </div>
                        </div>
                        <div className="glass-card rounded-2xl p-4 flex items-start gap-4 hover:bg-lumina-surface-variant/15 transition-colors">
                          <div className="shrink-0 w-11 h-11 rounded-xl bg-lumina-primary/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-lumina-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-lumina-on-surface">Agents</p>
                            <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant leading-relaxed">11 specialized AI agents work together for you</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Step 3: Ready to go ── */}
                  {step === 2 && (
                    <div className="flex flex-col items-center text-center flex-1 justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-lumina-primary/10 flex items-center justify-center mb-5">
                        <Sparkles className="w-8 h-8 text-lumina-primary" />
                      </div>
                      <h2 className="font-[family-name:var(--font-display)] text-xl md:text-2xl font-bold text-lumina-on-surface tracking-tight mb-2">
                        Ready to go!
                      </h2>
                      <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mb-8 max-w-[280px] leading-relaxed">
                        You&apos;re all set! Try asking Tamanna anything.
                      </p>
                      <div className="w-full space-y-2.5">
                        {SUGGESTIONS.map((s, i) => (
                          <motion.button
                            key={s}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 + i * 0.06 }}
                            whileHover={{ boxShadow: '0 0 20px rgba(96, 99, 238, 0.12)' }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleSuggestionClick(s)}
                            className="w-full glass-pill rounded-2xl px-4 py-3 text-left hover:bg-lumina-surface-variant/80 transition-colors group"
                          >
                            <span className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface group-hover:text-lumina-primary transition-colors">
                              {s}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                      <label className="flex items-center gap-2 mt-6 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={dontShowAgain}
                          onChange={(e) => setDontShowAgain(e.target.checked)}
                          className="w-4 h-4 rounded border-lumina-outline-variant text-lumina-primary focus:ring-lumina-primary/30 accent-lumina-primary"
                        />
                        <span className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant">
                          Don&apos;t show again
                        </span>
                      </label>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Footer */}
              <div className="mt-6 flex flex-col items-center gap-4">
                {step < 2 ? (
                  <button
                    onClick={handleNext}
                    className="w-full h-12 rounded-2xl bg-lumina-primary text-lumina-on-primary font-[family-name:var(--font-display)] text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    {step === 0 ? 'Get Started' : 'Next'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleDismiss}
                    className="w-full h-12 rounded-2xl bg-lumina-primary text-lumina-on-primary font-[family-name:var(--font-display)] text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    Start Chatting
                  </button>
                )}
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === step ? 'w-6 bg-lumina-primary' : 'w-2 bg-lumina-on-surface-variant/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
