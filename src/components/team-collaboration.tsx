'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Plus,
  UserPlus,
  Copy,
  Check,
  MessageSquare,
  Globe,
  Shield,
  Eye,
  Trash2,
  ChevronRight,
  Loader2,
  ArrowRight,
  Crown,
  User as UserIcon,
  Send,
  Hash,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

interface TeamWorkspace {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  accessCode: string | null;
  isPublic: boolean;
  maxMembers: number;
  memberCount: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  members?: TeamMember[];
  sharedSessions?: SharedSession[];
}

interface TeamMember {
  id: string;
  userId: string;
  displayName: string;
  role: string;
  avatar: string | null;
  joinedAt: string;
  lastActiveAt: string;
}

interface SharedSession {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdBy: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const AVATAR_COLORS = [
  'bg-lumina-primary/20 text-lumina-primary',
  'bg-emerald-500/20 text-emerald-500',
  'bg-violet-500/20 text-violet-500',
  'bg-amber-500/20 text-amber-500',
  'bg-sky-500/20 text-sky-500',
  'bg-pink-500/20 text-pink-500',
];

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-violet-500' },
  member: { label: 'Member', icon: UserIcon, color: 'text-lumina-primary' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-lumina-on-surface-variant/50' },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function TeamCollaboration() {
  const [workspaces, setWorkspaces] = useState<TeamWorkspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedWorkspace, setExpandedWorkspace] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamWorkspace | null>(null);
  const [sessionDialog, setSessionDialog] = useState<{ workspaceId: string; mode: 'view' | 'create' } | null>(null);

