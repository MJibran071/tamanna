'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Globe,
  BarChart3,
  Clock,
  BookOpen,
  Sparkles,
  Pencil,
  Trash2,
  Loader2,
  Zap,
  Send,
  Timer,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ─── Types ────────────────────────────────────────────────────────────────

interface QuickAction {
  id: string;
  title: string;
  prompt: string;
  icon?: string;
  order: number;
}

interface QuickActionsBarProps {
  onAction?: (prompt: string) => void;
}

// ─── Config ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  search: Search,
  globe: Globe,
  bar_chart: BarChart3,
  clock: Clock,
  book: BookOpen,
  sparkles: Sparkles,
  zap: Zap,
  send: Send,
  timer: Timer,
};

function getIconComponent(iconName?: string): React.ElementType {
  return ICON_MAP[iconName || ''] || Sparkles;
}

const DEFAULT_ICON_OPTIONS = [
  { value: 'search', label: 'Search' },
  { value: 'globe', label: 'Globe' },
  { value: 'bar_chart', label: 'Chart' },
  { value: 'clock', label: 'Clock' },
  { value: 'book', label: 'Book' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'zap', label: 'Zap' },
  { value: 'send', label: 'Send' },
  { value: 'timer', label: 'Timer' },
];

// ─── Animation ────────────────────────────────────────────────────────────

const chipVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.2, ease: 'easeOut' },
  }),
  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.15 } },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function QuickActionsBar({ onAction }: QuickActionsBarProps) {
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [contextMenuId, setContextMenuId] = useState<string | null>(null);

  // ── Form state ────────────────────────────────────────────────────────

  const [formTitle, setFormTitle] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formIcon, setFormIcon] = useState('sparkles');
  const [saving, setSaving] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextRef = useRef<HTMLDivElement>(null);

  // ── Fetch ───────────────────────────────────────────────────────────

  const fetchActions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quick-actions');
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.actions) ? data.actions : Array.isArray(data) ? data : [];
        setActions(items);
      }
    } catch {
      // Use defaults if API not available
      setActions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  // ── Close context menu on outside click ─────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextMenuId(null);
      }
    }
    if (contextMenuId) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [contextMenuId]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!formTitle.trim() || !formPrompt.trim()) return;
    setSaving(true);
    try {
      const method = editId ? 'PATCH' : 'POST';
      const url = editId ? `/api/quick-actions/${editId}` : '/api/quick-actions';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          prompt: formPrompt.trim(),
          icon: formIcon,
        }),
      });
      if (res.ok) {
        toast({ title: editId ? 'Updated' : 'Added', description: `"${formTitle}"` });
        setDialogOpen(false);
        setEditId(null);
        setFormTitle('');
        setFormPrompt('');
        setFormIcon('sparkles');
        fetchActions();
      } else {
        toast({ title: 'Failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [formTitle, formPrompt, formIcon, editId, fetchActions]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/quick-actions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Deleted' });
        setContextMenuId(null);
        fetchActions();
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  }, [fetchActions]);

  const handleEdit = useCallback((action: QuickAction) => {
    setEditId(action.id);
    setFormTitle(action.title);
    setFormPrompt(action.prompt);
    setFormIcon(action.icon || 'sparkles');
    setDialogOpen(true);
    setContextMenuId(null);
  }, []);

  const openCreateDialog = useCallback(() => {
    setEditId(null);
    setFormTitle('');
    setFormPrompt('');
    setFormIcon('sparkles');
    setDialogOpen(true);
  }, []);

  // ── Long press for context menu ─────────────────────────────────────

  const handleLongPressStart = useCallback((actionId: string) => {
    longPressTimer.current = setTimeout(() => {
      setContextMenuId(actionId);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
          {/* Quick action chips */}
          <AnimatePresence>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <motion.div
                  key={`skeleton-${i}`}
                  variants={chipVariants}
                  custom={i}
                  initial="hidden"
                  animate="visible"
                  className="shrink-0 h-9 w-24 rounded-full bg-lumina-surface-variant/30 animate-pulse"
                />
              ))
            ) : (
              actions.map((action, i) => {
                const Icon = getIconComponent(action.icon);
                return (
                  <motion.button
                    key={action.id}
                    custom={i}
                    variants={chipVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    onClick={() => onAction?.(action.prompt)}
                    onTouchStart={() => handleLongPressStart(action.id)}
                    onTouchEnd={handleLongPressEnd}
                    onTouchCancel={handleLongPressEnd}
                    onMouseDown={() => handleLongPressStart(action.id)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenuId(action.id);
                    }}
                    className="glass-pill shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-lumina-on-surface-variant hover:text-lumina-on-surface hover:bg-lumina-primary/10 transition-all cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate max-w-[80px]">{action.title}</span>
                  </motion.button>
                );
              })
            )}
          </AnimatePresence>

          {/* Add button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={openCreateDialog}
            className="shrink-0 flex items-center gap-1 px-3 py-2 text-xs font-medium text-lumina-primary bg-lumina-primary/10 rounded-full hover:bg-lumina-primary/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </motion.button>
        </div>
      </motion.div>

      {/* ── Context Menu ────────────────────────────────────────────── */}
      <AnimatePresence>
        {contextMenuId && (
          <motion.div
            ref={contextRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 glass-card rounded-xl p-1.5 border border-white/10 shadow-xl min-w-[140px]"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <button
              onClick={() => {
                const action = actions.find(a => a.id === contextMenuId);
                if (action) handleEdit(action);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-lumina-on-surface rounded-lg hover:bg-lumina-primary/10 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5 text-lumina-primary" />
              Edit
            </button>
            <button
              onClick={() => handleDelete(contextMenuId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add/Edit Dialog ─────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)]">
              {editId ? 'Edit Quick Action' : 'Add Quick Action'}
            </DialogTitle>
            <DialogDescription className="font-[family-name:var(--font-body)]">
              Create a shortcut for frequently used commands.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g., Morning Briefing"
                className="font-[family-name:var(--font-body)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Prompt</Label>
              <Input
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="The command Tamanna will execute"
                className="font-[family-name:var(--font-body)]"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Icon</Label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_ICON_OPTIONS.map((opt) => {
                  const Icon = getIconComponent(opt.value);
                  const isActive = formIcon === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormIcon(opt.value)}
                      className={`p-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-lumina-primary/20 text-lumina-primary ring-2 ring-lumina-primary/30'
                          : 'bg-lumina-surface-variant/20 text-lumina-on-surface-variant/50 hover:text-lumina-on-surface'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!formTitle.trim() || !formPrompt.trim() || saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-lumina-primary text-lumina-on-primary text-sm font-medium hover:bg-lumina-primary/90 transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editId ? 'Update' : 'Add Action'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
