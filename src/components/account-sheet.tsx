"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  User,
  Download,
  Trash2,
  MessageSquare,
  BarChart3,
  Pencil,
  Check,
  Flame,
  Sun,
  Moon,
  Monitor,
  TrendingUp,
  CalendarDays,
  Clock,
  Globe,
  Zap,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { useAgentStore } from "@/lib/stores/agent-store";
import { useTheme } from "next-themes";
import { toast } from "@/hooks/use-toast";

/* ─── constants ──────────────────────────────────────────── */
const PROFILE_KEY = "tamanna_profile";
const ACTIVITY_KEY = "tamanna_activity_log";
const FIRST_USE_KEY = "tamanna_first_use";
const ONBOARDING_KEY = "tamanna_onboarding_done";

interface UserProfile {
  name: string;
  email: string;
}

const DEFAULT_PROFILE: UserProfile = {
  name: "",
  email: "",
};

/* ─── helpers ────────────────────────────────────────────── */
function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_PROFILE;
}

function saveProfile(profile: UserProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* storage full */
  }
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

/** Simple deterministic hash from a string to a number 0‒1 */
function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return ((h & 0x7fffffff) % 1000) / 1000;
}

/** Format a Date to "Mon DD" like "Jun 15" */
function shortDay(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** ISO date string "YYYY-MM-DD" */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ─── activity tracking helpers ─────────────────────────────── */

/** Track today as an active day (called once per render when sheet is open) */
function recordTodayActivity() {
  const today = isoDate(new Date());
  const log = getActivityLog();
  if (log[today]) return; // already recorded today
  log[today] = true;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log));
}

/** Load the full activity log { "YYYY-MM-DD": true } */
function getActivityLog(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
}

/** Seed historical activity from the first-use / onboarding date */
function ensureFirstUseDate(): string | null {
  // Prefer the explicit key
  let first = localStorage.getItem(FIRST_USE_KEY);
  if (!first) {
    first = localStorage.getItem(ONBOARDING_KEY) === "1" ? "seeded" : null;
  }
  if (!first) {
    // Check profile key timestamp as heuristic
    try {
      const profileRaw = localStorage.getItem(PROFILE_KEY);
      if (profileRaw) {
        first = "seeded";
      }
    } catch {
      /* ignore */
    }
  }
  if (!first) return null;
  if (first === "seeded") {
    // Set today as first use if not already set
    localStorage.setItem(FIRST_USE_KEY, isoDate(new Date()));
    return localStorage.getItem(FIRST_USE_KEY);
  }
  return first;
}

