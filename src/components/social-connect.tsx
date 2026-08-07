'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import {
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ConfigField, PluginConfigSchema } from '@/lib/plugin-config-schemas';

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  connectLabel: string;
  hoverColor: string;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  {
    id: 'telegram',
    name: 'Telegram',
    icon: TelegramIcon,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    connectLabel: 'Telegram',
    hoverColor: 'hover:bg-sky-500/20',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: InstagramIcon,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    connectLabel: 'Instagram',
    hoverColor: 'hover:bg-pink-500/20',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: WhatsAppIcon,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    connectLabel: 'WhatsApp',
    hoverColor: 'hover:bg-emerald-500/20',
  },
  {
    id: 'x_twitter',
    name: 'X',
    icon: XTwitterIcon,
    color: 'text-gray-800 dark:text-white',
    bgColor: 'bg-gray-500/10',
    connectLabel: 'X',
    hoverColor: 'hover:bg-gray-500/20',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: DiscordIcon,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    connectLabel: 'Discord',
    hoverColor: 'hover:bg-indigo-500/20',
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: SlackIcon,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    connectLabel: 'Slack',
    hoverColor: 'hover:bg-violet-500/20',
  },
];

interface ConnectorData {
  id: string;
  status: string;
  config: Record<string, unknown>;
  lastSyncAt: string | null;
}

