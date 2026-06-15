'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  Trash2,
  Search,
  File,
  X,
  Loader2,
  Folder,
  FolderPlus,
  FolderInput,
  ChevronLeft,
  ChevronDown,
  Plus
} from 'lucide-react';
import { useFouzar, LmsRepositoryItem, FouzarFolder } from '../../lib/FouzarContext';
import { buildRepositoryEntryFromFile } from '../../lib/repositoryUpload';

interface FileExplorerProps {
  isCompact?: boolean;
  rootFolderId?: string | null; // Lock view to this subject space (e.g. 'cs101')
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
    updateRepositoryItem,
    updateFolder,
    addFolder,
    deleteFolder,
  } = useFouzar();

  // If rootFolderId is undefined/null, treat as null (root of all spaces)
  const effectiveRootFolderId = rootFolderId;

  const [currentDirId, setCurrentDirId] = useState<string | null>(effectiveRootFolderId);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('date-desc');

  // New folder creation state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Moving item state
  const [movingItem, setMovingItem] = useState<{
    type: 'file' | 'folder';
    id: string;
    name: string;
  } | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);

  // Sync with prop when root folder changes
  useEffect(() => {
    setCurrentDirId(effectiveRootFolderId);
  }, [effectiveRootFolderId]);

  // Find the root space's name
  const rootName = useMemo(() => {
    if (!effectiveRootFolderId || effectiveRootFolderId === 'general') {
      return 'Root Space';
    }
    const folder = folders.find((f) => f.id === effectiveRootFolderId);
    return folder ? folder.name : 'Root Space';
  }, [folders, effectiveRootFolderId]);

  // Parent directory ID helper to go up one level
  const parentDirId = useMemo(() => {
    if (currentDirId === effectiveRootFolderId) return null;
    const folder = folders.find((f) => f.id === currentDirId);
    return folder ? folder.parentFolderId : effectiveRootFolderId;
  }, [folders, currentDirId, effectiveRootFolderId]);

  // Trace the breadcrumbs path from currentDirId to effectiveRootFolderId
  const pathSegments = useMemo(() => {
    const segments: FouzarFolder[] = [];
    let currId = currentDirId;
    while (currId && currId !== effectiveRootFolderId) {
      const folder = folders.find((f) => f.id === currId);
      if (!folder) break;
      segments.unshift(folder);
      currId = folder.parentFolderId;
    }
    return segments;
  }, [folders, currentDirId, effectiveRootFolderId]);

  // Find descendants helper to prevent circular moves (e.g. folder into its subfolder)
  const isDescendant = (folderId: string, potentialParentId: string | null, allFolders: FouzarFolder[]): boolean => {
    let curr = potentialParentId;
    while (curr) {
      if (curr === folderId) return true;
      const parent = allFolders.find(f => f.id === curr);
      curr = parent ? parent.parentFolderId : null;
    }
    return false;
  };

  // Helper to parse file size label (e.g. "1.2 MB" -> bytes) for sorting
  const parseSize = (label: string): number => {
    if (!label) return 0;
    const parts = label.trim().split(/\s+/);
    const value = parseFloat(parts[0]);
    if (isNaN(value)) return 0;
    const unit = parts[1]?.toLowerCase() || '';
    if (unit.includes('gb') || unit.includes('g')) return value * 1024 * 1024 * 1024;
    if (unit.includes('mb') || unit.includes('m')) return value * 1024 * 1024;
    if (unit.includes('kb') || unit.includes('k')) return value * 1024;
    return value;
  };

  // Filter & sort subfolders
  const displayedFolders = useMemo(() => {
    const list = folders.filter((f) => {
      // If we are at the root space (currentDirId matches effectiveRootFolderId)
      // and it is null/general, show top-level spaces
      if (currentDirId === 'general' || currentDirId === null) {
        return (f.parentFolderId === 'general' || f.parentFolderId === null) && f.id !== 'general';
      }
      return f.parentFolderId === currentDirId;
    });

    // Subfolders are always sorted alphabetically
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, currentDirId]);

  // Filter & sort files
  const displayedFiles = useMemo(() => {
    const list = repository.filter((doc) => {
      // Check folder association matches currentDirId
      const docFolderId = doc.folderId === 'general' ? null : doc.folderId || null;
      const dirId = currentDirId === 'general' ? null : currentDirId || null;
      return docFolderId === dirId;
    });

    const filtered = searchQuery.trim()
      ? list.filter((doc) => doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
      : list;

    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-asc') return a.fileName.localeCompare(b.fileName);
      if (sortBy === 'name-desc') return b.fileName.localeCompare(a.fileName);
      if (sortBy === 'date-desc') return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      if (sortBy === 'date-asc') return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      if (sortBy === 'size-desc') return parseSize(b.sizeLabel) - parseSize(a.sizeLabel);
      if (sortBy === 'size-asc') return parseSize(a.sizeLabel) - parseSize(b.sizeLabel);
      return 0;
    });
  }, [repository, currentDirId, searchQuery, sortBy]);

  // File Upload Action
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      let folderCode = 'GEN';
      if (currentDirId) {
        const dir = folders.find((f) => f.id === currentDirId);
        if (dir) folderCode = dir.code;
      }
      const entry = await buildRepositoryEntryFromFile(file, folderCode);
      addRepositoryItem({
        ...entry,
        folderId: currentDirId || 'general',
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

  // Folder Creation Action
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    let folderCode = 'GEN';
    if (currentDirId) {
      const parentDir = folders.find((f) => f.id === currentDirId);
      if (parentDir) folderCode = parentDir.code;
    }

    addFolder(newFolderName.trim(), folderCode, currentDirId || 'general');
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  // Move Confirmation Action
  const handleMoveConfirm = () => {
    if (!movingItem) return;
    const dest = selectedDestId === 'root' ? null : selectedDestId;

    if (movingItem.type === 'file') {
      updateRepositoryItem(movingItem.id, { folderId: dest || 'general' });
    } else {
      updateFolder(movingItem.id, { parentFolderId: dest || 'general' });
    }

    setMovingItem(null);
    setSelectedDestId(null);
  };

  // Recursive destination tree builder
  const moveDestinations = useMemo(() => {
    if (!movingItem) return [];

    const rootDest = {
      id: 'root',
      name: rootName,
      level: 0,
    };

    const recurse = (parentId: string | null, level: number): { id: string; name: string; level: number }[] => {
      const children = folders.filter((f) => {
        if (parentId === 'general' || parentId === null) {
          return (f.parentFolderId === 'general' || f.parentFolderId === null) && f.id !== 'general';
        }
        return f.parentFolderId === parentId;
      });

      const list: { id: string; name: string; level: number }[] = [];
      for (const child of children) {
        if (movingItem.type === 'folder') {
          if (child.id === movingItem.id) continue;
          if (isDescendant(movingItem.id, child.id, folders)) continue;
        }
        list.push({ id: child.id, name: child.name, level });
        list.push(...recurse(child.id, level + 1));
      }
      return list;
    };

    return [rootDest, ...recurse(effectiveRootFolderId, 1)];
  }, [movingItem, folders, effectiveRootFolderId, rootName]);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-fouzar-signal" />;
    if (['ppt', 'pptx'].includes(ext || '')) return <FileText className="w-4 h-4 text-fouzar-amber" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext || '')) return <File className="w-4 h-4 text-fouzar-ice" />;
    return <FileText className="w-4 h-4 text-fouzar-text-secondary" />;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs">
      
      {/* Breadcrumb Navigation Path */}
      <div className="flex items-center gap-1.5 font-mono text-[9px] text-fouzar-text-secondary uppercase mb-3 overflow-x-auto whitespace-nowrap scrollbar-none py-1 border-b border-fouzar-border/10 shrink-0">
        {currentDirId !== effectiveRootFolderId && (
          <button
            type="button"
            onClick={() => setCurrentDirId(parentDirId)}
            className="p-1 hover:bg-fouzar-elevated/40 hover:text-white rounded transition-colors mr-1 cursor-pointer"
            title="Go Back"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setCurrentDirId(effectiveRootFolderId)}
          className={`hover:text-fouzar-accent transition-colors cursor-pointer ${
            currentDirId === effectiveRootFolderId ? 'text-fouzar-text-primary font-bold' : ''
          }`}
        >
          {rootName}
        </button>
        {pathSegments.map((seg, idx) => {
          const isLast = idx === pathSegments.length - 1;
          return (
            <React.Fragment key={seg.id}>
              <span className="text-fouzar-text-tertiary">/</span>
              <button
                type="button"
                onClick={() => setCurrentDirId(seg.id)}
                disabled={isLast}
                className={`hover:text-fouzar-accent transition-colors ${
                  isLast ? 'text-fouzar-text-primary font-bold cursor-default' : 'cursor-pointer'
                }`}
              >
                {seg.name}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Explorer Controls */}
      <div className="flex flex-col gap-2 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-tertiary" />
            <input
              type="text"
              placeholder="Search..."
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

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-fouzar-elevated/40 border border-fouzar-border text-[9px] font-mono rounded-[var(--fouzar-radius-md)] px-2 py-1.5 focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary cursor-pointer hover:bg-fouzar-elevated/60"
            >
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="size-desc">Largest</option>
              <option value="size-asc">Smallest</option>
            </select>
          </div>

          {/* New Folder Toggle */}
          <button
            type="button"
            onClick={() => setIsCreatingFolder(prev => !prev)}
            className={`p-1.5 border rounded-[var(--fouzar-radius-md)] cursor-pointer transition-colors ${
              isCreatingFolder
                ? 'bg-fouzar-accent/20 border-fouzar-accent text-fouzar-accent'
                : 'bg-fouzar-elevated/40 border-fouzar-border text-fouzar-text-secondary hover:text-white hover:border-white/20'
            }`}
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          {/* Upload Button */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 bg-fouzar-accent/10 border border-fouzar-accent/30 text-fouzar-accent hover:bg-fouzar-accent/20 rounded-[var(--fouzar-radius-md)] cursor-pointer transition-colors flex items-center justify-center gap-1 px-3"
            title="Upload File"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
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

      {/* Inline New Folder Form */}
      <AnimatePresence>
        {isCreatingFolder && (
          <motion.form
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            onSubmit={handleCreateFolder}
            className="flex items-center gap-2 p-2 bg-fouzar-accent/5 border border-fouzar-accent/20 rounded-[var(--fouzar-radius-md)] mb-3 shrink-0"
          >
            <Folder className="w-4 h-4 text-fouzar-accent shrink-0" />
            <input
              type="text"
              autoFocus
              required
              placeholder="New folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none text-[10px] text-fouzar-text-primary placeholder:text-fouzar-text-tertiary"
            />
            <button
              type="submit"
              className="px-2.5 py-0.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8px] uppercase font-bold rounded cursor-pointer hover:opacity-90"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingFolder(false);
                setNewFolderName('');
              }}
              className="p-1 text-fouzar-text-tertiary hover:text-fouzar-text-primary cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Directory Contents List */}
      <div
        onClick={() => setSelectedItemId(null)}
        className="flex-1 overflow-y-auto scrollbar-none space-y-1.5 pr-0.5"
      >
        {displayedFolders.length === 0 && displayedFiles.length === 0 ? (
          <div
            onClick={(e) => e.stopPropagation()}
            className="py-12 text-center border border-dashed border-fouzar-border rounded-[var(--fouzar-radius-lg)] bg-fouzar-elevated/10 flex flex-col items-center justify-center"
          >
            <Folder className="w-8 h-8 text-fouzar-text-tertiary mb-2" />
            <p className="font-mono text-[8.5px] text-fouzar-text-secondary uppercase">
              {searchQuery ? 'No matching items' : 'Directory is empty'}
            </p>
            {!searchQuery && (
              <p className="text-[7.5px] font-mono text-fouzar-text-tertiary uppercase mt-1">
                Create a subfolder or upload slides here
              </p>
            )}
          </div>
        ) : (
          <div className={isCompact ? 'space-y-1' : 'grid grid-cols-1 sm:grid-cols-2 gap-2'}>
            
            {/* Render subdirectories */}
            {displayedFolders.map((folder) => (
              <motion.div
                key={folder.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
                className={`group flex items-center justify-between p-2.5 bg-fouzar-elevated/20 border rounded-[var(--fouzar-radius-md)] transition-colors ${
                  selectedItemId === folder.id
                    ? 'border-fouzar-accent shadow-[0_0_10px_rgba(124,92,252,0.15)] bg-fouzar-accent/5'
                    : 'border-fouzar-border hover:border-fouzar-accent/40'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItemId(folder.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setCurrentDirId(folder.id);
                    setSelectedItemId(null);
                  }}
                  className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                >
                  <Folder className="w-4 h-4 text-fouzar-accent shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fouzar-text-primary truncate">{folder.name}</p>
                    <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">
                      Folder
                    </p>
                  </div>
                </button>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMovingItem({ type: 'folder', id: folder.id, name: folder.name });
                    }}
                    className="p-1 text-fouzar-text-tertiary hover:text-fouzar-accent transition-colors cursor-pointer"
                    title="Move Folder"
                  >
                    <FolderInput className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(folder.id);
                    }}
                    className="p-1 text-fouzar-text-tertiary hover:text-fouzar-signal transition-colors cursor-pointer"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}

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

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMovingItem({ type: 'file', id: doc.id, name: doc.fileName });
                      }}
                      className="p-1 text-fouzar-text-tertiary hover:text-fouzar-accent transition-colors cursor-pointer"
                      title="Move File"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRepositoryItem(doc.id);
                      }}
                      className="p-1 text-fouzar-text-tertiary hover:text-fouzar-signal transition-colors cursor-pointer"
                      title="Delete File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Move Destination Selection Modal */}
      <AnimatePresence>
        {movingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-5 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[80vh]"
            >
              <div className="flex justify-between items-center mb-3.5 pb-2 border-b border-fouzar-border/20 shrink-0">
                <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-white">
                  Move {movingItem.type}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setMovingItem(null);
                    setSelectedDestId(null);
                  }}
                  className="text-fouzar-text-tertiary hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[10px] text-fouzar-text-secondary mb-3 font-mono">
                Select target folder for <span className="text-fouzar-accent font-semibold">{movingItem.name}</span>:
              </p>

              {/* Destination folder tree list */}
              <div className="flex-1 overflow-y-auto scrollbar-none border border-fouzar-border/50 rounded-[var(--fouzar-radius-md)] bg-fouzar-bg/50 p-2 space-y-1 mb-4 min-h-[150px]">
                {moveDestinations.map((dest) => (
                  <button
                    key={dest.id || 'root'}
                    type="button"
                    onClick={() => setSelectedDestId(dest.id)}
                    style={{ paddingLeft: `${dest.level * 12 + 10}px` }}
                    className={`w-full text-left py-2 px-3 rounded text-[10px] flex items-center gap-2 cursor-pointer transition-colors border ${
                      selectedDestId === dest.id
                        ? 'bg-fouzar-accent/20 border-fouzar-accent text-fouzar-accent font-bold'
                        : 'border-transparent text-fouzar-text-primary hover:bg-fouzar-elevated/40 hover:text-white'
                    }`}
                  >
                    <Folder className={`w-3.5 h-3.5 ${selectedDestId === dest.id ? 'text-fouzar-accent' : 'text-fouzar-text-secondary'}`} />
                    <span className="truncate">{dest.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setMovingItem(null);
                    setSelectedDestId(null);
                  }}
                  className="px-3.5 py-1.5 border border-fouzar-border rounded-[var(--fouzar-radius-md)] font-mono text-[9px] uppercase text-fouzar-text-secondary hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedDestId === null}
                  onClick={handleMoveConfirm}
                  className="px-4 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Move Here
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
