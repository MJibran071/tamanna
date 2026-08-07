'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Rocket,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Circle,
  BrainCircuit,
  Loader2,
  Sparkles,
  Zap,
  Target,
  ChevronDown,
  Plus,
  Trash2,
  ArrowRight,
  Bot,
  Search,
  FileText,
  Code2,
  Calculator,
  Globe,
  Brain,
  TrendingUp,
  BarChart3,
  Layers,
  AlertCircle,
  Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Types ────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  description: string | null;
  goal: string;
  status: string;
  planJson: string | null;
  currentPhase: number;
  currentStep: number;
  totalSteps: number;
  progress: number;
  mode: string;
  maxSteps: number;
  autoExecute: boolean;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  error: string | null;
  outputJson: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PlanPhase {
  name: string;
  steps: PlanStep[];
}

interface PlanStep {
  agent: string;
  description: string;
  dependsOn: number[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-lumina-on-surface-variant/60', bgColor: 'bg-lumina-surface-variant/10', borderColor: 'border-lumina-outline/20', icon: Pencil },
  planning: { label: 'Planning', color: 'text-violet-500', bgColor: 'bg-violet-500/10', borderColor: 'border-violet-500/20', icon: BrainCircuit },
  executing: { label: 'Executing', color: 'text-lumina-primary', bgColor: 'bg-lumina-primary/10', borderColor: 'border-lumina-primary/20', icon: Play },
  paused: { label: 'Paused', color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20', icon: Pause },
  completed: { label: 'Completed', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20', icon: XCircle },
};

function getAgentIcon(agent: string) {
  const key = agent.toLowerCase();
  if (key.includes('search') || key.includes('research')) return <Search className="w-3.5 h-3.5" />;
  if (key.includes('code') || key.includes('coder')) return <Code2 className="w-3.5 h-3.5" />;
  if (key.includes('write')) return <FileText className="w-3.5 h-3.5" />;
  if (key.includes('analy') || key.includes('math')) return <Calculator className="w-3.5 h-3.5" />;
  if (key.includes('browser') || key.includes('scrape')) return <Globe className="w-3.5 h-3.5" />;
  if (key.includes('plan') || key.includes('brain')) return <Brain className="w-3.5 h-3.5" />;
  return <Bot className="w-3.5 h-3.5" />;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AutonomousMode() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMode, setNewMode] = useState('balanced');
  const [newMaxSteps, setNewMaxSteps] = useState('10');
  const [newAutoExecute, setNewAutoExecute] = useState(false);
  const [creating, setCreating] = useState(false);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/autonomous');
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data.projects) ? data.projects : Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = useCallback(async () => {
    if (!newTitle.trim() || !newGoal.trim()) {
      toast({ title: 'Missing fields', description: 'Title and goal are required.', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/autonomous', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          goal: newGoal.trim(),
          mode: newMode,
          maxSteps: parseInt(newMaxSteps) || 10,
          autoExecute: newAutoExecute,
        }),
      });
      if (res.ok) {
        toast({ title: 'Project created', description: `"${newTitle}" is ready for planning.` });
        setCreateOpen(false);
        setNewTitle('');
        setNewGoal('');
        setNewDescription('');
        setNewMode('balanced');
        setNewMaxSteps('10');
        setNewAutoExecute(false);
        fetchProjects();
      } else {
        const err = await res.json();
        toast({ title: 'Failed', description: err.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to create project', variant: 'destructive' });
    }
    finally { setCreating(false); }
  }, [newTitle, newGoal, newDescription, newMode, newMaxSteps, newAutoExecute, fetchProjects]);

  const handlePlan = useCallback(async (id: string) => {
    setPlanningId(id);
    try {
      const res = await fetch(`/api/autonomous/${id}/plan`, { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Plan generated', description: 'Your execution plan is ready.' });
        fetchProjects();
        setExpandedProject(id);
      } else {
        const err = await res.json();
        toast({ title: 'Planning failed', description: err.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate plan', variant: 'destructive' });
    }
    finally { setPlanningId(null); }
  }, [fetchProjects]);

  const handleExecute = useCallback(async (id: string) => {
    setExecutingId(id);
    try {
      const res = await fetch(`/api/autonomous/${id}/execute`, { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Execution started', description: 'Your autonomous agent is now working.' });
        fetchProjects();
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to start execution', variant: 'destructive' });
    }
    finally { setExecutingId(null); }
  }, [fetchProjects]);

  const handlePause = useCallback(async (id: string) => {
    try {
      await fetch(`/api/autonomous/${id}/execute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });
      toast({ title: 'Paused', description: 'Execution paused.' });
      fetchProjects();
    } catch {
      toast({ title: 'Error', description: 'Failed to pause', variant: 'destructive' });
    }
  }, [fetchProjects]);

  const handleRestart = useCallback(async (id: string) => {
    try {
      await fetch(`/api/autonomous/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft', currentStep: 0, currentPhase: 0, progress: 0, error: null, planJson: null }),
      });
      toast({ title: 'Restarted', description: 'Project reset to draft. Generate a new plan.' });
      fetchProjects();
    } catch {
      toast({ title: 'Error', description: 'Failed to restart', variant: 'destructive' });
    }
  }, [fetchProjects]);

  const handleDelete = useCallback(async (project: Project) => {
    try {
      await fetch(`/api/autonomous/${project.id}`, { method: 'DELETE' });
      toast({ title: 'Deleted', description: `"${project.title}" removed.` });
      fetchProjects();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
    setDeleteTarget(null);
  }, [fetchProjects]);

  const stats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter(p => p.status === 'completed').length;
    const active = projects.filter(p => ['planning', 'executing'].includes(p.status)).length;
    const avgProgress = total > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / total) : 0;
    return { total, completed, active, avgProgress };
  }, [projects]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-lumina-primary/10 border border-lumina-primary/20">
            <Rocket className="w-4 h-4 text-lumina-primary" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
              Autonomous Mode
            </h2>
            <p className="text-[11px] text-lumina-on-surface-variant/50">
              Set a goal — let the agent plan & execute autonomously
            </p>
          </div>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 text-xs font-medium px-3 py-1.5 rounded-lg"
        >
          <Plus className="w-3.5 h-3.5" />
          New Goal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Projects', value: stats.total, icon: Target, color: 'text-lumina-primary', bg: 'bg-lumina-primary/10' },
          { label: 'Active', value: stats.active, icon: Zap, color: 'text-violet-500', bg: 'bg-violet-500/10' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-3 border border-white/10"
          >
            <div className={`p-1.5 rounded-lg ${stat.bg} inline-flex mb-1`}>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <p className={`font-[family-name:var(--font-display)] text-lg font-semibold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-lumina-on-surface-variant/50">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Project list */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 text-lumina-primary animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-lumina-primary/5 border border-lumina-primary/10 flex items-center justify-center mb-4">
              <Rocket className="w-7 h-7 text-lumina-primary/40" />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface/60 mb-2">
              No Autonomous Projects
            </h3>
            <p className="text-sm text-lumina-on-surface-variant/50 max-w-xs leading-relaxed">
              Set a high-level goal and Tamanna will break it down into steps, select the right agents, and execute the plan.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-lumina-on-surface-variant/40">
              <ArrowRight className="w-3 h-3" />
              <span>Try: &quot;Migrate my React app to Next.js&quot; or &quot;Build a full REST API&quot;</span>
            </div>
          </motion.div>
        ) : (
          projects.map((project) => {
            const config = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
            const plan = project.planJson ? JSON.parse(project.planJson) as { phases?: PlanPhase[] } : null;
            const isExpanded = expandedProject === project.id;
            const StatusIcon = config.icon;

            return (
              <motion.div
                key={project.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass-card rounded-2xl border overflow-hidden transition-all ${
                  project.status === 'executing' ? 'border-lumina-primary/30 shadow-[0_0_20px_rgba(70,72,212,0.06)]' : 'border-white/10'
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-lumina-primary/[0.02] transition-colors"
                >
                  {/* Progress ring */}
                  <div className="shrink-0 relative">
                    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                      <circle className="text-lumina-surface-variant/30" stroke="currentColor" strokeWidth="3" fill="none" cx="18" cy="18" r="15" />
                      <motion.circle
                        className={project.status === 'completed' ? 'text-emerald-500' : project.status === 'failed' ? 'text-red-500' : 'text-lumina-primary'}
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        cx="18"
                        cy="18"
                        r="15"
                        strokeDasharray={`${2 * Math.PI * 15}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 15 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 15 * (1 - project.progress / 100) }}
                        transition={{ duration: 0.8 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-lumina-on-surface/80">{Math.round(project.progress)}%</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bgColor} ${config.color} border ${config.borderColor} uppercase tracking-wider`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] border-lumina-outline/20 text-lumina-on-surface-variant/50">
                        {project.mode}
                      </Badge>
                    </div>
                    <h3 className="font-[family-name:var(--font-body)] text-sm font-semibold text-lumina-on-surface truncate">{project.title}</h3>
                    <p className="text-[11px] text-lumina-on-surface-variant/50 truncate mt-0.5">{project.goal}</p>
                  </div>

                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-4 h-4 text-lumina-on-surface-variant/40" />
                  </motion.div>
                </button>

                {/* Expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
                        {/* Goal description */}
                        {project.description && (
                          <p className="text-xs text-lumina-on-surface-variant/70 leading-relaxed">{project.description}</p>
                        )}

                        {/* Progress bar */}
                        <div>
                          <div className="h-1.5 bg-lumina-surface-variant/30 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-lumina-primary to-lumina-secondary rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${project.progress}%` }}
                              transition={{ duration: 0.8 }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-[10px] text-lumina-on-surface-variant/40">
                            <span>Step {project.currentStep}/{project.totalSteps}</span>
                            <span>Phase {project.currentPhase + 1}</span>
                          </div>
                        </div>

                        {/* Plan visualization */}
                        {plan?.phases && plan.phases.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[11px] font-medium text-lumina-on-surface-variant/60 uppercase tracking-wider flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5" /> Execution Plan
                            </p>
                            {plan.phases.map((phase, pi) => (
                              <div key={pi} className="glass-card rounded-lg p-2.5 border border-white/5">
                                <p className="text-xs font-medium text-lumina-on-surface/80 mb-1.5">{phase.name}</p>
                                <div className="space-y-1">
                                  {phase.steps.map((step, si) => {
                                    const globalStep = si;
                                    const isStepDone = project.currentStep > globalStep;
                                    const isStepRunning = project.currentPhase === pi && project.currentStep === globalStep && project.status === 'executing';
                                    return (
                                      <div key={si} className="flex items-center gap-2 text-[11px]">
                                        {isStepDone ? (
                                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                        ) : isStepRunning ? (
                                          <motion.div animate={{ scale: [0.9, 1.1, 0.9] }} transition={{ duration: 1.5, repeat: Infinity }}>
                                            <div className="w-3 h-3 rounded-full bg-lumina-primary/30 border border-lumina-primary flex items-center justify-center">
                                              <div className="w-1 h-1 rounded-full bg-lumina-primary" />
                                            </div>
                                          </motion.div>
                                        ) : (
                                          <Circle className="w-3 h-3 text-lumina-outline/30 shrink-0" />
                                        )}
                                        <span className="text-lumina-on-surface-variant/60">{getAgentIcon(step.agent)}</span>
                                        <span className={isStepDone ? 'text-lumina-on-surface-variant/50 line-through' : 'text-lumina-on-surface/70'}>
                                          {step.description}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Error */}
                        {project.error && (
                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-red-500/80">{project.error}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {project.status === 'draft' && (
                            <Button
                              onClick={() => handlePlan(project.id)}
                              disabled={planningId === project.id}
                              size="sm"
                              className="flex-1 bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 text-xs"
                            >
                              {planningId === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <BrainCircuit className="w-3.5 h-3.5 mr-1.5" />}
                              Generate Plan
                            </Button>
                          )}
                          {(project.status === 'planning' || project.status === 'paused') && (
                            <Button
                              onClick={() => handleExecute(project.id)}
                              disabled={executingId === project.id}
                              size="sm"
                              className="flex-1 bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 text-xs"
                            >
                              {executingId === project.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                              Execute Plan
                            </Button>
                          )}
                          {project.status === 'executing' && (
                            <Button
                              onClick={() => handlePause(project.id)}
                              size="sm"
                              variant="outline"
                              className="flex-1 border-amber-500/30 text-amber-500 text-xs"
                            >
                              <Pause className="w-3.5 h-3.5 mr-1.5" />
                              Pause
                            </Button>
                          )}
                          {(project.status === 'completed' || project.status === 'failed') && (
                            <Button
                              onClick={() => handleRestart(project.id)}
                              size="sm"
                              variant="outline"
                              className="flex-1 border-lumina-primary/20 text-lumina-primary text-xs"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                              Restart
                            </Button>
                          )}
                          <Button
                            onClick={() => setDeleteTarget(project)}
                            size="sm"
                            variant="ghost"
                            className="text-red-400/60 hover:text-red-500 hover:bg-red-500/10 text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Timeline */}
                        {(project.startedAt || project.completedAt) && (
                          <div className="flex items-center gap-3 text-[10px] text-lumina-on-surface-variant/40">
                            {project.startedAt && (
                              <span className="flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                {formatDistanceToNow(new Date(project.startedAt), { addSuffix: true })}
                              </span>
                            )}
                            {project.durationMs && (
                              <span>{(project.durationMs / 1000).toFixed(1)}s</span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-card border-white/20 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lumina-primary font-[family-name:var(--font-display)]">
              <Rocket className="w-5 h-5" />
              New Autonomous Project
            </DialogTitle>
            <DialogDescription className="text-lumina-on-surface-variant">
              Define your goal and the agent will create an execution plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Title</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Build a REST API"
                className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Goal *</Label>
              <Textarea
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Describe what you want to achieve in detail..."
                rows={3}
                className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm resize-none"
              />
            </div>
            <div>
              <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Description (optional)</Label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Additional context..."
                className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Mode</Label>
                <Select value={newMode} onValueChange={setNewMode}>
                  <SelectTrigger className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-lumina-outline-variant/40">
                    <SelectItem value="fast">⚡ Fast</SelectItem>
                    <SelectItem value="balanced">⚖️ Balanced</SelectItem>
                    <SelectItem value="thorough">🔍 Thorough</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Max Steps</Label>
                <Input
                  type="number"
                  value={newMaxSteps}
                  onChange={(e) => setNewMaxSteps(e.target.value)}
                  className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="auto-execute"
                checked={newAutoExecute}
                onChange={(e) => setNewAutoExecute(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="auto-execute" className="text-xs text-lumina-on-surface-variant cursor-pointer">
                Auto-execute after planning
              </Label>
            </div>
            <Button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim() || !newGoal.trim()}
              className="w-full bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 text-sm font-medium"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {creating ? 'Creating...' : 'Create & Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="glass-card border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-[family-name:var(--font-body)]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-destructive text-white hover:bg-destructive/90 font-[family-name:var(--font-body)]">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