export default function SocialConnect() {
  const [connectorMap, setConnectorMap] = useState<Map<string, ConnectorData>>(new Map());
  const [connecting, setConnecting] = useState<string | null>(null);
  const [configPlatform, setConfigPlatform] = useState<SocialPlatform | null>(null);
  const [configSchema, setConfigSchema] = useState<PluginConfigSchema | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number; details?: Record<string, unknown> } | null>(null);

  // Load connector statuses from backend
  const loadConnectors = useCallback(async () => {
    try {
      const res = await fetch('/api/plugins?category=connector');
      if (res.ok) {
        const plugins = await res.json();
        const list = Array.isArray(plugins) ? plugins : [];
        const map = new Map<string, ConnectorData>();
        for (const p of list) {
          map.set(p.type, {
            id: p.id,
            status: p.status,
            config: p.config || {},
            lastSyncAt: p.lastSyncAt || null,
          });
        }
        setConnectorMap(map);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    loadConnectors();
  }, [loadConnectors]);

  // Open config dialog for a platform
  const openConfig = useCallback(async (platform: SocialPlatform) => {
    setConfigPlatform(platform);
    setLoadingConfig(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/connectors/${platform.id}`);
      if (res.ok) {
        const data = await res.json();
        setConfigSchema(data.schema || null);
        setConfigValues(data.plugin?.config || {});
      } else {
        // Load schema locally
        setConfigValues(connectorMap.get(platform.id)?.config || {});
        setConfigSchema(null);
      }
    } catch {
      setConfigValues(connectorMap.get(platform.id)?.config || {});
      setConfigSchema(null);
    } finally {
      setLoadingConfig(false);
    }
  }, [connectorMap]);

  // Update a config field
  const updateConfig = useCallback((key: string, value: unknown) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const togglePassword = useCallback((key: string) => {
    setShowPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Save connector config
  const handleSave = useCallback(async (andTest = false) => {
    if (!configPlatform) return;
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/connectors/${configPlatform.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: configValues,
          test: andTest,
          name: configPlatform.name,
        }),
      });
      if (res.ok || res.status === 201) {
        const data = await res.json();
        if (data.testResult) {
          setTestResult(data.testResult);
        }
        toast({
          title: andTest && data.testResult?.success
            ? `Connected to ${configPlatform.name}!`
            : `${configPlatform.name} configured`,
          description: data.testResult?.message || 'Configuration saved',
        });
        loadConnectors();
      } else {
        const err = await res.json();
        toast({ title: 'Save failed', description: err.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save configuration', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [configPlatform, configValues, loadConnectors]);

  // Disconnect a connector
  const handleDisconnect = useCallback(async (platform: SocialPlatform) => {
    setConnecting(platform.id);
    try {
      await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: platform.name,
          description: `${platform.name} connector for Tamanna`,
          category: 'connector',
          type: platform.id,
          status: 'disconnected',
        }),
      });
      setConnectorMap((prev) => {
        const next = new Map(prev);
        const existing = next.get(platform.id);
        if (existing) {
          next.set(platform.id, { ...existing, status: 'disconnected' });
        }
        return next;
      });
      toast({ title: `Disconnected from ${platform.name}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to disconnect', variant: 'destructive' });
    } finally {
      setConnecting(null);
    }
  }, []);

  // Test connector
  const handleTest = useCallback(async () => {
    if (!configPlatform) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/plugins/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: configPlatform.id,
          category: 'connector',
          config: configValues,
        }),
      });
      const result = await res.json();
      setTestResult(result);
      toast({
        title: result.success ? 'Test passed' : 'Test failed',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch {
      toast({ title: 'Test error', description: 'Failed to test connector', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  }, [configPlatform, configValues]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className="w-full"
      >
        <div className="glass-card rounded-2xl p-3">
          <p className="text-[10px] text-lumina-on-surface-variant/40 uppercase tracking-widest font-medium mb-2 px-1">
            Connect
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {SOCIAL_PLATFORMS.map((platform) => {
              const connector = connectorMap.get(platform.id);
              const isConnected = connector?.status === 'connected';
              const isConnecting = connecting === platform.id;
              const Icon = platform.icon;

              return (
                <motion.button
                  key={platform.id}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => {
                    if (isConnected) {
                      handleDisconnect(platform);
                    } else {
                      openConfig(platform);
                    }
                  }}
                  className={`group relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 cursor-pointer ${
                    isConnected
                      ? `${platform.bgColor} ring-1 ring-lumina-primary/20`
                      : `${platform.bgColor} ${platform.hoverColor}`
                  }`}
                  aria-label={isConnected ? `Disconnect ${platform.name}` : `Configure ${platform.name}`}
                  title={isConnected ? `Connected to ${platform.name} — click to disconnect` : `Configure ${platform.name}`}
                >
                  {isConnecting ? (
                    <div className="w-4 h-4 border-2 border-lumina-primary/30 border-t-lumina-primary rounded-full animate-spin" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isConnected ? platform.color : platform.color}/70 group-hover:${platform.color}`} />
                  )}

                  {/* Connected dot indicator */}
                  {isConnected && (
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ─── Connector Config Dialog ─────────────────────────────────── */}
      <Dialog open={!!configPlatform} onOpenChange={(open) => { if (!open) { setConfigPlatform(null); setTestResult(null); } }}>
        <DialogContent className="glass-card border-lumina-outline-variant/40 sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-[family-name:var(--font-display)] text-lumina-on-surface flex items-center gap-2">
              {configPlatform && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${configPlatform.bgColor}`}>
                  <configPlatform.icon className={`w-4 h-4 ${configPlatform.color}`} />
                </div>
              )}
              {configPlatform?.name || 'Configure'}
            </DialogTitle>
            <DialogDescription className="text-lumina-on-surface-variant font-[family-name:var(--font-body)]">
              Set up your {configPlatform?.name} connection credentials
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-4 font-[family-name:var(--font-body)]">
            {loadingConfig ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-lumina-primary animate-spin" />
              </div>
            ) : configSchema && configSchema.fields.length > 0 ? (
              configSchema.fields.map((field) => (
                <SocialConfigField
                  key={field.key}
                  field={field}
                  value={configValues[field.key]}
                  onChange={(val) => updateConfig(field.key, val)}
                  showPassword={showPasswords.has(field.key)}
                  onTogglePassword={() => togglePassword(field.key)}
                />
              ))
            ) : (
              <div className="text-center py-6 text-sm text-lumina-on-surface-variant/50">
                <p>Connect your {configPlatform?.name} account by filling in the details below.</p>
                <p className="text-xs mt-1">Your credentials are stored securely.</p>
              </div>
            )}

            {/* Test Result */}
            <AnimatePresence>
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-3 rounded-xl border text-sm ${
                    testResult.success
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    {testResult.success ? 'Connected!' : 'Connection Failed'}
                    <span className="ml-auto text-xs opacity-60">{testResult.latencyMs}ms</span>
                  </div>
                  <p className="text-xs mt-1 opacity-80">{testResult.message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-2">
              <Button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="flex-1 bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 gap-1.5 text-sm"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Save
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving || testing}
                variant="outline"
                className="flex-1 border-lumina-primary/30 text-lumina-primary hover:bg-lumina-primary/10 gap-1.5 text-sm"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ExternalLink className="w-4 h-4" />
                )}
                Save & Test
              </Button>
            </div>

            <Button
              onClick={handleTest}
              disabled={testing}
              variant="ghost"
              size="sm"
              className="w-full text-lumina-on-surface-variant hover:text-lumina-primary hover:bg-lumina-primary/5 gap-1.5 text-xs"
            >
              {testing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Test Connection Only
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Social Config Field Renderer ────────────────────────────────────────

function SocialConfigField({
  field,
  value,
  onChange,
  showPassword,
  onTogglePassword,
}: {
  field: ConfigField;
  value: unknown;
  onChange: (value: unknown) => void;
  showPassword: boolean;
  onTogglePassword: () => void;
}) {
  const strValue = value !== undefined && value !== null ? String(value) : field.defaultValue !== undefined ? String(field.defaultValue) : '';

  if (field.type === 'toggle') {
    const boolValue = value !== undefined ? Boolean(value) : Boolean(field.defaultValue);
    return (
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-lumina-surface-variant/10">
        <div>
          <Label className="text-xs font-medium text-lumina-on-surface">{field.label}</Label>
          {field.helpText && (
            <p className="text-[10px] text-lumina-on-surface-variant/50 mt-0.5">{field.helpText}</p>
          )}
        </div>
        <Switch checked={boolValue} onCheckedChange={onChange} />
      </div>
    );
  }

  if (field.type === 'select' && field.options) {
    return (
      <div>
        <Label className="text-xs font-medium text-lumina-on-surface-variant mb-1.5 block">
          {field.label} {field.required && <span className="text-red-400">*</span>}
        </Label>
        <Select value={strValue} onValueChange={onChange}>
          <SelectTrigger className="w-full bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm">
            <SelectValue placeholder={field.placeholder || 'Select...'} />
          </SelectTrigger>
          <SelectContent className="glass-card border-lumina-outline-variant/40">
            {field.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.helpText && (
          <p className="text-[10px] text-lumina-on-surface-variant/40 mt-1">{field.helpText}</p>
        )}
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <Label className="text-xs font-medium text-lumina-on-surface-variant mb-1.5 block">
          {field.label} {field.required && <span className="text-red-400">*</span>}
        </Label>
        <Textarea
          placeholder={field.placeholder}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm resize-none"
        />
        {field.helpText && (
          <p className="text-[10px] text-lumina-on-surface-variant/40 mt-1">{field.helpText}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Label className="text-xs font-medium text-lumina-on-surface-variant mb-1.5 block">
        {field.label} {field.required && <span className="text-red-400">*</span>}
      </Label>
      <div className="relative">
        <Input
          type={field.type === 'password' ? (showPassword ? 'text' : 'password') : field.type === 'url' ? 'url' : 'text'}
          placeholder={field.placeholder}
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
          className={`bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm pr-9 ${
            field.type === 'password' ? 'font-mono text-xs' : ''
          }`}
        />
        {field.type === 'password' && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-lumina-on-surface-variant/40 hover:text-lumina-primary transition-colors cursor-pointer"
          >
            {showPassword ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
      {field.helpText && (
        <p className="text-[10px] text-lumina-on-surface-variant/40 mt-1">{field.helpText}</p>
      )}
    </div>
  );
}

// ─── SVG Icons for Social Platforms ────────────────────────────────────────

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
}

function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.134 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.177 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.177 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.177 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.51 2.523h-6.313z" />
    </svg>
  );
}