  // Forms
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joining, setJoining] = useState(false);

  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionCreating, setSessionCreating] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(Array.isArray(data.workspaces) ? data.workspaces : Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWorkspaces(); }, [fetchWorkspaces]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
      });
      if (res.ok) {
        toast({ title: 'Workspace created', description: 'Share the access code with your team.' });
        setCreateOpen(false);
        setNewName('');
        setNewDesc('');
        fetchWorkspaces();
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
    finally { setCreating(false); }
  }, [newName, newDesc, fetchWorkspaces]);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim() || !joinName.trim()) {
      toast({ title: 'Fill all fields', variant: 'destructive' });
      return;
    }
    setJoining(true);
    try {
      // Find workspace by code first
      const listRes = await fetch('/api/workspaces');
      if (!listRes.ok) throw new Error('Failed');
      const data = await listRes.json();
      const wsList = data.workspaces || data;
      const ws = wsList.find((w: TeamWorkspace) => w.accessCode === joinCode.trim().toUpperCase());
      if (!ws) {
        toast({ title: 'Invalid code', description: 'No workspace found with this code.', variant: 'destructive' });
        setJoining(false);
        return;
      }
      const res = await fetch(`/api/workspaces/${ws.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: joinCode.trim().toUpperCase(), userId: `user_${Date.now()}`, displayName: joinName.trim() }),
      });
      if (res.ok) {
        toast({ title: 'Joined!', description: `You joined "${ws.name}"` });
        setJoinOpen(false);
        setJoinCode('');
        setJoinName('');
        fetchWorkspaces();
      } else {
        const err = await res.json();
        toast({ title: 'Failed to join', description: err.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
    finally { setJoining(false); }
  }, [joinCode, joinName, fetchWorkspaces]);

  const handleCreateSession = useCallback(async (workspaceId: string) => {
    if (!sessionTitle.trim()) {
      toast({ title: 'Title required', variant: 'destructive' });
      return;
    }
    setSessionCreating(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: sessionTitle.trim(), description: sessionDesc.trim() || null }),
      });
      if (res.ok) {
        toast({ title: 'Session created' });
        setSessionDialog(null);
        setSessionTitle('');
        setSessionDesc('');
        fetchWorkspaces();
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
    finally { setSessionCreating(false); }
  }, [sessionTitle, sessionDesc, fetchWorkspaces]);

  const handleDelete = useCallback(async (ws: TeamWorkspace) => {
    try {
      await fetch(`/api/workspaces/${ws.id}`, { method: 'DELETE' });
      toast({ title: 'Workspace deleted' });
      fetchWorkspaces();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
    setDeleteTarget(null);
  }, [fetchWorkspaces]);

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: 'Code copied!', description: `Access code: ${code}` });
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  // Stats
  const stats = useMemo(() => ({
    workspaces: workspaces.length,
    members: workspaces.reduce((sum, ws) => sum + ws.memberCount, 0),
    sessions: workspaces.reduce((sum, ws) => sum + (ws.sharedSessions?.length || 0), 0),
    messages: workspaces.reduce((sum, ws) => sum + ws.messageCount, 0),
  }), [workspaces]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
              Team Collaboration
            </h2>
            <p className="text-[11px] text-lumina-on-surface-variant/50">
              Shared workspaces for collaborative sessions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setJoinOpen(true)}
            variant="outline"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border-lumina-primary/20 text-lumina-primary hover:bg-lumina-primary/10"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Join
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 text-xs px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Workspaces', value: stats.workspaces, icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Members', value: stats.members, icon: Users, color: 'text-sky-500', bg: 'bg-sky-500/10' },
          { label: 'Sessions', value: stats.sessions, icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-500/10' },
          { label: 'Messages', value: stats.messages, icon: Send, color: 'text-amber-500', bg: 'bg-amber-500/10' },
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

      {/* Workspace List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /></div>
        ) : workspaces.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-emerald-500/40" />
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface/60 mb-2">
              No Workspaces Yet
            </h3>
            <p className="text-sm text-lumina-on-surface-variant/50 max-w-xs leading-relaxed">
              Create a shared workspace to collaborate with your team on agent sessions.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-lumina-on-surface-variant/40">
              <ArrowRight className="w-3 h-3" />
              <span>Share the access code to invite team members</span>
            </div>
          </motion.div>
        ) : (
          workspaces.map((ws, i) => {
            const isExpanded = expandedWorkspace === ws.id;
            return (
              <motion.div
                key={ws.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card rounded-2xl border border-white/10 overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedWorkspace(isExpanded ? null : ws.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-lumina-primary/[0.02] transition-colors"
                >
                  {/* Members avatars */}
                  <div className="flex -space-x-2 shrink-0">
                    {(ws.members || []).slice(0, 3).map((member, mi) => (
                      <div key={member.id} className={`w-8 h-8 rounded-full ${getAvatarColor(member.displayName)} flex items-center justify-center text-[10px] font-bold ring-2 ring-lumina-surface`}>
                        {getInitials(member.displayName)}
                      </div>
                    ))}
                    {(ws.memberCount || 0) > 3 && (
                      <div className="w-8 h-8 rounded-full bg-lumina-surface-variant/30 flex items-center justify-center text-[10px] font-medium text-lumina-on-surface-variant/50 ring-2 ring-lumina-surface">
                        +{ws.memberCount - 3}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-[family-name:var(--font-body)] text-sm font-semibold text-lumina-on-surface truncate">{ws.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {ws.accessCode && (
                        <Badge variant="outline" className="text-[9px] border-lumina-primary/20 text-lumina-primary font-mono">
                          <Hash className="w-2.5 h-2.5 mr-0.5" />
                          {ws.accessCode}
                        </Badge>
                      )}
                      <span className="text-[10px] text-lumina-on-surface-variant/40">
                        {ws.sharedSessions?.length || 0} sessions • {ws.memberCount} members
                      </span>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 text-lumina-on-surface-variant/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
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
                        {ws.description && (
                          <p className="text-xs text-lumina-on-surface-variant/60">{ws.description}</p>
                        )}

                        {/* Access code share */}
                        {ws.accessCode && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-lumina-primary/5 border border-lumina-primary/10">
                            <span className="text-[10px] text-lumina-primary/70 font-medium">Access Code:</span>
                            <code className="flex-1 text-sm font-mono font-bold text-lumina-primary tracking-wider">{ws.accessCode}</code>
                            <button
                              onClick={() => copyCode(ws.accessCode!)}
                              className="p-1.5 rounded-lg hover:bg-lumina-primary/10 transition-colors"
                            >
                              {copiedCode === ws.accessCode ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-lumina-primary/70" />
                              )}
                            </button>
                          </div>
                        )}

                        {/* Members */}
                        {ws.members && ws.members.length > 0 && (
                          <div>
                            <p className="text-[11px] font-medium text-lumina-on-surface-variant/60 uppercase tracking-wider mb-2">Members</p>
                            <div className="space-y-1.5">
                              {ws.members.map((member) => {
                                const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member;
                                return (
                                  <div key={member.id} className="flex items-center gap-2.5 text-xs">
                                    <div className={`w-7 h-7 rounded-full ${getAvatarColor(member.displayName)} flex items-center justify-center text-[9px] font-bold shrink-0`}>
                                      {getInitials(member.displayName)}
                                    </div>
                                    <span className="flex-1 text-lumina-on-surface/80 truncate">{member.displayName}</span>
                                    <span className={`flex items-center gap-0.5 text-[10px] ${roleConfig.color}`}>
                                      <roleConfig.icon className="w-3 h-3" />
                                      {roleConfig.label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Sessions */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-medium text-lumina-on-surface-variant/60 uppercase tracking-wider">Sessions</p>
                            <button
                              onClick={() => setSessionDialog({ workspaceId: ws.id, mode: 'create' })}
                              className="flex items-center gap-1 text-[10px] text-lumina-primary hover:text-lumina-primary/80"
                            >
                              <Plus className="w-3 h-3" /> New Session
                            </button>
                          </div>
                          {ws.sharedSessions && ws.sharedSessions.length > 0 ? (
                            <div className="space-y-1.5">
                              {ws.sharedSessions.map((session) => (
                                <div key={session.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-lumina-surface-variant/10 border border-white/5">
                                  <MessageSquare className="w-4 h-4 text-lumina-on-surface-variant/40 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-lumina-on-surface truncate">{session.title}</p>
                                    <div className="flex items-center gap-2 text-[10px] text-lumina-on-surface-variant/40">
                                      <span>{session.status}</span>
                                      <span>by {session.createdBy}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="glass-card rounded-lg p-4 text-center">
                              <MessageSquare className="w-6 h-6 text-lumina-on-surface-variant/20 mx-auto mb-1" />
                              <p className="text-[11px] text-lumina-on-surface-variant/40">No sessions yet</p>
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => setDeleteTarget(ws)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] text-red-400/60 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3 h-3" /> Delete Workspace
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-card border-white/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-500 font-[family-name:var(--font-display)]">
              <Users className="w-5 h-5" />
              New Workspace
            </DialogTitle>
            <DialogDescription className="text-lumina-on-surface-variant">
              Create a shared workspace for your team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Workspace Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Frontend Team" className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Description</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What is this workspace for?" rows={2} className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm resize-none" />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 text-sm font-medium">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {creating ? 'Creating...' : 'Create Workspace'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="glass-card border-white/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lumina-primary font-[family-name:var(--font-display)]">
              <UserPlus className="w-5 h-5" />
              Join Workspace
            </DialogTitle>
            <DialogDescription className="text-lumina-on-surface-variant">
              Enter the access code shared by a team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Access Code *</Label>
              <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="e.g. FRNTSQ" className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm font-mono uppercase tracking-wider" maxLength={8} />
            </div>
            <div>
              <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Your Display Name *</Label>
              <Input value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="e.g. Alex" className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm" />
            </div>
            <Button onClick={handleJoin} disabled={joining || !joinCode.trim() || !joinName.trim()} className="w-full bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 text-sm font-medium">
              {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              {joining ? 'Joining...' : 'Join Workspace'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Session Create Dialog */}
      <Dialog open={!!sessionDialog && sessionDialog.mode === 'create'} onOpenChange={() => setSessionDialog(null)}>
        <DialogContent className="glass-card border-white/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-500 font-[family-name:var(--font-display)]">
              <MessageSquare className="w-5 h-5" />
              New Session
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Session Title *</Label>
              <Input value={sessionTitle} onChange={(e) => setSessionTitle(e.target.value)} placeholder="e.g. Sprint Planning" className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm" />
            </div>
            <div>
              <Label className="text-xs text-lumina-on-surface-variant mb-1 block">Description</Label>
              <Textarea value={sessionDesc} onChange={(e) => setSessionDesc(e.target.value)} placeholder="What's this session about?" rows={2} className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-sm resize-none" />
            </div>
            {sessionDialog && (
              <Button
                onClick={() => handleCreateSession(sessionDialog.workspaceId)}
                disabled={sessionCreating || !sessionTitle.trim()}
                className="w-full bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 text-sm font-medium"
              >
                {sessionCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Session
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="glass-card border-white/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>All sessions and data will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-[family-name:var(--font-body)]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-destructive text-white hover:bg-destructive/90 font-[family-name:var(--font-body)]">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
