'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Workflow,
  Plus,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Webhook,
  MousePointer,
  Loader2,
  GitBranch,
  Zap,
  CheckCircle2,
  AlertCircle,
  Hash,
  Settings2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface WorkflowStep {
  id?: string;
  name: string;
  action: string;
  config?: string;
}

interface WorkflowData {
  id: string;
  name: string;
  description: string | null;
  triggerType: 'schedule' | 'manual' | 'event' | 'webhook';
  triggerConfig: string;
  steps: WorkflowStep[];
  status: 'active' | 'paused' | 'draft';
  lastRun?: string;
  runCount: number;
  createdAt: string;
}

// ─── Config ──────────────────────────────────────────────────────────────

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual', icon: MousePointer, color: 'text-lumina-primary', bg: 'bg-lumina-primary/10' },
  { value: 'schedule', label: 'Schedule', icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { value: 'event', label: 'Event', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { value: 'webhook', label: 'Webhook', icon: Webhook, color: 'text-sky-500', bg: 'bg-sky-500/10' },
];

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  active: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Active', icon: CheckCircle2 },
  paused: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Paused', icon: Pause },
  draft: { color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Draft', icon: AlertCircle },
};

function formatTime(iso?: string): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ─── Animation ────────────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: 'easeOut' },
  }),
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function AutomationBuilder() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowData | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // ── Create form state ─────────────────────────────────────────────────

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTriggerType, setFormTriggerType] = useState('manual');
  const [formTriggerConfig, setFormTriggerConfig] = useState('');
  const [formSteps, setFormSteps] = useState('');
  const [creating, setCreating] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.workflows) ? data.workflows : Array.isArray(data) ? data : [];
        setWorkflows(items);
      }
    } catch {
      toast({ title: 'Failed to load workflows', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  // ── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter(w => w.status === 'active').length;
    const totalExecutions = workflows.reduce((sum, w) => sum + w.runCount, 0);
    return { total, active, totalExecutions };
  }, [workflows]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!formName.trim()) return;
    setCreating(true);
    try {
      let steps: WorkflowStep[] = [];
      try {
        steps = JSON.parse(formSteps);
      } catch {
        steps = [{ name: 'Step 1', action: formSteps }];
      }

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          triggerType: formTriggerType,
          triggerConfig: formTriggerConfig.trim(),
          steps,
        }),
      });
      if (res.ok) {
        toast({ title: 'Workflow created', description: `"${formName}" is ready.` });
        setDialogOpen(false);
        setFormName('');
        setFormDescription('');
        setFormTriggerType('manual');
        setFormTriggerConfig('');
        setFormSteps('');
        fetchWorkflows();
      } else {
        toast({ title: 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }, [formName, formDescription, formTriggerType, formTriggerConfig, formSteps, fetchWorkflows]);

  const handleToggleStatus = useCallback(async (workflow: WorkflowData) => {
    try {
      const newStatus = workflow.status === 'active' ? 'paused' : 'active';
      const res = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast({ title: `Workflow ${newStatus}` });
        fetchWorkflows();
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  }, [fetchWorkflows]);

  const handleExecute = useCallback(async (workflow: WorkflowData) => {
    setExecutingId(workflow.id);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/execute`, { method: 'POST' });
      if (res.ok) {
        toast({ title: 'Workflow executed', description: `"${workflow.name}" is running.` });
        fetchWorkflows();
      } else {
        toast({ title: 'Execution failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setExecutingId(null);
    }
  }, [fetchWorkflows]);

  const handleDelete = useCallback(async () => {
    if (!selectedWorkflow) return;
    try {
      const res = await fetch(`/api/workflows/${selectedWorkflow.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Workflow deleted' });
        fetchWorkflows();
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedWorkflow(null);
    }
  }, [selectedWorkflow, fetchWorkflows]);

  const openDeleteDialog = useCallback((workflow: WorkflowData) => {
    setSelectedWorkflow(workflow);
    setDeleteDialogOpen(true);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <Workflow className="w-4 h-4 text-cyan-500" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
              Workflows
            </h2>
          </div>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-1 ml-[42px]">
            Automate multi-step tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkflows}
            className="p-2 rounded-lg text-lumina-on-surface-variant/40 hover:text-lumina-primary hover:bg-lumina-primary/10 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDialogOpen(true)}
            className="glass-pill rounded-full px-3 py-2 text-xs font-medium text-lumina-primary flex items-center gap-1.5 hover:bg-lumina-primary/15 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </button>
        </div>
      </motion.div>

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: 'Total', value: stats.total, icon: GitBranch, color: 'text-lumina-primary', bg: 'bg-lumina-primary/10' },
          { label: 'Active', value: stats.active, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Executions', value: stats.totalExecutions, icon: Play, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5">
            <div className={`p-1.5 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            </div>
            <span className={`font-[family-name:var(--font-display)] text-lg font-semibold ${stat.color}`}>{stat.value}</span>
            <span className="text-[10px] text-lumina-on-surface-variant/50">{stat.label}</span>
          </div>
        ))}
      </motion.div>

      {/* ── Workflow List ────────────────────────────────────────────── */}
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-cyan-500/5 flex items-center justify-center mb-4">
              <Workflow className="w-8 h-8 text-cyan-500/40" />
            </div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
              No workflows yet
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-2 max-w-[260px]">
              Create automated workflows to handle complex multi-step tasks
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              className="glass-pill rounded-full px-4 py-2 text-sm font-medium text-lumina-primary flex items-center gap-2 hover:bg-lumina-primary/15 transition-all mt-5"
            >
              <Plus className="w-4 h-4" />
              Create Workflow
            </button>
          </motion.div>
        ) : (
          workflows.map((workflow, i) => {
            const trigger = TRIGGER_TYPES.find(t => t.value === workflow.triggerType) || TRIGGER_TYPES[0];
            const statusCfg = STATUS_CONFIG[workflow.status] || STATUS_CONFIG.draft;
            const isExpanded = expandedId === workflow.id;

            return (
              <motion.div
                key={workflow.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="glass-card rounded-xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : workflow.id)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-lumina-surface-variant/20 transition-colors"
                >
                  <div className={`shrink-0 w-8 h-8 rounded-lg ${trigger.bg} flex items-center justify-center`}>
                    <trigger.icon className={`w-4 h-4 ${trigger.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-lumina-on-surface truncate">{workflow.name}</h3>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${trigger.bg} ${trigger.color} font-medium`}>
                        {trigger.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-lumina-on-surface-variant/40">
                      <span className={`px-1.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color} font-medium`}>
                        {statusCfg.label}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <GitBranch className="w-3 h-3" />
                        {workflow.steps.length} steps
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Hash className="w-3 h-3" />
                        {workflow.runCount} runs
                      </span>
                      {workflow.lastRun && <span>• {formatTime(workflow.lastRun)}</span>}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5 text-lumina-on-surface-variant/40" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-lumina-on-surface-variant/40" />
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-lumina-outline-variant/20"
                    >
                      <div className="px-4 py-3 space-y-3">
                        {workflow.description && (
                          <p className="text-xs text-lumina-on-surface-variant/60">{workflow.description}</p>
                        )}

                        {/* Steps */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-medium text-lumina-on-surface-variant/50 uppercase tracking-wider">Steps</span>
                          {workflow.steps.map((step, si) => (
                            <div key={step.id || si} className="flex items-center gap-2 text-xs">
                              <div className="w-5 h-5 rounded-full bg-lumina-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-lumina-primary">{si + 1}</span>
                              </div>
                              <span className="text-lumina-on-surface">{step.name}</span>
                              <span className="text-[10px] text-lumina-on-surface-variant/40">{step.action}</span>
                            </div>
                          ))}
                        </div>

                        {/* Trigger config */}
                        {workflow.triggerConfig && (
                          <div className="text-[10px] text-lumina-on-surface-variant/40">
                            Trigger: <code className="px-1 py-0.5 rounded bg-lumina-surface-variant/20 text-lumina-on-surface-variant/60">{workflow.triggerConfig}</code>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleExecute(workflow)}
                            disabled={executingId === workflow.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[11px] font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-40"
                          >
                            {executingId === workflow.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            Execute
                          </button>

                          <button
                            onClick={() => handleToggleStatus(workflow)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 text-[11px] font-medium hover:bg-amber-500/20 transition-all"
                          >
                            {workflow.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                            {workflow.status === 'active' ? 'Pause' : 'Activate'}
                          </button>

                          <div className="flex-1" />

                          <button
                            onClick={() => openDeleteDialog(workflow)}
                            className="p-1.5 rounded-full text-lumina-on-surface-variant/30 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Create Dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)]">Create Workflow</DialogTitle>
            <DialogDescription className="font-[family-name:var(--font-body)]">
              Define a multi-step automated workflow.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Name</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Daily Briefing"
                className="font-[family-name:var(--font-body)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Description</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What does this workflow do?"
                rows={2}
                className="font-[family-name:var(--font-body)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Trigger Type</Label>
              <Select value={formTriggerType} onValueChange={setFormTriggerType}>
                <SelectTrigger className="font-[family-name:var(--font-body)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="flex items-center gap-2">
                        <t.icon className={`w-4 h-4 ${t.color}`} />
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(formTriggerType === 'schedule' || formTriggerType === 'webhook' || formTriggerType === 'event') && (
              <div className="space-y-2">
                <Label className="font-[family-name:var(--font-body)] text-sm">
                  {formTriggerType === 'schedule' ? 'Cron Expression' : formTriggerType === 'webhook' ? 'Webhook Path' : 'Event Name'}
                </Label>
                <Input
                  value={formTriggerConfig}
                  onChange={(e) => setFormTriggerConfig(e.target.value)}
                  placeholder={formTriggerType === 'schedule' ? '0 9 * * *' : formTriggerType === 'webhook' ? '/api/webhook/my-hook' : 'user.signup'}
                  className="font-[family-name:var(--font-body)] font-mono text-xs"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Steps (JSON)</Label>
              <Textarea
                value={formSteps}
                onChange={(e) => setFormSteps(e.target.value)}
                placeholder={'[{"name":"Fetch News","action":"search","config":"AI news today"}]'}
                rows={4}
                className="font-[family-name:var(--font-mono-override)] text-xs"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={!formName.trim() || creating}
              className="w-full font-[family-name:var(--font-body)]"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ───────────────────────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-[family-name:var(--font-display)]">Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription className="font-[family-name:var(--font-body)]">
              Are you sure you want to delete &quot;{selectedWorkflow?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
