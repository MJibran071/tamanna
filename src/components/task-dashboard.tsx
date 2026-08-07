'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAgentStore } from '@/lib/stores/agent-store';
import {
  CheckCircle2,
  XCircle,
  Circle,
  Bot,
  Search,
  FileText,
  Calculator,
  Code2,
  Globe,
  Brain,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Flame,
  Trophy,
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────

interface TaskExecution {
  id: string;
  prompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: TaskStep[];
  startedAt: string | null;
  completedAt: string | null;
  artifacts: TaskArtifact[];
  durationMs?: number;
}

interface TaskStep {
  id: string;
  agent: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  durationMs?: number;
  startedAt?: string;
  completedAt?: string;
}

interface TaskArtifact {
  id: string;
  title: string;
  type: 'image' | 'document' | 'code' | 'data' | 'audio';
  size?: string;
  createdAt: string;
}

interface TaskStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  avgDurationMs: number;
  successRate: number;
  totalSteps: number;
}

// ─── Helper ────────────────────────────────────────────────────────────────

function getAgentIconKey(agent: string): string {
  const key = agent.toLowerCase();
  const map: Record<string, string> = {
    researcher: 'search',
    writer: 'filetext',
    coder: 'code2',
    browser: 'globe',
    analyst: 'calculator',
    planner: 'brain',
    executor: 'zap',
    vision: 'eye',
    translator: 'languages',
    summarizer: 'filetext',
    math: 'calculator',
    search: 'search',
  };
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return 'bot';
}

