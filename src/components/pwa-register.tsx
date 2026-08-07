'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // Check if previously dismissed — initialize in state to avoid setState in effect
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    const wasDismissed = localStorage.getItem('tamanna_pwa_dismissed');
    const dismissedAt = wasDismissed ? parseInt(wasDismissed, 10) : 0;
    return dismissedAt && Date.now() - dismissedAt < 86400000;
  });

  useEffect(() => {

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed) {
        // Delay banner to not annoy on first visit
        setTimeout(() => setShowBanner(true), 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] SW registration failed:', err);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [dismissed]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('tamanna_pwa_dismissed', String(Date.now()));
  }, []);

  // Detect standalone mode — hide banner if already installed
  if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  return (
    <AnimatePresence>
      {showBanner && !dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-[360px] z-[100]"
        >
          <div className="glass-card rounded-2xl p-4 shadow-tinted-strong">
            <div className="flex items-start gap-3">
              {/* App Icon */}
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-tinted">
                <img
                  src="/icons/icon-192x192.png"
                  alt="Tamanna"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-lumina-on-surface">
                  Install Tamanna
                </h3>
                <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant mt-0.5 leading-relaxed">
                  Add to your {typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'home screen' : 'device'} for a faster, app-like experience.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleInstall}
                  className="px-4 py-2 rounded-xl bg-lumina-primary text-lumina-on-primary font-[family-name:var(--font-body)] text-xs font-semibold hover:bg-lumina-primary/90 transition-colors shadow-[0_2px_8px_rgba(70,72,212,0.2)] flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 rounded-lg hover:bg-lumina-surface-variant/50 text-lumina-on-surface-variant/40 transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
