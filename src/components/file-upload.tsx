'use client';

import { useCallback, useRef, useState, type DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ImageIcon,
  FileVideo,
  FileAudio,
  FileText,
  X,
  Upload,
  Plus,
  Camera,
  Film,
  Music,
  File,
} from 'lucide-react';
import { useAgentStore } from '@/lib/stores/agent-store';
import type { Attachment, AttachmentType } from '@/types/agent';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_FILES = 4;

const ACCEPTED_TYPES: Record<AttachmentType, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/webm'],
  document: [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

function detectAttachmentType(mimeType: string): AttachmentType {
  if (ACCEPTED_TYPES.image.includes(mimeType)) return 'image';
  if (ACCEPTED_TYPES.video.includes(mimeType)) return 'video';
  if (ACCEPTED_TYPES.audio.includes(mimeType)) return 'audio';
  return 'document';
}

function getTypeIcon(type: AttachmentType) {
  switch (type) {
    case 'image': return <ImageIcon className="w-4 h-4" />;
    case 'video': return <FileVideo className="w-4 h-4" />;
    case 'audio': return <FileAudio className="w-4 h-4" />;
    case 'document': return <FileText className="w-4 h-4" />;
  }
}

function getTypeColor(type: AttachmentType) {
  switch (type) {
    case 'image': return 'from-emerald-500/20 to-teal-500/20 text-emerald-500';
    case 'video': return 'from-purple-500/20 to-violet-500/20 text-purple-500';
    case 'audio': return 'from-amber-500/20 to-orange-500/20 text-amber-500';
    case 'document': return 'from-sky-500/20 to-blue-500/20 text-sky-500';
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:mime;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function generateThumbnail(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      resolve(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Resize to thumbnail
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 200;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX_DIM) { height = (height / width) * MAX_DIM; width = MAX_DIM; }
        } else {
          if (height > MAX_DIM) { width = (width / height) * MAX_DIM; height = MAX_DIM; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => resolve(undefined);
      img.src = result;
    };
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

export function AttachmentPreview({ attachment, onRemove }: { attachment: Attachment; onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="relative group flex-shrink-0"
    >
      {attachment.thumbnailUrl ? (
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border border-lumina-outline-variant/20 shadow-md">
          <img
            src={attachment.thumbnailUrl}
            alt={attachment.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className={`w-16 h-16 md:w-20 md:h-20 rounded-xl bg-gradient-to-br ${getTypeColor(attachment.type)} flex flex-col items-center justify-center gap-1 border border-lumina-outline-variant/20 shadow-md`}>
          {getTypeIcon(attachment.type)}
          <span className="text-[9px] font-medium opacity-70 truncate max-w-[56px] md:max-w-[70px]">
            {attachment.name.split('.').pop()?.toUpperCase()}
          </span>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-red-600"
        aria-label="Remove attachment"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Size badge */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-lumina-surface-container-high/90 backdrop-blur-sm border border-lumina-outline-variant/10">
        <span className="text-[8px] text-lumina-on-surface-variant font-medium">{formatFileSize(attachment.size)}</span>
      </div>
    </motion.div>
  );
}

export function PendingAttachments() {
  const pendingAttachments = useAgentStore((s) => s.pendingAttachments);
  const removePendingAttachment = useAgentStore((s) => s.removePendingAttachment);

  if (pendingAttachments.length === 0) return null;

  return (
    <AnimatePresence mode="popLayout">
      <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
        {pendingAttachments.map((attachment) => (
          <AttachmentPreview
            key={attachment.id}
            attachment={attachment}
            onRemove={() => removePendingAttachment(attachment.id)}
          />
        ))}
      </div>
    </AnimatePresence>
  );
}

interface FileUploadTriggerProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function FileUploadTrigger({ onFilesSelected, disabled }: FileUploadTriggerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    onFilesSelected(fileArray);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`shrink-0 p-2.5 md:p-2 rounded-xl md:rounded-full transition-all duration-200 ${
          disabled
            ? 'opacity-40 cursor-not-allowed text-lumina-on-surface-variant/30'
            : 'text-lumina-primary hover:bg-lumina-surface-variant/50'
        }`}
        aria-label="Attach file"
      >
        <Plus className="w-5 h-5" />
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={[
          ...ACCEPTED_TYPES.image,
          ...ACCEPTED_TYPES.video,
          ...ACCEPTED_TYPES.audio,
          ...ACCEPTED_TYPES.document,
        ].join(',')}
        onChange={handleChange}
        className="hidden"
      />
    </>
  );
}

interface FileDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function FileDropZone({ onFilesDropped, children, disabled }: FileDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCountRef = useRef(0);

  const processFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const validFiles: File[] = [];
    const allAccepted = [
      ...ACCEPTED_TYPES.image,
      ...ACCEPTED_TYPES.video,
      ...ACCEPTED_TYPES.audio,
      ...ACCEPTED_TYPES.document,
    ];

    for (const file of files) {
      if (!allAccepted.includes(file.type)) continue;

      const type = detectAttachmentType(file.type);
      const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
      if (file.size > maxSize) continue;

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesDropped(validFiles.slice(0, MAX_FILES));
    }
  }, [onFilesDropped]);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    dragCountRef.current++;
    if (dragCountRef.current === 1) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current = 0;
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [disabled, processFiles]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-lumina-primary/5 backdrop-blur-sm rounded-2xl border-2 border-dashed border-lumina-primary/40"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Upload className="w-10 h-10 text-lumina-primary/60 mb-3" />
            </motion.div>
            <p className="text-sm font-medium text-lumina-primary/70 font-[family-name:var(--font-body)]">
              Drop files here
            </p>
            <p className="text-xs text-lumina-on-surface-variant/50 mt-1 font-[family-name:var(--font-body)]">
              Images, videos, audio, or documents
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
}

/**
 * Hook to process files into attachments and add them to the store.
 */
export function useFileUpload() {
  const addPendingAttachment = useAgentStore((s) => s.addPendingAttachment);
  const pendingAttachments = useAgentStore((s) => s.pendingAttachments);

  const processFiles = useCallback(async (files: File[]) => {
    const remaining = MAX_FILES - pendingAttachments.length;
    if (remaining <= 0) return;

    const toProcess = files.slice(0, remaining);

    for (const file of toProcess) {
      try {
        const [base64Data, thumbnailUrl] = await Promise.all([
          fileToBase64(file),
          generateThumbnail(file),
        ]);

        const type = detectAttachmentType(file.type);

        const attachment: Attachment = {
          id: crypto.randomUUID(),
          type,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          base64Data,
          thumbnailUrl,
        };

        addPendingAttachment(attachment);
      } catch (err) {
        console.error('[FileUpload] Error processing file:', file.name, err);
      }
    }
  }, [addPendingAttachment, pendingAttachments.length]);

  return { processFiles };
}
