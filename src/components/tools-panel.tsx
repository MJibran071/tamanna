'use client';

import { useState, useMemo } from 'react';
import {
  Globe,
  FileText,
  ImagePlus,
  Eye,
  BarChart3,
  Code2,
  Languages,
  AlignLeft,
  Calculator,
  FlaskConical,
  PenTool,
  Search,
  Sparkles,
  Pencil,
  Terminal,
  FileBarChart,
  ArrowRight,
  Lightbulb,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentCard {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  examples: string[];
}

interface ToolsPanelProps {
  onAgentSelect?: (query: string, agentId: string) => void;
}

const agents: AgentCard[] = [
  {
    id: 'web_search',
    name: 'Web Search',
    description: 'Search the web for up-to-date information from multiple sources.',
    icon: Globe,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    examples: ['"Latest AI news"', '"Python tutorials"', '"Weather tomorrow"'],
  },
  {
    id: 'web_reader',
    name: 'Web Reader',
    description: 'Read and extract text content from any URL on the web.',
    icon: FileText,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    examples: ['"Read this article"', '"Summarize this page"'],
  },
  {
    id: 'image_gen',
    name: 'Image Generator',
    description: 'Generate stunning images from text descriptions using AI.',
    icon: ImagePlus,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    examples: ['"A sunset over mountains"', '"Abstract art"', '"Cat astronaut"'],
  },
  {
    id: 'vlm',
    name: 'Vision Analyzer',
    description: 'Analyze images, describe scenes, read text, and identify objects.',
    icon: Eye,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    examples: ['"What is in this image?"', '"Describe this photo"'],
  },
  {
    id: 'analysis',
    name: 'Data Analysis',
    description: 'Analyze data, compare options, and provide deep insights.',
    icon: BarChart3,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    examples: ['"Compare these options"', '"Analyze this data"'],
  },
  {
    id: 'code_assistant',
    name: 'Code Assistant',
    description: 'Generate, explain, debug, and review code in any language.',
    icon: Code2,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    examples: ['"Write a React component"', '"Debug this code"', '"Explain this function"'],
  },
  {
    id: 'translator',
    name: 'Translator',
    description: 'Translate text between languages with high accuracy.',
    icon: Languages,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    examples: ['"Translate to Spanish"', '"What does this mean?"'],
  },
  {
    id: 'summarizer',
    name: 'Summarizer',
    description: 'Summarize articles, documents, and conversations.',
    icon: AlignLeft,
    color: 'text-lime-600',
    bgColor: 'bg-lime-500/10',
    examples: ['"Summarize this article"', '"Give me the key points"'],
  },
  {
    id: 'math',
    name: 'Math Expert',
    description: 'Solve equations, calculus, statistics, and more step by step.',
    icon: Calculator,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    examples: ['"Solve x\u00b2 + 5x + 6 = 0"', '"What is 15% of 240?"'],
  },
  {
    id: 'research',
    name: 'Research Agent',
    description: 'Deep research: searches, reads, and synthesizes comprehensive reports.',
    icon: FlaskConical,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    examples: ['"Research quantum computing"', '"Deep dive into AI ethics"'],
  },
  {
    id: 'writing',
    name: 'Writing Assistant',
    description: 'Write emails, articles, stories, reports, and any content.',
    icon: PenTool,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    examples: ['"Draft a professional email"', '"Write a blog post"'],
  },
];

const agentCategories: Record<string, string> = {
  web_search: 'Search',
  web_reader: 'Search',
  image_gen: 'Create',
  vlm: 'Create',
  analysis: 'Analyze',
  code_assistant: 'Code',
  translator: 'Write',
  summarizer: 'Write',
  math: 'Analyze',
  research: 'Search',
  writing: 'Write',
};

const categoryConfig: { label: string; value: string; icon: React.ElementType }[] = [
  { label: 'All', value: 'All', icon: Sparkles },
  { label: 'Search', value: 'Search', icon: Search },
  { label: 'Create', value: 'Create', icon: ImagePlus },
  { label: 'Analyze', value: 'Analyze', icon: FileBarChart },
  { label: 'Code', value: 'Code', icon: Terminal },
  { label: 'Write', value: 'Write', icon: Pencil },
];

const quickActions = [
  { icon: Search, label: 'Research a topic', query: 'Research the latest developments in AI' },
  { icon: Pencil, label: 'Write something', query: 'Help me write a professional email' },
  { icon: Terminal, label: 'Code help', query: 'Help me write a React component' },
  { icon: FileBarChart, label: 'Analyze data', query: 'Analyze the pros and cons of this' },
];

/** Strip surrounding quotes from example strings */
function stripQuotes(str: string): string {
  const trimmed = str.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export default function ToolsPanel({ onAgentSelect }: ToolsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const matchesCategory =
        activeCategory === 'All' || agentCategories[agent.id] === activeCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        agent.name.toLowerCase().includes(query) ||
        agent.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  const handleQuickAction = (query: string) => {
    onAgentSelect?.(query, '');
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      {/* Header with gradient icon badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-start justify-between"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
            Tools
          </h2>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-1">
            {agents.length} AI agents at your service
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lumina-primary/20 to-lumina-primary/5 flex items-center justify-center ring-1 ring-lumina-primary/10">
          <FlaskConical className="w-6 h-6 text-lumina-primary" />
        </div>
      </motion.div>

      {/* Compact tip card */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="glass-card rounded-xl p-3 flex items-center gap-3"
      >
        <div className="shrink-0 w-7 h-7 rounded-lg bg-lumina-primary/10 flex items-center justify-center">
          <Lightbulb className="w-3.5 h-3.5 text-lumina-primary" />
        </div>
        <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant leading-relaxed">
          Just ask naturally &mdash; Tamanna orchestrates agents automatically. No need to pick tools manually.
        </p>
      </motion.div>

      {/* Quick Action Bar */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="flex flex-wrap gap-2"
      >
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => handleQuickAction(action.query)}
            className="glass-pill flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-lumina-on-surface-variant hover:text-lumina-on-surface hover:bg-lumina-primary/10 transition-all duration-200 cursor-pointer"
          >
            <action.icon className="w-3.5 h-3.5" />
            {action.label}
          </button>
        ))}
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lumina-on-surface-variant/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/60 dark:bg-white/5 border border-lumina-outline-variant/20 font-[family-name:var(--font-body)] text-sm text-lumina-on-surface placeholder:text-lumina-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-lumina-primary/30 focus:border-lumina-primary/30 transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-lumina-on-surface-variant/10 flex items-center justify-center hover:bg-lumina-on-surface-variant/20 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3 text-lumina-on-surface-variant/60" />
          </button>
        )}
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
        className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
      >
        {categoryConfig.map((cat) => {
          const isActive = activeCategory === cat.value;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-lumina-primary text-lumina-on-primary shadow-sm'
                  : 'glass-pill text-lumina-on-surface-variant hover:text-lumina-on-surface hover:bg-white/60 dark:hover:bg-white/10'
              }`}
            >
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
              {cat.value !== 'All' && (
                <span className={`ml-0.5 text-[10px] ${isActive ? 'text-lumina-on-primary/70' : 'text-lumina-on-surface-variant/40'}`}>
                  {agents.filter((a) => agentCategories[a.id] === cat.value).length}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Agent Grid */}
      <AnimatePresence mode="popLayout">
        {filteredAgents.length > 0 ? (
          <motion.div
            key={`${activeCategory}-${searchQuery}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar"
          >
            {filteredAgents.map((agent) => (
              <AgentCardComponent
                key={agent.id}
                agent={agent}
                variants={itemVariants}
                onSelect={onAgentSelect}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-lumina-surface-variant/30 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-lumina-on-surface-variant/30" />
            </div>
            <p className="font-[family-name:var(--font-body)] text-sm font-medium text-lumina-on-surface-variant/60">
              No agents found
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant/40 mt-1 max-w-[240px]">
              {searchQuery
                ? `No results for \"${searchQuery}\". Try a different search term.`
                : 'No agents in this category.'}
            </p>
            {(searchQuery || activeCategory !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('All');
                }}
                className="mt-3 text-xs text-lumina-primary hover:text-lumina-primary/80 font-medium transition-colors cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Individual agent card with interactive features */
function AgentCardComponent({
  agent,
  variants,
  onSelect,
}: {
  agent: AgentCard;
  variants: {
    hidden: { opacity: number; y: number; scale: number };
    visible: {
      opacity: number;
      y: number;
      scale: number;
      transition: { duration: number; ease: string };
    };
  };
  onSelect?: (query: string, agentId: string) => void;
}) {
  const firstQuery = stripQuotes(agent.examples[0] || agent.description);

  return (
    <motion.div
      variants={variants}
      whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(70,72,212,0.10)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect?.(firstQuery, agent.id)}
      className="glass-card rounded-2xl p-4 cursor-pointer group relative overflow-hidden"
    >
      {/* Gradient left border accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(to bottom, var(--agent-color), transparent)' }}
      />

      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3">
          <div
            className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${agent.bgColor} group-hover:scale-110 transition-transform duration-200`}
            style={{ '--agent-color': getComputedColor(agent.color) } as React.CSSProperties}
          >
            <agent.icon className={`w-5 h-5 ${agent.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-[family-name:var(--font-body)] text-sm font-semibold text-lumina-on-surface">
              {agent.name}
            </h3>
          </div>
        </div>
        {/* Try button - visible on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(firstQuery, agent.id);
          }}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-lumina-primary bg-lumina-primary/10 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-200 hover:bg-lumina-primary/20 cursor-pointer"
        >
          Try
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant leading-relaxed mb-3">
        {agent.description}
      </p>

      {/* Example query chips */}
      <div className="flex flex-wrap gap-1.5">
        {agent.examples.map((ex, i) => {
          const queryText = stripQuotes(ex);
          return (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(queryText, agent.id);
              }}
              className="glass-pill px-2 py-0.5 text-[10px] font-mono text-lumina-on-surface-variant/60 hover:text-lumina-on-surface hover:bg-lumina-primary/10 transition-all duration-200 cursor-pointer"
            >
              {queryText}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/** Map tailwind text color classes to hex values for CSS custom properties */
function getComputedColor(colorClass: string): string {
  const map: Record<string, string> = {
    'text-sky-500': '#0ea5e9',
    'text-emerald-500': '#10b981',
    'text-pink-500': '#ec4899',
    'text-violet-500': '#8b5cf6',
    'text-amber-500': '#f59e0b',
    'text-cyan-500': '#06b6d4',
    'text-indigo-500': '#6366f1',
    'text-lime-600': '#65a30d',
    'text-orange-500': '#f97316',
    'text-rose-500': '#f43f5e',
    'text-teal-500': '#14b8a6',
  };
  return map[colorClass] || '#6b7280';
}
