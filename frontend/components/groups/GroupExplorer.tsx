'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  File,
  Image as ImageIcon,
  FileVideo,
  Upload,
  Play,
  Trash2,
  Folder,
  ChevronRight,
  ChevronDown,
  Sparkles,
  User,
  Plus,
} from 'lucide-react';
import { getGroupFiles, uploadGroupFile, deleteGroupFile, type GroupFileItem } from '../../lib/api';
import { useOnFileSync } from '../../lib/socket';
import { useFouzar } from '../../lib/FouzarContext';

interface GroupExplorerProps {
  groupId: string;
  onOpenFile?: (doc: any) => void;
  onPresentFile?: (fileId: string, fileName: string) => void;
  onFileActionActivity?: (type: 'upload' | 'delete', fileName: string) => void;
}

const CATEGORIES = ['Lecture', 'Lab', 'Assignment', 'Book', 'Resource', 'Other'] as const;
type ResourceCategory = typeof CATEGORIES[number];

function getCategoryForFile(fileName: string, mimeType?: string): ResourceCategory {
  const lower = (fileName || '').toLowerCase();
  if (lower.includes('lecture') || lower.includes('lec') || lower.includes('slides') || lower.includes('ch')) return 'Lecture';
  if (lower.includes('lab') || lower.includes('prac') || lower.includes('exp')) return 'Lab';
  if (lower.includes('assign') || lower.includes('task') || lower.includes('hw') || lower.includes('homework')) return 'Assignment';
  if (lower.includes('book') || lower.includes('textbook') || lower.includes('guide')) return 'Book';
  if (lower.includes('syllabus') || lower.includes('resource') || lower.includes('link') || lower.includes('ref')) return 'Resource';
  return 'Other';
}

function getFileIcon(fileName: string) {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return ImageIcon;
  if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) return FileVideo;
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'md'].includes(ext)) return FileText;
  return File;
}

