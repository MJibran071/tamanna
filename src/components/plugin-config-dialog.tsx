'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Plug,
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
import { toast } from '@/hooks/use-toast';
import type { PluginDefinition } from '@/lib/plugin-definitions';
import type { ConfigField, PluginConfigSchema } from '@/lib/plugin-config-schemas';

interface PluginConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plugin: PluginDefinition & { dbId: string | null; status: string };
  savedConfig: Record<string, unknown>;
  onSave: (config: Record<string, unknown>, test?: boolean) => void;
}

interface TestResult {
  success: boolean;
  message: string;
  latencyMs: number;
  details?: Record<string, unknown>;
}

export default function PluginConfigDialog({
  open,
  onOpenChange,
  plugin,
  savedConfig,
  onSave,
}: PluginConfigDialogProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [schema, setSchema] = useState<PluginConfigSchema | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [loadingSchema, setLoadingSchema] = useState(false);

  // Load schema from our local definitions
  useEffect(() => {
    if (!open) return;
    async function loadSchema() {
      setLoadingSchema(true);
      try {
        const res = await fetch(`/api/connectors/${plugin.type}`);
        if (res.ok) {
          const data = await res.json();
          setSchema(data.schema || null);
          // Merge saved config
          const currentConfig = data.plugin?.config || savedConfig || {};
          setConfig(currentConfig);
        } else {
          // Fallback: try the test endpoint to get schema info
          setConfig(savedConfig || {});
        }
      } catch {
        setConfig(savedConfig || {});
      } finally {
        setLoadingSchema(false);
      }
    }
    loadSchema();
    setTestResult(null);
  }, [open, plugin.type, savedConfig]);

  const updateConfig = useCallback((key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const togglePassword = useCallback((key: string) => {
    setShowPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/plugins/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: plugin.type,
          category: plugin.category,
          config,
        }),
      });
      const result = await res.json();
      setTestResult(result);
      if (result.success) {
        toast({ title: 'Test passed', description: result.message });
      } else {
        toast({ title: 'Test failed', description: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Test error', description: 'Failed to reach test endpoint', variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  }, [plugin.type, plugin.category, config]);

  const handleSave = useCallback(async (andTest = false) => {
    setSaving(true);
    try {
      // Use the connectors API for connectors, plugins API for skills/data sources
      const endpoint = plugin.category === 'connector'
        ? `/api/connectors/${plugin.type}`
        : '/api/plugins';

      const body = plugin.category === 'connector'
        ? { config, test: andTest, name: plugin.name, description: plugin.description }
        : {
            name: plugin.name,
            description: plugin.description,
            category: plugin.category,
            type: plugin.type,
            status: plugin.status === 'connected' ? 'connected' : 'connected',
            config,
          };

      const res = await fetch(endpoint, {
        method: plugin.category === 'connector' ? 'POST' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok || res.status === 201) {
        const data = await res.json();
        toast({
          title: 'Configuration saved',
          description: andTest ? (data.testResult?.success ? 'Connected!' : 'Saved but test failed') : `${plugin.name} configured`,
        });
        if (data.testResult) {
          setTestResult(data.testResult);
        }
        onSave(config, andTest);
      } else {
        const err = await res.json();
        toast({ title: 'Save failed', description: err.error || 'Unknown error', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save configuration', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }, [plugin, config, onSave]);

  const fields = schema?.fields || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-lumina-outline-variant/40 sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-display)] text-lumina-on-surface flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plugin.bgColor}`}>
              <plugin.icon className={`w-4 h-4 ${plugin.color}`} />
            </div>
            {plugin.name}
          </DialogTitle>
          <DialogDescription className="text-lumina-on-surface-variant font-[family-name:var(--font-body)]">
            Configure and test {plugin.name} ({plugin.category.replace('_', ' ')})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-4 font-[family-name:var(--font-body)]">
          {loadingSchema ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 text-lumina-primary animate-spin" />
            </div>
          ) : fields.length === 0 ? (
            <div className="text-center py-6 text-sm text-lumina-on-surface-variant/50">
              <Plug className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>This plugin has no configurable options.</p>
              <p className="text-xs mt-1">Enable/disable it using the toggle in the main list.</p>
            </div>
          ) : (
            fields.map((field) => (
              <ConfigFieldRenderer
                key={field.key}
                field={field}
                value={config[field.key]}
                onChange={(val) => updateConfig(field.key, val)}
                showPassword={showPasswords.has(field.key)}
                onTogglePassword={() => togglePassword(field.key)}
              />
            ))
          )}

          {/* Test Result */}
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
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
                {testResult.success ? 'Test Passed' : 'Test Failed'}
                <span className="ml-auto text-xs opacity-60">{testResult.latencyMs}ms</span>
              </div>
              <p className="text-xs mt-1 opacity-80">{testResult.message}</p>
            </motion.div>
          )}

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
              Save Config
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

          {/* Separate test button if already configured */}
          {fields.length > 0 && (
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
              Test Only (without saving)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Config Field Renderer ────────────────────────────────────────────────

function ConfigFieldRenderer({
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
          rows={field.key === 'feedUrls' || field.key === 'headers' || field.key === 'watchedRepos' || field.key === 'supportedTypes' || field.key === 'supportedFormats' || field.key === 'allowedChatIds' || field.key === 'allowedChannels' || field.key === 'allowedGuilds' ? 3 : 2}
          className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm resize-none"
        />
        {field.helpText && (
          <p className="text-[10px] text-lumina-on-surface-variant/40 mt-1">{field.helpText}</p>
        )}
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div>
        <Label className="text-xs font-medium text-lumina-on-surface-variant mb-1.5 block">
          {field.label} {field.required && <span className="text-red-400">*</span>}
        </Label>
        <Input
          type="number"
          placeholder={field.placeholder}
          value={strValue}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          className="bg-lumina-surface-variant/20 border-lumina-outline-variant/40 text-lumina-on-surface text-sm"
        />
        {field.helpText && (
          <p className="text-[10px] text-lumina-on-surface-variant/40 mt-1">{field.helpText}</p>
        )}
      </div>
    );
  }

  // text, url, password, oauth
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
            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {field.helpText && (
        <p className="text-[10px] text-lumina-on-surface-variant/40 mt-1">{field.helpText}</p>
      )}
    </div>
  );
}
