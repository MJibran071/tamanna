'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plug,
  Search,
  X,
  Link2,
  Zap,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Mail,
  FileText,
  Rss,
  Globe,
  Code2,
  BarChart3,
  Eye,
  Volume2,
  Mic,
  Languages,
  ImagePlus,
  FlaskConical,
  PenTool,
  Calculator,
  Terminal,
  Phone,
  Video,
  Music,
  ShoppingBag,
  Cloud,
  FolderOpen,
  CalendarDays,
  MapPin,
  Bell,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────

interface PluginItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  type: string;
  config: Record<string, unknown> | null;
  status: string;
  enabled: boolean;
  lastSyncAt: string | null;
}

interface PluginDefinition {
  type: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  category: 'connector' | 'skill' | 'data_source';
}

// ─── Plugin Definitions — real SDK capabilities mapped to plugins ────────

const PLUGIN_DEFINITIONS: PluginDefinition[] = [
  // ── Connectors ──
  { type: 'telegram', name: 'Telegram', description: 'Connect your Telegram bot to send and receive messages', icon: MessageSquare, color: 'text-sky-500', bgColor: 'bg-sky-500/10', category: 'connector' },
  { type: 'whatsapp', name: 'WhatsApp', description: 'Bridge WhatsApp conversations with Tamanna', icon: Phone, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', category: 'connector' },
  { type: 'instagram', name: 'Instagram', description: 'Connect Instagram DMs for social assistant features', icon: CameraIcon, color: 'text-pink-500', bgColor: 'bg-pink-500/10', category: 'connector' },
  { type: 'x_twitter', name: 'X (Twitter)', description: 'Monitor and respond to X/Twitter mentions and DMs', icon: XIcon, color: 'text-gray-700 dark:text-gray-200', bgColor: 'bg-gray-500/10', category: 'connector' },
  { type: 'gmail', name: 'Gmail', description: 'Read, draft, and send emails through Gmail', icon: Mail, color: 'text-red-500', bgColor: 'bg-red-500/10', category: 'connector' },
  { type: 'slack', name: 'Slack', description: 'Integrate with Slack workspaces for team assistance', icon: HashIcon, color: 'text-violet-500', bgColor: 'bg-violet-500/10', category: 'connector' },
  { type: 'discord', name: 'Discord', description: 'Join Discord servers as an AI assistant', icon: GamepadIcon, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10', category: 'connector' },
  { type: 'github', name: 'GitHub', description: 'Monitor repos, issues, and pull requests', icon: Code2, color: 'text-gray-800 dark:text-white', bgColor: 'bg-gray-500/10', category: 'connector' },

  // ── Skills ──
  { type: 'asr', name: 'Speech Recognition', description: 'Transcribe audio to text in real-time', icon: Mic, color: 'text-amber-500', bgColor: 'bg-amber-500/10', category: 'skill' },
  { type: 'tts', name: 'Text to Speech', description: 'Convert text responses to natural-sounding voice', icon: Volume2, color: 'text-teal-500', bgColor: 'bg-teal-500/10', category: 'skill' },
  { type: 'llm', name: 'Language Model', description: 'Advanced conversational AI with reasoning capabilities', icon: Zap, color: 'text-lumina-primary', bgColor: 'bg-lumina-primary/10', category: 'skill' },
  { type: 'vlm', name: 'Vision Analysis', description: 'Understand images, describe scenes, read documents', icon: Eye, color: 'text-violet-500', bgColor: 'bg-violet-500/10', category: 'skill' },
  { type: 'image_generation', name: 'Image Generation', description: 'Create images from text descriptions using AI', icon: ImagePlus, color: 'text-pink-500', bgColor: 'bg-pink-500/10', category: 'skill' },
  { type: 'web_search', name: 'Web Search', description: 'Search the web for up-to-date information', icon: Globe, color: 'text-sky-500', bgColor: 'bg-sky-500/10', category: 'skill' },
  { type: 'web_reader', name: 'Web Reader', description: 'Extract and read content from any web page URL', icon: FileText, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', category: 'skill' },
  { type: 'translation', name: 'Translation', description: 'Translate text between languages with high accuracy', icon: Languages, color: 'text-blue-500', bgColor: 'bg-blue-500/10', category: 'skill' },
  { type: 'code_assistant', name: 'Code Assistant', description: 'Generate, explain, debug, and review code', icon: Terminal, color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', category: 'skill' },
  { type: 'math', name: 'Math Expert', description: 'Solve equations, calculus, statistics step by step', icon: Calculator, color: 'text-orange-500', bgColor: 'bg-orange-500/10', category: 'skill' },
  { type: 'data_analysis', name: 'Data Analysis', description: 'Analyze data, compare options, provide deep insights', icon: BarChart3, color: 'text-amber-500', bgColor: 'bg-amber-500/10', category: 'skill' },
  { type: 'research', name: 'Research Agent', description: 'Deep research: searches, reads, synthesizes reports', icon: FlaskConical, color: 'text-rose-500', bgColor: 'bg-rose-500/10', category: 'skill' },
  { type: 'writing', name: 'Writing Assistant', description: 'Write emails, articles, stories, and any content', icon: PenTool, color: 'text-teal-500', bgColor: 'bg-teal-500/10', category: 'skill' },

  // ── Data Sources ──
  { type: 'local_files', name: 'Local Files', description: 'Upload and index local documents for context', icon: FolderOpen, color: 'text-amber-500', bgColor: 'bg-amber-500/10', category: 'data_source' },
  { type: 'rss_feeds', name: 'RSS Feeds', description: 'Subscribe to RSS feeds for automatic content ingestion', icon: Rss, color: 'text-orange-500', bgColor: 'bg-orange-500/10', category: 'data_source' },
  { type: 'api_endpoints', name: 'API Endpoints', description: 'Connect external REST/GraphQL APIs as data sources', icon: Globe, color: 'text-sky-500', bgColor: 'bg-sky-500/10', category: 'data_source' },
  { type: 'calendar', name: 'Calendar', description: 'Sync with Google/Apple Calendar for scheduling context', icon: CalendarDays, color: 'text-blue-500', bgColor: 'bg-blue-500/10', category: 'data_source' },
  { type: 'location', name: 'Location Services', description: 'Provide location-aware responses and local search', icon: MapPin, color: 'text-red-500', bgColor: 'bg-red-500/10', category: 'data_source' },
  { type: 'notifications', name: 'Notifications', description: 'Push notification channels for alerts and reminders', icon: Bell, color: 'text-purple-500', bgColor: 'bg-purple-500/10', category: 'data_source' },
  { type: 'media_library', name: 'Media Library', description: 'Index photos, videos, and audio files for AI analysis', icon: Music, color: 'text-pink-500', bgColor: 'bg-pink-500/10', category: 'data_source' },
  { type: 'cloud_storage', name: 'Cloud Storage', description: 'Connect Google Drive, Dropbox, or S3 buckets', icon: Cloud, color: 'text-sky-500', bgColor: 'bg-sky-500/10', category: 'data_source' },
  { type: 'ecommerce', name: 'E-Commerce', description: 'Connect Shopify, WooCommerce, or Amazon for shopping assistance', icon: ShoppingBag, color: 'text-amber-500', bgColor: 'bg-amber-500/10', category: 'data_source' },
  { type: 'video_platforms', name: 'Video Platforms', description: 'Connect YouTube, Vimeo for video content analysis', icon: Video, color: 'text-red-500', bgColor: 'bg-red-500/10', category: 'data_source' },
];

// ─── Custom SVG Icons ──────────────────────────────────────────────────────

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function GamepadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15" cy="13" r="1" />
      <circle cx="18" cy="11" r="1" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </svg>
  );
}

// ─── Animation Variants ───────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

// ─── Component ─────────────────────────────────────────────────────────────

type CategoryTab = 'all' | 'connector' | 'skill' | 'data_source';

export default function PluginsPanel() {
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingType, setConnectingType] = useState<string | null>(null);

  // Fetch plugins from the database
  useEffect(() => {
    fetchPlugins();
  }, []);

  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/plugins');
      if (res.ok) {
        const data = await res.json();
        setPlugins(data);
      }
    } catch {
      // Silently fail — plugins will just show as disconnected
    } finally {
      setLoading(false);
    }
  };

  // Merge definitions with DB status
  const mergedPlugins = useMemo(() => {
    return PLUGIN_DEFINITIONS.map((def) => {
      const existing = plugins.find((p) => p.type === def.type && p.category === def.category);
      return {
        ...def,
        status: existing?.status || 'disconnected',
        enabled: existing?.enabled ?? true,
        lastSyncAt: existing?.lastSyncAt || null,
        dbId: existing?.id || null,
      };
    });
  }, [plugins]);

  const filteredPlugins = useMemo(() => {
    return mergedPlugins.filter((p) => {
      const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [mergedPlugins, activeCategory, searchQuery]);

  const stats = useMemo(() => ({
    total: mergedPlugins.length,
    connected: mergedPlugins.filter((p) => p.status === 'connected').length,
    connectors: mergedPlugins.filter((p) => p.category === 'connector').length,
    skills: mergedPlugins.filter((p) => p.category === 'skill').length,
    dataSources: mergedPlugins.filter((p) => p.category === 'data_source').length,
  }), [mergedPlugins]);

  const handleConnect = useCallback(async (plugin: typeof mergedPlugins[0]) => {
    if (plugin.category === 'skill') {
      // Skills are built-in — toggle enabled
      const newStatus = plugin.status === 'connected' ? 'disconnected' : 'connected';
      setConnectingType(plugin.type);
      try {
        await fetch('/api/plugins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: plugin.name,
            description: plugin.description,
            category: plugin.category,
            type: plugin.type,
            status: newStatus,
          }),
        });
        toast({
          title: newStatus === 'connected' ? `${plugin.name} enabled` : `${plugin.name} disabled`,
          description: newStatus === 'connected'
            ? `${plugin.name} is now active and ready to use.`
            : `${plugin.name} has been deactivated.`,
        });
        await fetchPlugins();
      } catch {
        toast({ title: 'Error', description: `Failed to update ${plugin.name}`, variant: 'destructive' });
      } finally {
        setConnectingType(null);
      }
      return;
    }

    // For connectors and data sources — show connect workflow
    setConnectingType(plugin.type);
    try {
      await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: plugin.name,
          description: plugin.description,
          category: plugin.category,
          type: plugin.type,
          status: 'connected',
        }),
      });
      toast({
        title: `${plugin.name} connected`,
        description: `${plugin.name} has been successfully linked to Tamanna.`,
      });
      await fetchPlugins();
    } catch {
      toast({ title: 'Error', description: `Failed to connect ${plugin.name}`, variant: 'destructive' });
    } finally {
      setConnectingType(null);
    }
  }, [fetchPlugins]);

  const handleDisconnect = useCallback(async (plugin: typeof mergedPlugins[0]) => {
    setConnectingType(plugin.type);
    try {
      await fetch('/api/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: plugin.name,
          description: plugin.description,
          category: plugin.category,
          type: plugin.type,
          status: 'disconnected',
        }),
      });
      toast({
        title: `${plugin.name} disconnected`,
        description: `${plugin.name} has been disconnected from Tamanna.`,
      });
      await fetchPlugins();
    } catch {
      toast({ title: 'Error', description: `Failed to disconnect ${plugin.name}`, variant: 'destructive' });
    } finally {
      setConnectingType(null);
    }
  }, [fetchPlugins]);

  return (
    <div className="w-full max-w-xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-start justify-between"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
            Plugins
          </h2>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-1">
            {stats.total} plugins &middot; {stats.connected} connected
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lumina-primary/20 to-lumina-primary/5 flex items-center justify-center ring-1 ring-lumina-primary/10">
          <Plug className="w-6 h-6 text-lumina-primary" />
        </div>
      </motion.div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="grid grid-cols-3 gap-2"
      >
        {[
          { label: 'Connectors', count: stats.connectors, icon: Link2 },
          { label: 'Skills', count: stats.skills, icon: Zap },
          { label: 'Data Sources', count: stats.dataSources, icon: Database },
        ].map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-3 text-center">
            <stat.icon className="w-4 h-4 text-lumina-primary mx-auto mb-1" />
            <p className="text-lg font-semibold text-lumina-on-surface tabular-nums">{stat.count}</p>
            <p className="text-[10px] text-lumina-on-surface-variant">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1"
      >
        {[
          { value: 'all' as const, label: 'All', icon: Plug },
          { value: 'connector' as const, label: 'Connectors', icon: Link2 },
          { value: 'skill' as const, label: 'Skills', icon: Zap },
          { value: 'data_source' as const, label: 'Data Sources', icon: Database },
        ].map((cat) => {
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
            </button>
          );
        })}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.3 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lumina-on-surface-variant/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search plugins..."
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

      {/* Plugin Grid */}
      <AnimatePresence mode="popLayout">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-6 h-6 text-lumina-primary animate-spin" />
          </div>
        ) : filteredPlugins.length > 0 ? (
          <motion.div
            key={`${activeCategory}-${searchQuery}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar"
          >
            {filteredPlugins.map((plugin) => (
              <PluginCard
                key={`${plugin.category}-${plugin.type}`}
                plugin={plugin}
                variants={itemVariants}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                isConnecting={connectingType === plugin.type}
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
              No plugins found
            </p>
            {(searchQuery || activeCategory !== 'all') && (
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
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

// ─── Plugin Card ───────────────────────────────────────────────────────────

function PluginCard({
  plugin,
  variants,
  onConnect,
  onDisconnect,
  isConnecting,
}: {
  plugin: {
    type: string;
    name: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    category: string;
    status: string;
    enabled: boolean;
    lastSyncAt: string | null;
  };
  variants: {
    hidden: { opacity: number; y: number; scale: number };
    visible: {
      opacity: number;
      y: number;
      scale: number;
      transition: { duration: number; ease: string };
    };
  };
  onConnect: (p: typeof plugin) => void;
  onDisconnect: (p: typeof plugin) => void;
  isConnecting: boolean;
}) {
  const isConnected = plugin.status === 'connected';
  const Icon = plugin.icon;

  return (
    <motion.div
      variants={variants}
      whileHover={{ scale: 1.01 }}
      className="glass-card rounded-2xl p-4 group relative overflow-hidden"
    >
      {/* Top Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${plugin.bgColor}`}>
            <Icon className={`w-5 h-5 ${plugin.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-[family-name:var(--font-body)] text-sm font-semibold text-lumina-on-surface truncate">
                {plugin.name}
              </h3>
              <StatusBadge status={plugin.status} />
            </div>
            <p className="text-[10px] text-lumina-on-surface-variant/50 uppercase tracking-wider mt-0.5">
              {plugin.category.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant leading-relaxed mb-3">
        {plugin.description}
      </p>

      {/* Action Row */}
      <div className="flex items-center justify-between">
        {isConnected && plugin.lastSyncAt && (
          <span className="text-[10px] text-lumina-on-surface-variant/40">
            Synced {formatRelativeTime(plugin.lastSyncAt)}
          </span>
        )}
        {!isConnected && (
          <span />
        )}

        {isConnecting ? (
          <div className="flex items-center gap-1 text-xs text-lumina-primary">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Updating...</span>
          </div>
        ) : isConnected ? (
          <button
            onClick={() => onDisconnect(plugin)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all duration-200 cursor-pointer"
          >
            <XCircle className="w-3 h-3" />
            Disconnect
          </button>
        ) : (
          <button
            onClick={() => onConnect(plugin)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-lumina-primary bg-lumina-primary/10 hover:bg-lumina-primary/20 transition-all duration-200 cursor-pointer"
          >
            <ChevronRight className="w-3 h-3" />
            {plugin.category === 'skill' ? 'Enable' : 'Connect'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'connected') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-500/10 text-emerald-600">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Active
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-red-500/10 text-red-500">
        <AlertCircle className="w-2.5 h-2.5" />
        Error
      </span>
    );
  }
  return null;
}

// ─── Utility ───────────────────────────────────────────────────────────────

function formatRelativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
