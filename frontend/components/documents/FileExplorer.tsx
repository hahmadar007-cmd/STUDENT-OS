'use client';

import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  Trash2,
  Search,
  File,
  X,
  Loader2
} from 'lucide-react';
import { useFouzar, LmsRepositoryItem } from '../../lib/FouzarContext';
import { buildRepositoryEntryFromFile } from '../../lib/repositoryUpload';

interface FileExplorerProps {
  isCompact?: boolean;
  rootFolderId?: string | null; // Lock view to this subject
  onOpenFile?: (doc: LmsRepositoryItem) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  isCompact = false,
  rootFolderId = null,
  onOpenFile,
}) => {
  const {
    folders,
    repository,
    addRepositoryItem,
    removeRepositoryItem,
  } = useFouzar();

  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const currentFolder = folders.find((f) => f.id === rootFolderId);

  // Filter files in current subject
  const displayedFiles = useMemo(() => {
    const list = repository.filter((doc) => {
      // If rootFolderId is set, show files for this subject
      if (rootFolderId) {
        return doc.folderId === rootFolderId;
      }
      // If no rootFolderId, show all files (or files with no folderId)
      return true;
    });

    if (!searchQuery.trim()) return list;
    return list.filter((doc) => doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [repository, rootFolderId, searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const folderCode = currentFolder ? currentFolder.code : 'GEN';
      const entry = await buildRepositoryEntryFromFile(file, folderCode);
      addRepositoryItem({
        ...entry,
        folderId: rootFolderId || 'general',
      });
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-fouzar-signal" />;
    if (['ppt', 'pptx'].includes(ext || '')) return <FileText className="w-4 h-4 text-fouzar-amber" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext || '')) return <File className="w-4 h-4 text-fouzar-ice" />;
    return <FileText className="w-4 h-4 text-fouzar-text-secondary" />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      {/* File Explorer Header & Controls */}
      <div className="flex flex-col gap-2.5 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-tertiary" />
            <input
              type="text"
              placeholder="Search in subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-fouzar-elevated/40 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-[10px] font-mono focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary focus:shadow-[var(--fouzar-focus-ring)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-fouzar-text-tertiary hover:text-fouzar-text-primary"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Upload trigger */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 bg-fouzar-accent/10 border border-fouzar-accent/30 text-fouzar-accent hover:bg-fouzar-accent/20 rounded-[var(--fouzar-radius-md)] cursor-pointer transition-colors flex items-center justify-center gap-1 px-3"
            title="Upload File"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span className="font-mono text-[9px] uppercase tracking-wider font-bold">Upload</span>
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>

      {/* Directory Contents */}
      <div 
        onClick={() => setSelectedItemId(null)}
        className="flex-1 overflow-y-auto scrollbar-none space-y-1.5 pr-0.5"
      >
        {displayedFiles.length === 0 ? (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="py-12 text-center border border-dashed border-fouzar-border rounded-[var(--fouzar-radius-lg)] bg-fouzar-elevated/10 flex flex-col items-center justify-center"
          >
            <FileText className="w-8 h-8 text-fouzar-text-tertiary mb-2" />
            <p className="font-mono text-[8.5px] text-fouzar-text-secondary uppercase">
              {searchQuery ? 'No matching files' : 'Space is empty'}
            </p>
            {!searchQuery && (
              <p className="text-[7.5px] font-mono text-fouzar-text-tertiary uppercase mt-1">
                Upload lectures, labs or syllabi here
              </p>
            )}
          </div>
        ) : (
          <div className={isCompact ? 'space-y-1' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
            {/* Render Files */}
            <AnimatePresence>
              {displayedFiles.map((doc) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  onClick={(e) => e.stopPropagation()}
                  className={`group flex items-center justify-between p-2.5 bg-fouzar-elevated/30 border rounded-[var(--fouzar-radius-md)] transition-colors ${
                    selectedItemId === doc.id
                      ? 'border-fouzar-accent shadow-[0_0_10px_rgba(124,92,252,0.15)] bg-fouzar-accent/5'
                      : 'border-fouzar-border hover:border-fouzar-accent/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemId(doc.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      onOpenFile?.(doc);
                      setSelectedItemId(null);
                    }}
                    className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    {getFileIcon(doc.fileName)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-fouzar-text-primary truncate">{doc.fileName}</p>
                      <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">
                        {doc.courseCode} · {doc.category} · {doc.sizeLabel}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRepositoryItem(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-fouzar-text-tertiary hover:text-fouzar-signal transition-all cursor-pointer"
                    title="Delete File"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
