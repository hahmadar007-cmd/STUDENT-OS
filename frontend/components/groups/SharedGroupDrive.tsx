'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  Trash2,
  CloudUpload,
  Radio,
  Clock,
  File,
  Image,
  FileVideo,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { getGroupFiles, uploadGroupFile, deleteGroupFile, type GroupFileItem } from '../../lib/api';
import { useOnFileSync } from '../../lib/socket';
import { useFouzar } from '../../lib/FouzarContext';

interface SharedGroupDriveProps {
  groupId: string;
  /** Called when user clicks "Present Live" on a file — parent wires to useLivePresentation */
  onPresentFile?: (fileId: string, fileName: string) => void;
  currentUserId?: string;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'text/plain',
  'text/markdown',
];

const MAX_FILE_MB = 50;

function fileIcon(fileName: string, mimeType?: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return Image;
  if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) return FileVideo;
  if (['pdf'].includes(ext)) return FileText;
  return File;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * SharedGroupDrive
 *
 * Feature A — A full drag-and-drop shared file canvas scoped to one study circle.
 * Files are persisted in the `GroupFile` table via the existing upload endpoint.
 * Real-time sync is handled by the `fileSync` WebSocket event already wired in
 * the NestJS controller.
 */
export const SharedGroupDrive: React.FC<SharedGroupDriveProps> = ({
  groupId,
  onPresentFile,
  currentUserId,
}) => {
  const { mode, user } = useFouzar();
  const isGreenhouse = mode === 'greenhouse';

  const [files, setFiles] = useState<GroupFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load initial file list ────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    try {
      const list = await getGroupFiles(groupId);
      setFiles(list ?? []);
    } catch (e) {
      console.warn('[SharedDrive] Failed to load group files:', e);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) loadFiles();
  }, [groupId, loadFiles]);

  // ── Real-time file sync via WebSocket ─────────────────────────────────────
  const handleFileSync = useCallback(
    (data: { action: string; file?: GroupFileItem; fileId?: string }) => {
      if (data.action === 'uploaded' && data.file) {
        setFiles((prev) => {
          // Avoid duplicates from the uploader's own response
          if (prev.some((f) => f.id === data.file!.id)) return prev;
          return [data.file!, ...prev];
        });
      } else if (data.action === 'deleted' && data.fileId) {
        setFiles((prev) => prev.filter((f) => f.id !== data.fileId));
      }
    },
    [],
  );
  useOnFileSync(handleFileSync);

  // ── Upload pipeline ───────────────────────────────────────────────────────
  const handleUpload = useCallback(
    async (file: File) => {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type) && file.type !== '') {
        setUploadError(`File type not supported. Please upload PDF, DOCX, PPTX, images, or video.`);
        return;
      }
      // Validate size
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setUploadError(`File too large. Max size is ${MAX_FILE_MB} MB.`);
        return;
      }

      setUploadState('uploading');
      setUploadProgress(0);
      setUploadError(null);

      try {
        const result = await uploadGroupFile(groupId, file, (pct) => {
          setUploadProgress(pct);
        });
        if (result.success && result.file) {
          setFiles((prev) => {
            if (prev.some((f) => f.id === result.file.id)) return prev;
            return [result.file, ...prev];
          });
        }
        setUploadState('success');
        setTimeout(() => setUploadState('idle'), 2000);
      } catch (err: any) {
        setUploadError(err.message || 'Upload failed');
        setUploadState('error');
        setTimeout(() => {
          setUploadState('idle');
          setUploadError(null);
        }, 4000);
      }
    },
    [groupId],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      // Reset input value so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [handleUpload],
  );

  // ── Delete pipeline ───────────────────────────────────────────────────────
  const handleDelete = useCallback(
    async (fileId: string) => {
      setDeletingId(fileId);
      try {
        await deleteGroupFile(groupId, fileId);
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } catch (err: any) {
        console.error('[SharedDrive] Delete failed:', err);
      } finally {
        setDeletingId(null);
      }
    },
    [groupId],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full gap-4 p-1">
      {/* Section header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-fouzar-text-secondary block">
            Shared Circle Drive
          </span>
          <span className="font-mono text-[7px] text-fouzar-text-tertiary">
            {files.length} file{files.length !== 1 ? 's' : ''} · synced live
          </span>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[7.5px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] hover:opacity-90 transition-opacity flex items-center gap-1.5 shrink-0"
        >
          <Upload className="w-3 h-3" />
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.txt,.md"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Drag-and-drop upload zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => uploadState === 'idle' && fileInputRef.current?.click()}
        animate={{
          borderColor: isDragOver ? 'var(--fouzar-accent)' : undefined,
          backgroundColor: isDragOver ? 'rgba(124,92,252,0.06)' : undefined,
        }}
        className={`relative shrink-0 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[var(--fouzar-radius-lg)] py-5 cursor-pointer transition-colors select-none ${
          isDragOver
            ? 'border-fouzar-accent bg-fouzar-accent/5'
            : 'border-fouzar-border/60 hover:border-fouzar-accent/40 hover:bg-fouzar-elevated/20'
        }`}
      >
        <AnimatePresence mode="wait">
          {uploadState === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 w-full px-6"
            >
              <CloudUpload className="w-6 h-6 text-fouzar-accent animate-bounce" />
              <div className="w-full bg-fouzar-border/40 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-fouzar-accent rounded-full"
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <span className="font-mono text-[8px] text-fouzar-accent">{uploadProgress}%</span>
            </motion.div>
          )}
          {uploadState === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-1"
            >
              <CheckCircle className="w-6 h-6 text-emerald-400" />
              <span className="font-mono text-[8px] text-emerald-400 uppercase">Uploaded!</span>
            </motion.div>
          )}
          {(uploadState === 'idle' || uploadState === 'error') && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-1"
            >
              <Upload className={`w-5 h-5 ${uploadState === 'error' ? 'text-fouzar-signal' : 'text-fouzar-text-tertiary'}`} />
              {uploadState === 'error' && uploadError ? (
                <span className="font-mono text-[7.5px] text-fouzar-signal text-center px-4">{uploadError}</span>
              ) : (
                <>
                  <span className="font-mono text-[8px] text-fouzar-text-secondary">
                    Drop a file or click to upload
                  </span>
                  <span className="font-mono text-[6.5px] text-fouzar-text-tertiary uppercase">
                    PDF · DOCX · PPTX · Images · Video · Max {MAX_FILE_MB} MB
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* File matrix grid */}
      <div className="flex-1 overflow-y-auto scrollbar-none space-y-2 min-h-0">
        <AnimatePresence initial={false}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="font-mono text-[8px] text-fouzar-text-tertiary uppercase animate-pulse">
                Loading drive…
              </span>
            </div>
          ) : files.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-10 gap-3 border border-dashed border-fouzar-border/40 rounded-[var(--fouzar-radius-lg)]"
            >
              <CloudUpload className="w-8 h-8 text-fouzar-text-tertiary opacity-40" />
              <p className="font-mono text-[8px] text-fouzar-text-tertiary uppercase text-center leading-relaxed">
                No files uploaded yet.
                <br />
                Drop a file above to share with your circle.
              </p>
            </motion.div>
          ) : (
            files.map((file) => {
              const FileIcon = fileIcon(file.fileName);
              const isDeleting = deletingId === file.id;
              const isOwner =
                user?.name === file.uploadedBy ||
                user?.id === file.uploadedBy;
              return (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: isDeleting ? 0.4 : 1, y: 0 }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`group flex items-center gap-3 p-3 rounded-[var(--fouzar-radius-md)] border transition-colors ${
                    isGreenhouse
                      ? 'border-fouzar-border/40 bg-white/5 hover:bg-white/8'
                      : 'border-fouzar-border/50 bg-fouzar-elevated/20 hover:bg-fouzar-elevated/35'
                  }`}
                >
                  {/* File type icon */}
                  <div className="w-8 h-8 rounded-[var(--fouzar-radius-sm)] bg-fouzar-accent/10 border border-fouzar-accent/20 flex items-center justify-center shrink-0">
                    <FileIcon className="w-4 h-4 text-fouzar-accent" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold truncate leading-tight text-fouzar-text-primary">
                      {file.fileName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[6.5px] text-fouzar-text-tertiary uppercase">
                        {file.fileSize}
                      </span>
                      <span className="font-mono text-[6.5px] text-fouzar-text-tertiary">·</span>
                      <span className="font-mono text-[6.5px] text-fouzar-text-tertiary">
                        {file.uploadedBy}
                      </span>
                      <span className="font-mono text-[6.5px] text-fouzar-text-tertiary">·</span>
                      <Clock className="w-2.5 h-2.5 text-fouzar-text-tertiary" />
                      <span className="font-mono text-[6.5px] text-fouzar-text-tertiary">
                        {formatDate(file.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Present Live button */}
                    {onPresentFile && (
                      <button
                        type="button"
                        onClick={() => onPresentFile(file.id, file.fileName)}
                        title="Present this file live to the circle"
                        className="flex items-center gap-1 px-2 py-1 bg-fouzar-accent/10 border border-fouzar-accent/30 text-fouzar-accent rounded-[var(--fouzar-radius-sm)] font-mono text-[7px] uppercase tracking-wider hover:bg-fouzar-accent/20 transition-colors cursor-pointer"
                      >
                        <Radio className="w-2.5 h-2.5" />
                        Present
                      </button>
                    )}
                    {/* Delete button (uploader only) */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleDelete(file.id)}
                        disabled={isDeleting}
                        title="Delete file"
                        className="p-1.5 text-fouzar-text-tertiary hover:text-fouzar-signal transition-colors rounded-[var(--fouzar-radius-sm)] hover:bg-fouzar-signal/10 cursor-pointer disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
