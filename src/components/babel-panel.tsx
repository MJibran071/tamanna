'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Globe,
  Mic,
  Type,
  ArrowLeftRight,
  Copy,
  Volume2,
  MessagesSquare,
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  Clock,
  RotateCcw,
  Sparkles,
  Play,
  Square,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ── */

interface Language {
  code: string;
  name: string;
  native: string;
  flag: string;
  engine: string;
  ttsReady: boolean;
  rtl?: boolean;
}

type TranslateMode = 'voice' | 'text' | 'conversation';

interface TranslationEntry {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  sourceFlag: string;
  targetFlag: string;
  engineUsed?: string;
  createdAt: string;
}

interface EngineStatus {
  name: string;
  id: string;
  isLoaded: boolean;
  isAvailable: boolean;
  qualityTier: string;
}

/* ── Fallback language data (used when API is unreachable) ── */

const FALLBACK_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', native: 'English', flag: '\u{1F1FA}\u{1F1F8}', engine: 'kokoro', ttsReady: true },
  { code: 'ur', name: 'Urdu', native: '\u0627\u0631\u062F\u0648', flag: '\u{1F1F5}\u{1F1F0}', engine: 'qwen_tts_0.6b', ttsReady: false, rtl: true },
  { code: 'hi', name: 'Hindi', native: '\u0939\u093F\u0928\u094D\u0926\u0940', flag: '\u{1F1EE}\u{1F1F3}', engine: 'qwen_tts_0.6b', ttsReady: false },
  { code: 'ar', name: 'Arabic', native: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: '\u{1F1E6}\u{1F1EA}', engine: 'qwen_tts_0.6b', ttsReady: false, rtl: true },
  { code: 'es', name: 'Spanish', native: 'Espa\u00F1ol', flag: '\u{1F1EA}\u{1F1F8}', engine: 'kokoro', ttsReady: true },
  { code: 'fr', name: 'French', native: 'Fran\u00E7ais', flag: '\u{1F1EB}\u{1F1F7}', engine: 'kokoro', ttsReady: true },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}', engine: 'kokoro', ttsReady: true },
  { code: 'zh', name: 'Chinese', native: '\u4E2D\u6587', flag: '\u{1F1E8}\u{1F1F3}', engine: 'qwen_tts_0.6b', ttsReady: false },
  { code: 'ja', name: 'Japanese', native: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}', engine: 'qwen_tts_0.6b', ttsReady: false },
  { code: 'ko', name: 'Korean', native: '\uD55C\uAD6D\uC5B4', flag: '\u{1F1F0}\u{1F1F7}', engine: 'qwen_tts_0.6b', ttsReady: false },
  { code: 'pt', name: 'Portuguese', native: 'Portugu\u00EAs', flag: '\u{1F1F5}\u{1F1F9}', engine: 'kokoro', ttsReady: true },
  { code: 'tr', name: 'Turkish', native: 'T\u00FCrk\u00E7e', flag: '\u{1F1F9}\u{1F1F7}', engine: 'kokoro', ttsReady: true },
  { code: 'ru', name: 'Russian', native: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439', flag: '\u{1F1F7}\u{1F1FA}', engine: 'kokoro', ttsReady: false },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '\u{1F1EE}\u{1F1F9}', engine: 'kokoro', ttsReady: true },
];

const QUICK_PHRASES: Record<string, string[]> = {
  default: [
    'Hello, how are you?',
    'Thank you very much',
    'Where is the nearest hospital?',
    'I need help',
    'How much does this cost?',
    'Nice to meet you',
    'Can you help me?',
    'I don\'t understand',
  ],
};

const FALLBACK_ENGINES: EngineStatus[] = [
  { name: 'Kokoro', id: 'kokoro', isLoaded: true, isAvailable: true, qualityTier: 'good' },
  { name: 'Qwen TTS 0.6B', id: 'qwen_tts_0.6b', isLoaded: false, isAvailable: true, qualityTier: 'excellent' },
  { name: 'Qwen TTS 1.7B', id: 'qwen_tts_1.7b', isLoaded: false, isAvailable: true, qualityTier: 'premium' },
  { name: 'Chatterbox Turbo', id: 'chatterbox_turbo', isLoaded: false, isAvailable: true, qualityTier: 'good' },
  { name: 'LuxTTS', id: 'luxtts', isLoaded: false, isAvailable: true, qualityTier: 'excellent' },
  { name: 'TADA', id: 'tada', isLoaded: false, isAvailable: true, qualityTier: 'premium' },
];