/** Calculate the current streak (consecutive active days ending today/yesterday) */
function calculateStreak(): number {
  const log = getActivityLog();
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = isoDate(d);
    if (log[key]) {
      streak++;
    } else {
      // Allow today to be not yet recorded — if yesterday is active, streak is at least 1
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

/** Count total distinct active days */
function countActiveDays(): number {
  return Object.keys(getActivityLog()).length;
}

/** Detect browser name from UA */
function detectBrowser(): string {
  if (typeof navigator === "undefined") return "Unknown";
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Other";
}

/* ─── component ───────────────────────────────────────────── */

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountSheet({
  open,
  onOpenChange,
}: AccountSheetProps) {
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  const [editingField, setEditingField] = useState<"name" | "email" | null>(
    null
  );
  const [draftValue, setDraftValue] = useState("");
  const [mounted, setMounted] = useState(false);

  const { theme, resolvedTheme } = useTheme();

  const conversations = useAgentStore((s) => s.conversations);
  const messages = useAgentStore((s) => s.messages);
  const deleteConversation = useAgentStore((s) => s.deleteConversation);
  const clearAll = useAgentStore((s) => s.clearAll);

  // Record activity and hydrate on mount (client-only)
  useEffect(() => {
    ensureFirstUseDate();
    recordTodayActivity();
    // Defer setState to avoid synchronous setState-in-effect lint
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  // Re-sync profile from localStorage each time the sheet opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setProfile(loadProfile());
        recordTodayActivity();
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  /* ─── derived stats ─────────────────────────────────── */
  const stats = useMemo(() => {
    const totalConversations = conversations.length;
    const totalMessages =
      messages.length +
      conversations.reduce((acc, conv) => acc + conv.messages.length, 0);
    const activeDays = mounted ? countActiveDays() : 0;
    const avgPerDay = activeDays > 0 ? +(totalMessages / activeDays).toFixed(1) : 0;
    return { totalConversations, totalMessages, activeDays, avgPerDay };
  }, [conversations, messages, mounted]);

  /* ─── activity chart data ──────────────────────────── */
  const activityData = useMemo(() => {
    const today = new Date();
    const log = mounted ? getActivityLog() : {};
    const days: { label: string; level: number; active: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = isoDate(d);
      const isActive = !!log[key];
      // Generate a deterministic activity level for this day
      // If active, base it on the hash; if not, give a very low value
      const raw = hashStr("tamanna_act_" + key);
      days.push({
        label: i === 0 ? "Today" : shortDay(d),
        level: isActive ? 0.3 + raw * 0.7 : raw * 0.15,
        active: isActive,
      });
    }
    return days;
  }, [mounted]);

  const streak = useMemo(() => (mounted ? calculateStreak() : 0), [mounted]);

  const sessionStart = useMemo(() => {
    // Use a session timestamp stored at module load, or just "now"
    return new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  const browserName = useMemo(() => detectBrowser(), []);

  /* ─── edit helpers ─────────────────────────────────── */
  const startEdit = (field: "name" | "email") => {
    setEditingField(field);
    setDraftValue(profile[field]);
  };

  const saveEdit = useCallback(() => {
    if (!editingField) return;
    const updated = { ...profile, [editingField]: draftValue };
    setProfile(updated);
    saveProfile(updated);
    setEditingField(null);
    setDraftValue("");
    toast({
      title: "Profile updated",
      description: `${editingField === "name" ? "Name" : "Email"} saved successfully.`,
    });
  }, [editingField, draftValue, profile]);

  const cancelEdit = () => {
    setEditingField(null);
    setDraftValue("");
  };

  /* ─── export ────────────────────────────────────────── */
  const handleExport = useCallback(() => {
    try {
      const exportData = {
        profile: loadProfile(),
        settings: (() => {
          try {
            return JSON.parse(localStorage.getItem("tamanna_settings") || "{}");
          } catch {
            return {};
          }
        })(),
        conversations: conversations.map((conv) => ({
          id: conv.id,
          title: conv.title,
          messages: conv.messages,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        })),
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tamanna-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Your conversations have been downloaded.",
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Could not export your data. Please try again.",
        variant: "destructive",
      });
    }
  }, [conversations]);

  /* ─── clear all ─────────────────────────────────────── */
  const handleClearAllData = useCallback(() => {
    for (const conv of conversations) {
      deleteConversation(conv.id);
    }
    clearAll();
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem("tamanna_settings");
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.removeItem(FIRST_USE_KEY);
    setProfile(DEFAULT_PROFILE);
    handleOpenChange(false);
    toast({
      title: "All data cleared",
      description: "Your profile, settings, and conversations have been removed.",
    });
  }, [conversations, deleteConversation, clearAll, handleOpenChange]);

  const initials = getInitials(profile.name);

  const isDark = resolvedTheme === "dark";
  const effectiveTheme = isDark ? "Dark" : "Light";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="glass-card overflow-y-auto border-l border-white/20 dark:border-white/10 sm:max-w-md"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-lumina-primary font-[family-name:var(--font-display)] text-xl">
            <User className="w-5 h-5" />
            Account
          </SheetTitle>
          <SheetDescription className="text-lumina-on-surface-variant font-[family-name:var(--font-body)]">
            Manage your profile and data
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 mt-2 px-4 pb-6 font-[family-name:var(--font-body)]">
          {/* ── Avatar & Profile ──────────────────────────── */}
          <section className="glass-pill rounded-xl p-5">
            <div className="flex flex-col items-center gap-4">
              {/* Avatar */}
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-lumina-primary to-lumina-secondary flex items-center justify-center shadow-tinted-strong transition-transform duration-200 group-hover:scale-105">
                  <span className="text-2xl font-bold text-lumina-on-primary font-[family-name:var(--font-display)]">
                    {initials}
                  </span>
                </div>
              </div>

              {/* Name Field */}
              <div className="w-full space-y-1.5">
                <Label className="text-xs font-medium text-lumina-on-surface-variant uppercase tracking-wider">
                  Name
                </Label>
                {editingField === "name" ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                      placeholder="Enter your name"
                      className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface font-[family-name:var(--font-body)] h-9 text-sm"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={saveEdit}
                      className="h-9 w-9 shrink-0 text-lumina-primary hover:bg-lumina-primary/10"
                      aria-label="Save name"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-lumina-surface-variant/20 border border-lumina-outline-variant/30 cursor-pointer hover:border-lumina-primary/40 transition-colors duration-200"
                    onClick={() => startEdit("name")}
                  >
                    <span className="text-sm text-lumina-on-surface truncate">
                      {profile.name || "Set your name"}
                    </span>
                    <Pencil className="w-3.5 h-3.5 text-lumina-on-surface-variant shrink-0" />
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div className="w-full space-y-1.5">
                <Label className="text-xs font-medium text-lumina-on-surface-variant uppercase tracking-wider">
                  Email
                </Label>
                {editingField === "email" ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      autoFocus
                      placeholder="Enter your email"
                      className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface font-[family-name:var(--font-body)] h-9 text-sm"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={saveEdit}
                      className="h-9 w-9 shrink-0 text-lumina-primary hover:bg-lumina-primary/10"
                      aria-label="Save email"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-lumina-surface-variant/20 border border-lumina-outline-variant/30 cursor-pointer hover:border-lumina-primary/40 transition-colors duration-200"
                    onClick={() => startEdit("email")}
                  >
                    <span className="text-sm text-lumina-on-surface truncate">
                      {profile.email || "Set your email"}
                    </span>
                    <Pencil className="w-3.5 h-3.5 text-lumina-on-surface-variant shrink-0" />
                  </div>
                )}
              </div>
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Streak Counter & Activity Chart ────────────── */}
          <section className="glass-pill rounded-xl p-5 space-y-4">
            {/* Streak badge + Activity header row */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-lumina-primary" />
                This Week&apos;s Activity
              </Label>
              {/* Streak badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-lumina-primary/15 to-lumina-secondary/15 border border-lumina-primary/20">
                <Flame
                  className={`w-4 h-4 ${streak > 0 ? "text-orange-500" : "text-lumina-on-surface-variant/50"}`}
                />
                <span
                  className={`text-sm font-bold font-[family-name:var(--font-display)] tabular-nums ${streak > 0 ? "text-orange-500" : "text-lumina-on-surface-variant/50"}`}
                >
                  {streak}
                </span>
                <span className="text-xs text-lumina-on-surface-variant hidden sm:inline">
                  day{streak !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* 7-day activity bar chart */}
            <div className="flex items-end justify-between gap-1.5 h-24 px-1">
              {activityData.map((day, i) => {
                // Cap minimum height for visibility
                const barHeight = Math.max(8, day.level * 100);
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 flex-1"
                  >
                    {/* Bar */}
                    <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                      <div
                        className="w-full max-w-[32px] rounded-t-md transition-all duration-300 ease-out"
                        style={{
                          height: `${barHeight}%`,
                          background: day.active
                            ? "linear-gradient(to top, var(--color-lumina-primary), var(--color-lumina-secondary))"
                            : "linear-gradient(to top, color-mix(in srgb, var(--color-lumina-primary) 20%, transparent), color-mix(in srgb, var(--color-lumina-secondary) 15%, transparent))",
                          opacity: day.active ? 1 : 0.5,
                          boxShadow: day.active
                            ? "0 0 8px color-mix(in srgb, var(--color-lumina-primary) 30%, transparent)"
                            : "none",
                        }}
                      />
                    </div>
                    {/* Day label */}
                    <span className="text-[10px] leading-none text-lumina-on-surface-variant tabular-nums whitespace-nowrap">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Conversation Stats ────────────────────────── */}
          <section>
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-lumina-primary" />
              Conversation Stats
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Conversations */}
              <div className="glass-pill rounded-xl p-4 text-center">
                <div className="w-9 h-9 rounded-full bg-lumina-primary/10 flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="w-4 h-4 text-lumina-primary" />
                </div>
                <p className="text-2xl font-bold text-lumina-on-surface font-[family-name:var(--font-display)] tabular-nums">
                  {stats.totalConversations}
                </p>
                <p className="text-xs text-lumina-on-surface-variant mt-0.5">
                  Conversations
                </p>
              </div>
              {/* Messages */}
              <div className="glass-pill rounded-xl p-4 text-center">
                <div className="w-9 h-9 rounded-full bg-lumina-secondary/20 flex items-center justify-center mx-auto mb-2">
                  <MessageSquare className="w-4 h-4 text-lumina-secondary" />
                </div>
                <p className="text-2xl font-bold text-lumina-on-surface font-[family-name:var(--font-display)] tabular-nums">
                  {stats.totalMessages}
                </p>
                <p className="text-xs text-lumina-on-surface-variant mt-0.5">
                  Messages
                </p>
              </div>
              {/* Avg Messages / Day */}
              <div className="glass-pill rounded-xl p-4 text-center">
                <div className="w-9 h-9 rounded-full bg-lumina-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Zap className="w-4 h-4 text-lumina-primary" />
                </div>
                <p className="text-2xl font-bold text-lumina-on-surface font-[family-name:var(--font-display)] tabular-nums">
                  {stats.avgPerDay}
                </p>
                <p className="text-xs text-lumina-on-surface-variant mt-0.5">
                  Avg Messages/Day
                </p>
              </div>
              {/* Active Days */}
              <div className="glass-pill rounded-xl p-4 text-center">
                <div className="w-9 h-9 rounded-full bg-lumina-secondary/20 flex items-center justify-center mx-auto mb-2">
                  <CalendarDays className="w-4 h-4 text-lumina-secondary" />
                </div>
                <p className="text-2xl font-bold text-lumina-on-surface font-[family-name:var(--font-display)] tabular-nums">
                  {stats.activeDays}
                </p>
                <p className="text-xs text-lumina-on-surface-variant mt-0.5">
                  Active Days
                </p>
              </div>
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Theme & Session Info ─────────────────────── */}
          <section className="space-y-3">
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
              <Monitor className="w-4 h-4 text-lumina-primary" />
              Preferences &amp; Session
            </Label>

            <div className="grid grid-cols-2 gap-3">
              {/* Theme card */}
              <div className="glass-pill rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-lumina-primary/10 flex items-center justify-center">
                    {mounted && (isDark ? (
                      <Moon className="w-3.5 h-3.5 text-lumina-primary" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-lumina-primary" />
                    ))}
                  </div>
                  <span className="text-xs text-lumina-on-surface-variant font-medium uppercase tracking-wider">
                    Theme
                  </span>
                </div>
                <p className="text-sm font-semibold text-lumina-on-surface font-[family-name:var(--font-display)]">
                  {mounted ? effectiveTheme : "…"}
                </p>
                <p className="text-[10px] text-lumina-on-surface-variant">
                  {mounted ? (theme === "system" ? "Follows system" : `${effectiveTheme} mode`) : "Loading…"}
                </p>
              </div>

              {/* Language card */}
              <div className="glass-pill rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-lumina-secondary/20 flex items-center justify-center">
                    <Globe className="w-3.5 h-3.5 text-lumina-secondary" />
                  </div>
                  <span className="text-xs text-lumina-on-surface-variant font-medium uppercase tracking-wider">
                    Language
                  </span>
                </div>
                <p className="text-sm font-semibold text-lumina-on-surface font-[family-name:var(--font-display)]">
                  English
                </p>
                <p className="text-[10px] text-lumina-on-surface-variant">
                  Default (UI language)
                </p>
              </div>
            </div>

            {/* Session info card */}
            <div className="glass-pill rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-lumina-primary/10 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-lumina-primary" />
                </div>
                <span className="text-xs text-lumina-on-surface-variant font-medium uppercase tracking-wider">
                  Session
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-lumina-on-surface-variant">Session Started</span>
                <span className="text-lumina-on-surface font-medium tabular-nums">
                  {sessionStart}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-lumina-on-surface-variant">Browser</span>
                <span className="text-lumina-on-surface font-medium">
                  {mounted ? browserName : "…"}
                </span>
              </div>
            </div>
          </section>

          <Separator className="bg-lumina-outline-variant/40" />

          {/* ── Data Management ────────────────────────────── */}
          <section>
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2 mb-3">
              <Download className="w-4 h-4 text-lumina-primary" />
              Data Management
            </Label>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-start border-lumina-outline-variant/40 text-lumina-on-surface hover:bg-lumina-primary/5 hover:text-lumina-primary hover:border-lumina-primary/30 font-[family-name:var(--font-body)] transition-all duration-200"
                onClick={handleExport}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Conversations
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive font-[family-name:var(--font-body)] transition-all duration-200"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glass-card border-lumina-outline-variant/40">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-[family-name:var(--font-display)] text-lumina-on-surface">
                      Clear all data?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-lumina-on-surface-variant font-[family-name:var(--font-body)]">
                      This will permanently delete your profile, settings, and
                      all conversation history. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="font-[family-name:var(--font-body)]">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleClearAllData}
                      className="bg-destructive text-white hover:bg-destructive/90 font-[family-name:var(--font-body)]"
                    >
                      Delete Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
