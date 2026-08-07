"use client";

import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { useTheme } from "next-themes";
import {
  Settings,
  Sun,
  Moon,
  Monitor,
  Volume2,
  Languages,
  Trash2,
  Info,
  Clock,
  Plus,
  Trash,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  Repeat,
  Timer,
  Plug,
  Link2,
  Zap,
  Database,
  XCircle,
  Search,
  X,
  Users,
  Globe,
  Bell,
  Smartphone,
  Heart,
  Shield,
  FileText,
  Mic,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAgentStore } from "@/lib/stores/agent-store";
import { DEFAULT_VOICE_SPEED, DEFAULT_LANGUAGE, SETTINGS_KEY } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { PLUGIN_DEFINITIONS } from "@/lib/plugin-definitions";
const PluginConfigDialog = lazy(() => import("@/components/plugin-config-dialog"));
const TeamCollaborationSection = lazy(() => import("@/components/team-collaboration"));

// ─── Types ────────────────────────────────────────────────────────────────

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface TamannaSettings {
  voiceSpeed: number;
  ttsAutoplay: boolean;
  responseLanguage: string;
  ttsEngine: string;
  voiceLanguage: string;
  accentColor: string;
  soundEffects: boolean;
  vibration: boolean;
  autoRead: boolean;
}

interface ScheduledTask {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  scheduleType: string;
  cronExpr: string | null;
  intervalSec: number | null;
  runAt: string | null;
  timezone: string;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  lastError: string | null;
  createdAt: string;
}

interface NewTaskForm {
  name: string;
  description: string;
  prompt: string;
  scheduleType: "cron" | "fixed_rate" | "one_time";
  cronExpr: string;
  intervalMin: number;
  runAtDate: string;
  runAtTime: string;
  timezone: string;
}

interface PluginItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: string;
  config: Record<string, unknown> | null;
  status: string;
  enabled: boolean;
  lastSyncAt: string | null;
  metadata?: { icon?: string; color?: string; author?: string; version?: string; requiresOAuth?: boolean; configSchema?: Array<{ key: string; label: string; type: string; required?: boolean }> } | null;
}

const TIMEZONES = [
  { value: "Asia/Karachi", label: "Pakistan (PKT)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Dhaka", label: "Bangladesh (BST)" },
  { value: "Asia/Riyadh", label: "Saudi Arabia (AST)" },
  { value: "Asia/Dubai", label: "UAE (GST)" },
  { value: "Europe/London", label: "UK (GMT)" },
  { value: "Europe/Berlin", label: "Germany (CET)" },
  { value: "America/New_York", label: "US Eastern (EST)" },
  { value: "America/Chicago", label: "US Central (CST)" },
  { value: "America/Los_Angeles", label: "US Pacific (PST)" },
  { value: "Asia/Tokyo", label: "Japan (JST)" },
  { value: "Australia/Sydney", label: "Australia (AEST)" },
];

const CRON_PRESETS = [
  { label: "Every minute", expr: "* * * * *" },
  { label: "Every 5 minutes", expr: "*/5 * * * *" },
  { label: "Every 15 minutes", expr: "*/15 * * * *" },
  { label: "Every hour", expr: "0 * * * *" },
  { label: "Daily at midnight", expr: "0 0 * * *" },
  { label: "Daily at 9 AM", expr: "0 9 * * *" },
  { label: "Weekly on Monday", expr: "0 9 * * 1" },
  { label: "Monthly on 1st", expr: "0 9 1 * *" },
];

// ─── Settings helpers ────────────────────────────────────────────────────

const DEFAULT_SETTINGS: TamannaSettings = {
  voiceSpeed: DEFAULT_VOICE_SPEED,
  ttsAutoplay: true,
  responseLanguage: DEFAULT_LANGUAGE,
  ttsEngine: "browser",
  voiceLanguage: "en-US",
  accentColor: "purple",
  soundEffects: true,
  vibration: false,
  autoRead: false,
};

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
];

const VOICE_LANGUAGES = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "ur-PK", label: "Urdu (Pakistan)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "ar-SA", label: "Arabic (Saudi)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "ja-JP", label: "Japanese" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
];

const TTS_ENGINES = [
  { value: "browser", label: "Browser TTS", description: "Built-in speech synthesis" },
  { value: "google", label: "Google TTS", description: "High quality voices" },
  { value: "azure", label: "Azure Neural", description: "Microsoft neural voices" },
];

