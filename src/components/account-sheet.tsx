"use client";

import { useState, useCallback, useMemo } from "react";
import {
  User,
  Download,
  Trash2,
  MessageSquare,
  BarChart3,
  Pencil,
  Check,
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
import { toast } from "@/hooks/use-toast";

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserProfile {
  name: string;
  email: string;
}

const PROFILE_KEY = "tamanna_profile";
const DEFAULT_PROFILE: UserProfile = {
  name: "",
  email: "",
};

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

export default function AccountSheet({
  open,
  onOpenChange,
}: AccountSheetProps) {
  const [profile, setProfile] = useState<UserProfile>(loadProfile);
  const [editingField, setEditingField] = useState<"name" | "email" | null>(null);
  const [draftValue, setDraftValue] = useState("");

  const conversations = useAgentStore((s) => s.conversations);
  const messages = useAgentStore((s) => s.messages);
  const deleteConversation = useAgentStore((s) => s.deleteConversation);
  const clearAll = useAgentStore((s) => s.clearAll);

  // Re-sync profile from localStorage each time the sheet opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setProfile(loadProfile());
      }
      onOpenChange(isOpen);
    },
    [onOpenChange]
  );

  const stats = useMemo(() => {
    const totalConversations = conversations.length;
    const totalMessages =
      messages.length +
      conversations.reduce((acc, conv) => acc + conv.messages.length, 0);
    return { totalConversations, totalMessages };
  }, [conversations, messages]);

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

  const handleClearAllData = useCallback(() => {
    for (const conv of conversations) {
      deleteConversation(conv.id);
    }
    clearAll();
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem("tamanna_settings");
    setProfile(DEFAULT_PROFILE);
    handleOpenChange(false);
    toast({
      title: "All data cleared",
      description: "Your profile, settings, and conversations have been removed.",
    });
  }, [conversations, deleteConversation, clearAll, handleOpenChange]);

  const initials = getInitials(profile.name);

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

          {/* ── Conversation Stats ────────────────────────── */}
          <section>
            <Label className="text-sm font-medium text-lumina-on-surface flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-lumina-primary" />
              Conversation Stats
            </Label>
            <div className="grid grid-cols-2 gap-3">
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
