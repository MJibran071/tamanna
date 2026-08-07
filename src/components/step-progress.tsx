'use client';

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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StepState } from '@/types/agent';

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
  };
  for (const [k, v] of Object.entries(map)) {
    if (key.includes(k)) return v;
  }
  return 'bot';
}

/** Animated processing label shown during execution */
function ProcessingLabel() {
  const agentState = useAgentStore((s) => s.agentState);
  const isExecuting = agentState === 'planning' || agentState === 'executing';

  if (!isExecuting) return null;

  const label = agentState === 'planning' ? 'Planning' : 'Processing';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 mb-3"
    >
      <motion.div
        className="flex gap-0.5"
        initial="hidden"
        animate="visible"
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1 h-1 rounded-full bg-lumina-primary"
            variants={{
              hidden: { opacity: 0.3, y: 0 },
              visible: {
                opacity: [0.3, 1, 0.3],
                y: [0, -3, 0],
                transition: {
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: 'easeInOut',
                },
              },
            }}
          />
        ))}
      </motion.div>
      <span className="font-[family-name:var(--font-body)] text-xs font-medium text-lumina-primary/80">
        {label}
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          ...
        </motion.span>
      </span>
    </motion.div>
  );
}

export default function StepProgress() {
  const currentPlan = useAgentStore((s) => s.currentPlan);
  const stepStates = useAgentStore((s) => s.stepStates);

  if (currentPlan.length === 0) return null;

  const completedCount = stepStates.filter((s) => s.status === 'completed').length;
  const failedCount = stepStates.filter((s) => s.status === 'failed').length;
  const runningStep = stepStates.find((s) => s.status === 'running');
  const totalCount = stepStates.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-xl mx-auto"
      >
        <div className="glass-card rounded-2xl p-4 space-y-1 overflow-hidden relative">
          {/* Animated progress bar at top */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-lumina-surface-variant/30 rounded-t-2xl overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-lumina-primary to-lumina-primary-container rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-body)] text-xs font-semibold uppercase tracking-[0.06em] text-lumina-on-surface-variant">
                Execution Plan
              </span>
              <span className="text-[11px] text-lumina-on-surface-variant/50 tabular-nums">
                {completedCount}/{totalCount}
              </span>
            </div>
            {failedCount > 0 && (
              <span className="text-[11px] text-red-500/80 font-medium">
                {failedCount} failed
              </span>
            )}
          </div>

          {/* Processing label */}
          <ProcessingLabel />

          {/* Steps with connecting line */}
          <div className="relative pl-4">
            {/* Vertical connecting line */}
            {stepStates.length > 1 && (
              <div className="absolute left-[11px] top-2 bottom-2 w-px">
                <motion.div
                  className="w-full bg-gradient-to-b from-lumina-primary/40 to-lumina-primary/10 rounded-full"
                  initial={{ height: 0 }}
                  animate={{
                    height: '100%',
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            )}

            <div className="space-y-1">
              {stepStates.map((step, idx) => (
                <StepRow key={step.stepIndex} step={step} isLast={idx === stepStates.length - 1} />
              ))}
            </div>
          </div>

          {/* Running step description highlight */}
          <AnimatePresence>
            {runningStep?.result && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-2 px-3 py-2 rounded-lg bg-lumina-primary/5 border border-lumina-primary/10">
                  <p className="font-[family-name:var(--font-body)] text-[11px] text-lumina-on-surface-variant/70 truncate">
                    {runningStep.result}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function AgentIconBadge({ agent, status }: { agent: string; status: StepState['status'] }) {
  if (status === 'completed') {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative z-10 w-[22px] h-[22px] rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0"
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      </motion.div>
    );
  }

  if (status === 'failed') {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative z-10 w-[22px] h-[22px] rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0"
      >
        <XCircle className="w-3.5 h-3.5 text-red-500" />
      </motion.div>
    );
  }

  if (status === 'running') {
    return (
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 w-[22px] h-[22px] rounded-full bg-lumina-primary/10 border border-lumina-primary/40 flex items-center justify-center shrink-0"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <DynamicAgentIcon agent={agent} className="w-3.5 h-3.5 text-lumina-primary" />
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="relative z-10 w-[22px] h-[22px] rounded-full bg-lumina-surface-variant/20 border border-lumina-outline/30 flex items-center justify-center shrink-0">
      <Circle className="w-2.5 h-2.5 text-lumina-outline/50" />
    </div>
  );
}

/** Resolves agent name to icon using conditional rendering to satisfy static-components lint */
function DynamicAgentIcon({ agent, className }: { agent: string; className?: string }) {
  const iconKey = getAgentIconKey(agent);
  const cls = className ?? '';
  switch (iconKey) {
    case 'search':
      return <Search className={cls} />;
    case 'filetext':
      return <FileText className={cls} />;
    case 'code2':
      return <Code2 className={cls} />;
    case 'globe':
      return <Globe className={cls} />;
    case 'calculator':
      return <Calculator className={cls} />;
    case 'brain':
      return <Brain className={cls} />;
    case 'zap':
      return <Zap className={cls} />;
    default:
      return <Bot className={cls} />;
  }
}

function StepRow({ step }: { step: StepState; isLast: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: step.stepIndex * 0.05 }}
      className="flex items-start gap-3 py-1.5 -ml-4 pl-4"
    >
      <AgentIconBadge agent={step.agent} status={step.status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <DynamicAgentIcon agent={step.agent} className="w-3 h-3 text-lumina-on-surface-variant/50 shrink-0" />
          <span className="font-mono text-xs font-medium text-lumina-on-surface/80">
            {step.agent}
          </span>
        </div>
        <p className="font-[family-name:var(--font-body)] text-[11px] text-lumina-on-surface-variant/70 leading-relaxed mt-0.5">
          {step.description}
        </p>

        {step.error && step.status === 'failed' && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-[family-name:var(--font-body)] text-[11px] text-red-500/80 mt-0.5 truncate"
          >
            {step.error}
          </motion.p>
        )}

        {step.result && step.status === 'completed' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-[family-name:var(--font-body)] text-[11px] text-emerald-600/70 dark:text-emerald-400/70 mt-0.5 truncate"
          >
            {step.result}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
