'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Brain,
  Lightbulb,
  TrendingUp,
  Clock,
  Zap,
  BarChart3,
  Search,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Target,
  Activity,
  Loader2,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────

interface UserPattern {
  id: string;
  patternType: string;
  key: string;
  value: string | null;
  frequency: number;
  lastSeen: string;
  weight: number;
  confidence: number;
  tags: string;
}

interface Suggestion {
  id: string;
  title: string;
  description: string;
  action: string;
  actionData: string | null;
  relevanceScore: number;
  urgencyScore: number;
  status: string;
  shownCount: number;
  validFrom: string;
  validUntil: string | null;
}

const PATTERN_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  frequent_topic: { label: 'Topic', icon: Target, color: 'text-lumina-primary', bg: 'bg-lumina-primary/10' },
  time_preference: { label: 'Time', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  tool_usage: { label: 'Tool', icon: Zap, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  query_pattern: { label: 'Query', icon: Search, color: 'text-sky-500', bg: 'bg-sky-500/10' },
  workflow: { label: 'Workflow', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
};

function formatTime(iso: string): string {
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

function getKeyLabel(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function DeepLearning() {
  const [patterns, setPatterns] = useState<UserPattern[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'patterns' | 'suggestions'>('patterns');

  const fetchPatterns = useCallback(async () => {
    setPatternsLoading(true);
    try {
      const res = await fetch('/api/patterns');
      if (res.ok) {
        const data = await res.json();
        setPatterns(Array.isArray(data.patterns) ? data.patterns : Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setPatternsLoading(false); }
  }, []);

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/patterns/suggest');
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    finally { setSuggestionsLoading(false); }
  }, []);

  useEffect(() => { fetchPatterns(); fetchSuggestions(); }, [fetchPatterns, fetchSuggestions]);

  const handleSuggestionAction = useCallback(async (suggestion: Suggestion, action: 'accepted' | 'dismissed') => {
    try {
      await fetch(`/api/suggestions/${suggestion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action }),
      });
      toast({
        title: action === 'accepted' ? 'Suggestion accepted' : 'Suggestion dismissed',
        description: action === 'accepted' ? 'We\'ll remember your preference.' : 'Won\'t show this again.',
      });
      fetchSuggestions();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  }, [fetchSuggestions]);

  const handleGenerateSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/patterns/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        toast({
          title: 'Suggestions generated',
          description: `${data.suggestions?.length || 0} new AI suggestions created.`,
        });
        fetchSuggestions();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: 'Failed', description: err.error || 'Could not generate suggestions', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
    finally { setSuggestionsLoading(false); }
  }, [fetchSuggestions]);

  // Stats
  const patternStats = useMemo(() => {
    const totalPatterns = patterns.length;
    const highConfidence = patterns.filter(p => p.confidence >= 0.8).length;
    const topPattern = [...patterns].sort((a, b) => b.frequency - a.frequency)[0];
    const avgConfidence = totalPatterns > 0 ? (patterns.reduce((sum, p) => sum + p.confidence, 0) / totalPatterns) : 0;
    return { totalPatterns, highConfidence, topPattern, avgConfidence };
  }, [patterns]);

  const suggestionStats = useMemo(() => ({
    total: suggestions.length,
    pending: suggestions.filter(s => s.status === 'active').length,
    avgRelevance: suggestions.length > 0 ? (suggestions.reduce((sum, s) => sum + s.relevanceScore, 0) / suggestions.length) : 0,
  }), [suggestions]);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Brain className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
              Deep Learning
            </h2>
            <p className="text-[11px] text-lumina-on-surface-variant/50">
              Proactive suggestions from behavioral patterns
            </p>
          </div>
        </div>
        <button
          onClick={() => { fetchPatterns(); fetchSuggestions(); }}
          className="p-1.5 rounded-lg text-lumina-on-surface-variant/40 hover:text-lumina-primary hover:bg-lumina-primary/10 transition-all"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Patterns', value: patternStats.totalPatterns, icon: BarChart3, color: 'text-violet-500', bg: 'bg-violet-500/10' },
          { label: 'High Confidence', value: patternStats.highConfidence, icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Suggestions', value: suggestionStats.pending, icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Avg Confidence', value: `${Math.round(patternStats.avgConfidence * 100)}%`, icon: TrendingUp, color: 'text-sky-500', bg: 'bg-sky-500/10' },
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

      {/* Tab Switch */}
      <div className="flex gap-1 p-0.5 bg-lumina-surface-variant/20 rounded-xl">
        {[
          { key: 'patterns' as const, label: 'Behavior Patterns', icon: Activity },
          { key: 'suggestions' as const, label: 'Proactive Suggestions', icon: Lightbulb },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-lumina-primary text-lumina-on-primary shadow-sm'
                : 'text-lumina-on-surface-variant/60 hover:text-lumina-on-surface hover:bg-lumina-surface-variant/30'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'patterns' && (
          <motion.div
            key="patterns"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-3"
          >
            {/* Top pattern highlight */}
            {patternStats.topPattern && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-4 border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <span className="text-[11px] font-medium text-violet-500 uppercase tracking-wider">Top Pattern</span>
                </div>
                <h3 className="font-[family-name:var(--font-body)] text-sm font-semibold text-lumina-on-surface">
                  {getKeyLabel(patternStats.topPattern.key)}
                </h3>
                {patternStats.topPattern.value && (
                  <p className="text-xs text-lumina-on-surface-variant/60 mt-1">{patternStats.topPattern.value}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-lumina-on-surface-variant/40">
                  <span>Frequency: {patternStats.topPattern.frequency}</span>
                  <span>Confidence: {Math.round(patternStats.topPattern.confidence * 100)}%</span>
                  <span>Last seen: {formatTime(patternStats.topPattern.lastSeen)}</span>
                </div>
              </motion.div>
            )}

            {/* Pattern list */}
            {patternsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-violet-500 animate-spin" /></div>
            ) : patterns.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Activity className="w-8 h-8 text-lumina-on-surface-variant/20 mx-auto mb-2" />
                <p className="text-xs text-lumina-on-surface-variant/50">No patterns detected yet</p>
                <p className="text-[10px] text-lumina-on-surface-variant/30 mt-1">
                  Patterns emerge as you use Tamanna more
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {patterns.map((pattern, i) => {
                  const config = PATTERN_TYPE_CONFIG[pattern.patternType] || PATTERN_TYPE_CONFIG.frequent_topic;
                  return (
                    <motion.div
                      key={pattern.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass-card rounded-xl p-3 border border-white/10 flex items-center gap-3"
                    >
                      <div className={`shrink-0 w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                        <config.icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-semibold text-lumina-on-surface truncate">{getKeyLabel(pattern.key)}</h4>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-lumina-surface-variant/20 text-lumina-on-surface-variant/50">
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-lumina-on-surface-variant/40">
                          <span>×{pattern.frequency}</span>
                          <span>•</span>
                          <span>{Math.round(pattern.confidence * 100)}% conf</span>
                          <span>•</span>
                          <span>{formatTime(pattern.lastSeen)}</span>
                        </div>
                      </div>
                      {/* Confidence bar */}
                      <div className="shrink-0 w-12">
                        <div className="h-1 bg-lumina-surface-variant/30 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pattern.confidence >= 0.8 ? 'bg-emerald-500' : pattern.confidence >= 0.5 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${pattern.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Generate suggestions button */}
            <button
              onClick={handleGenerateSuggestions}
              disabled={suggestionsLoading}
              className="w-full glass-card rounded-xl p-3 border border-dashed border-lumina-outline/20 flex items-center justify-center gap-2 text-xs text-lumina-on-surface-variant/50 hover:text-violet-500 hover:border-violet-500/30 transition-all"
            >
              {suggestionsLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate AI Suggestions
            </button>
          </motion.div>
        )}

        {activeTab === 'suggestions' && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-3"
          >
            {suggestionsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-amber-500 animate-spin" /></div>
            ) : suggestions.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <Lightbulb className="w-8 h-8 text-lumina-on-surface-variant/20 mx-auto mb-2" />
                <p className="text-xs text-lumina-on-surface-variant/50">No suggestions yet</p>
                <p className="text-[10px] text-lumina-on-surface-variant/30 mt-1">
                  Suggestions appear based on your usage patterns
                </p>
              </div>
            ) : (
              suggestions.map((suggestion, i) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-xl p-4 border border-amber-500/10 bg-gradient-to-br from-amber-500/[0.02] to-transparent"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-lumina-on-surface">{suggestion.title}</h4>
                      <p className="text-xs text-lumina-on-surface-variant/60 mt-0.5 leading-relaxed">{suggestion.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1 text-[10px] text-emerald-500/70">
                          <Target className="w-3 h-3" />
                          Relevance: {Math.round(suggestion.relevanceScore * 100)}%
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-amber-500/70">
                          <Zap className="w-3 h-3" />
                          Urgency: {Math.round(suggestion.urgencyScore * 100)}%
                        </div>
                        <span className="text-[10px] text-lumina-on-surface-variant/30">shown {suggestion.shownCount}×</span>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => handleSuggestionAction(suggestion, 'accepted')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-medium text-emerald-500 hover:bg-emerald-500/20 transition-all"
                        >
                          <ThumbsUp className="w-3 h-3" /> Accept
                        </button>
                        <button
                          onClick={() => handleSuggestionAction(suggestion, 'dismissed')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-lumina-surface-variant/10 border border-lumina-outline/20 text-[10px] font-medium text-lumina-on-surface-variant/50 hover:bg-lumina-surface-variant/20 transition-all"
                        >
                          <ThumbsDown className="w-3 h-3" /> Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
