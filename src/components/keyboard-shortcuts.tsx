'use client';

import { useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const shortcuts = [
  { keys: ['Enter'], description: 'Send message' },
  { keys: ['Shift', 'Enter'], description: 'New line' },
  { keys: ['Escape'], description: 'Cancel / Stop' },
  { keys: ['1'], description: 'Switch to Talk' },
  { keys: ['2'], description: 'Switch to History' },
  { keys: ['3'], description: 'Switch to Memory' },
  { keys: ['4'], description: 'Switch to Tools' },
  { keys: ['?', 'Ctrl+/'], description: 'Show shortcuts' },
  { keys: ['N'], description: 'New conversation' },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="glass-pill inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-medium text-lumina-on-surface border border-lumina-outline-variant/20">
      {children}
    </kbd>
  );
}

export function useKeyboardShortcuts({
  isOpen,
  onClose,
  onToggle,
  onNewChat,
  onTabSwitch,
}: {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  onNewChat: () => void;
  onTabSwitch: (tab: string) => void;
}) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Escape always closes the shortcuts panel (even when input focused)
      if (e.key === 'Escape') {
        if (isOpen) {
          onClose();
          e.preventDefault();
        }
        return;
      }

      // Shortcuts that work even with input focused
      if (e.ctrlKey && e.key === '/') {
        onToggle();
        e.preventDefault();
        return;
      }

      // Everything below requires no input focused
      if (isInput) return;

      if (e.key === '?') {
        onToggle();
        e.preventDefault();
        return;
      }

      // Only process navigation shortcuts when panel is NOT open
      if (!isOpen) {
        if (e.key === '1') {
          onTabSwitch('talk');
          e.preventDefault();
        }
        if (e.key === '2') {
          onTabSwitch('history');
          e.preventDefault();
        }
        if (e.key === '3') {
          onTabSwitch('memory');
          e.preventDefault();
        }
        if (e.key === '4') {
          onTabSwitch('tools');
          e.preventDefault();
        }
        if (e.key === 'n' || e.key === 'N') {
          onNewChat();
          e.preventDefault();
        }
      }
    },
    [isOpen, onClose, onToggle, onNewChat, onTabSwitch],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default function KeyboardShortcutsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="shortcuts-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50 backdrop-blur-sm"
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="shortcuts-panel"
            ref={panelRef}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
          >
            <div className="glass-card rounded-2xl p-6 w-full max-w-md shadow-tinted-strong pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
                  Keyboard Shortcuts
                </h2>
                <span className="text-xs text-lumina-on-surface-variant/50 font-mono">
                  ESC to close
                </span>
              </div>

              {/* Shortcuts list */}
              <div className="space-y-3">
                {shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-lumina-on-surface-variant">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {shortcut.keys.map((key, kIdx) => (
                        <span key={kIdx} className="flex items-center gap-1.5">
                          {kIdx > 0 && (
                            <span className="text-[10px] text-lumina-on-surface-variant/40">
                              +
                            </span>
                          )}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="mt-5 pt-3 border-t border-lumina-outline-variant/15">
                <p className="text-xs text-lumina-on-surface-variant/40 text-center">
                  Shortcuts only work when the input is not focused
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
