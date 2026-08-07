'use client';

import { useState, useCallback } from 'react';
import {
  Wand2,
  Search,
  Globe,
  Bell,
  Send,
  Sparkles,
  BookOpen,
  Plane,
  BarChart3,
  ShoppingBag,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface DashboardProps {
  onSendCommand?: (command: string) => void;
}

const QUICK_ACTIONS = [
  { label: 'Search', icon: Search, prompt: 'Search the web for ', color: 'text-sky-500', bg: 'bg-sky-500/10' },
  { label: 'Browse', icon: Globe, prompt: 'Open and summarize ', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { label: 'Remind', icon: Bell, prompt: 'Set a reminder: ', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Compare', icon: BarChart3, prompt: 'Compare ', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { label: 'Read', icon: BookOpen, prompt: 'Read and summarize: ', color: 'text-violet-500', bg: 'bg-violet-500/10' },
  { label: 'Shop', icon: ShoppingBag, prompt: 'Find deals on ', color: 'text-rose-500', bg: 'bg-rose-500/10' },
];

export default function UltraModeDashboard({ onSendCommand }: DashboardProps) {
  const [command, setCommand] = useState('');

  const handleSend = useCallback(() => {
    const trimmed = command.trim();
    if (!trimmed) return;
    onSendCommand?.(trimmed);
    toast({ title: 'Command sent', description: `Tamanna is on it: "${trimmed.slice(0, 60)}${trimmed.length > 60 ? '…' : ''}"` });
    setCommand('');
  }, [command, onSendCommand]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full space-y-5"
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-lumina-primary/25 to-lumina-secondary/15 flex items-center justify-center ring-1 ring-lumina-primary/15">
          <Wand2 className="w-4.5 h-4.5 text-lumina-primary" />
        </div>
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-lumina-on-surface tracking-tight">
            Ultra Mode
          </h2>
          <p className="text-xs text-lumina-on-surface-variant/60 mt-0.5">
            Tell Tamanna what to do — she handles the rest
          </p>
        </div>
      </div>

      {/* ── Command Console ───────────────────────────────────────── */}
      <div className="relative">
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-lumina-primary via-violet-500 to-lumina-primary bg-[length:200%_100%] animate-[bg-drift_4s_ease_infinite] p-[1.5px]">
            <div className="w-full h-full rounded-2xl bg-lumina-surface" />
          </div>
          <div className="relative flex items-end gap-2 p-3.5">
            <textarea
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Search best laptops under 100k, Compare iPhone 15 vs Samsung S24, Set reminder for 3pm meeting..."
              rows={2}
              className="flex-1 bg-transparent outline-none text-lumina-on-surface placeholder:text-lumina-on-surface-variant/35 text-sm resize-none min-h-[36px] leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!command.trim()}
              className="shrink-0 w-9 h-9 rounded-xl bg-lumina-primary text-lumina-on-primary flex items-center justify-center hover:bg-lumina-primary/90 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Action Grid ─────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-lumina-on-surface-variant/50 uppercase tracking-wider mb-3">
          Quick Actions
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => onSendCommand?.(action.prompt)}
                className="glass-card rounded-xl p-3 flex flex-col items-center gap-2 border border-white/[0.07] hover:border-lumina-primary/20 hover:bg-lumina-primary/[0.04] active:scale-95 transition-all cursor-pointer group"
              >
                <div className={`w-8 h-8 rounded-lg ${action.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <Icon className={`w-4 h-4 ${action.color}`} />
                </div>
                <span className="text-[11px] font-medium text-lumina-on-surface-variant/70 group-hover:text-lumina-on-surface transition-colors">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
