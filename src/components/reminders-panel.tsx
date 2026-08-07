'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  AlarmClock,
  Loader2,
  Calendar,
  AlertTriangle,
  Timer,
  Tag,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

// ─── Types ────────────────────────────────────────────────────────────────

interface Reminder {
  id: string;
  title: string;
  description: string | null;
  scheduledFor: string;
  category: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'snoozed' | 'dismissed';
  createdAt: string;
  updatedAt: string;
}

// ─── Config ──────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { color: string; border: string; label: string }> = {
  urgent: { color: 'text-red-500', border: 'border-l-red-500', label: 'Urgent' },
  high: { color: 'text-amber-500', border: 'border-l-amber-500', label: 'High' },
  medium: { color: 'text-sky-500', border: 'border-l-sky-500', label: 'Medium' },
  low: { color: 'text-emerald-500', border: 'border-l-emerald-500', label: 'Low' },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: React.ElementType }> = {
  pending: { color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending', icon: Clock },
  completed: { color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Done', icon: CheckCircle2 },
  snoozed: { color: 'text-sky-500', bg: 'bg-sky-500/10', label: 'Snoozed', icon: AlarmClock },
  dismissed: { color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Dismissed', icon: XCircle },
};

const CATEGORIES = ['All', 'work', 'personal', 'health', 'finance', 'learning', 'social'];

const FILTER_STATUS_CHIPS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'snoozed', label: 'Snoozed' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────

function getRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) return 'overdue';
  if (mins < 1) return 'now';
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `in ${days}d`;
}

function formatScheduledTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Animation ────────────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' },
  }),
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function RemindersPanel() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeCategory, setActiveCategory] = useState('All');
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Create form state ─────────────────────────────────────────────────

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formScheduledFor, setFormScheduledFor] = useState('');
  const [formCategory, setFormCategory] = useState('personal');
  const [formPriority, setFormPriority] = useState('medium');
  const [creating, setCreating] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────

  const fetchReminders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeFilter !== 'all') params.set('status', activeFilter);
      const res = await fetch(`/api/reminders?${params}`);
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.reminders) ? data.reminders : Array.isArray(data) ? data : [];
        setReminders(items);
      }
    } catch {
      toast({ title: 'Failed to load reminders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  // ── Filtered list ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...reminders];
    if (activeCategory !== 'All') {
      list = list.filter(r => r.category === activeCategory);
    }
    // Sort by scheduledFor
    list.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
    return list;
  }, [reminders, activeCategory]);

  // ── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const pending = reminders.filter(r => r.status === 'pending').length;
    const completedToday = reminders.filter(r => {
      if (r.status !== 'completed') return false;
      const today = new Date();
      const d = new Date(r.updatedAt);
      return d.toDateString() === today.toDateString();
    }).length;
    const upcoming24h = reminders.filter(r => {
      if (r.status !== 'pending') return false;
      const diff = new Date(r.scheduledFor).getTime() - Date.now();
      return diff > 0 && diff < 86400000;
    }).length;
    return { pending, completedToday, upcoming24h };
  }, [reminders]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (!formTitle.trim() || !formScheduledFor) return;
    setCreating(true);
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          scheduledFor: new Date(formScheduledFor).toISOString(),
          category: formCategory,
          priority: formPriority,
        }),
      });
      if (res.ok) {
        toast({ title: 'Reminder set', description: `"${formTitle}"` });
        setDialogOpen(false);
        setFormTitle('');
        setFormDescription('');
        setFormScheduledFor('');
        setFormCategory('personal');
        setFormPriority('medium');
        fetchReminders();
      } else {
        toast({ title: 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  }, [formTitle, formDescription, formScheduledFor, formCategory, formPriority, fetchReminders]);

  const handleAction = useCallback(async (reminder: Reminder, action: 'complete' | 'snooze' | 'dismiss') => {
    try {
      const res = await fetch(`/api/reminders/${reminder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const labels = { complete: 'Completed', snooze: 'Snoozed', dismiss: 'Dismissed' };
        toast({ title: labels[action], description: `"${reminder.title}"` });
        fetchReminders();
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  }, [fetchReminders]);

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
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-500" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
              Reminders
            </h2>
          </div>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-1 ml-[42px]">
            Never forget anything
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReminders}
            className="p-2 rounded-lg text-lumina-on-surface-variant/40 hover:text-lumina-primary hover:bg-lumina-primary/10 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDialogOpen(true)}
            className="glass-pill rounded-full px-3 py-2 text-xs font-medium text-lumina-primary flex items-center gap-1.5 hover:bg-lumina-primary/15 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
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
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Done Today', value: stats.completedToday, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'In 24h', value: stats.upcoming24h, icon: Timer, color: 'text-sky-500', bg: 'bg-sky-500/10' },
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

      {/* ── Status Filter Chips ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
      >
        {FILTER_STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => setActiveFilter(chip.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeFilter === chip.value
                ? 'bg-lumina-primary text-lumina-on-primary shadow-sm'
                : 'glass-pill text-lumina-on-surface-variant hover:text-lumina-on-surface'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </motion.div>

      {/* ── Category Filter Chips ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1"
      >
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              activeCategory === cat
                ? 'bg-lumina-primary text-lumina-on-primary shadow-sm'
                : 'glass-pill text-lumina-on-surface-variant hover:text-lumina-on-surface'
            }`}
          >
            <Tag className="w-3 h-3" />
            {cat}
          </button>
        ))}
      </motion.div>

      {/* ── Reminder List ─────────────────────────────────────────────── */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-8 flex flex-col items-center justify-center text-center"
          >
            <Bell className="w-8 h-8 text-lumina-on-surface-variant/20 mx-auto mb-2" />
            <p className="text-xs text-lumina-on-surface-variant/50">No reminders</p>
            <p className="text-[10px] text-lumina-on-surface-variant/30 mt-1">
              {activeFilter !== 'all' || activeCategory !== 'All'
                ? 'No matching reminders'
                : 'Add a reminder to get started'}
            </p>
          </motion.div>
        ) : (
          filtered.map((reminder, i) => {
            const priorityCfg = PRIORITY_CONFIG[reminder.priority] || PRIORITY_CONFIG.medium;
            const statusCfg = STATUS_CONFIG[reminder.status] || STATUS_CONFIG.pending;
            const isOverdue = new Date(reminder.scheduledFor) < new Date() && reminder.status === 'pending';

            return (
              <motion.div
                key={reminder.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className={`glass-card rounded-xl border-l-[3px] ${priorityCfg.border} border border-white/10 overflow-hidden`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-lumina-on-surface truncate">{reminder.title}</h3>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${priorityCfg.color} bg-lumina-surface-variant/20 font-medium capitalize`}>
                          {priorityCfg.label}
                        </span>
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-lumina-on-surface-variant/60 mt-0.5 line-clamp-1">{reminder.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-lumina-on-surface-variant/40">
                        <span className={`flex items-center gap-0.5 ${isOverdue ? 'text-red-500' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          {formatScheduledTime(reminder.scheduledFor)}
                        </span>
                        <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                          ({getRelativeTime(reminder.scheduledFor)})
                        </span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.color} font-medium`}>
                          {statusCfg.label}
                        </span>
                        <span className="capitalize">{reminder.category}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {reminder.status === 'pending' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleAction(reminder, 'complete')}
                          className="p-1.5 rounded-full text-emerald-500/60 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all"
                          title="Complete"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(reminder, 'snooze')}
                          className="p-1.5 rounded-full text-sky-500/60 hover:text-sky-500 hover:bg-sky-500/10 transition-all"
                          title="Snooze"
                        >
                          <AlarmClock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(reminder, 'dismiss')}
                          className="p-1.5 rounded-full text-lumina-on-surface-variant/30 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          title="Dismiss"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Create Reminder Dialog ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)]">Set Reminder</DialogTitle>
            <DialogDescription className="font-[family-name:var(--font-body)]">
              Create a new smart reminder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Call the bank"
                className="font-[family-name:var(--font-body)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional details..."
                className="font-[family-name:var(--font-body)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">When</Label>
              <Input
                type="datetime-local"
                value={formScheduledFor}
                onChange={(e) => setFormScheduledFor(e.target.value)}
                className="font-[family-name:var(--font-body)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-[family-name:var(--font-body)] text-sm">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="font-[family-name:var(--font-body)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter(c => c !== 'All').map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        <span className="capitalize">{cat}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-[family-name:var(--font-body)] text-sm">Priority</Label>
                <Select value={formPriority} onValueChange={setFormPriority}>
                  <SelectTrigger className="font-[family-name:var(--font-body)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className={`${cfg.color}`}>{cfg.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleCreate}
              disabled={!formTitle.trim() || !formScheduledFor || creating}
              className="w-full font-[family-name:var(--font-body)]"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 mr-2" />
                  Set Reminder
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