export const GroupExplorer: React.FC<GroupExplorerProps> = ({
  groupId,
  onOpenFile,
  onPresentFile,
  onFileActionActivity,
}) => {
  const { user } = useFouzar();
  const [files, setFiles] = useState<GroupFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | 'All'>('All');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Lecture: true,
    Lab: true,
    Assignment: true,
    Book: true,
    Resource: true,
    Other: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    if (!groupId) return;
    try {
      const list = await getGroupFiles(groupId);
      setFiles(list ?? []);
    } catch (e) {
      console.warn('[GroupExplorer] Failed to load group files:', e);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadFiles();
  }, [groupId, loadFiles]);

  const handleFileSync = useCallback(
    (data: { action: string; file?: GroupFileItem; fileId?: string }) => {
      if (data.action === 'uploaded' && data.file) {
        setFiles((prev) => {
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) return;
    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await uploadGroupFile(groupId, file, (pct) => setUploadProgress(pct));
      if (res.success && res.file) {
        setFiles((prev) => [res.file, ...prev.filter((f) => f.id !== res.file.id)]);
        onFileActionActivity?.('upload', file.name);
      }
    } catch (err: any) {
      console.error('[GroupExplorer] Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (fileId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete ${fileName}?`)) return;
    try {
      await deleteGroupFile(groupId, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      onFileActionActivity?.('delete', fileName);
    } catch (err) {
      console.error('[GroupExplorer] Delete failed:', err);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Categorize files
  const categorizedFiles = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = files.filter((f) => getCategoryForFile(f.fileName) === cat);
    return acc;
  }, {} as Record<ResourceCategory, GroupFileItem[]>);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-t-[var(--fouzar-radius-lg)] p-4 relative">
      {/* Header & Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-fouzar-border/60 shrink-0">
        <div>
          <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-fouzar-text-primary flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-fouzar-accent" />
            Group Explorer
          </h3>
          <p className="text-[9px] text-fouzar-text-secondary mt-0.5 font-mono">
            Shared repository & materials for this circle
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase tracking-wider font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-[var(--fouzar-glow-primary)]"
          >
            <Upload className="w-3 h-3" />
            {uploading ? `${uploadProgress}%` : '+ Upload'}
          </button>
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex gap-1 py-2 border-b border-fouzar-border/30 overflow-x-auto scrollbar-none shrink-0">
        <button
          type="button"
          onClick={() => setSelectedCategory('All')}
          className={`px-2.5 py-0.5 rounded-full font-mono text-[8px] uppercase tracking-wider transition-colors shrink-0 ${
            selectedCategory === 'All'
              ? 'bg-fouzar-accent/20 text-fouzar-accent font-bold border border-fouzar-accent/40'
              : 'bg-fouzar-elevated/30 text-fouzar-text-secondary hover:text-fouzar-text-primary'
          }`}
        >
          All ({files.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = categorizedFiles[cat].length;
          if (count === 0 && selectedCategory !== 'All') return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-0.5 rounded-full font-mono text-[8px] uppercase tracking-wider transition-colors shrink-0 ${
                selectedCategory === cat
                  ? 'bg-fouzar-accent/20 text-fouzar-accent font-bold border border-fouzar-accent/40'
                  : 'bg-fouzar-elevated/30 text-fouzar-text-secondary hover:text-fouzar-text-primary'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto scrollbar-none py-3 space-y-3">
        {loading ? (
          <div className="text-center py-8 font-mono text-[9px] text-fouzar-text-tertiary uppercase animate-pulse">
            Loading group files...
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-fouzar-border/60 rounded-[var(--fouzar-radius-lg)] p-6">
            <Upload className="w-8 h-8 text-fouzar-text-tertiary mx-auto mb-2 opacity-50" />
            <p className="font-serif text-xs font-bold text-fouzar-text-primary uppercase tracking-wider">
              No files in group drive yet
            </p>
            <p className="text-[9.5px] text-fouzar-text-secondary mt-1 max-w-sm mx-auto">
              Upload your first shared document, lecture slides, or lab manual to collaborate with peers.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-fouzar-accent/15 border border-fouzar-accent/40 text-fouzar-accent font-mono text-[9px] uppercase tracking-wider rounded-[var(--fouzar-radius-md)] hover:bg-fouzar-accent/25 transition-all inline-flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              Upload Shared File
            </button>
          </div>
        ) : (
          CATEGORIES.map((cat) => {
            const groupList = categorizedFiles[cat];
            if (selectedCategory !== 'All' && selectedCategory !== cat) return null;
            if (groupList.length === 0 && selectedCategory === 'All') return null;

            const isExpanded = expandedCategories[cat] ?? true;

            return (
              <div key={cat} className="space-y-1">
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between py-1 px-2 hover:bg-fouzar-elevated/20 rounded font-mono text-[8.5px] uppercase tracking-wider text-fouzar-text-secondary cursor-pointer select-none"
                >
                  <div className="flex items-center gap-1.5 font-bold text-fouzar-accent">
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span>{cat}s</span>
                  </div>
                  <span className="text-[7.5px] opacity-70">({groupList.length})</span>
                </button>

                {/* Category Files */}
                {isExpanded && (
                  <div className="space-y-1 pl-3">
                    {groupList.map((file) => {
                      const Icon = getFileIcon(file.fileName);
                      return (
                        <div
                          key={file.id}
                          className="group flex items-center justify-between p-2.5 rounded-[var(--fouzar-radius-md)] bg-fouzar-elevated/20 border border-fouzar-border/40 hover:bg-fouzar-elevated/50 hover:border-fouzar-border transition-all"
                        >
                          {/* File info */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Icon className="w-4 h-4 text-fouzar-accent shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[10.5px] font-medium text-fouzar-text-primary truncate leading-tight">
                                {file.fileName}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[8px] font-mono text-fouzar-text-tertiary uppercase">
                                <span>{file.fileSize}</span>
                                <span>·</span>
                                <span className="flex items-center gap-1 text-fouzar-text-secondary">
                                  <User className="w-2.5 h-2.5" />
                                  {file.uploadedBy || 'Member'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Hover action buttons: Open ▸ and Present ⊙ */}
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            {/* Open button */}
                            <button
                              type="button"
                              onClick={() =>
                                onOpenFile?.({
                                  id: file.id,
                                  fileName: file.fileName,
                                  fileUrl: file.fileUrl,
                                })
                              }
                              className="px-2.5 py-1 bg-fouzar-elevated/80 border border-fouzar-border hover:bg-fouzar-elevated text-fouzar-text-primary text-[8px] font-mono uppercase tracking-wider rounded transition-colors cursor-pointer"
                            >
                              Open ▸
                            </button>

                            {/* Present Live button (equal priority) */}
                            <button
                              type="button"
                              onClick={() => onPresentFile?.(file.id, file.fileName)}
                              className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 text-[8px] font-mono uppercase tracking-wider rounded transition-colors cursor-pointer flex items-center gap-1 font-bold"
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              Present ⊙
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={(e) => handleDelete(file.id, file.fileName, e)}
                              className="p-1 text-fouzar-text-tertiary hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Delete file"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
