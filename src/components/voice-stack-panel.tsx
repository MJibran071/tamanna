'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Volume2,
  Mic,
  Cpu,
  Zap,
  Crown,
  Globe,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Settings2,
  ChevronRight,
  Gauge,
  Star,
  Shield,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface EngineInfo {
  id: string;
  name: string;
  model_id: string;
  size_mb: number;
  languages: string[];
  speed_tier: string;
  quality_tier: string;
  is_loaded: boolean;
  load_time_ms: number;
  last_used: string | null;
}

interface VoiceStackStatus {
  loaded_engine: string | null;
  engines: Record<string, EngineInfo>;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', ur: 'Urdu', hi: 'Hindi', ar: 'Arabic', zh: 'Chinese',
  ja: 'Japanese', ko: 'Korean', ru: 'Russian', es: 'Spanish', fr: 'French',
  de: 'German', pt: 'Portuguese', it: 'Italian', nl: 'Dutch', tr: 'Turkish',
  pl: 'Polish', sv: 'Swedish',
};

const SPEED_ICONS: Record<string, React.ElementType> = {
  ultra: Zap, fast: Gauge, normal: Volume2, slow: Crown,
};

const QUALITY_COLORS: Record<string, string> = {
  basic: 'text-gray-400', good: 'text-emerald-400', excellent: 'text-amber-400', premium: 'text-purple-400',
};