function DynamicAgentIcon({ agent, className, size = 'sm' }: { agent: string; className?: string; size?: 'sm' | 'md' }) {
  const iconKey = getAgentIconKey(agent);
  const cls = className ?? '';
  const IconComponent = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  switch (iconKey) {
    case 'search':
      return <Search className={`${cls} ${IconComponent}`} />;
    case 'filetext':
      return <FileText className={`${cls} ${IconComponent}`} />;
    case 'code2':
      return <Code2 className={`${cls} ${IconComponent}`} />;
    case 'globe':
      return <Globe className={`${cls} ${IconComponent}`} />;
    case 'calculator':
      return <Calculator className={`${cls} ${IconComponent}`} />;
    case 'brain':
      return <Brain className={`${cls} ${IconComponent}`} />;
    case 'zap':
      return <Zap className={`${cls} ${IconComponent}`} />;
    default:
      return <Bot className={`${cls} ${IconComponent}`} />;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function getStepStatusColor(status: TaskStep['status']): string {
  switch (status) {
    case 'completed':
      return 'emerald';
    case 'failed':
      return 'red';
    case 'running':
      return 'lumina-primary';
    default:
      return 'outline';
  }
}

// ─── Stats Cards ──────────────────────────────────────────────────────────

function StatsRow({ stats }: { stats: TaskStats }) {
  const cards = [
    {
      icon: Target,
      label: 'Tasks',
      value: stats.totalTasks,
      color: 'text-lumina-primary',
      bgColor: 'bg-lumina-primary/10',
      borderColor: 'border-lumina-primary/20',
    },
    {
      icon: Trophy,
      label: 'Completed',
      value: stats.completedTasks,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
    },
    {
      icon: Flame,
      label: 'Success Rate',
      value: `${stats.successRate}%`,
      color: stats.successRate >= 80 ? 'text-emerald-500' : stats.successRate >= 50 ? 'text-amber-500' : 'text-red-500',
      bgColor: stats.successRate >= 80 ? 'bg-emerald-500/10' : stats.successRate >= 50 ? 'bg-amber-500/10' : 'bg-red-500/10',
      borderColor: stats.successRate >= 80 ? 'border-emerald-500/20' : stats.successRate >= 50 ? 'border-amber-500/20' : 'border-red-500/20',
    },
    {
      icon: Zap,
      label: 'Avg Time',
      value: stats.avgDurationMs > 0 ? formatDuration(stats.avgDurationMs) : '—',
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.3 }}
          className={`glass-card rounded-xl p-3 border ${card.borderColor}`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className={`p-1.5 rounded-lg ${card.bgColor}`}>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
          </div>
          <p className={`font-[family-name:var(--font-display)] text-lg font-semibold ${card.color}`}>
            {card.value}
          </p>
          <p className="font-[family-name:var(--font-body)] text-[11px] text-lumina-on-surface-variant/60">
            {card.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Step Timeline ─────────────────────────────────────────────────────────

function StepTimeline({ steps }: { steps: TaskStep[] }) {
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progressPercent = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="relative">
      {/* Progress bar */}
      {steps.length > 1 && (
        <div className="absolute left-[15px] top-0 bottom-0 w-[2px]">
          <motion.div
            className="w-full bg-gradient-to-b from-lumina-primary/40 to-lumina-primary/10 rounded-full"
            initial={{ height: '0%' }}
            animate={{ height: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      )}

      <div className="space-y-2">
        {steps.map((step, idx) => (
          <StepTimelineItem key={step.id} step={step} index={idx} />
        ))}
      </div>
    </div>
  );
}

function StepTimelineItem({ step, index }: { step: TaskStep; index: number }) {
  const isRunning = step.status === 'running';
  const isCompleted = step.status === 'completed';
  const isFailed = step.status === 'failed';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="flex items-start gap-3 relative"
    >
      {/* Status indicator */}
      <div className="relative z-10 shrink-0">
        {isCompleted && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-[30px] h-[30px] rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </motion.div>
        )}
        {isFailed && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-[30px] h-[30px] rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center"
          >
            <XCircle className="w-4 h-4 text-red-500" />
          </motion.div>
        )}
        {isRunning && (
          <motion.div
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-[30px] h-[30px] rounded-full bg-lumina-primary/10 border border-lumina-primary/40 flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <DynamicAgentIcon agent={step.agent} className="text-lumina-primary" />
            </motion.div>
          </motion.div>
        )}
        {!isRunning && !isCompleted && !isFailed && (
          <div className="w-[30px] h-[30px] rounded-full bg-lumina-surface-variant/20 border border-lumina-outline/30 flex items-center justify-center">
            <Circle className="w-3.5 h-3.5 text-lumina-outline/50" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 mb-0.5">
          <DynamicAgentIcon agent={step.agent} className="text-lumina-on-surface-variant/50" />
          <span className="font-mono text-xs font-medium text-lumina-on-surface/70 uppercase tracking-wider">
            {step.agent}
          </span>
          {step.durationMs && (
            <span className="text-[10px] text-lumina-on-surface-variant/40 ml-auto">
              {formatDuration(step.durationMs)}
            </span>
          )}
        </div>
        <p className={`font-[family-name:var(--font-body)] text-sm leading-relaxed ${
          isRunning ? 'text-lumina-on-surface' : isCompleted ? 'text-lumina-on-surface-variant/80' : 'text-lumina-on-surface-variant/50'
        }`}>
          {step.description}
        </p>

        {/* Running indicator */}
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-1.5 mt-1"
          >
            <Loader2 className="w-3 h-3 text-lumina-primary animate-spin" />
            <span className="text-[11px] text-lumina-primary/70">Processing...</span>
          </motion.div>
        )}

        {/* Error */}
        {isFailed && step.error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10"
          >
            <AlertTriangle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-red-500/80 leading-relaxed">{step.error}</p>
          </motion.div>
        )}

        {/* Result */}
        {isCompleted && step.result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
          >
            <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/70 leading-relaxed">{step.result}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Task Card ──────────────────────────────────────────────────────────────

function TaskCard({ task, isExpanded, onToggle }: { task: TaskExecution; isExpanded: boolean; onToggle: () => void }) {
  const completedSteps = task.steps.filter(s => s.status === 'completed').length;
  const failedSteps = task.steps.filter(s => s.status === 'failed').length;
  const isRunning = task.status === 'running';

  const statusBadge = (() => {
    switch (task.status) {
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lumina-primary/10 border border-lumina-primary/20 text-[10px] font-medium text-lumina-primary uppercase tracking-wider">
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-lumina-primary"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            Running
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-500 uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-medium text-red-500 uppercase tracking-wider">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lumina-surface-variant/20 border border-lumina-outline/20 text-[10px] font-medium text-lumina-on-surface-variant/50 uppercase tracking-wider">
            <Circle className="w-3 h-3" />
            Pending
          </span>
        );
    }
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className={`glass-card rounded-2xl border overflow-hidden transition-all duration-300 ${
        isRunning
          ? 'border-lumina-primary/30 shadow-[0_0_20px_rgba(70,72,212,0.08)]'
          : 'border-white/10 dark:border-white/5'
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-lumina-primary/[0.02] transition-colors"
      >
        {/* Progress ring */}
        <div className="shrink-0 relative">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle
              className="text-lumina-surface-variant/30"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              cx="18"
              cy="18"
              r="15"
            />
            <motion.circle
              className={isRunning ? 'text-lumina-primary' : task.status === 'completed' ? 'text-emerald-500' : 'text-lumina-on-surface-variant/30'}
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              cx="18"
              cy="18"
              r="15"
              strokeDasharray={`${2 * Math.PI * 15}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 15 }}
              animate={{
                strokeDashoffset: task.steps.length > 0
                  ? 2 * Math.PI * 15 * (1 - completedSteps / task.steps.length)
                  : 2 * Math.PI * 15,
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-lumina-on-surface/80">
              {task.steps.length > 0 ? `${completedSteps}/${task.steps.length}` : '—'}
            </span>
          </div>
        </div>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {statusBadge}
            {task.durationMs && (
              <span className="text-[10px] text-lumina-on-surface-variant/40">
                <Clock className="w-3 h-3 inline mr-0.5" />
                {formatDuration(task.durationMs)}
              </span>
            )}
          </div>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface/80 truncate">
            {task.prompt}
          </p>
          {task.steps.length > 0 && (
            <p className="text-[11px] text-lumina-on-surface-variant/50 mt-0.5">
              {task.steps.length} steps • {completedSteps} done{failedSteps > 0 ? ` • ${failedSteps} failed` : ''}
            </p>
          )}
        </div>

        {/* Expand/collapse */}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-lumina-on-surface-variant/40" />
        </motion.div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-white/5 dark:border-white/3">
              {/* Step timeline */}
              {task.steps.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-3.5 h-3.5 text-lumina-on-surface-variant/50" />
                    <span className="text-[11px] font-medium text-lumina-on-surface-variant/60 uppercase tracking-wider">
                      Execution Steps
                    </span>
                  </div>
                  <StepTimeline steps={task.steps} />
                </div>
              )}

              {/* Artifacts */}
              {task.artifacts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5 dark:border-white/3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-lumina-on-surface-variant/50" />
                    <span className="text-[11px] font-medium text-lumina-on-surface-variant/60 uppercase tracking-wider">
                      Artifacts ({task.artifacts.length})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {task.artifacts.map(artifact => (
                      <div
                        key={artifact.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-lumina-surface-variant/20 border border-lumina-outline/10 text-[11px] text-lumina-on-surface-variant/70"
                      >
                        <ArtifactTypeIcon type={artifact.type} />
                        <span className="max-w-[120px] truncate">{artifact.title}</span>
                        {artifact.size && (
                          <span className="text-lumina-on-surface-variant/40">{artifact.size}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="mt-3 pt-3 border-t border-white/5 dark:border-white/3 flex items-center gap-3 text-[11px] text-lumina-on-surface-variant/40">
                {task.startedAt && (
                  <span className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    Started {formatDistanceToNow(new Date(task.startedAt), { addSuffix: true })}
                  </span>
                )}
                {task.completedAt && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Finished {formatDistanceToNow(new Date(task.completedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ArtifactTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'image':
      return <Globe className="w-3 h-3 text-emerald-500" />;
    case 'document':
      return <FileText className="w-3 h-3 text-blue-500" />;
    case 'code':
      return <Code2 className="w-3 h-3 text-purple-500" />;
    case 'data':
      return <Calculator className="w-3 h-3 text-orange-500" />;
    case 'audio':
      return <Zap className="w-3 h-3 text-pink-500" />;
    default:
      return <FileText className="w-3 h-3 text-lumina-on-surface-variant" />;
  }
}

// ─── Active Task Hero (shown during execution) ──────────────────────────────

function ActiveTaskHero({ task }: { task: TaskExecution }) {
  const completedSteps = task.steps.filter(s => s.status === 'completed').length;
  const progressPercent = task.steps.length > 0 ? (completedSteps / task.steps.length) * 100 : 0;
  const currentStep = task.steps.find(s => s.status === 'running');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="glass-card rounded-2xl p-5 border border-lumina-primary/20 shadow-[0_0_30px_rgba(70,72,212,0.06)] relative overflow-hidden">
        {/* Animated gradient border at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-lumina-primary via-lumina-secondary to-lumina-primary"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ width: '200%' }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-lumina-primary/10 border border-lumina-primary/20">
              <BrainCircuit className="w-4 h-4 text-lumina-primary" />
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold text-lumina-on-surface">
                Agent Working
              </h3>
              <p className="text-[11px] text-lumina-on-surface-variant/50">
                Multi-step execution in progress
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-lumina-primary tabular-nums">
            {completedSteps}/{task.steps.length} steps
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-lumina-surface-variant/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-lumina-primary to-lumina-secondary rounded-full"
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-lumina-on-surface-variant/40">
              Step {completedSteps + 1} of {task.steps.length}
            </span>
            <span className="text-[10px] text-lumina-on-surface-variant/40">
              {Math.round(progressPercent)}%
            </span>
          </div>
        </div>

        {/* Current step highlight */}
        {currentStep && (
          <motion.div
            layout
            className="p-3 rounded-xl bg-lumina-primary/5 border border-lumina-primary/10"
          >
            <div className="flex items-center gap-2 mb-1">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <DynamicAgentIcon agent={currentStep.agent} className="text-lumina-primary" />
              </motion.div>
              <span className="font-mono text-xs font-medium text-lumina-primary uppercase tracking-wider">
                {currentStep.agent}
              </span>
            </div>
            <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface/80 leading-relaxed">
              {currentStep.description}
            </p>
          </motion.div>
        )}

        {/* Quick step overview */}
        <div className="mt-4 flex gap-1.5">
          {task.steps.map((step, idx) => {
            const dotColor = step.status === 'completed'
              ? 'bg-emerald-500'
              : step.status === 'failed'
                ? 'bg-red-500'
                : step.status === 'running'
                  ? 'bg-lumina-primary'
                  : 'bg-lumina-outline/30';
            return (
              <motion.div
                key={step.id}
                className={`flex-1 h-1 rounded-full ${dotColor} transition-colors duration-300`}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
              />
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-lumina-primary/5 border border-lumina-primary/10 flex items-center justify-center mb-4">
        <BrainCircuit className="w-7 h-7 text-lumina-primary/40" />
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface/60 mb-2">
        No Tasks Yet
      </h3>
      <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant/50 max-w-xs leading-relaxed">
        Start a conversation with Tamanna and give it a complex task. 
        The agent will break it down into steps and show real-time progress here.
      </p>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-lumina-on-surface-variant/40">
        <ArrowRight className="w-3 h-3" />
        <span>Try: "Research the latest AI trends and write a summary"</span>
      </div>
    </motion.div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function TaskDashboard() {
  const currentPlan = useAgentStore((s) => s.currentPlan);
  const stepStates = useAgentStore((s) => s.stepStates);
  const agentState = useAgentStore((s) => s.agentState);
  const messages = useAgentStore((s) => s.messages);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Build the "active" task from current Zustand state (real-time execution)
  const activeTask: TaskExecution | null = useMemo(() => {
    if (stepStates.length === 0) return null;

    return {
      id: 'active',
      prompt: messages.find(m => m.role === 'user')?.content || 'Current Task',
      status: agentState === 'executing' || agentState === 'planning' ? 'running'
        : stepStates.every(s => s.status === 'completed') ? 'completed'
        : stepStates.some(s => s.status === 'failed') ? 'failed'
        : 'pending',
      steps: stepStates.map(s => ({
        id: `step-${s.stepIndex}`,
        agent: s.agent,
        description: s.description,
        status: s.status,
        result: s.result,
        error: s.error,
      })),
      startedAt: new Date().toISOString(),
      completedAt: stepStates.every(s => s.status !== 'pending' && s.status !== 'running')
        ? new Date().toISOString()
        : null,
      artifacts: [],
    };
  }, [stepStates, agentState, messages]);

  // Build historical "completed" tasks from message history
  const historicalTasks: TaskExecution[] = useMemo(() => {
    // Extract task-like patterns from past messages
    const tasks: TaskExecution[] = [];
    // For now, we show the active task prominently
    // Historical tasks would come from the database in future iterations
    return tasks;
  }, []);

  // Calculate stats
  const stats: TaskStats = useMemo(() => {
    const allTasks = [...historicalTasks];
    if (activeTask) allTasks.push(activeTask);

    const completed = allTasks.filter(t => t.status === 'completed');
    const failed = allTasks.filter(t => t.status === 'failed');
    const withDuration = allTasks.filter(t => t.durationMs);

    return {
      totalTasks: allTasks.length,
      completedTasks: completed.length,
      failedTasks: failed.length,
      avgDurationMs: withDuration.length > 0
        ? Math.round(withDuration.reduce((sum, t) => sum + (t.durationMs || 0), 0) / withDuration.length)
        : 0,
      successRate: allTasks.length > 0
        ? Math.round((completed.length / allTasks.length) * 100)
        : 0,
      totalSteps: allTasks.reduce((sum, t) => sum + t.steps.length, 0),
    };
  }, [activeTask, historicalTasks]);

  const isCurrentlyExecuting = agentState === 'executing' || agentState === 'planning';

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-lumina-primary/10 border border-lumina-primary/20">
            <BrainCircuit className="w-4 h-4 text-lumina-primary" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
              Task Dashboard
            </h2>
            <p className="text-[11px] text-lumina-on-surface-variant/50">
              Real-time agent execution monitoring
            </p>
          </div>
        </div>
        {isCurrentlyExecuting && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lumina-primary/10 border border-lumina-primary/20 text-[11px] font-medium text-lumina-primary"
          >
            <motion.span
              className="w-2 h-2 rounded-full bg-lumina-primary"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            Live
          </motion.span>
        )}
      </div>

      {/* Stats */}
      {stats.totalTasks > 0 && <StatsRow stats={stats} />}

      {/* Active Task Hero (during execution) */}
      <AnimatePresence>
        {activeTask && isCurrentlyExecuting && (
          <ActiveTaskHero task={activeTask} />
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="space-y-3">
        {/* Active task card (when not executing, show completed/failed state) */}
        {activeTask && !isCurrentlyExecuting && stepStates.length > 0 && (
          <TaskCard
            key={activeTask.id}
            task={activeTask}
            isExpanded={expandedTask === activeTask.id}
            onToggle={() => setExpandedTask(prev => prev === activeTask.id ? null : activeTask.id)}
          />
        )}

        {/* Historical tasks */}
        {historicalTasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            isExpanded={expandedTask === task.id}
            onToggle={() => setExpandedTask(prev => prev === task.id ? null : task.id)}
          />
        ))}

        {/* Empty state */}
        {!activeTask && historicalTasks.length === 0 && <EmptyState />}
      </div>
    </div>
  );
}
