'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plug,
  RefreshCw,
  Plus,
  MessageSquare,
  Send,
  Globe,
  Mail,
  Unplug,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Hash,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
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

interface Service {
  id: string;
  serviceType: string;
  displayName: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastActivity?: string;
  messageCount: number;
  capabilities: string[];
}

// ─── Config ──────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'email', label: 'Email' },
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'instagram', label: 'Instagram' },
];

const SERVICE_ICONS: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  whatsapp: { icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-500/10' },
  telegram: { icon: Send, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  email: { icon: Mail, color: 'text-red-500', bg: 'bg-red-500/10' },
  discord: { icon: MessageSquare, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  slack: { icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  twitter: { icon: Globe, color: 'text-sky-400', bg: 'bg-sky-400/10' },
  instagram: { icon: Globe, color: 'text-pink-500', bg: 'bg-pink-500/10' },
};

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; label: string; dotColor: string }> = {
  connected: { icon: Wifi, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: 'Connected', dotColor: 'bg-emerald-500' },
  disconnected: { icon: WifiOff, color: 'text-gray-400', bg: 'bg-gray-400/10', label: 'Disconnected', dotColor: 'bg-gray-400' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Error', dotColor: 'bg-red-500' },
  pending: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', label: 'Pending', dotColor: 'bg-amber-500' },
};

const CAPABILITY_LABELS: Record<string, string> = {
  send_message: 'Send Messages',
  read_messages: 'Read Messages',
  send_files: 'Send Files',
  receive_files: 'Receive Files',
  webhooks: 'Webhooks',
  automation: 'Automation',
  notifications: 'Notifications',
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

export default function ConnectedServicesPanel() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newServiceType, setNewServiceType] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [connecting, setConnecting] = useState(false);

  // ── Fetch ───────────────────────────────────────────────────────────

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/services');
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data.services) ? data.services : Array.isArray(data) ? data : [];
        setServices(items);
      }
    } catch {
      toast({ title: 'Failed to load services', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleAddService = useCallback(async () => {
    if (!newServiceType || !newDisplayName.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceType: newServiceType, displayName: newDisplayName.trim() }),
      });
      if (res.ok) {
        toast({ title: 'Service added', description: `${newDisplayName} is being connected.` });
        setDialogOpen(false);
        setNewServiceType('');
        setNewDisplayName('');
        fetchServices();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Failed to add', description: err.error || 'Could not connect service', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  }, [newServiceType, newDisplayName, fetchServices]);

  const handleToggleConnection = useCallback(async (service: Service) => {
    try {
      const res = await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: service.status === 'connected' ? 'disconnected' : 'connected',
        }),
      });
      if (res.ok) {
        toast({
          title: service.status === 'connected' ? 'Disconnected' : 'Connected',
          description: `${service.displayName} ${service.status === 'connected' ? 'disconnected' : 'reconnected'}.`,
        });
        fetchServices();
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  }, [fetchServices]);

  // ── Stats ────────────────────────────────────────────────────────────

  const connectedCount = services.filter(s => s.status === 'connected').length;

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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Plug className="w-4 h-4 text-emerald-500" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
              Connected Services
            </h2>
          </div>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-1 ml-[42px]">
            {connectedCount} of {services.length} connected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchServices}
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

      {/* ── Service Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="col-span-full space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="col-span-full glass-card rounded-2xl p-10 flex flex-col items-center justify-center text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 flex items-center justify-center mb-4">
              <Plug className="w-8 h-8 text-emerald-500/40" />
            </div>
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
              No services yet
            </p>
            <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-2 max-w-[260px]">
              Connect your services to let Tamanna act on your behalf
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              className="glass-pill rounded-full px-4 py-2 text-sm font-medium text-lumina-primary flex items-center gap-2 hover:bg-lumina-primary/15 transition-all mt-5"
            >
              <Plus className="w-4 h-4" />
              Add Service
            </button>
          </motion.div>
        ) : (
          services.map((service, i) => {
            const iconConfig = SERVICE_ICONS[service.serviceType] || SERVICE_ICONS.email;
            const statusConfig = STATUS_CONFIG[service.status] || STATUS_CONFIG.disconnected;

            return (
              <motion.div
                key={service.id}
                custom={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="glass-card rounded-xl border border-white/10 overflow-hidden group relative"
              >
                {/* Status dot */}
                <div className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ${statusConfig.dotColor}`} />

                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl ${iconConfig.bg} flex items-center justify-center`}>
                      <iconConfig.icon className={`w-5 h-5 ${iconConfig.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-lumina-on-surface truncate">{service.displayName}</h3>
                      <span className={`text-[10px] font-medium ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Capabilities */}
                  {(() => {
                    const caps = Array.isArray(service.capabilities) ? service.capabilities : (typeof service.capabilities === 'string' ? service.capabilities.split(',').map(s => s.trim()).filter(Boolean) : []);
                    return caps.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {caps.slice(0, 3).map((cap, ci) => (
                          <span
                            key={ci}
                            className="text-[9px] px-1.5 py-0.5 rounded-full bg-lumina-surface-variant/20 text-lumina-on-surface-variant/50"
                          >
                            {CAPABILITY_LABELS[cap] || cap}
                          </span>
                        ))}
                        {caps.length > 3 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-lumina-surface-variant/20 text-lumina-on-surface-variant/30">
                            +{caps.length - 3}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Stats */}
                  <div className="flex items-center justify-between text-[10px] text-lumina-on-surface-variant/40 mb-3">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {service.messageCount} messages
                    </span>
                    <span>{formatTime(service.lastActivity)}</span>
                  </div>

                  {/* Connect/Disconnect button */}
                  <button
                    onClick={() => handleToggleConnection(service)}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      service.status === 'connected'
                        ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20'
                    }`}
                  >
                    {service.status === 'connected' ? (
                      <>
                        <Unplug className="w-3 h-3" />
                        Disconnect
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Connect
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Add Service Dialog ────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)]">Add New Service</DialogTitle>
            <DialogDescription className="font-[family-name:var(--font-body)]">
              Connect a new service so Tamanna can act on your behalf.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Service Type</Label>
              <Select value={newServiceType} onValueChange={setNewServiceType}>
                <SelectTrigger className="font-[family-name:var(--font-body)]">
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        {(() => {
                          const ic = SERVICE_ICONS[type.value];
                          if (ic) {
                            const Icon = ic.icon;
                            return <Icon className={`w-4 h-4 ${ic.color}`} />;
                          }
                          return null;
                        })()}
                        {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-[family-name:var(--font-body)] text-sm">Display Name</Label>
              <Input
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="e.g., My WhatsApp, Work Email..."
                className="font-[family-name:var(--font-body)]"
              />
            </div>

            <Button
              onClick={handleAddService}
              disabled={!newServiceType || !newDisplayName.trim() || connecting}
              className="w-full font-[family-name:var(--font-body)]"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plug className="w-4 h-4 mr-2" />
                  Connect Service
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
