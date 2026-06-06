'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  FolderPlus,
  ChevronRight,
  FileText,
  Upload,
  Trash2,
  Plus,
  Search,
  ArrowUpLeft,
  File,
  X,
  Loader2
} from 'lucide-react';
import { useFouzar, LmsRepositoryItem } from '../../lib/FouzarContext';
import { buildRepositoryEntryFromFile } from '../../lib/repositoryUpload';

interface FileExplorerProps {
  isCompact?: boolean;
  rootFolderId?: string | null; // Lock view to this folder and its descendants
  onOpenFile?: (doc: LmsRepositoryItem) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  isCompact = false,
  rootFolderId = null,
  onOpenFile,
}) => {
  const {
    folders,
    currentFolderId,
    setCurrentFolderId,
    repository,
    addRepositoryItem,
    removeRepositoryItem,
    addFolder,
    deleteFolder,
  } = useFouzar();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCode, setNewFolderCode] = useState('');
  const [addFolderError, setAddFolderError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to determine if a folder is a descendant of another folder
  const isDescendant = (childId: string | null, parentId: string | null): boolean => {
    if (childId === parentId) return true;
    if (!childId) return false;
    const childFolder = folders.find((f) => f.id === childId);
    if (!childFolder) return false;
    return isDescendant(childFolder.parentFolderId, parentId);
  };

  // Keep currentFolderId scoped within rootFolderId
  useEffect(() => {
    if (rootFolderId && !isDescendant(currentFolderId, rootFolderId)) {
      setCurrentFolderId(rootFolderId);
    }
  }, [rootFolderId, currentFolderId, folders, setCurrentFolderId]);

  const currentFolder = folders.find((f) => f.id === currentFolderId);
  const isRootOfSubject = currentFolder && currentFolder.parentFolderId === null;

  // Filter folders in current level
  const displayedFolders = useMemo(() => {
    const list = folders.filter((f) => {
      if (currentFolderId) {
        return f.parentFolderId === currentFolderId;
      } else {
        // Root level: show subject folders (where parentFolderId is null and id !== 'all')
        return f.parentFolderId === null && f.id !== 'all';
      }
    });

    if (!searchQuery.trim()) return list;
    return list.filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [folders, currentFolderId, searchQuery]);

  // Filter files in current level
  const displayedFiles = useMemo(() => {
    const list = repository.filter((doc) => {
      if (currentFolderId) {
        if (doc.folderId === currentFolderId) return true;
        // Backwards compatibility for files at root of subject
        if (isRootOfSubject && !doc.folderId) {
          return doc.courseCode.toLowerCase() === currentFolder.code.toLowerCase();
        }
        return false;
      } else {
        // Absolute root level: show files with no folderId and no subject, or all files?
        // Let's show files that are truly at the root (no folderId)
        return !doc.folderId;
      }
    });

    if (!searchQuery.trim()) return list;
    return list.filter((doc) => doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [repository, currentFolderId, isRootOfSubject, currentFolder, searchQuery]);

  // Build breadcrumbs path
  const breadcrumbs = useMemo(() => {
    const list: { id: string | null; name: string }[] = [];
    let currentId: string | null = currentFolderId;

    while (currentId && currentId !== rootFolderId) {
      const f = folders.find((folder) => folder.id === currentId);
      if (f) {
        list.unshift({ id: f.id, name: f.name });
        currentId = f.parentFolderId;
      } else {
        break;
      }
    }

    if (rootFolderId) {
      const rootFolder = folders.find((f) => f.id === rootFolderId);
      list.unshift({ id: rootFolderId, name: rootFolder ? rootFolder.name : 'Subject Root' });
    } else {
      list.unshift({ id: null, name: 'Root' });
    }

    return list;
  }, [folders, currentFolderId, rootFolderId]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    setAddFolderError(null);
    const name = newFolderName.trim();
    if (!name) return;

    let code = newFolderCode.trim().toUpperCase();

    // If we are at root level (parentFolderId === null), we need a code
    if (!currentFolderId) {
      if (!code) {
        setAddFolderError('Subject code is required at root level.');
        return;
      }
      if (folders.some((f) => f.code === code && f.parentFolderId === null)) {
        setAddFolderError('A subject with this code already exists.');
        return;
      }
      if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase() && f.parentFolderId === null)) {
        setAddFolderError('A subject folder with this name already exists.');
        return;
      }
    } else {
      // Inherit parent code
      code = currentFolder?.code || 'GEN';
      
      // Check for duplicate folder name in the current directory level
      if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase() && f.parentFolderId === currentFolderId)) {
        setAddFolderError('A folder with this name already exists in this directory.');
        return;
      }
    }

    addFolder(name, code, currentFolderId);
    setNewFolderName('');
    setNewFolderCode('');
    setShowAddFolder(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const folderCode = currentFolder ? currentFolder.code : 'GEN';
      const entry = await buildRepositoryEntryFromFile(file, folderCode);
      addRepositoryItem({
        ...entry,
        folderId: currentFolderId,
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
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 flex-wrap font-mono text-[9px] text-fouzar-text-secondary uppercase tracking-wider bg-fouzar-elevated/20 p-2 rounded-[var(--fouzar-radius-md)] border border-fouzar-border/30">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.id || 'root'}>
              {idx > 0 && (
                <span className="text-fouzar-accent font-mono text-[8px] tracking-tighter shrink-0 select-none opacity-80 px-1">
                  ──────➔
                </span>
              )}
              <button
                type="button"
                onClick={() => setCurrentFolderId(crumb.id)}
                className={`hover:text-fouzar-accent transition-colors truncate max-w-[120px] ${
                  crumb.id === currentFolderId ? 'text-fouzar-text-primary font-bold' : 'cursor-pointer'
                }`}
              >
                {crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-tertiary" />
            <input
              type="text"
              placeholder="Search in folder..."
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

          {/* Nav Up Button (only if not at rootFolderId) */}
          {currentFolderId !== rootFolderId && (
            <button
              type="button"
              onClick={() => {
                if (currentFolder) {
                  setCurrentFolderId(currentFolder.parentFolderId);
                }
              }}
              className="p-1.5 bg-fouzar-elevated/50 hover:bg-fouzar-elevated border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer transition-colors"
              title="Go Up One Level"
            >
              <ArrowUpLeft className="w-4 h-4" />
            </button>
          )}

          {/* New Folder trigger */}
          <button
            type="button"
            onClick={() => setShowAddFolder(!showAddFolder)}
            className={`p-1.5 border rounded-[var(--fouzar-radius-md)] transition-colors cursor-pointer ${
              showAddFolder
                ? 'bg-fouzar-accent/20 border-fouzar-accent text-fouzar-accent'
                : 'bg-fouzar-elevated/50 hover:bg-fouzar-elevated border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-text-primary'
            }`}
            title="Create Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>

          {/* Upload trigger (hidden at absolute root level) */}
          {currentFolderId && (
            <>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 bg-fouzar-accent/10 border border-fouzar-accent/30 text-fouzar-accent hover:bg-fouzar-accent/20 rounded-[var(--fouzar-radius-md)] cursor-pointer transition-colors flex items-center justify-center"
                title="Upload File"
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                className="hidden"
                onChange={handleFileUpload}
              />
            </>
          )}
        </div>

        {/* Inline Add Folder Form */}
        <AnimatePresence>
          {showAddFolder && (
            <motion.form
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              onSubmit={handleCreateFolder}
              className="p-3 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)] space-y-2.5"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Folder Name (e.g. Lectures)"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 bg-fouzar-bg border border-fouzar-border px-2 py-1.5 text-[10px] font-mono rounded-[var(--fouzar-radius-sm)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                />
                {!currentFolderId && (
                  <input
                    type="text"
                    required
                    placeholder="Code (e.g. CN)"
                    value={newFolderCode}
                    onChange={(e) => setNewFolderCode(e.target.value)}
                    className="w-20 bg-fouzar-bg border border-fouzar-border px-2 py-1.5 text-[10px] font-mono rounded-[var(--fouzar-radius-sm)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary uppercase"
                  />
                )}
              </div>

              {addFolderError && (
                <p className="text-[8px] font-mono text-fouzar-signal uppercase tracking-wider">
                  {addFolderError}
                </p>
              )}

              <div className="flex gap-1.5 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFolder(false);
                    setAddFolderError(null);
                  }}
                  className="px-2.5 py-1 border border-fouzar-border rounded-[var(--fouzar-radius-sm)] font-mono text-[8px] uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 bg-fouzar-accent text-fouzar-text-inverse rounded-[var(--fouzar-radius-sm)] font-mono text-[8px] uppercase font-bold hover:opacity-90 cursor-pointer"
                >
                  Create
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Directory Contents */}
      <div className="flex-1 overflow-y-auto scrollbar-none space-y-1.5 pr-0.5">
        {displayedFolders.length === 0 && displayedFiles.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-fouzar-border rounded-[var(--fouzar-radius-lg)] bg-fouzar-elevated/10 flex flex-col items-center justify-center">
            <Folder className="w-8 h-8 text-fouzar-text-tertiary mb-2" />
            <p className="font-mono text-[8.5px] text-fouzar-text-secondary uppercase">
              {searchQuery ? 'No matching items' : 'Folder is empty'}
            </p>
            {!currentFolderId && (
              <p className="text-[7.5px] font-mono text-fouzar-text-tertiary uppercase mt-1">
                Create a subject folder to get started
              </p>
            )}
            {currentFolderId && !searchQuery && (
              <p className="text-[7.5px] font-mono text-fouzar-text-tertiary uppercase mt-1">
                Upload lectures, labs or syllabi here
              </p>
            )}
          </div>
        ) : (
          <div className={isCompact ? 'space-y-1' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
            {/* Render Folders */}
            <AnimatePresence>
              {displayedFolders.map((folder) => {
                const parentFolder = folder.parentFolderId ? folders.find((f) => f.id === folder.parentFolderId) : null;
                return (
                  <motion.div
                    key={folder.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="group flex items-center justify-between p-2.5 bg-fouzar-elevated/20 border border-fouzar-border/60 rounded-[var(--fouzar-radius-md)] hover:border-fouzar-accent/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <Folder className="w-4 h-4 text-fouzar-accent shrink-0" />
                      <div className="min-w-0 flex-1">
                        {parentFolder ? (
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="font-mono text-[8.5px] text-fouzar-text-secondary uppercase truncate max-w-[80px] opacity-75">
                              {parentFolder.name}
                            </span>
                            <span className="text-fouzar-accent font-mono text-[9px] tracking-widest shrink-0 select-none">
                              ──────➔
                            </span>
                            <span className="font-semibold text-fouzar-text-primary truncate">
                              {folder.name}
                            </span>
                          </div>
                        ) : (
                          <p className="font-semibold text-fouzar-text-primary truncate">{folder.name}</p>
                        )}
                        {folder.code && !currentFolderId && (
                          <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">
                            {folder.code} Subject
                          </p>
                        )}
                      </div>
                    </button>

                    {parentFolder && (
                      <span className="font-mono text-[6.5px] bg-fouzar-accent/10 border border-fouzar-accent/20 text-fouzar-accent px-1.5 py-0.5 rounded-[var(--fouzar-radius-sm)] uppercase tracking-wider shrink-0 mr-2 select-none">
                        Sub-Folder
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => deleteFolder(folder.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-fouzar-text-tertiary hover:text-fouzar-signal transition-all cursor-pointer"
                      title="Delete Folder"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Render Files */}
            <AnimatePresence>
              {displayedFiles.map((doc) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="group flex items-center justify-between p-2.5 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)] hover:border-fouzar-accent/40 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => onOpenFile?.(doc)}
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
                    onClick={() => removeRepositoryItem(doc.id)}
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
