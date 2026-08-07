'use client';

import { Keyboard, Wifi, WifiOff } from 'lucide-react';
import { useAgentStore } from '@/lib/stores/agent-store';

export default function PageFooter() {
  const isConnected = useAgentStore((s) => s.isConnected);

  return (
    <footer className="hidden md:flex fixed bottom-0 w-full z-40 flex-col items-center justify-center">
      {/* Subtle top border gradient — mirrors top-bar bottom border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lumina-primary/20 to-transparent" />

      <div className="w-full bg-lumina-surface/70 backdrop-blur-xl px-8 lg:px-16 h-10 max-w-screen-xl mx-auto flex items-center justify-between">
        {/* Left: Brand + version */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-tight text-gradient-primary">
            Tamanna AI
          </span>
          <span className="text-[10px] font-medium text-lumina-on-surface-variant/50 select-none">
            v0.2.1
          </span>
        </div>

        {/* Center: Keyboard shortcut hint */}
        <div className="flex items-center gap-1.5 text-lumina-on-surface-variant/50">
          <Keyboard className="w-3 h-3" />
          <span className="font-[family-name:var(--font-body)] text-[11px]">
            Press <kbd className="font-mono text-[10px] px-1 py-0.5 rounded bg-lumina-surface-variant/50 text-lumina-on-surface-variant/70 border border-white/10">/</kbd> for shortcuts
          </span>
        </div>

        {/* Right: Connection status */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isConnected
                ? 'bg-emerald-500 connection-pulse'
                : 'bg-red-500'
            }`}
            aria-label={isConnected ? 'Connected' : 'Disconnected'}
          />
          <span className="font-[family-name:var(--font-body)] text-[11px] text-lumina-on-surface-variant/50">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {isConnected ? (
            <Wifi className="w-3 h-3 text-emerald-500/60" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-500/60" />
          )}
        </div>
      </div>
    </footer>
  );
}
