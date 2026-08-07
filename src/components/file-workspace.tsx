'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Image as ImageIcon,
  FileText,
  Code2,
  BarChart3,
  Music,
  LayoutGrid,
  List,
  Search,
  X,
  Eye,
  Download,
  Trash2,
  FolderOpen,
  ArrowUpDown,
  Copy,
  Check,
  Clock,
  HardDrive,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface ArtifactSummary {
  id: string;
  taskId: string;
  type: string;
  mimeType: string;
  url: string | null;
  title: string | null;
  createdAt: string;
}

interface ArtifactFull extends ArtifactSummary {
  contentBase64: string | null;
}

interface FileWorkspaceProps {
  className?: string;
}

type ViewMode = 'grid' | 'list';
type SortMode = 'newest' | 'oldest' | 'name';
type FilterType = 'all' | 'image' | 'document' | 'code' | 'data' | 'audio';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  image: { icon: ImageIcon, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', label: 'Image' },
  document: { icon: FileText, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Document' },
  code: { icon: Code2, color: 'text-purple-500', bgColor: 'bg-purple-500/10', label: 'Code' },
  data: { icon: BarChart3, color: 'text-orange-500', bgColor: 'bg-orange-500/10', label: 'Data' },
  audio: { icon: Music, color: 'text-pink-500', bgColor: 'bg-pink-500/10', label: 'Audio' },
};

const FILTER_CHIPS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'document', label: 'Documents' },
  { value: 'code', label: 'Code' },
  { value: 'data', label: 'Data' },
  { value: 'audio', label: 'Audio' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name', label: 'Name' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

function estimateSize(type: string): string {
  const sizeMap: Record<string, string> = {
    image: '~150 KB', document: '~24 KB', code: '~4 KB', data: '~8 KB', audio: '~320 KB',
  };
  return sizeMap[type] || '~12 KB';
}

function getLangFromMime(mimeType: string): string {
  if (mimeType.includes('javascript') || mimeType.includes('json')) return 'javascript';
  if (mimeType.includes('typescript')) return 'typescript';
  if (mimeType.includes('python')) return 'python';
  if (mimeType.includes('html')) return 'html';
  if (mimeType.includes('css')) return 'css';
  return 'text';
}

function getDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

type ItemVariantType = {
  hidden: { opacity: number; y: number; scale: number };
  visible: { opacity: number; y: number; scale: number; transition: { duration: number; ease: string } };
};

export default function FileWorkspace({ className }: FileWorkspaceProps) {
  const [artifacts, setArtifacts] = useState<ArtifactSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactFull | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ArtifactSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchArtifacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (filter !== 'all') params.set('type', filter);
      const res = await fetch(`/api/artifacts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setArtifacts(Array.isArray(data.artifacts) ? data.artifacts : []);
    } catch {
      toast.error('Failed to load artifacts');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  const displayed = useMemo(() => {
    let items = [...artifacts];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.type.toLowerCase().includes(q) ||
          a.mimeType.toLowerCase().includes(q)
      );
    }
    switch (sort) {
      case 'newest':
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'name':
        items.sort((a, b) => (a.title || 'Untitled').localeCompare(b.title || 'Untitled'));
        break;
    }
    return items;
  }, [artifacts, search, sort]);

  const openPreview = async (artifact: ArtifactSummary) => {
    try {
      setPreviewLoading(true);
      setPreviewArtifact(null);
      const res = await fetch(`/api/artifacts/${artifact.id}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setPreviewArtifact(data);
    } catch {
      toast.error('Failed to load artifact');
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadArtifact = async (artifact: ArtifactSummary) => {
    try {
      const res = await fetch(`/api/artifacts/${artifact.id}?download=true`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (artifact.title || 'artifact').replace(/[^a-zA-Z0-9._-]/g, '_');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Download failed');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/artifacts/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setArtifacts((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast.success('Artifact deleted');
    } catch {
      toast.error('Failed to delete artifact');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const copyContent = async () => {
    if (!previewArtifact?.contentBase64) return;
    try {
      const decoded = atob(previewArtifact.contentBase64);
      await navigator.clipboard.writeText(decoded);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className={`w-full max-w-xl mx-auto space-y-5 ${className || ''}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex items-start justify-between"
      >
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-lumina-on-surface tracking-tight">
            Files
          </h2>
          <p className="font-[family-name:var(--font-body)] text-sm text-lumina-on-surface-variant mt-1">
            {artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-lumina-primary/20 to-lumina-primary/5 flex items-center justify-center ring-1 ring-lumina-primary/10">
          <HardDrive className="w-6 h-6 text-lumina-primary" />
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lumina-on-surface-variant/40 pointer-events-none" />
        <input
          type="text"
          placeholder="Search artifacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-8 rounded-xl bg-white/60 dark:bg-white/5 border border-lumina-outline-variant/20 font-[family-name:var(--font-body)] text-sm text-lumina-on-surface placeholder:text-lumina-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-lumina-primary/30 focus:border-lumina-primary/30 transition-all duration-200"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-lumina-on-surface-variant/10 flex items-center justify-center hover:bg-lumina-on-surface-variant/20 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3 text-lumina-on-surface-variant/60" />
          </button>
        )}
      </motion.div>

      {/* Filter Chips + View Toggle + Sort */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="flex items-center gap-3"
      >
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1 no-scrollbar">
          {FILTER_CHIPS.map((chip) => {
            const isActive = filter === chip.value;
            return (
              <button
                key={chip.value}
                onClick={() => setFilter(chip.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-lumina-primary text-lumina-on-primary shadow-sm'
                    : 'glass-pill text-lumina-on-surface-variant hover:text-lumina-on-surface hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => {
                const idx = SORT_OPTIONS.findIndex((s) => s.value === sort);
                setSort(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].value);
              }}
              className="shrink-0 w-8 h-8 rounded-lg glass-pill flex items-center justify-center hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-lumina-on-surface-variant" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sort: {SORT_OPTIONS.find((s) => s.value === sort)?.label}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
              className="shrink-0 w-8 h-8 rounded-lg glass-pill flex items-center justify-center hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {viewMode === 'grid' ? (
                <List className="w-3.5 h-3.5 text-lumina-on-surface-variant" />
              ) : (
                <LayoutGrid className="w-3.5 h-3.5 text-lumina-on-surface-variant" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{viewMode === 'grid' ? 'List view' : 'Grid view'}</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>

      {/* Sort indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-1.5 px-1"
      >
        <Clock className="w-3 h-3 text-lumina-on-surface-variant/40" />
        <span className="text-[11px] text-lumina-on-surface-variant/50">
          Sorted by {SORT_OPTIONS.find((s) => s.value === sort)?.label.toLowerCase()}
          {displayed.length !== artifacts.length && (' - ' + displayed.length + ' of ' + artifacts.length)}
        </span>
      </motion.div>

      {/* Main content area */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="w-8 h-8 rounded-full border-2 border-lumina-primary/20 border-t-lumina-primary animate-spin" />
            <p className="mt-3 text-sm text-lumina-on-surface-variant/60">Loading artifacts...</p>
          </motion.div>
        ) : displayed.length > 0 ? (
          <motion.div
            key={`${viewMode}-${filter}-${sort}-${search}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {viewMode === 'grid' ? (
              <GridView
                artifacts={displayed}
                onPreview={openPreview}
                onDownload={downloadArtifact}
                onDelete={setDeleteTarget}
                itemVariants={itemVariants}
              />
            ) : (
              <ListView
                artifacts={displayed}
                onPreview={openPreview}
                onDownload={downloadArtifact}
                onDelete={setDeleteTarget}
                itemVariants={itemVariants}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-lumina-surface-variant/30 flex items-center justify-center mb-4">
              <FolderOpen className="w-6 h-6 text-lumina-on-surface-variant/30" />
            </div>
            <p className="font-[family-name:var(--font-body)] text-sm font-medium text-lumina-on-surface-variant/60">
              No artifacts yet
            </p>
            <p className="font-[family-name:var(--font-body)] text-xs text-lumina-on-surface-variant/40 mt-1 max-w-[240px]">
              {search || filter !== 'all'
                ? 'No matching artifacts. Try adjusting your filters.'
                : 'Artifacts generated during your conversations will appear here.'}
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilter('all');
                }}
                className="mt-3 text-xs text-lumina-primary hover:text-lumina-primary/80 font-medium transition-colors cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Dialog */}
      <Dialog
        open={!!previewArtifact || previewLoading}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewArtifact(null);
            setPreviewLoading(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-lumina-surface/95 backdrop-blur-xl border border-lumina-outline-variant/20 rounded-2xl">
          {previewLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-2 border-lumina-primary/20 border-t-lumina-primary animate-spin" />
              <p className="mt-3 text-sm text-lumina-on-surface-variant/60">Loading preview...</p>
            </div>
          ) : previewArtifact ? (
            <ArtifactPreview
              artifact={previewArtifact}
              copied={copied}
              onCopy={copyContent}
              onDownload={() => downloadArtifact(previewArtifact)}
              onDelete={() => {
                setDeleteTarget(previewArtifact);
                setPreviewArtifact(null);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-lumina-surface/95 backdrop-blur-xl border border-lumina-outline-variant/20 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lumina-on-surface">Delete artifact?</AlertDialogTitle>
            <AlertDialogDescription className="text-lumina-on-surface-variant">
              This artifact will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// -- Grid View

function GridView({
  artifacts,
  onPreview,
  onDownload,
  onDelete,
  itemVariants,
}: {
  artifacts: ArtifactSummary[];
  onPreview: (a: ArtifactSummary) => void;
  onDownload: (a: ArtifactSummary) => void;
  onDelete: (a: ArtifactSummary) => void;
  itemVariants: ItemVariantType;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {artifacts.map((artifact) => (
        <ArtifactCard
          key={artifact.id}
          artifact={artifact}
          onPreview={onPreview}
          onDownload={onDownload}
          onDelete={onDelete}
          variants={itemVariants}
        />
      ))}
    </div>
  );
}

// -- List View

function ListView({
  artifacts,
  onPreview,
  onDownload,
  onDelete,
  itemVariants,
}: {
  artifacts: ArtifactSummary[];
  onPreview: (a: ArtifactSummary) => void;
  onDownload: (a: ArtifactSummary) => void;
  onDelete: (a: ArtifactSummary) => void;
  itemVariants: ItemVariantType;
}) {
  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
      {artifacts.map((artifact) => (
        <ArtifactRow
          key={artifact.id}
          artifact={artifact}
          onPreview={onPreview}
          onDownload={onDownload}
          onDelete={onDelete}
          variants={itemVariants}
        />
      ))}
    </div>
  );
}

// -- Grid Card

function ArtifactCard({
  artifact,
  onPreview,
  onDownload,
  onDelete,
  variants,
}: {
  artifact: ArtifactSummary;
  onPreview: (a: ArtifactSummary) => void;
  onDownload: (a: ArtifactSummary) => void;
  onDelete: (a: ArtifactSummary) => void;
  variants: ItemVariantType;
}) {
  const config = TYPE_CONFIG[artifact.type] || TYPE_CONFIG.document;
  const Icon = config.icon;

  return (
    <motion.div
      variants={variants}
      whileHover={{ scale: 1.02, boxShadow: '0 8px 30px rgba(70,72,212,0.10)' }}
      whileTap={{ scale: 0.98 }}
      className="glass-card rounded-2xl p-4 cursor-pointer group relative overflow-hidden flex flex-col"
    >
      <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>

      <h3 className="font-[family-name:var(--font-body)] text-sm font-semibold text-lumina-on-surface truncate">
        {artifact.title || 'Untitled'}
      </h3>

      <Badge
        variant="secondary"
        className={`mt-2 w-fit text-[10px] px-1.5 py-0 ${config.bgColor} ${config.color} border-0`}
      >
        {config.label}
      </Badge>

      <div className="flex-1" />

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-lumina-outline-variant/10">
        <span className="text-[10px] text-lumina-on-surface-variant/50">
          {formatDistanceToNow(new Date(artifact.createdAt), { addSuffix: true })}
        </span>
        <span className="text-[10px] text-lumina-on-surface-variant/40">
          {estimateSize(artifact.type)}
        </span>
      </div>

      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(artifact); }}
              className="w-6 h-6 rounded-md bg-white/80 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-white dark:hover:bg-black/60 transition-colors cursor-pointer"
            >
              <Eye className="w-3 h-3 text-lumina-on-surface-variant" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Preview</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(artifact); }}
              className="w-6 h-6 rounded-md bg-white/80 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-white dark:hover:bg-black/60 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3 text-lumina-on-surface-variant" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Download</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(artifact); }}
              className="w-6 h-6 rounded-md bg-white/80 dark:bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3 text-red-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

// -- List Row

function ArtifactRow({
  artifact,
  onPreview,
  onDownload,
  onDelete,
  variants,
}: {
  artifact: ArtifactSummary;
  onPreview: (a: ArtifactSummary) => void;
  onDownload: (a: ArtifactSummary) => void;
  onDelete: (a: ArtifactSummary) => void;
  variants: ItemVariantType;
}) {
  const config = TYPE_CONFIG[artifact.type] || TYPE_CONFIG.document;
  const Icon = config.icon;

  return (
    <motion.div
      variants={variants}
      whileHover={{ x: 4 }}
      onClick={() => onPreview(artifact)}
      className="glass-card rounded-xl px-4 py-3 cursor-pointer group flex items-center gap-3"
    >
      <div className={`shrink-0 w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-[family-name:var(--font-body)] text-sm font-medium text-lumina-on-surface truncate">
          {artifact.title || 'Untitled'}
        </p>
        <p className="text-[11px] text-lumina-on-surface-variant/50 mt-0.5">
          {config.label} - {estimateSize(artifact.type)}
        </p>
      </div>

      <span className="shrink-0 text-[11px] text-lumina-on-surface-variant/40 hidden sm:block">
        {formatDistanceToNow(new Date(artifact.createdAt), { addSuffix: true })}
      </span>

      <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onDownload(artifact); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-lumina-primary/10 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-lumina-on-surface-variant" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Download</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(artifact); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Delete</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

// -- Artifact Preview

function ArtifactPreview({
  artifact,
  copied,
  onCopy,
  onDownload,
  onDelete,
}: {
  artifact: ArtifactFull;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const config = TYPE_CONFIG[artifact.type] || TYPE_CONFIG.document;
  const Icon = config.icon;

  let textContent: string | null = null;
  if (artifact.contentBase64) {
    try { textContent = atob(artifact.contentBase64); } catch { textContent = null; }
  }

  let jsonData: Record<string, unknown>[] | null = null;
  if (artifact.type === 'data' && textContent) {
    try {
      const parsed = JSON.parse(textContent);
      if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
        jsonData = parsed;
      }
    } catch { /* not valid JSON array */ }
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="font-[family-name:var(--font-display)] text-lg text-lumina-on-surface">
              {artifact.title || 'Untitled'}
            </DialogTitle>
            <DialogDescription className="text-lumina-on-surface-variant/60 mt-1">
              {config.label} - {artifact.mimeType} - {formatDistanceToNow(new Date(artifact.createdAt), { addSuffix: true })}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <div className="mt-4 rounded-xl overflow-hidden border border-lumina-outline-variant/10">
        {/* Image Preview */}
        {artifact.type === 'image' && (
          <div className="bg-black/5 dark:bg-white/5 p-2">
            {artifact.contentBase64 ? (
              <img
                src={getDataUrl(artifact.mimeType, artifact.contentBase64)}
                alt={artifact.title || 'Artifact image'}
                className="w-full h-auto rounded-lg max-h-[50vh] object-contain"
              />
            ) : artifact.url ? (
              <img
                src={artifact.url}
                alt={artifact.title || 'Artifact image'}
                className="w-full h-auto rounded-lg max-h-[50vh] object-contain"
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-lumina-on-surface-variant/40 text-sm">
                No image data available
              </div>
            )}
          </div>
        )}

        {/* Code Preview */}
        {artifact.type === 'code' && textContent && (
          <div className="relative">
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={onCopy}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-white/80 dark:bg-black/50 backdrop-blur-sm text-xs text-lumina-on-surface-variant hover:text-lumina-on-surface transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <SyntaxHighlighter
              language={getLangFromMime(artifact.mimeType)}
              style={oneDark}
              customStyle={{
                margin: 0,
                borderRadius: '0.75rem',
                fontSize: '13px',
                maxHeight: '50vh',
                padding: '1rem',
              }}
              showLineNumbers
            >
              {textContent}
            </SyntaxHighlighter>
          </div>
        )}

        {/* Document Preview */}
        {artifact.type === 'document' && (
          <div className="bg-white/60 dark:bg-white/5 p-5">
            {textContent ? (
              <pre className="whitespace-pre-wrap text-sm text-lumina-on-surface leading-relaxed font-[family-name:var(--font-body)] max-h-[50vh] overflow-y-auto">
                {textContent}
              </pre>
            ) : (
              <div className="text-center py-8 text-lumina-on-surface-variant/40">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Document content not available</p>
              </div>
            )}
          </div>
        )}

        {/* Audio Preview */}
        {artifact.type === 'audio' && (
          <div className="bg-white/60 dark:bg-white/5 p-6 flex flex-col items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl ${config.bgColor} flex items-center justify-center`}>
              <Music className={`w-8 h-8 ${config.color}`} />
            </div>
            {artifact.contentBase64 ? (
              <audio controls className="w-full max-w-sm" src={getDataUrl(artifact.mimeType, artifact.contentBase64)} />
            ) : artifact.url ? (
              <audio controls className="w-full max-w-sm" src={artifact.url} />
            ) : (
              <p className="text-sm text-lumina-on-surface-variant/40">No audio data available</p>
            )}
          </div>
        )}

        {/* Data Preview */}
        {artifact.type === 'data' && (
          <div className="bg-white/60 dark:bg-white/5 p-4 max-h-[50vh] overflow-auto">
            {jsonData ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-lumina-outline-variant/20">
                    {Object.keys(jsonData[0]).map((key) => (
                      <th key={key} className="text-left px-3 py-2 text-xs font-semibold text-lumina-on-surface-variant uppercase tracking-wider">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {jsonData.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-lumina-outline-variant/10 hover:bg-lumina-primary/5 transition-colors">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-3 py-2 text-lumina-on-surface text-xs">
                          {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : textContent ? (
              <pre className="whitespace-pre-wrap text-sm text-lumina-on-surface font-mono">
                {textContent}
              </pre>
            ) : (
              <div className="text-center py-8 text-lumina-on-surface-variant/40">
                <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Data not available</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 mt-4">
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-pill text-xs font-medium text-lumina-on-surface-variant hover:text-lumina-on-surface hover:bg-white/60 dark:hover:bg-white/10 transition-all cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={onDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-lumina-primary bg-lumina-primary/10 hover:bg-lumina-primary/20 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          Download
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </>
  );
}