const MODE_CONFIG: {
  id: TranslateMode;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'voice', label: 'Voice-to-Voice', icon: Mic },
  { id: 'text', label: 'Text-to-Voice', icon: Type },
  { id: 'conversation', label: 'Conversation', icon: MessagesSquare },
];

/* ── Helpers ── */

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getEngineColor(engine?: string): string {
  if (!engine) return 'text-lumina-on-surface-variant';
  if (engine.includes('kokoro')) return 'text-emerald-400';
  if (engine.includes('qwen')) return 'text-amber-400';
  if (engine.includes('chatterbox')) return 'text-rose-400';
  if (engine.includes('luxtts')) return 'text-purple-400';
  if (engine.includes('tada')) return 'text-pink-400';
  return 'text-lumina-primary';
}

function getQualityBadgeColor(tier: string): string {
  switch (tier) {
    case 'premium': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'excellent': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'good': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default: return 'bg-lumina-surface-variant/30 text-lumina-on-surface-variant/60 border-lumina-outline-variant/20';
  }
}

/* ── Main Component ── */

export default function BabelPanel() {
  /* State */
  const [mode, setMode] = useState<TranslateMode>('text');
  const [languages, setLanguages] = useState<Language[]>(FALLBACK_LANGUAGES);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('ur');
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [engineUsed, setEngineUsed] = useState<string | undefined>();
  const [engines, setEngines] = useState<EngineStatus[]>(FALLBACK_ENGINES);
  const [history, setHistory] = useState<TranslationEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isLoadingLangs, setIsLoadingLangs] = useState(true);
  const [conversationPairs, setConversationPairs] = useState<TranslationEntry[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformRef = useRef<number[]>(Array(12).fill(0));
  const waveformInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sourceLangObj = languages.find((l) => l.code === sourceLang);
  const targetLangObj = languages.find((l) => l.code === targetLang);
  const isTargetRTL = targetLangObj?.rtl;

  /* ── Data fetching ── */

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [langRes, engineRes, historyRes] = await Promise.allSettled([
          fetch('/api/babel/languages'),
          fetch('/api/voice/engines'),
          fetch('/api/babel/history?limit=10'),
        ]);

        if (langRes.status === 'fulfilled' && langRes.value.ok) {
          const data = await langRes.value.json();
          if (Array.isArray(data) && data.length > 0) {
            setLanguages(data);
          }
        }

        if (engineRes.status === 'fulfilled' && engineRes.value.ok) {
          const data = await engineRes.value.json();
          if (data.engines) {
            const mapped = Object.entries(data.engines).map(([id, eng]: [string, any]) => ({
              name: eng.name || id,
              id,
              isLoaded: data.loaded_engine === id,
              isAvailable: true,
              qualityTier: eng.quality_tier || 'basic',
            }));
            setEngines(mapped);
          }
        }

        if (historyRes.status === 'fulfilled' && historyRes.value.ok) {
          const data = await historyRes.value.json();
          if (Array.isArray(data)) {
            setHistory(data);
          }
        }
      } catch {
        // Use fallback data
      } finally {
        setIsLoadingLangs(false);
      }
    };
    fetchData();
  }, []);

  /* ── Waveform animation for recording ── */

  useEffect(() => {
    if (isRecording) {
      waveformInterval.current = setInterval(() => {
        waveformRef.current = waveformRef.current.map(() =>
          Math.random() * 0.8 + 0.2
        );
      }, 120);
    } else {
      if (waveformInterval.current) {
        clearInterval(waveformInterval.current);
        waveformInterval.current = null;
      }
      waveformRef.current = Array(12).fill(0);
    }
    return () => {
      if (waveformInterval.current) clearInterval(waveformInterval.current);
    };
  }, [isRecording]);

  /* ── Force re-render for waveform ── */
  const [waveformTick, setWaveformTick] = useState(0);
  useEffect(() => {
    if (isRecording) {
      const tick = setInterval(() => setWaveformTick((t) => t + 1), 120);
      return () => clearInterval(tick);
    }
  }, [isRecording]);

  /* ── Translation ── */

  const handleTranslate = useCallback(
    async (text?: string) => {
      const inputText = (text || sourceText).trim();
      if (!inputText || isTranslating) return;

      setIsTranslating(true);
      setTranslatedText('');
      setEngineUsed(undefined);

      try {
        const res = await fetch('/api/babel/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: inputText,
            sourceLang,
            targetLang,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const result = data.translatedText || data.translation || inputText;
          const engine = data.engineUsed || data.engine;
          setTranslatedText(result);
          setEngineUsed(engine);

          // Add to conversation pairs in conversation mode
          if (mode === 'conversation') {
            setConversationPairs((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                sourceText: inputText,
                translatedText: result,
                sourceLang,
                targetLang,
                sourceFlag: sourceLangObj?.flag || '',
                targetFlag: targetLangObj?.flag || '',
                engineUsed: engine,
                createdAt: new Date().toISOString(),
              },
            ]);
          }
        } else {
          // Fallback: show a placeholder translation
          setTranslatedText(`[${targetLangObj?.name || targetLang}] ${inputText}`);
          setEngineUsed('fallback');
        }
      } catch {
        setTranslatedText(`[${targetLangObj?.name || targetLang}] ${inputText}`);
        setEngineUsed('fallback');
      } finally {
        setIsTranslating(false);
      }
    },
    [sourceText, sourceLang, targetLang, targetLangObj, sourceLangObj, isTranslating, mode]
  );

  /* ── Speak / TTS ── */

  const handleSpeak = useCallback(async () => {
    if (!translatedText || isSpeaking) return;
    setIsSpeaking(true);

    try {
      // Text is already translated — call TTS directly with target language
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: translatedText,
          language: targetLang,
          speed: 1.0,
        }),
      });

      if (res.ok) {
        const engine = res.headers.get('X-Engine') || 'unknown';
        setEngineUsed(engine);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
        }
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(url);
          toast.error('Audio playback failed');
        };
        audio.play();
        toast.success(`Playing via ${engine}`);
      } else {
        // Fallback: try Web Speech API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(translatedText);
          utterance.lang = targetLang;
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
        } else {
          toast.error('No TTS engine available');
          setIsSpeaking(false);
        }
      }
    } catch {
      toast.error('TTS service unavailable');
      setIsSpeaking(false);
    }
  }, [translatedText, targetLang, isSpeaking]);

  /* ── Copy ── */

  const handleCopy = useCallback(async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [translatedText]);

  /* ── Language swap ── */

  const handleSwap = useCallback(() => {
    setIsSwapping(true);
    setTimeout(() => {
      const tempLang = sourceLang;
      const tempText = sourceText;
      const tempTranslated = translatedText;
      setSourceLang(targetLang);
      setTargetLang(tempLang);
      setSourceText(tempTranslated);
      setTranslatedText(tempText);
      setEngineUsed(undefined);
      setIsSwapping(false);
    }, 300);
  }, [sourceLang, targetLang, sourceText, translatedText]);

  /* ── Quick phrase ── */

  const handleQuickPhrase = useCallback(
    (phrase: string) => {
      setSourceText(phrase);
      handleTranslate(phrase);
    },
    [handleTranslate]
  );

  /* ── Voice recording toggle ── */

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      setIsRecording(false);
      toast.success('Recording stopped');
    } else {
      setIsRecording(true);
      toast.info('Listening...');
      // Auto-stop after 10 seconds
      recordingTimerRef.current = setTimeout(() => {
        setIsRecording(false);
        toast.success('Recording stopped');
      }, 10000);
    }
  }, [isRecording]);

  /* ── Play audio (if cached) ── */

  const handlePlayAudio = useCallback(() => {
    if (audioRef.current) {
      if (isSpeaking) {
        audioRef.current.pause();
        setIsSpeaking(false);
      } else {
        audioRef.current.play();
        setIsSpeaking(true);
      }
    } else {
      handleSpeak();
    }
  }, [isSpeaking, handleSpeak]);

  /* ── Conversation mode: send from target side ── */

  const [conversationReplyText, setConversationReplyText] = useState('');

  const handleConversationReply = useCallback(async () => {
    const text = conversationReplyText.trim();
    if (!text || isTranslating) return;
    setConversationReplyText('');
    // Reverse direction: target -> source
    try {
      setIsTranslating(true);
      const res = await fetch('/api/babel/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          sourceLang: targetLang,
          targetLang: sourceLang,
        }),
      });
      let result = `[${sourceLangObj?.name || sourceLang}] ${text}`;
      let engine = 'fallback';
      if (res.ok) {
        const data = await res.json();
        result = data.translatedText || data.translation || result;
        engine = data.engineUsed || data.engine || 'fallback';
      }
      setConversationPairs((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sourceText: text,
          translatedText: result,
          sourceLang: targetLang,
          targetLang: sourceLang,
          sourceFlag: targetLangObj?.flag || '',
          targetFlag: sourceLangObj?.flag || '',
          engineUsed: engine,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch {
      // silent fail
    } finally {
      setIsTranslating(false);
    }
  }, [conversationReplyText, targetLang, sourceLang, sourceLangObj, targetLangObj, isTranslating]);

  /* ──────────────────────────────────────────
     RENDER
  ────────────────────────────────────────── */

  return (
    <div className="space-y-6 font-[family-name:var(--font-body)]">
      {/* ═══ Header ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="glass-card rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-rose-500/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-lumina-primary" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
                Babel
              </h2>
              <p className="text-xs text-lumina-on-surface-variant/60">Universal Voice Translator</p>
            </div>
          </div>
        </div>

        {/* Mode Toggle Pills */}
        <div className="flex gap-2 p-1 rounded-full bg-lumina-surface-variant/20">
          {MODE_CONFIG.map((m) => {
            const isActive = mode === m.id;
            const Icon = m.icon;
            return (
              <motion.button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors duration-200 cursor-pointer flex-1 justify-center ${
                  isActive
                    ? 'text-lumina-on-primary'
                    : 'text-lumina-on-surface-variant/70 hover:text-lumina-on-surface'
                }`}
                whileTap={{ scale: 0.97 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="babel-mode-pill"
                    className="absolute inset-0 rounded-full bg-lumina-primary shadow-sm"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{m.label}</span>
                  <span className="sm:hidden">{m.id === 'voice' ? 'Voice' : m.id === 'text' ? 'Text' : 'Chat'}</span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ═══ Language Pair Selector ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="flex items-center gap-3">
          {/* Source Language */}
          <motion.div
            className="flex-1"
            animate={isSwapping ? { x: 20, opacity: 0 } : { x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {isLoadingLangs ? (
              <Skeleton className="h-12 rounded-xl bg-lumina-surface-container/50" />
            ) : (
              <Select value={sourceLang} onValueChange={setSourceLang}>
                <SelectTrigger className="h-12 bg-lumina-surface-container/50 border-lumina-primary/10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        <span className="font-medium text-lumina-on-surface">{lang.name}</span>
                        <span className="text-xs text-lumina-on-surface-variant/60">{lang.native}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </motion.div>

          {/* Swap Button */}
          <motion.button
            onClick={handleSwap}
            disabled={isSwapping || isTranslating}
            className="shrink-0 w-10 h-10 rounded-full bg-lumina-primary/10 flex items-center justify-center hover:bg-lumina-primary/20 transition-colors cursor-pointer disabled:opacity-50"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={{ rotate: isSwapping ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ArrowLeftRight className="w-4 h-4 text-lumina-primary" />
          </motion.button>

          {/* Target Language */}
          <motion.div
            className="flex-1"
            animate={isSwapping ? { x: -20, opacity: 0 } : { x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {isLoadingLangs ? (
              <Skeleton className="h-12 rounded-xl bg-lumina-surface-container/50" />
            ) : (
              <Select value={targetLang} onValueChange={setTargetLang}>
                <SelectTrigger className="h-12 bg-lumina-surface-container/50 border-lumina-primary/10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span>
                        <span className="font-medium text-lumina-on-surface">{lang.name}</span>
                        <span className="text-xs text-lumina-on-surface-variant/60">{lang.native}</span>
                        {lang.rtl && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 text-amber-400 border-amber-400/30 bg-amber-400/5"
                          >
                            RTL
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </motion.div>
        </div>

        {/* RTL Indicator for target */}
        {isTargetRTL && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 flex items-center gap-1.5"
          >
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 text-amber-400 border-amber-400/20 bg-amber-400/5"
            >
              RTL
            </Badge>
            <span className="text-[10px] text-lumina-on-surface-variant/50">
              {targetLangObj?.name} is read right-to-left
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* ═══ Translation Flow Visualization ═══ */}
      {translatedText && !isTranslating && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-3"
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-lg bg-lumina-surface-container/50 text-lumina-on-surface-variant/70 truncate max-w-[100px] sm:max-w-[160px]">
              {sourceLangObj?.flag} {sourceText.slice(0, 20)}{sourceText.length > 20 ? '...' : ''}
            </span>
            <motion.div
              className="flex items-center gap-1 shrink-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="w-6 h-px bg-lumina-primary/30" />
              {engineUsed && (
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1.5 py-0 shrink-0 ${getEngineColor(engineUsed)} border-current/20 bg-current/5`}
                >
                  <Cpu className="w-2.5 h-2.5 mr-0.5" />
                  {engineUsed === 'fallback' ? 'Mock' : engineUsed}
                </Badge>
              )}
              <div className="w-6 h-px bg-lumina-primary/30" />
            </motion.div>
            <span
              className={`px-2 py-1 rounded-lg bg-lumina-primary/5 text-lumina-on-surface truncate max-w-[100px] sm:max-w-[160px] ${isTargetRTL ? 'text-right' : ''}`}
              dir={isTargetRTL ? 'rtl' : undefined}
            >
              {targetLangObj?.flag} {translatedText.slice(0, 20)}{translatedText.length > 20 ? '...' : ''}
            </span>
          </div>
        </motion.div>
      )}

      {/* Translation in progress indicator */}
      {isTranslating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="glass-card rounded-2xl p-3"
        >
          <div className="flex items-center gap-2 text-xs text-lumina-on-surface-variant/60">
            <span className="px-2 py-1 rounded-lg bg-lumina-surface-container/50 truncate max-w-[100px] sm:max-w-[160px]">
              {sourceLangObj?.flag} {sourceText.slice(0, 20)}...
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <motion.div
                className="w-6 h-px bg-lumina-primary/40"
                animate={{ scaleX: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              >
                <Sparkles className="w-3 h-3 text-lumina-primary" />
              </motion.div>
              <motion.div
                className="w-6 h-px bg-lumina-primary/40"
                animate={{ scaleX: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }}
              />
            </div>
            <Skeleton className="h-6 flex-1 rounded-lg bg-lumina-surface-container/50" />
          </div>
        </motion.div>
      )}

      {/* ═══ Source Input Area ═══ */}
      <AnimatePresence mode="wait">
        {mode === 'text' && (
          <motion.div
            key="text-input"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="glass-card-header flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
                <Type className="w-4 h-4 text-lumina-primary" />
                Source &mdash; {sourceLangObj?.flag} {sourceLangObj?.name}
              </h3>
              {sourceText && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSourceText(''); setTranslatedText(''); setEngineUsed(undefined); }}
                  className="text-xs text-lumina-on-surface-variant/50 hover:text-lumina-on-surface h-7 px-2"
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder={`Type or paste text to translate to ${targetLangObj?.name || '...'}...`}
              className="min-h-[100px] resize-none bg-lumina-surface-container/30 border-lumina-outline-variant/20 text-lumina-on-surface placeholder:text-lumina-on-surface-variant/30 rounded-xl text-sm font-[family-name:var(--font-body)]"
              disabled={isTranslating}
            />
            <div className="flex justify-end mt-3">
              <Button
                onClick={() => handleTranslate()}
                disabled={!sourceText.trim() || isTranslating}
                className="bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 shadow-sm"
                size="sm"
              >
                {isTranslating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Globe className="w-3.5 h-3.5 mr-1.5" />
                )}
                Translate
              </Button>
            </div>
          </motion.div>
        )}

        {mode === 'voice' && (
          <motion.div
            key="voice-input"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="glass-card-header flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
                <Mic className="w-4 h-4 text-lumina-primary" />
                Voice Input &mdash; {sourceLangObj?.flag} {sourceLangObj?.name}
              </h3>
            </div>

            {/* Record button with waveform */}
            <div className="flex flex-col items-center gap-4">
              {/* Waveform visualization */}
              <div className="flex items-center justify-center gap-1 h-16">
                {isRecording
                  ? waveformRef.current.map((h, i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 rounded-full bg-lumina-primary"
                        animate={{
                          height: [4, Math.max(8, h * 48), 4],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.5 + Math.random() * 0.4,
                          ease: 'easeInOut',
                        }}
                      />
                    ))
                  : Array(12)
                      .fill(0)
                      .map((_, i) => (
                        <div
                          key={i}
                          className="w-1.5 h-1 rounded-full bg-lumina-on-surface-variant/20"
                        />
                      ))}
              </div>

              {/* Record button */}
              <motion.button
                onClick={toggleRecording}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200 ${
                  isRecording
                    ? 'bg-red-500/10 ring-2 ring-red-500/30'
                    : 'bg-lumina-primary/10 ring-2 ring-lumina-primary/20 hover:bg-lumina-primary/20'
                }`}
                whileTap={{ scale: 0.92 }}
              >
                {isRecording && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-red-500/10"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
                {isRecording ? (
                  <Square className="w-6 h-6 text-red-400 relative z-10" fill="currentColor" />
                ) : (
                  <Mic className="w-6 h-6 text-lumina-primary relative z-10" />
                )}
              </motion.button>

              <p className="text-xs text-lumina-on-surface-variant/50">
                {isRecording ? 'Listening...' : 'Tap to start recording'}
              </p>

              {/* Show recognized text if available */}
              {sourceText && !isRecording && (
                <div className="w-full p-3 rounded-xl bg-lumina-surface-container/30 border border-lumina-outline-variant/10">
                  <p className="text-sm text-lumina-on-surface">{sourceText}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {mode === 'conversation' && (
          <motion.div
            key="conversation-input"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="glass-card-header flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
                <MessagesSquare className="w-4 h-4 text-lumina-primary" />
                Conversation Mode
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConversationPairs([])}
                className="text-xs text-lumina-on-surface-variant/50 hover:text-lumina-on-surface h-7 px-2"
              >
                <RotateCcw className="w-3 h-3 mr-1" /> Clear
              </Button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {conversationPairs.length === 0 && (
                <div className="text-center py-6">
                  <MessagesSquare className="w-8 h-8 mx-auto mb-2 text-lumina-on-surface-variant/20" />
                  <p className="text-xs text-lumina-on-surface-variant/40">
                    Type in either language to start a conversation
                  </p>
                </div>
              )}
              {conversationPairs.map((pair) => (
                <motion.div
                  key={pair.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2"
                >
                  <div className="flex-1 p-2.5 rounded-xl bg-lumina-surface-container/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs">{pair.sourceFlag}</span>
                      <span className="text-[10px] text-lumina-on-surface-variant/50">
                        {languages.find((l) => l.code === pair.sourceLang)?.name}
                      </span>
                    </div>
                    <p className="text-xs text-lumina-on-surface">{pair.sourceText}</p>
                  </div>
                  <div className="flex-1 p-2.5 rounded-xl bg-lumina-primary/5 border border-lumina-primary/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs">{pair.targetFlag}</span>
                      <span className="text-[10px] text-lumina-on-surface-variant/50">
                        {languages.find((l) => l.code === pair.targetLang)?.name}
                      </span>
                    </div>
                    <p
                      className="text-xs text-lumina-on-surface"
                      dir={languages.find((l) => l.code === pair.targetLang)?.rtl ? 'rtl' : undefined}
                    >
                      {pair.translatedText}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Source input for conversation */}
            <div className="flex gap-2 mt-3">
              <div className="flex-1 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs">
                  {sourceLangObj?.flag}
                </span>
                <input
                  type="text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && sourceText.trim() && !isTranslating) {
                      handleTranslate();
                      setSourceText('');
                    }
                  }}
                  placeholder={`${sourceLangObj?.name || 'Source'}...`}
                  className="w-full h-9 pl-8 pr-3 rounded-xl bg-lumina-surface-container/30 border border-lumina-outline-variant/20 text-sm text-lumina-on-surface placeholder:text-lumina-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-lumina-primary/30"
                  disabled={isTranslating}
                />
              </div>
              <div className="flex-1 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs">
                  {targetLangObj?.flag}
                </span>
                <input
                  type="text"
                  value={conversationReplyText}
                  onChange={(e) => setConversationReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && conversationReplyText.trim() && !isTranslating) {
                      handleConversationReply();
                    }
                  }}
                  placeholder={`${targetLangObj?.name || 'Target'}...`}
                  dir={isTargetRTL ? 'rtl' : undefined}
                  className={`w-full h-9 pl-8 pr-3 rounded-xl bg-lumina-surface-container/30 border border-lumina-outline-variant/20 text-sm text-lumina-on-surface placeholder:text-lumina-on-surface-variant/30 focus:outline-none focus:ring-2 focus:ring-lumina-primary/30 ${isTargetRTL ? 'text-right' : ''}`}
                  disabled={isTranslating}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Target Output Area ═══ */}
      {mode !== 'conversation' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="glass-card rounded-2xl p-4"
        >
          <div className="glass-card-header flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-lumina-primary" />
              Translation &mdash; {targetLangObj?.flag} {targetLangObj?.name}
            </h3>
            {engineUsed && (
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${getEngineColor(engineUsed)} border-current/20 bg-current/5`}
              >
                <Cpu className="w-2.5 h-2.5 mr-0.5" />
                {engineUsed === 'fallback' ? 'Offline' : engineUsed}
              </Badge>
            )}
          </div>

          {/* Translated text */}
          <div className="min-h-[80px] p-3 rounded-xl bg-lumina-surface-container/20 border border-lumina-outline-variant/10">
            {isTranslating ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4 rounded bg-lumina-surface-variant/20" />
                <Skeleton className="h-4 w-1/2 rounded bg-lumina-surface-variant/20" />
                <Skeleton className="h-4 w-2/3 rounded bg-lumina-surface-variant/20" />
              </div>
            ) : translatedText ? (
              <p
                className="text-sm text-lumina-on-surface leading-relaxed"
                dir={isTargetRTL ? 'rtl' : undefined}
              >
                {translatedText}
              </p>
            ) : (
              <p
                className={`text-sm text-lumina-on-surface-variant/30 italic ${isTargetRTL ? 'text-right' : ''}`}
                dir={isTargetRTL ? 'rtl' : undefined}
              >
                Translation will appear here...
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!translatedText || isTranslating}
              className="h-8 text-xs border-lumina-outline-variant/20 hover:bg-lumina-primary/10 hover:text-lumina-primary hover:border-lumina-primary/20"
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span
                    key="copied"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    className="flex items-center gap-1.5 text-emerald-500"
                  >
                    <Check className="w-3.5 h-3.5" /> Copied
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    className="flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePlayAudio}
              disabled={!translatedText || isTranslating}
              className={`h-8 text-xs border-lumina-outline-variant/20 hover:bg-lumina-primary/10 hover:text-lumina-primary hover:border-lumina-primary/20 ${
                isSpeaking ? 'bg-lumina-primary/10 text-lumina-primary border-lumina-primary/20' : ''
              }`}
            >
              <motion.div
                animate={isSpeaking ? { scale: [1, 1.2, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.8 }}
              >
                {isSpeaking ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </motion.div>
              {isSpeaking ? 'Playing' : 'Play'}
            </Button>

            <div className="flex-1" />

            <Button
              size="sm"
              onClick={handleSpeak}
              disabled={!translatedText || isTranslating || isSpeaking}
              className="h-8 text-xs bg-lumina-primary text-lumina-on-primary hover:bg-lumina-primary/90 shadow-sm"
            >
              {isSpeaking ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 mr-1.5" />
              )}
              Speak
            </Button>
          </div>
        </motion.div>
      )}

      {/* ═══ Quick Phrases ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="glass-card-header flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-medium text-lumina-on-surface">Quick Phrases</h3>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {(QUICK_PHRASES.default).map((phrase, i) => (
            <motion.button
              key={i}
              onClick={() => handleQuickPhrase(phrase)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isTranslating}
              className="shrink-0 glass-pill px-3 py-1.5 rounded-full text-xs font-medium text-lumina-on-surface-variant hover:text-lumina-on-surface hover:bg-lumina-primary/10 transition-all duration-200 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {phrase}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ═══ Engine Status Bar ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="glass-card rounded-2xl p-4"
      >
        <div className="glass-card-header flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
            <Cpu className="w-4 h-4 text-lumina-primary" />
            Engine Status
          </h3>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 text-emerald-400 border-emerald-400/20 bg-emerald-400/5"
          >
            {engines.filter((e) => e.isLoaded).length}/{engines.length} loaded
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {engines.map((engine) => (
            <div
              key={engine.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-lumina-surface-container/30"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  engine.isLoaded
                    ? 'bg-emerald-400'
                    : engine.isAvailable
                      ? 'bg-gray-400'
                      : 'bg-red-400'
                }`}
              />
              <span className="text-[11px] text-lumina-on-surface-variant/70 font-medium">
                {engine.name}
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1 py-0 border-current/15 bg-current/5 ${getQualityBadgeColor(engine.qualityTier)}`}
              >
                {engine.qualityTier}
              </Badge>
            </div>
          ))}
        </div>

        {/* Audio quality tier indicator */}
        <div className="mt-3 flex items-center gap-4 text-[10px] text-lumina-on-surface-variant/50">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400" /> Loaded
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-400" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400" /> Offline
          </span>
          <span className="ml-auto">
            Coverage: {languages.length} languages
          </span>
        </div>
      </motion.div>

      {/* ═══ Translation History ═══ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <button
          onClick={() => setHistoryOpen(!historyOpen)}
          className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-lumina-surface-container/20 transition-colors"
        >
          <h3 className="text-sm font-medium text-lumina-on-surface flex items-center gap-2">
            <Clock className="w-4 h-4 text-lumina-primary" />
            Translation History
            {history.length > 0 && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-lumina-primary/10 text-lumina-primary"
              >
                {history.length}
              </Badge>
            )}
          </h3>
          <motion.div
            animate={{ rotate: historyOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-lumina-on-surface-variant/50" />
          </motion.div>
        </button>

        <AnimatePresence>
          {historyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Separator className="bg-lumina-outline-variant/10" />
              <div className="max-h-96 overflow-y-auto">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <AlertCircle className="w-8 h-8 text-lumina-on-surface-variant/20 mb-2" />
                    <p className="text-xs text-lumina-on-surface-variant/40 text-center">
                      No translations yet. Start translating to build your history.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-lumina-outline-variant/5">
                    {history.slice(0, 10).map((entry) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-start gap-3 p-3 hover:bg-lumina-surface-container/10 transition-colors cursor-pointer"
                        onClick={() => {
                          setSourceLang(entry.sourceLang);
                          setTargetLang(entry.targetLang);
                          setSourceText(entry.sourceText);
                          setTranslatedText(entry.translatedText);
                          setEngineUsed(entry.engineUsed);
                        }}
                      >
                        {/* Source side */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs">{entry.sourceFlag || '\u{1F1FA}\u{1F1F8}'}</span>
                            <span className="text-[10px] text-lumina-on-surface-variant/40">
                              {entry.sourceLang}
                            </span>
                          </div>
                          <p className="text-xs text-lumina-on-surface/80 truncate">
                            {entry.sourceText}
                          </p>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="w-3.5 h-3.5 text-lumina-on-surface-variant/20 shrink-0 mt-3" />

                        {/* Target side */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs">{entry.targetFlag || '\u{1F1F5}\u{1F1F0}'}</span>
                            <span className="text-[10px] text-lumina-on-surface-variant/40">
                              {entry.targetLang}
                            </span>
                            {entry.engineUsed && (
                              <Badge
                                variant="outline"
                                className={`text-[8px] px-1 py-0 ${getEngineColor(entry.engineUsed)} border-current/15 bg-current/5`}
                              >
                                {entry.engineUsed}
                              </Badge>
                            )}
                          </div>
                          <p
                            className="text-xs text-lumina-primary/80 truncate"
                            dir={
                              languages.find((l) => l.code === entry.targetLang)?.rtl
                                ? 'rtl'
                                : undefined
                            }
                          >
                            {entry.translatedText}
                          </p>
                        </div>

                        {/* Timestamp */}
                        <span className="text-[10px] text-lumina-on-surface-variant/30 shrink-0 mt-1 whitespace-nowrap">
                          {formatRelativeTime(entry.createdAt)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