export default function VoiceStackPanel() {
  const [status, setStatus] = useState<VoiceStackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [routerPref, setRouterPref] = useState<string>('balanced');
  const [localTTS, setLocalTTS] = useState(true);
  const [selectedEngine, setSelectedEngine] = useState<string>('auto');
  const [isTesting, setIsTesting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/voice/engines');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Load saved settings
  useEffect(() => {
    const settings = JSON.parse(localStorage.getItem('tamanna_voice_settings') || '{}');
    if (settings.routerPref) setRouterPref(settings.routerPref);
    if (settings.localTTS !== undefined) setLocalTTS(settings.localTTS);
    if (settings.selectedEngine) setSelectedEngine(settings.selectedEngine);
  }, []);

  const saveSettings = (updates: Record<string, unknown>) => {
    const current = JSON.parse(localStorage.getItem('tamanna_voice_settings') || '{}');
    const next = { ...current, ...updates };
    localStorage.setItem('tamanna_voice_settings', JSON.stringify(next));
  };

  const handlePrefChange = (value: string) => {
    setRouterPref(value);
    saveSettings({ routerPref: value });
    toast.success(`Voice preference set to ${value}`);
  };

  const handleEngineChange = (value: string) => {
    setSelectedEngine(value);
    saveSettings({ selectedEngine: value });
    toast.success(value === 'auto' ? 'Auto engine selection enabled' : `Engine set to ${value}`);
  };

  const handleLocalToggle = (checked: boolean) => {
    setLocalTTS(checked);
    saveSettings({ localTTS: checked });
    toast.success(checked ? 'Local TTS enabled — zero latency!' : 'Switched to cloud TTS');
  };

  const handleTestVoice = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Hello! I am Tamanna, your local AI voice assistant.',
          engine: selectedEngine === 'auto' ? undefined : selectedEngine,
          speed: 1.0,
        }),
      });
      if (res.ok) {
        const engine = res.headers.get('X-Engine') || 'unknown';
        const latency = res.headers.get('X-Latency-Ms') || '?';
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play();
        toast.success(`🎵 Played via ${engine} in ${latency}ms`);
      } else {
        toast.error('Voice test failed — service may be offline');
      }
    } catch {
      toast.error('Voice stack not reachable');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 font-[family-name:var(--font-body)]">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Volume2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-lumina-on-surface font-[family-name:var(--font-display)]">Local Voice Stack</h3>
              <p className="text-xs text-lumina-on-surface-variant/60">7 TTS Engines • Whisper STT • Smart Router</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-lumina-on-surface-variant/60">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Status Banner */}
        <div className="mt-4 p-3 rounded-xl bg-lumina-primary/5 border border-lumina-primary/10">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div className="text-xs text-lumina-on-surface-variant/70">
              <span className="font-medium text-emerald-400">100% Local</span> — Zero API keys, zero cloud calls, zero cost.
              Every model runs on your hardware. Your voice never leaves this machine.
            </div>
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Router Preference */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-lumina-on-surface-variant/60 uppercase tracking-wider mb-2 block">
              Smart Router
            </label>
            <Select value={routerPref} onValueChange={handlePrefChange}>
              <SelectTrigger className="bg-lumina-surface-container/50 border-lumina-primary/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanced">
                  <span className="flex items-center gap-2"><Volume2 className="w-3 h-3" /> Balanced</span>
                </SelectItem>
                <SelectItem value="speed">
                  <span className="flex items-center gap-2"><Zap className="w-3 h-3" /> Speed First</span>
                </SelectItem>
                <SelectItem value="quality">
                  <span className="flex items-center gap-2"><Star className="w-3 h-3" /> Quality First</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Engine Selection */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <label className="text-xs font-medium text-lumina-on-surface-variant/60 uppercase tracking-wider mb-2 block">
              TTS Engine
            </label>
            <Select value={selectedEngine} onValueChange={handleEngineChange}>
              <SelectTrigger className="bg-lumina-surface-container/50 border-lumina-primary/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">🧠 Auto (Smart)</SelectItem>
                <SelectItem value="kokoro">⚡ Kokoro (82MB)</SelectItem>
                <SelectItem value="luxtts">🚀 LuxTTS (300MB)</SelectItem>
                <SelectItem value="qwen_tts_0.6b">🌍 Qwen 0.6B (1.2GB)</SelectItem>
                <SelectItem value="chatterbox_turbo">✨ Chatterbox Turbo (1.5GB)</SelectItem>
                <SelectItem value="qwen_tts_1.7b">👑 Qwen 1.7B (3.5GB)</SelectItem>
                <SelectItem value="chatterbox_ml">🌐 Chatterbox ML (3.2GB)</SelectItem>
                <SelectItem value="tada">💎 TADA (4GB)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Toggle + Test */}
        <Card className="glass-card border-0">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-lumina-on-surface-variant/60 uppercase tracking-wider">
                Local TTS
              </label>
              <Switch checked={localTTS} onCheckedChange={handleLocalToggle} />
            </div>
            <Button
              onClick={handleTestVoice}
              disabled={!isOnline || isTesting}
              size="sm"
              className="w-full bg-lumina-primary/10 text-lumina-primary hover:bg-lumina-primary/20 transition-all"
            >
              {isTesting ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Mic className="w-3 h-3 mr-1" />
              )}
              Test Voice
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Engine Grid */}
      <Card className="glass-card border-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-[family-name:var(--font-display)]">
              Available Engines
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchStatus} className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 rounded-xl bg-lumina-surface-container/50" />
              ))}
            </div>
          ) : status?.engines ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(status.engines).map(([id, engine]) => {
                const SpeedIcon = SPEED_ICONS[engine.speed_tier] || Volume2;
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className={`relative p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] ${
                      status.loaded_engine === id
                        ? 'bg-lumina-primary/5 border-lumina-primary/30'
                        : 'bg-lumina-surface-container/30 border-lumina-primary/5 hover:border-lumina-primary/15'
                    }`}
                    onClick={() => handleEngineChange(id)}
                  >
                    {/* Loaded indicator */}
                    {status.loaded_engine === id && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-lumina-primary/10 flex items-center justify-center shrink-0">
                        <Cpu className="w-4 h-4 text-lumina-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-lumina-on-surface truncate">{engine.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {engine.size_mb}MB
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${QUALITY_COLORS[engine.quality_tier]}`}>
                            {engine.quality_tier}
                          </Badge>
                          <span className="text-[10px] text-lumina-on-surface-variant/40 flex items-center gap-0.5">
                            <SpeedIcon className="w-3 h-3" /> {engine.speed_tier}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {engine.languages.slice(0, 5).map((lang) => (
                            <span key={lang} className="text-[10px] px-1.5 py-0.5 rounded bg-lumina-surface-variant/50 text-lumina-on-surface-variant/60">
                              {LANGUAGE_NAMES[lang] || lang}
                            </span>
                          ))}
                          {engine.languages.length > 5 && (
                            <span className="text-[10px] text-lumina-on-surface-variant/40">
                              +{engine.languages.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-lumina-on-surface-variant/50">
              <Volume2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Voice stack is offline</p>
              <p className="text-xs mt-1">Start the Python mini-service to enable local TTS</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="glass-card border-0">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-lumina-primary" />
            <h4 className="text-sm font-semibold text-lumina-on-surface">How Smart Routing Works</h4>
          </div>
          <div className="space-y-2 text-xs text-lumina-on-surface-variant/70">
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 text-lumina-primary shrink-0" />
              <span><strong>English text</strong> → Auto-selects <strong>Kokoro</strong> (82MB, fastest)</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 text-lumina-primary shrink-0" />
              <span><strong>Urdu/Hindi/Arabic</strong> → Auto-selects <strong>Qwen TTS 0.6B</strong> (multilingual)</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 text-lumina-primary shrink-0" />
              <span><strong>Speed priority</strong> → Picks fastest engine regardless of language</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 text-lumina-primary shrink-0" />
              <span><strong>Quality priority</strong> → Picks highest quality engine for the language</span>
            </div>
            <div className="flex items-start gap-2">
              <ChevronRight className="w-3 h-3 mt-0.5 text-lumina-primary shrink-0" />
              <span><strong>Hot-swap</strong> → Only one model in memory at a time, auto-unloads unused</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
