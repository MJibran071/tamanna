'use client';

import { useState, useCallback } from 'react';
import {
  Globe,
  Search,
  FileText,
  BarChart3,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Sparkles,
  RotateCcw,
  BookOpen,
  GitCompareArrows,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain?: string;
  favicon?: string;
}

interface PageContent {
  title: string;
  url: string;
  content: string;
  wordCount?: number;
}

interface ComparisonItem {
  name: string;
  attributes?: Record<string, string>;
  score?: number;
}

interface ComparisonResult {
  summary: string;
  items: ComparisonItem[];
  recommendation?: string;
}

interface BrowserAgentPanelProps {
  searchQuery?: string;
  searchResults?: SearchResult[];
  pageContent?: PageContent;
  comparisonResults?: ComparisonResult;
  isLoading?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=32`;
  } catch {
    return '';
  }
}

// ─── Animation Variants ────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.3, ease: 'easeOut' },
  }),
};

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ─── Sub-components ────────────────────────────────────────────────────────

function SearchSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center text-center min-h-[300px]"
    >
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500/15 to-emerald-500/5 flex items-center justify-center mb-5">
        <Globe className="w-10 h-10 text-sky-500/40" />
      </div>
      <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-lumina-on-surface">
        Browse the Web
      </p>
      <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-2 max-w-[280px]">
        Search anything. Browse any site. Tamanna does it for you.
      </p>
      <div className="flex items-center gap-2 mt-6">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
          <Search className="w-4 h-4 text-sky-500" />
        </div>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
          <GitCompareArrows className="w-4 h-4 text-orange-500" />
        </div>
      </div>
    </motion.div>
  );
}

function SearchResultsView({ results, onReadMore }: { results: SearchResult[]; onReadMore: (url: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Search className="w-4 h-4 text-sky-500" />
        <span className="text-xs font-medium text-lumina-on-surface-variant">
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </span>
      </div>
      {results.map((result, i) => (
        <motion.div
          key={result.url}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ scale: 1.01, boxShadow: '0 8px 30px rgba(70,72,212,0.10)' }}
          className="glass-card rounded-xl p-4 border border-white/10 cursor-pointer group"
          onClick={() => onReadMore(result.url)}
        >
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-white/60 dark:bg-white/5 flex items-center justify-center border border-lumina-outline-variant/20">
              {result.favicon ? (
                <img src={result.favicon} alt="" className="w-4 h-4 rounded" />
              ) : (
                <Globe className="w-4 h-4 text-lumina-on-surface-variant/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-lumina-on-surface-variant/40 truncate">{extractDomain(result.url)}</span>
                <ExternalLink className="w-3 h-3 text-lumina-on-surface-variant/20 shrink-0 group-hover:text-lumina-primary transition-colors" />
              </div>
              <h3 className="text-sm font-semibold text-lumina-on-surface mt-0.5 line-clamp-1 group-hover:text-lumina-primary transition-colors">
                {result.title}
              </h3>
              <p className="text-xs text-lumina-on-surface-variant/60 mt-1 line-clamp-2 leading-relaxed">
                {result.snippet}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end mt-2">
            <span className="text-[10px] text-lumina-primary font-medium flex items-center gap-1 group-hover:gap-1.5 transition-all">
              Read more <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function PageContentView({ page, onBack }: { page: PageContent; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-lumina-on-surface-variant/60 hover:text-lumina-primary transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to results
      </button>

      <div className="glass-card rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-lumina-on-surface truncate">{page.title}</h3>
            <span className="text-[10px] text-lumina-on-surface-variant/40 truncate block">{extractDomain(page.url)}</span>
          </div>
        </div>

        {page.wordCount && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-lumina-surface-variant/20 text-lumina-on-surface-variant/50">
              {page.wordCount.toLocaleString()} words
            </span>
          </div>
        )}

        <div className="max-h-96 overflow-y-auto rounded-lg bg-white/30 dark:bg-white/5 p-3">
          <div className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant/80 leading-relaxed whitespace-pre-wrap">
            {page.content}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ComparisonView({ comparison }: { comparison: ComparisonResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="glass-card rounded-xl p-4 border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.02] to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <GitCompareArrows className="w-4 h-4 text-orange-500" />
          <span className="text-[11px] font-medium text-orange-500 uppercase tracking-wider">AI Comparison</span>
        </div>
        <p className="text-sm text-lumina-on-surface leading-relaxed">{comparison.summary}</p>
      </div>

      {comparison.recommendation && (
        <div className="glass-card rounded-xl p-3 border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.02] to-transparent">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-500">Recommendation</span>
          </div>
          <p className="text-xs text-lumina-on-surface-variant mt-1">{comparison.recommendation}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {comparison.items.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-xl p-4 border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-lumina-on-surface">{item.name}</h4>
              {item.score != null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lumina-primary/10 text-lumina-primary font-semibold">
                  {Math.round(item.score * 100)}%
                </span>
              )}
            </div>
            {item.attributes && (
              <div className="space-y-1.5">
                {Object.entries(item.attributes).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-[11px]">
                    <span className="text-lumina-on-surface-variant/50">{key}</span>
                    <span className="text-lumina-on-surface font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function BrowserAgentPanel({
  searchQuery: initialQuery,
  searchResults: initialResults,
  pageContent: initialPageContent,
  comparisonResults: initialComparison,
  isLoading: externalLoading,
}: BrowserAgentPanelProps) {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<SearchResult[]>(initialResults || []);
  const [pageContent, setPageContent] = useState<PageContent | null>(initialPageContent || null);
  const [comparison, setComparison] = useState<ComparisonResult | null>(initialComparison || null);
  const [isLoading, setIsLoading] = useState(externalLoading || false);
  const [view, setView] = useState<'empty' | 'search' | 'page' | 'comparison'>(
    initialResults?.length ? 'search'
      : initialPageContent ? 'page'
      : initialComparison ? 'comparison'
      : 'empty'
  );

  // Sync external props
  const currentView = initialResults?.length ? 'search'
    : initialPageContent ? 'page'
    : initialComparison ? 'comparison'
    : view;

  // ── Handlers ─────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setView('search');
    setResults([]);
    setPageContent(null);
    setComparison(null);
    try {
      const res = await fetch('/api/browser/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        if (!data.results?.length) {
          toast({ title: 'No results', description: 'Try a different search query.' });
        }
      } else {
        toast({ title: 'Search failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  const handleReadPage = useCallback(async (url: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/browser/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        setPageContent(data);
        setView('page');
      } else {
        toast({ title: 'Failed to read page', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCompare = useCallback(async (items: unknown[], type: string) => {
    setIsLoading(true);
    setView('comparison');
    try {
      const res = await fetch('/api/browser/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, type }),
      });
      if (res.ok) {
        const data = await res.json();
        setComparison(data);
      } else {
        toast({ title: 'Comparison failed', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Network error', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBackToSearch = useCallback(() => {
    setPageContent(null);
    setView('search');
  }, []);

  const handleReset = useCallback(() => {
    setQuery('');
    setResults([]);
    setPageContent(null);
    setComparison(null);
    setView('empty');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="w-full max-w-xl mx-auto space-y-5"
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <motion.div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center ring-1 ring-sky-500/10">
              <Globe className="w-4 h-4 text-sky-500" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
              Browser Agent
            </h2>
          </div>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-1 ml-[42px]">
            Search, browse, and compare — hands-free
          </p>
        </div>
        {(currentView !== 'empty') && (
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-lumina-on-surface-variant/40 hover:text-lumina-primary hover:bg-lumina-primary/10 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </motion.div>

      {/* ── Search Bar ────────────────────────────────────────────────── */}
      <motion.div className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
        <Search className="w-4 h-4 text-lumina-on-surface-variant/50 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search the web or enter a URL..."
          className="flex-1 bg-transparent outline-none text-lumina-on-surface placeholder:text-lumina-on-surface-variant/40 font-[family-name:var(--font-body)] text-sm"
        />
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <Loader2 className="w-4 h-4 text-lumina-primary animate-spin" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SearchSkeleton />
          </motion.div>
        ) : currentView === 'empty' ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState />
          </motion.div>
        ) : currentView === 'page' && pageContent ? (
          <motion.div key="page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PageContentView page={pageContent} onBack={handleBackToSearch} />
          </motion.div>
        ) : currentView === 'comparison' && comparison ? (
          <motion.div key="comparison" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ComparisonView comparison={comparison} />
          </motion.div>
        ) : currentView === 'search' ? (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <SearchResultsView results={results} onReadMore={handleReadPage} />
          </motion.div>
        ) : (
          <motion.div key="empty-fallback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