const ACCENT_COLORS = [
  { value: "purple", label: "Purple", color: "bg-purple-500", ring: "ring-purple-500" },
  { value: "blue", label: "Blue", color: "bg-blue-500", ring: "ring-blue-500" },
  { value: "teal", label: "Teal", color: "bg-teal-500", ring: "ring-teal-500" },
  { value: "rose", label: "Rose", color: "bg-rose-500", ring: "ring-rose-500" },
  { value: "amber", label: "Amber", color: "bg-amber-500", ring: "ring-amber-500" },
];

function loadSettings(): TamannaSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    /* ignore parse errors */
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: TamannaSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage full */
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function SettingsSheet({
  open,
  onOpenChange,
}: SettingsSheetProps) {
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<TamannaSettings>(loadSettings);
  const deleteConversation = useAgentStore((s) => s.deleteConversation);
  const conversations = useAgentStore((s) => s.conversations);
  const clearAll = useAgentStore((s) => s.clearAll);

  // ─── Scheduled Tasks State ───────────────────────────────────────────
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState<NewTaskForm>({
    name: "",
    description: "",
    prompt: "",
    scheduleType: "cron",
    cronExpr: "0 9 * * *",
    intervalMin: 30,
    runAtDate: "",
    runAtTime: "",
    timezone: "Asia/Karachi",
  });
  const [creatingTask, setCreatingTask] = useState(false);

  // ─── Plugins State ────────────────────────────────────────────────
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(false);
  const [pluginsFilter, setPluginsFilter] = useState<string>("all");
  const [pluginsSearch, setPluginsSearch] = useState("");
  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [configuringPlugin, setConfiguringPlugin] = useState<{ type: string; name: string; description: string; icon: React.ElementType; color: string; bgColor: string; category: string; status: string; dbId: string | null } | null>(null);

  // ─── Voice Preview State ─────────────────────────────────────
  const [isPreviewing, setIsPreviewing] = useState(false);

  const handleVoicePreview = useCallback(() => {
    if (isPreviewing) {
      window.speechSynthesis.cancel();
      setIsPreviewing(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(
      `Hello! I am Tamanna, your AI voice assistant. Speaking at ${settings.voiceSpeed.toFixed(2)}x speed.`
    );
    utterance.lang = settings.voiceLanguage;
    utterance.rate = settings.voiceSpeed;
    utterance.onend = () => setIsPreviewing(false);
    utterance.onerror = () => setIsPreviewing(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setIsPreviewing(true);
  }, [isPreviewing, settings.voiceSpeed, settings.voiceLanguage]);

  const fetchPlugins = useCallback(async () => {
    setPluginsLoading(true);
    try {
      const res = await fetch("/api/plugins");
      if (res.ok) {
        const data = await res.json();
        setPlugins(Array.isArray(data.plugins) ? data.plugins : Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setPluginsLoading(false); }
  }, []);

  const updateSetting = useCallback(
    <K extends keyof TamannaSettings>(key: K, value: TamannaSettings[K]) => {
      setSettings((prev) => {
        const updated = { ...prev, [key]: value };
        saveSettings(updated);
        return updated;
      });
    },
    []
  );

  const handleClearHistory = useCallback(() => {
    for (const conv of conversations) {
      deleteConversation(conv.id);
    }
    clearAll();
    onOpenChange(false);
    toast({
      title: "History cleared",
      description: "All conversation history has been deleted.",
    });
  }, [conversations, deleteConversation, clearAll, onOpenChange]);

  // ─── Task CRUD ──────────────────────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await fetch("/api/scheduled-tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch {
      // Silently fail
    } finally {
      setTasksLoading(false);
    }
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!newTask.name.trim() || !newTask.prompt.trim()) {
      toast({ title: "Missing fields", description: "Name and prompt are required.", variant: "destructive" });
      return;
    }

    setCreatingTask(true);
    try {
      const body: Record<string, unknown> = {
        name: newTask.name.trim(),
        description: newTask.description.trim() || null,
        prompt: newTask.prompt.trim(),
        scheduleType: newTask.scheduleType,
        timezone: newTask.timezone,
      };

      if (newTask.scheduleType === "cron") {
        body.cronExpr = newTask.cronExpr;
      } else if (newTask.scheduleType === "fixed_rate") {
        body.intervalSec = newTask.intervalMin * 60;
      } else if (newTask.scheduleType === "one_time") {
        if (newTask.runAtDate && newTask.runAtTime) {
          body.runAt = new Date(`${newTask.runAtDate}T${newTask.runAtTime}`).toISOString();
        }
      }

      const res = await fetch("/api/scheduled-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast({ title: "Task created", description: `"${newTask.name}" has been scheduled.` });
        setTaskDialogOpen(false);
        setNewTask({
          name: "",
          description: "",
          prompt: "",
          scheduleType: "cron",
          cronExpr: "0 9 * * *",
          intervalMin: 30,
          runAtDate: "",
          runAtTime: "",
          timezone: "Asia/Karachi",
        });
        fetchTasks();
      } else {
        const err = await res.json();
        toast({ title: "Failed to create task", description: err.error || "Unknown error", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create task", variant: "destructive" });
    } finally {
      setCreatingTask(false);
    }
  }, [newTask, fetchTasks]);

  const handleToggleTask = useCallback(
    async (task: ScheduledTask) => {
      try {
        await fetch(`/api/scheduled-tasks/${task.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled: !task.enabled }),
        });
        toast({
          title: task.enabled ? "Task paused" : "Task resumed",
          description: `"${task.name}" is now ${task.enabled ? "paused" : "active"}.`,
        });
        fetchTasks();
      } catch {
        toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
      }
    },
    [fetchTasks]
  );

  const handleDeleteTask = useCallback(
    async (task: ScheduledTask) => {
      try {
        await fetch(`/api/scheduled-tasks/${task.id}`, { method: "DELETE" });
        toast({ title: "Task deleted", description: `"${task.name}" has been removed.` });
        fetchTasks();
      } catch {
        toast({ title: "Error", description: "Failed to delete task", variant: "destructive" });
      }
    },
    [fetchTasks]
  );

  // ─── Plugin actions ─────────────────────────────────────────────
  const mergedPlugins = (() => {
    return PLUGIN_DEFINITIONS.map((def) => {
      const existing = plugins.find((p) => p.type === def.type && p.category === def.category);
      return { ...def, status: existing?.status || "disconnected", dbId: existing?.id || null };
    });
  })();

  const filteredPlugins = (() => {
    return mergedPlugins.filter((p) => {
      const matchesCat = pluginsFilter === "all" || p.category === pluginsFilter;
      const q = pluginsSearch.toLowerCase();
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  })();

  const handlePluginToggle = useCallback(async (plugin: typeof mergedPlugins[0]) => {
    setConnectingType(plugin.type);
    try {
      const dbPlugin = plugins.find((p) => p.type === plugin.type);
      if (!dbPlugin) {
        // Plugin not yet in DB — create it first
        const createRes = await fetch("/api/plugins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: plugin.name, description: plugin.description, category: plugin.category, type: plugin.type }),
        });
        if (!createRes.ok) {
          toast({ title: "Error", description: `Failed to create ${plugin.name}`, variant: "destructive" });
          return;
        }
        const created = await createRes.json();
        // Now connect it
        await fetch(`/api/plugins/${created.id}/connect`, { method: "POST" });
        toast({ title: `${plugin.name} connected` });
      } else if (plugin.status === "connected") {
        // Disconnect using real endpoint
        await fetch(`/api/plugins/${dbPlugin.id}/disconnect`, { method: "POST" });
        toast({ title: `${plugin.name} disconnected` });
      } else {
        // Connect using real endpoint
        await fetch(`/api/plugins/${dbPlugin.id}/connect`, { method: "POST" });
        toast({ title: `${plugin.name} connected` });
      }
      fetchPlugins();
    } catch {
      toast({ title: "Error", description: `Failed to update ${plugin.name}`, variant: "destructive" });
    } finally {
      setConnectingType(null);
    }
  }, [plugins, fetchPlugins]);

  const handlePluginConfigSave = useCallback((type: string) => {
    // Re-fetch plugins after config save
    fetchPlugins();
  }, [fetchPlugins]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setSettings(loadSettings());
        fetchTasks();
        fetchPlugins();
        setConfiguringPlugin(null);
      }
      onOpenChange(isOpen);
    },
    [onOpenChange, fetchTasks, fetchPlugins]
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="glass-card overflow-y-auto border-l border-white/20 dark:border-white/10 sm:max-w-md"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-lumina-primary font-[family-name:var(--font-display)] text-xl">
            <Settings className="w-5 h-5" />
            Settings
          </SheetTitle>
          <SheetDescription className="text-lumina-on-surface-variant font-[family-name:var(--font-body)]">
            Customize your Tamanna experience
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 mt-2 px-4 pb-6 font-[family-name:var(--font-body)]">
          {/* ── Theme Toggle ──────────────────────────────── */}
          <section>
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4 text-lumina-primary" />
              Appearance
            </Label>
            <div className="glass-pill rounded-xl p-3 space-y-3">
              <div className="flex gap-1 bg-lumina-surface-variant/30 rounded-lg p-1">
                {[
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                  { value: "system", icon: Monitor, label: "System" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                      theme === option.value
                        ? "bg-lumina-primary text-lumina-on-primary shadow-sm"
                        : "text-lumina-on-surface-variant hover:text-lumina-primary hover:bg-lumina-surface-variant/50"
                    }`}
                    aria-label={`${option.label} theme`}
                  >
                    <option.icon className="w-3.5 h-3.5" />
                    {option.label}
                  </button>
                ))}
              </div>
              {/* Accent Color Picker */}
              <div>
                <span className="text-xs text-lumina-on-surface-variant mb-2 block">Accent Color</span>
                <div className="flex items-center gap-2">
                  {ACCENT_COLORS.map((accent) => (
                    <button
                      key={accent.value}
                      onClick={() => updateSetting("accentColor", accent.value)}
                      className={`relative w-7 h-7 rounded-full ${accent.color} transition-all duration-200 hover:scale-110 ${
                        settings.accentColor === accent.value
                          ? `ring-2 ${accent.ring} ring-offset-2 ring-offset-background`
                          : "opacity-60 hover:opacity-100"
                      }`}
                      aria-label={`${accent.label} accent`}
                      title={accent.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Voice Settings ──────────────────────────────── */}
          <section>
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2 mb-3">
              <Volume2 className="w-4 h-4 text-lumina-primary" />
              Voice Settings
            </Label>
            <div className="glass-pill rounded-xl p-4 space-y-4">
              {/* Voice Speed Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-lumina-on-surface-variant">Speed</span>
                  <span className="text-sm font-semibold text-lumina-primary tabular-nums">
                    {settings.voiceSpeed.toFixed(2)}x
                  </span>
                </div>
                <Slider
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={[settings.voiceSpeed]}
                  onValueChange={(val) => updateSetting("voiceSpeed", val[0])}
                  className="py-2"
                />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-lumina-on-surface-variant/40">0.5x</span>
                  <span className="text-[10px] text-lumina-on-surface-variant/40">2.0x</span>
                </div>
              </div>

              <Separator className="bg-lumina-outline-variant/20" />

              {/* TTS Engine Selector */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Mic className="w-3.5 h-3.5 text-lumina-primary" />
                  <span className="text-xs text-lumina-on-surface-variant">TTS Engine</span>
                </div>
                <Select
                  value={settings.ttsEngine}
                  onValueChange={(val) => updateSetting("ttsEngine", val)}
                >
                  <SelectTrigger className="w-full bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface font-[family-name:var(--font-body)]">
                    <SelectValue placeholder="Select engine" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-lumina-outline-variant/40">
                    {TTS_ENGINES.map((engine) => (
                      <SelectItem
                        key={engine.value}
                        value={engine.value}
                        className="text-lumina-on-surface font-[family-name:var(--font-body)] focus:bg-lumina-primary/10 focus:text-lumina-primary"
                      >
                        <div className="flex flex-col">
                          <span>{engine.label}</span>
                          <span className="text-[10px] text-lumina-on-surface-variant/50">{engine.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-lumina-outline-variant/20" />

              {/* Voice Language Selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-lumina-primary" />
                    <span className="text-xs text-lumina-on-surface-variant">Voice Language</span>
                  </div>
                  <button
                    onClick={handleVoicePreview}
                    className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium text-lumina-primary bg-lumina-primary/10 hover:bg-lumina-primary/20 transition-all duration-200 cursor-pointer"
                    aria-label="Preview voice"
                  >
                    {isPreviewing ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    {isPreviewing ? "Stop" : "Preview"}
                  </button>
                </div>
                <Select
                  value={settings.voiceLanguage}
                  onValueChange={(val) => updateSetting("voiceLanguage", val)}
                >
                  <SelectTrigger className="w-full bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface font-[family-name:var(--font-body)]">
                    <SelectValue placeholder="Select voice language" />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-lumina-outline-variant/40">
                    {VOICE_LANGUAGES.map((lang) => (
                      <SelectItem
                        key={lang.value}
                        value={lang.value}
                        className="text-lumina-on-surface font-[family-name:var(--font-body)] focus:bg-lumina-primary/10 focus:text-lumina-primary"
                      >
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-lumina-outline-variant/20" />

              {/* TTS Auto-play Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-lumina-on-surface-variant">
                  Auto-play voice responses
                </span>
                <Switch
                  checked={settings.ttsAutoplay}
                  onCheckedChange={(checked) => updateSetting("ttsAutoplay", checked)}
                />
              </div>
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Response Language ────────────────────────── */}
          <section>
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2 mb-3">
              <Languages className="w-4 h-4 text-lumina-primary" />
              Response Language
            </Label>
            <div className="glass-pill rounded-xl p-3">
              <Select
                value={settings.responseLanguage}
                onValueChange={(val) => updateSetting("responseLanguage", val)}
              >
                <SelectTrigger className="w-full bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface font-[family-name:var(--font-body)]">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="glass-card border-lumina-outline-variant/40">
                  {LANGUAGES.map((lang) => (
                    <SelectItem
                      key={lang.value}
                      value={lang.value}
                      className="text-lumina-on-surface font-[family-name:var(--font-body)] focus:bg-lumina-primary/10 focus:text-lumina-primary"
                    >
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Notifications ────────────────────────────── */}
          <section>
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-lumina-primary" />
              Notifications
            </Label>
            <div className="glass-pill rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-lumina-on-surface-variant" />
                  <span className="text-xs text-lumina-on-surface-variant">Sound Effects</span>
                </div>
                <Switch
                  checked={settings.soundEffects}
                  onCheckedChange={(checked) => updateSetting("soundEffects", checked)}
                />
              </div>
              <Separator className="bg-lumina-outline-variant/20" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-lumina-on-surface-variant" />
                  <span className="text-xs text-lumina-on-surface-variant">Vibration</span>
                </div>
                <Switch
                  checked={settings.vibration}
                  onCheckedChange={(checked) => updateSetting("vibration", checked)}
                />
              </div>
              <Separator className="bg-lumina-outline-variant/20" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-lumina-on-surface-variant" />
                  <span className="text-xs text-lumina-on-surface-variant">Auto-read responses</span>
                </div>
                <Switch
                  checked={settings.autoRead}
                  onCheckedChange={(checked) => updateSetting("autoRead", checked)}
                />
              </div>
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Scheduled Tasks ──────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-lumina-primary" />
                Scheduled Tasks
                {tasks.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-lumina-primary/10 text-lumina-primary tabular-nums">
                    {tasks.length}
                  </span>
                )}
              </Label>

              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs font-medium bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 rounded-lg gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-lumina-outline-variant/40 sm:max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="font-[family-name:var(--font-display)] text-lumina-on-surface flex items-center gap-2">
                      <CalendarClock className="w-5 h-5 text-lumina-primary" />
                      Create Scheduled Task
                    </DialogTitle>
                    <DialogDescription className="text-lumina-on-surface-variant font-[family-name:var(--font-body)]">
                      Schedule Tamanna to run tasks automatically on a recurring basis.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col gap-4 mt-4 font-[family-name:var(--font-body)]">
                    {/* Task Name */}
                    <div>
                      <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Task Name *</Label>
                      <Input
                        placeholder="e.g. Daily briefing"
                        value={newTask.name}
                        onChange={(e) => setNewTask((p) => ({ ...p, name: e.target.value }))}
                        className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Description</Label>
                      <Input
                        placeholder="Optional description"
                        value={newTask.description}
                        onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
                        className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm"
                      />
                    </div>

                    {/* Prompt */}
                    <div>
                      <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Prompt / Message *</Label>
                      <Textarea
                        placeholder="What should Tamanna do? e.g. Give me a summary of today's news"
                        value={newTask.prompt}
                        onChange={(e) => setNewTask((p) => ({ ...p, prompt: e.target.value }))}
                        rows={3}
                        className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm resize-none"
                      />
                    </div>

                    {/* Schedule Type */}
                    <div>
                      <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Schedule Type</Label>
                      <div className="flex gap-1 bg-lumina-surface-variant/30 rounded-lg p-1">
                        {[
                          { value: "cron" as const, label: "Recurring", icon: Repeat },
                          { value: "fixed_rate" as const, label: "Interval", icon: Timer },
                          { value: "one_time" as const, label: "One-time", icon: CalendarClock },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setNewTask((p) => ({ ...p, scheduleType: opt.value }))}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex-1 justify-center cursor-pointer ${
                              newTask.scheduleType === opt.value
                                ? "bg-lumina-primary text-lumina-on-primary shadow-sm"
                                : "text-lumina-on-surface-variant hover:text-lumina-primary hover:bg-lumina-surface-variant/50"
                            }`}
                          >
                            <opt.icon className="w-3.5 h-3.5" />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cron Expression */}
                    {newTask.scheduleType === "cron" && (
                      <div>
                        <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Cron Expression</Label>
                        <Input
                          placeholder="* * * * *"
                          value={newTask.cronExpr}
                          onChange={(e) => setNewTask((p) => ({ ...p, cronExpr: e.target.value }))}
                          className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm font-mono"
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {CRON_PRESETS.map((preset) => (
                            <button
                              key={preset.expr}
                              onClick={() => setNewTask((p) => ({ ...p, cronExpr: preset.expr }))}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                                newTask.cronExpr === preset.expr
                                  ? "bg-lumina-primary/15 text-lumina-primary"
                                  : "glass-pill text-lumina-on-surface-variant/60 hover:text-lumina-on-surface hover:bg-lumina-primary/10"
                              }`}
                            >
                              {preset.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fixed Rate */}
                    {newTask.scheduleType === "fixed_rate" && (
                      <div>
                        <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Interval</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={10080}
                            value={newTask.intervalMin}
                            onChange={(e) => setNewTask((p) => ({ ...p, intervalMin: Number(e.target.value) || 1 }))}
                            className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm w-24"
                          />
                          <span className="text-xs text-lumina-on-surface-variant">minutes</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {[5, 15, 30, 60, 120, 360, 1440].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => setNewTask((p) => ({ ...p, intervalMin: mins }))}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                                newTask.intervalMin === mins
                                  ? "bg-lumina-primary/15 text-lumina-primary"
                                  : "glass-pill text-lumina-on-surface-variant/60 hover:text-lumina-on-surface hover:bg-lumina-primary/10"
                              }`}
                            >
                              {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* One-time */}
                    {newTask.scheduleType === "one_time" && (
                      <div>
                        <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Run At</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            value={newTask.runAtDate}
                            onChange={(e) => setNewTask((p) => ({ ...p, runAtDate: e.target.value }))}
                            className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm flex-1"
                          />
                          <Input
                            type="time"
                            value={newTask.runAtTime}
                            onChange={(e) => setNewTask((p) => ({ ...p, runAtTime: e.target.value }))}
                            className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm flex-1"
                          />
                        </div>
                      </div>
                    )}

                    {/* Timezone */}
                    <div>
                      <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Timezone</Label>
                      <Select
                        value={newTask.timezone}
                        onValueChange={(val) => setNewTask((p) => ({ ...p, timezone: val }))}
                      >
                        <SelectTrigger className="w-full bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-lumina-outline-variant/40">
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value} className="text-sm">
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Create Button */}
                    <Button
                      onClick={handleCreateTask}
                      disabled={creatingTask || !newTask.name.trim() || !newTask.prompt.trim()}
                      className="w-full bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 font-medium gap-2"
                    >
                      {creatingTask ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CalendarClock className="w-4 h-4" />
                      )}
                      {creatingTask ? "Creating..." : "Create Scheduled Task"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Task List */}
            <div className="space-y-2">
              {tasksLoading ? (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="w-4 h-4 text-lumina-primary animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="glass-pill rounded-xl p-6 text-center">
                  <Clock className="w-8 h-8 text-lumina-on-surface-variant/20 mx-auto mb-2" />
                  <p className="text-xs text-lumina-on-surface-variant/50">
                    No scheduled tasks yet
                  </p>
                  <p className="text-[10px] text-lumina-on-surface-variant/30 mt-1">
                    Create one to automate recurring prompts
                  </p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`glass-card rounded-xl p-3 transition-all duration-200 ${!task.enabled ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <ScheduleTypeIcon type={task.scheduleType} className="w-4 h-4 text-lumina-primary shrink-0" />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-lumina-on-surface truncate">
                            {task.name}
                          </h4>
                          {task.description && (
                            <p className="text-[10px] text-lumina-on-surface-variant/60 truncate">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleTask(task)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            task.enabled
                              ? "text-lumina-primary hover:bg-lumina-primary/10"
                              : "text-lumina-on-surface-variant/40 hover:bg-lumina-surface-variant/30"
                          }`}
                          aria-label={task.enabled ? "Pause task" : "Resume task"}
                        >
                          {task.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="p-1.5 rounded-lg text-red-400/60 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          aria-label="Delete task"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[11px] text-lumina-on-surface-variant/50 font-mono truncate mb-1.5">
                      {formatScheduleDesc(task)}
                    </p>

                    <div className="flex items-center gap-3 text-[10px] text-lumina-on-surface-variant/40">
                      {task.lastRunAt && (
                        <span className="flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          Last: {formatRelativeTime(task.lastRunAt)}
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <Repeat className="w-3 h-3" />
                        {task.runCount} run{task.runCount !== 1 ? "s" : ""}
                      </span>
                      {task.nextRunAt && task.enabled && (
                        <span className="flex items-center gap-0.5">
                          <CalendarClock className="w-3 h-3" />
                          Next: {formatRelativeTime(task.nextRunAt)}
                        </span>
                      )}
                      {task.lastError && (
                        <span className="flex items-center gap-0.5 text-red-500">
                          <AlertCircle className="w-3 h-3" />
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Plugins ──────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
                <Plug className="w-4 h-4 text-lumina-primary" />
                Plugins
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-lumina-primary/10 text-lumina-primary tabular-nums">
                  {mergedPlugins.filter((p) => p.status === "connected").length}/{mergedPlugins.length}
                </span>
              </Label>
            </div>

            {/* Category filter tabs */}
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                { value: "all", label: "All", icon: Plug },
                { value: "connector", label: "Connectors", icon: Link2 },
                { value: "skill", label: "Skills", icon: Zap },
                { value: "data_source", label: "Data Sources", icon: Database },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setPluginsFilter(cat.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                    pluginsFilter === cat.value
                      ? "bg-lumina-primary text-lumina-on-primary shadow-sm"
                      : "glass-pill text-lumina-on-surface-variant hover:text-lumina-on-surface hover:bg-white/60 dark:hover:bg-white/10"
                  }`}
                >
                  <cat.icon className="w-3 h-3" />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lumina-on-surface-variant/40 pointer-events-none" />
              <input
                type="text"
                placeholder="Search plugins..."
                value={pluginsSearch}
                onChange={(e) => setPluginsSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-7 rounded-lg bg-lumina-surface-variant/20 border border-lumina-outline-variant/20 font-[family-name:var(--font-body)] text-xs text-lumina-on-surface placeholder:text-lumina-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-lumina-primary/30 transition-all duration-200"
              />
              {pluginsSearch && (
                <button
                  onClick={() => setPluginsSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-lumina-on-surface-variant/10 flex items-center justify-center hover:bg-lumina-on-surface-variant/20 transition-colors cursor-pointer"
                >
                  <X className="w-2.5 h-2.5 text-lumina-on-surface-variant/60" />
                </button>
              )}
            </div>

            {/* Plugin list */}
            <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
              {pluginsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 text-lumina-primary animate-spin" />
                </div>
              ) : filteredPlugins.length === 0 ? (
                <div className="glass-pill rounded-xl p-4 text-center">
                  <Search className="w-6 h-6 text-lumina-on-surface-variant/20 mx-auto mb-1" />
                  <p className="text-[11px] text-lumina-on-surface-variant/50">No plugins found</p>
                </div>
              ) : (
                filteredPlugins.map((plugin) => {
                  const isConnected = plugin.status === "connected";
                  const Icon = plugin.icon;
                  return (
                    <div
                      key={`${plugin.category}-${plugin.type}`}
                      className={`flex items-center gap-2.5 p-2 rounded-xl transition-all duration-200 ${isConnected ? "bg-lumina-primary/5 ring-1 ring-lumina-primary/10" : "hover:bg-lumina-surface-variant/20"}`}
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${plugin.bgColor}`}>
                        <Icon className={`w-4 h-4 ${plugin.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-semibold text-lumina-on-surface truncate">{plugin.name}</h4>
                          {isConnected && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-px rounded-full text-[8px] font-medium bg-emerald-500/10 text-emerald-600">
                              <CheckCircle2 className="w-2 h-2" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-lumina-on-surface-variant/50 truncate">{plugin.description}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-1">
                        <button
                          onClick={() => setConfiguringPlugin(plugin)}
                          className="flex items-center gap-0.5 px-2 py-1 rounded-full text-[10px] font-medium text-lumina-on-surface-variant/60 hover:text-lumina-primary hover:bg-lumina-primary/10 transition-all duration-200 cursor-pointer"
                          title="Configure"
                        >
                          <Settings className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handlePluginToggle(plugin)}
                          disabled={connectingType === plugin.type}
                          className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                            connectingType === plugin.type
                              ? "text-lumina-on-surface-variant/40"
                              : isConnected
                              ? "text-red-500 bg-red-500/10 hover:bg-red-500/20"
                              : "text-lumina-primary bg-lumina-primary/10 hover:bg-lumina-primary/20"
                          }`}
                        >
                          {connectingType === plugin.type ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              {isConnected ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                              {isConnected ? "Off" : plugin.category === "skill" ? "On" : "Link"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* Plugin Config Dialog */}
          {configuringPlugin && (
            <Suspense fallback={null}>
              <PluginConfigDialog
              open={!!configuringPlugin}
              onOpenChange={(open) => { if (!open) setConfiguringPlugin(null); }}
              plugin={configuringPlugin}
              savedConfig={plugins.find((p) => p.type === configuringPlugin.type && p.category === configuringPlugin.category)?.config || {}}
              onSave={() => handlePluginConfigSave(configuringPlugin.type)}
            />
            </Suspense>
          )}

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Team Collaboration ────────────────────────────── */}
          <section>
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-emerald-500" />
              Team Collaboration
            </Label>
            <div className="glass-pill rounded-xl p-4">
              <Suspense fallback={
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-lumina-primary/30 border-t-emerald-500 animate-spin" />
                </div>
              }>
                <TeamCollaborationSection />
              </Suspense>
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Clear History ────────────────────────────── */}
          <section>
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-lumina-primary" />
              Data
            </Label>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive font-[family-name:var(--font-body)] transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Conversation History
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-card border-lumina-outline-variant/40">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-[family-name:var(--font-display)] text-lumina-on-surface">
                    Clear all conversations?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-lumina-on-surface-variant font-[family-name:var(--font-body)]">
                    This will permanently delete all your conversation history.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="font-[family-name:var(--font-body)]">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearHistory}
                    className="bg-destructive text-white hover:bg-destructive/90 font-[family-name:var(--font-body)]"
                  >
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── About Section ─────────────────────────────── */}
          <section className="glass-pill rounded-xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-lumina-primary/10 shrink-0">
                <Info className="w-5 h-5 text-lumina-primary" />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] font-semibold text-lumina-on-surface text-sm">
                  Tamanna — AI Voice Assistant
                </h3>
                <p className="text-xs text-lumina-on-surface-variant mt-1 leading-relaxed">
                  A sophisticated voice interface that feels alive yet
                  unobtrusive. Powered by intelligent design for natural,
                  fluid conversations.
                </p>
              </div>
            </div>

            <Separator className="bg-lumina-outline-variant/20 mb-3" />

            {/* Version & Build Info */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-lumina-on-surface-variant">Version</span>
              <span className="text-xs font-mono text-lumina-on-surface-variant/60">v0.2.1 · build 2025.07</span>
            </div>

            {/* Made with love */}
            <div className="flex items-center justify-center gap-1 py-2">
              <span className="text-xs text-lumina-on-surface-variant/50">Made with</span>
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span className="text-xs text-lumina-on-surface-variant/50">by</span>
              <span className="text-xs font-semibold text-lumina-primary">Tamanna AI</span>
            </div>

            <Separator className="bg-lumina-outline-variant/20 mb-3" />

            {/* Legal Links */}
            <div className="flex items-center justify-center gap-4">
              <button
                className="flex items-center gap-1 text-[11px] text-lumina-on-surface-variant/50 hover:text-lumina-primary transition-colors duration-200 cursor-pointer"
                onClick={() => toast({ title: "Privacy Policy", description: "Coming soon." })}
              >
                <Shield className="w-3 h-3" />
                Privacy Policy
              </button>
              <span className="text-lumina-on-surface-variant/20">·</span>
              <button
                className="flex items-center gap-1 text-[11px] text-lumina-on-surface-variant/50 hover:text-lumina-primary transition-colors duration-200 cursor-pointer"
                onClick={() => toast({ title: "Terms of Service", description: "Coming soon." })}
              >
                <FileText className="w-3 h-3" />
                Terms of Service
              </button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function ScheduleTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "cron":
      return <Repeat className={className} />;
    case "fixed_rate":
      return <Timer className={className} />;
    case "one_time":
      return <CalendarClock className={className} />;
    default:
      return <Clock className={className} />;
  }
}

function formatScheduleDesc(task: ScheduledTask): string {
  if (task.scheduleType === "cron" && task.cronExpr) {
    return `cron: ${task.cronExpr} (${task.timezone})`;
  }
  if (task.scheduleType === "fixed_rate" && task.intervalSec) {
    const mins = task.intervalSec / 60;
    if (mins < 60) return `every ${mins} minute${mins !== 1 ? "s" : ""}`;
    const hrs = mins / 60;
    if (hrs < 24) return `every ${hrs} hour${hrs !== 1 ? "s" : ""}`;
    return `every ${(hrs / 24).toFixed(1)} days`;
  }
  if (task.scheduleType === "one_time" && task.runAt) {
    return `once at ${new Date(task.runAt).toLocaleString()} (${task.timezone})`;
  }
  return task.scheduleType;
}

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
