'use client';

import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Upload, Trash2, Search, File, X, Loader2,
  Folder, FolderPlus, FolderInput, ChevronLeft, ChevronDown,
  Plus, Maximize2, Minimize2, ChevronRight, Star, Pin,
  Copy, Edit3, List, Grid, ArrowLeft, ArrowRight,
  Clock, Download, BookMarked, Home,
} from 'lucide-react';
import { useFouzar, LmsRepositoryItem, FouzarFolder } from '../../lib/FouzarContext';
import { UploadButton } from '../../utils/uploadthing';
import { getAuthToken, getBackendUrl } from '../../lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FileExplorerProps {
  isCompact?: boolean;
  rootFolderId?: string | null;
  onOpenFile?: (doc: LmsRepositoryItem) => void;
  scope?: 'sanctuary' | 'group';
  groupId?: string | null;
}

type ViewMode = 'grid' | 'list';
type SortKey = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc';
type SidebarView = 'browser' | 'favorites' | 'recent' | 'downloads' | 'collections';

interface ContextMenu {
  x: number;
  y: number;
  type: 'folder' | 'file';
  id: string;
  name: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseSize(label: string): number {
  if (!label) return 0;
  const parts = label.trim().split(/\s+/);
  const value = parseFloat(parts[0]);
  if (isNaN(value)) return 0;
  const unit = parts[1]?.toLowerCase() || '';
  if (unit.includes('gb')) return value * 1024 * 1024 * 1024;
  if (unit.includes('mb')) return value * 1024 * 1024;
  if (unit.includes('kb')) return value * 1024;
  return value;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getFileIcon(fileName: string, size = 'md'): React.ReactElement {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const cls = size === 'lg' ? 'w-8 h-8' : 'w-4 h-4';
  if (ext === 'pdf') return <FileText className={`${cls} text-[#ff2d55]`} />;
  if (['ppt', 'pptx'].includes(ext)) return <FileText className={`${cls} text-[#f5a623]`} />;
  if (['doc', 'docx'].includes(ext)) return <FileText className={`${cls} text-[#00b4d8]`} />;
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext)) return <File className={`${cls} text-[#4cd964]`} />;
  if (['zip', 'rar', '7z'].includes(ext)) return <File className={`${cls} text-[#af52de]`} />;
  if (['mp4', 'mkv', 'mov', 'webm'].includes(ext)) return <File className={`${cls} text-[#ff3b30]`} />;
  return <FileText className={`${cls} text-white/40`} />;
}

function getFileEmoji(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return '📄';
  if (['ppt', 'pptx'].includes(ext)) return '📊';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['zip', 'rar', '7z'].includes(ext)) return '📦';
  if (['mp4', 'mkv', 'mov', 'webm'].includes(ext)) return '🎬';
  return '📂';
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export const FileExplorer: React.FC<FileExplorerProps> = ({
  isCompact = false,
  rootFolderId = null,
  onOpenFile,
  scope = 'sanctuary',
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

  const effectiveRootFolderId = rootFolderId;

  // ── Navigation State ────────────────────────────────────────────────────────
  const [currentDirId, setCurrentDirIdRaw] = useState<string | null>(effectiveRootFolderId);
  const [history, setHistory] = useState<(string | null)[]>([effectiveRootFolderId]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // ── UI State ─────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sidebarView, setSidebarView] = useState<SidebarView>('browser');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('date-desc');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isMaximized, setIsMaximized] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [movingItem, setMovingItem] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null);
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [recentlyOpened, setRecentlyOpened] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── Sync root prop ───────────────────────────────────────────────────────────
  useEffect(() => {
    setCurrentDirIdRaw(effectiveRootFolderId);
    setHistory([effectiveRootFolderId]);
    setHistoryIndex(0);
  }, [effectiveRootFolderId]);

  // ── Track recently opened ────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('fasca-recently-opened');
    if (saved) setRecentlyOpened(JSON.parse(saved));
  }, []);

  const recordOpen = useCallback((id: string) => {
    setRecentlyOpened(prev => {
      const next = [id, ...prev.filter(x => x !== id)].slice(0, 20);
      localStorage.setItem('fasca-recently-opened', JSON.stringify(next));
      return next;
    });
  }, []);

  // ── Navigation helpers ───────────────────────────────────────────────────────
  const navigateTo = useCallback((id: string | null) => {
    setCurrentDirIdRaw(id);
    setSearchQuery('');
    setContextMenu(null);
    setSelectedItemId(null);
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, id];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const goBack = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setCurrentDirIdRaw(history[newIndex]);
    setSearchQuery('');
    setContextMenu(null);
  }, [history, historyIndex]);

  const goForward = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setCurrentDirIdRaw(history[newIndex]);
    setSearchQuery('');
    setContextMenu(null);
  }, [history, historyIndex]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  // ── Breadcrumb path ──────────────────────────────────────────────────────────
  const rootName = useMemo(() => {
    if (!effectiveRootFolderId || effectiveRootFolderId === 'general') return 'Sanctuary';
    return folders.find(f => f.id === effectiveRootFolderId)?.name ?? 'Sanctuary';
  }, [folders, effectiveRootFolderId]);

  const pathSegments = useMemo<FouzarFolder[]>(() => {
    const segments: FouzarFolder[] = [];
    let currId = currentDirId;
    while (currId && currId !== effectiveRootFolderId) {
      const folder = folders.find(f => f.id === currId);
      if (!folder) break;
      segments.unshift(folder);
      currId = folder.parentFolderId;
    }
    return segments;
  }, [folders, currentDirId, effectiveRootFolderId]);

  const parentDirId = useMemo<string | null>(() => {
    if (currentDirId === effectiveRootFolderId) return null;
    const folder = folders.find(f => f.id === currentDirId);
    return folder ? folder.parentFolderId : effectiveRootFolderId;
  }, [folders, currentDirId, effectiveRootFolderId]);

  // ── Folder/File Filtering ────────────────────────────────────────────────────
  const displayedFolders = useMemo<FouzarFolder[]>(() => {
    let list = folders.filter(f => {
      if (currentDirId === 'general' || currentDirId === null) {
        return (f.parentFolderId === 'general' || f.parentFolderId === null) && f.id !== 'general';
      }
      return f.parentFolderId === currentDirId;
    });
    if (searchQuery.trim()) {
      list = list.filter(f => (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return [...list].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [folders, currentDirId, searchQuery]);

  const displayedFiles = useMemo<LmsRepositoryItem[]>(() => {
    const list = repository.filter(doc => {
      const docFolderId = doc.folderId === 'general' ? null : doc.folderId || null;
      const dirId = currentDirId === 'general' ? null : currentDirId || null;
      return docFolderId === dirId;
    });
    const filtered = searchQuery.trim()
      ? list.filter(doc => (doc.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()))
      : list;
    return [...filtered].sort((a, b) => {
      if (sortBy === 'name-asc') return a.fileName.localeCompare(b.fileName);
      if (sortBy === 'name-desc') return b.fileName.localeCompare(a.fileName);
      if (sortBy === 'date-asc') return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      if (sortBy === 'size-desc') return parseSize(b.sizeLabel) - parseSize(a.sizeLabel);
      if (sortBy === 'size-asc') return parseSize(a.sizeLabel) - parseSize(b.sizeLabel);
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
  }, [repository, currentDirId, searchQuery, sortBy]);

  // ── Sidebar special views ────────────────────────────────────────────────────
  const favoriteFiles = useMemo(() => repository.filter(r => (r as any).isFavorite), [repository]);
  const favoriteFolders = useMemo(() => folders.filter(f => f.isFavorite), [folders]);
  const recentFiles = useMemo(() => {
    return recentlyOpened
      .map(id => repository.find(r => r.id === id))
      .filter(Boolean) as LmsRepositoryItem[];
  }, [recentlyOpened, repository]);
  const downloadFiles = useMemo(() => {
    return repository.filter(r => {
      const ext = r.fileName.split('.').pop()?.toLowerCase() ?? '';
      return (r as any).downloadUrl || ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'zip'].includes(ext);
    });
  }, [repository]);

  // ── Folder tree for move destination ────────────────────────────────────────
  const isDescendant = (folderId: string, potentialParentId: string | null, allFolders: FouzarFolder[]): boolean => {
    let curr = potentialParentId;
    while (curr) {
      if (curr === folderId) return true;
      const parent = allFolders.find(f => f.id === curr);
      curr = parent ? parent.parentFolderId : null;
    }
    return false;
  };

  const moveDestinations = useMemo(() => {
    if (!movingItem) return [];
    const rootDest = { id: 'root', name: rootName, level: 0 };
    const recurse = (parentId: string | null, level: number): { id: string; name: string; level: number }[] => {
      const children = folders.filter(f => {
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

  // ── Context Menu handlers ────────────────────────────────────────────────────
  const openContextMenu = (e: React.MouseEvent, type: 'folder' | 'file', id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id, name });
  };

  useEffect(() => {
    const dismiss = () => setContextMenu(null);
    window.addEventListener('click', dismiss);
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') dismiss(); });
    return () => { window.removeEventListener('click', dismiss); };
  }, []);

  const startRename = (id: string, currentName: string) => {
    setContextMenu(null);
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const commitRename = (type: 'folder' | 'file', id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return; }
    if (type === 'folder') {
      updateFolder(id, { name: renameValue.trim() });
    } else {
      updateRepositoryItem(id, { fileName: renameValue.trim() });
    }
    setRenamingId(null);
  };

  const duplicateFile = (doc: LmsRepositoryItem) => {
    setContextMenu(null);
    const copy = {
      ...doc,
      id: `${doc.id}-copy-${Date.now()}`,
      fileName: `${doc.fileName.replace(/(\.[^.]+)$/, '')} (copy)${doc.fileName.match(/\.[^.]+$/)?.[0] ?? ''}`,
      uploadedAt: new Date().toISOString(),
    };
    addRepositoryItem(copy);
  };

  const toggleFavoriteFolder = (id: string, current: boolean | undefined) => {
    updateFolder(id, { isFavorite: !current });
    setContextMenu(null);
  };

  const togglePinFolder = (id: string, current: boolean | undefined) => {
    updateFolder(id, { isPinned: !current });
    setContextMenu(null);
  };

  const toggleFavoriteFile = (id: string, current: boolean | undefined) => {
    updateRepositoryItem(id, { isFavorite: !current } as any);
    setContextMenu(null);
  };

  // ── Folder create ────────────────────────────────────────────────────────────
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    addFolder(newFolderName.trim(), 'GEN', currentDirId || 'general');
    setNewFolderName('');
    setIsCreatingFolder(false);
  };

  // ── Move confirm ─────────────────────────────────────────────────────────────
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

  // ── Folder tree sidebar recursive rendering ──────────────────────────────────
  const renderFolderTree = (parentId: string | null, depth = 0): React.ReactElement[] => {
    const children = folders.filter(f => {
      if (parentId === null || parentId === 'general') {
        return (f.parentFolderId === null || f.parentFolderId === 'general') && f.id !== 'general';
      }
      return f.parentFolderId === parentId;
    });
    return children.map(f => (
      <div key={f.id}>
        <button
          onClick={() => navigateTo(f.id)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-colors text-left ${currentDirId === f.id ? 'bg-[#7c5cfc]/20 text-[#9b82ff]' : 'text-white/50 hover:text-white/90 hover:bg-white/5'}`}
          style={{ paddingLeft: `${12 + depth * 14}px` }}
        >
          <Folder className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate flex-1">{f.name}</span>
          {f.isPinned && <Pin className="w-2.5 h-2.5 text-[#7c5cfc]/60" />}
        </button>
        {renderFolderTree(f.id, depth + 1)}
      </div>
    ));
  };

  // ── Shared File/Folder card elements ─────────────────────────────────────────
  const FolderCard = ({ folder }: { folder: FouzarFolder }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative rounded-xl border transition-all cursor-pointer ${
        selectedItemId === folder.id
          ? 'border-[#7c5cfc] bg-[#7c5cfc]/10'
          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
      } ${viewMode === 'grid' ? 'p-4 flex flex-col gap-2' : 'p-3 flex items-center gap-3'}`}
      onClick={(e) => { e.stopPropagation(); setSelectedItemId(folder.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); navigateTo(folder.id); }}
      onContextMenu={(e) => openContextMenu(e, 'folder', folder.id, folder.name)}
    >
      {viewMode === 'grid' ? (
        <>
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${folder.isFavorite ? 'bg-yellow-500/20' : 'bg-[#7c5cfc]/20'}`}>
              <Folder className={`w-5 h-5 ${folder.isFavorite ? 'text-yellow-400' : 'text-[#7c5cfc]'}`} />
            </div>
            {folder.isPinned && <Pin className="w-3 h-3 text-[#7c5cfc]/60" />}
          </div>
          {renamingId === folder.id ? (
            <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
              onBlur={() => commitRename('folder', folder.id)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename('folder', folder.id); if (e.key === 'Escape') setRenamingId(null); }}
              className="bg-transparent border-b border-[#7c5cfc] text-[12px] text-white outline-none w-full" />
          ) : (
            <p className="text-[12px] font-medium text-white/90 truncate">{folder.name}</p>
          )}
          <p className="text-[9px] font-mono text-white/30 uppercase">Folder</p>
        </>
      ) : (
        <>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${folder.isFavorite ? 'bg-yellow-500/20' : 'bg-[#7c5cfc]/10'}`}>
            <Folder className={`w-4 h-4 ${folder.isFavorite ? 'text-yellow-400' : 'text-[#7c5cfc]'}`} />
          </div>
          <div className="flex-1 min-w-0">
            {renamingId === folder.id ? (
              <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                onBlur={() => commitRename('folder', folder.id)}
                onKeyDown={e => { if (e.key === 'Enter') commitRename('folder', folder.id); if (e.key === 'Escape') setRenamingId(null); }}
                className="bg-transparent border-b border-[#7c5cfc] text-[12px] text-white outline-none w-full" />
            ) : (
              <p className="text-[12px] font-medium text-white/90 truncate">{folder.name}</p>
            )}
            <p className="text-[9px] font-mono text-white/30 uppercase">Folder</p>
          </div>
          {folder.isPinned && <Pin className="w-3 h-3 text-white/20 flex-shrink-0" />}
          <ChevronRight className="w-4 h-4 text-white/20 opacity-0 group-hover:opacity-100 flex-shrink-0" />
        </>
      )}
    </motion.div>
  );

  const FileCard = ({ doc }: { doc: LmsRepositoryItem }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`group relative rounded-xl border transition-all cursor-pointer ${
        selectedItemId === doc.id
          ? 'border-[#7c5cfc] bg-[#7c5cfc]/10'
          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
      } ${viewMode === 'grid' ? 'p-4 flex flex-col gap-2' : 'p-3 flex items-center gap-3'}`}
      onClick={(e) => { e.stopPropagation(); setSelectedItemId(doc.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); recordOpen(doc.id); onOpenFile?.(doc); }}
      onContextMenu={(e) => openContextMenu(e, 'file', doc.id, doc.fileName)}
    >
      {viewMode === 'grid' ? (
        <>
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">
              {getFileEmoji(doc.fileName)}
            </div>
            {(doc as any).isFavorite && <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />}
          </div>
          {renamingId === doc.id ? (
            <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
              onBlur={() => commitRename('file', doc.id)}
              onKeyDown={e => { if (e.key === 'Enter') commitRename('file', doc.id); if (e.key === 'Escape') setRenamingId(null); }}
              className="bg-transparent border-b border-[#7c5cfc] text-[12px] text-white outline-none w-full" />
          ) : (
            <p className="text-[12px] font-medium text-white/90 truncate">{doc.fileName}</p>
          )}
          <div className="flex items-center gap-2 mt-auto">
            <span className="text-[9px] font-mono text-white/30">{doc.sizeLabel}</span>
            <span className="text-[9px] font-mono text-white/20 ml-auto">{timeAgo(doc.uploadedAt)}</span>
          </div>
        </>
      ) : (
        <>
          <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 text-lg">
            {getFileEmoji(doc.fileName)}
          </div>
          <div className="flex-1 min-w-0">
            {renamingId === doc.id ? (
              <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                onBlur={() => commitRename('file', doc.id)}
                onKeyDown={e => { if (e.key === 'Enter') commitRename('file', doc.id); if (e.key === 'Escape') setRenamingId(null); }}
                className="bg-transparent border-b border-[#7c5cfc] text-[12px] text-white outline-none w-full" />
            ) : (
              <p className="text-[12px] font-medium text-white/90 truncate">{doc.fileName}</p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-mono text-white/30 uppercase">{doc.category}</span>
              <span className="text-[9px] font-mono text-white/20">·</span>
              <span className="text-[9px] font-mono text-white/30">{doc.sizeLabel}</span>
            </div>
          </div>
          <span className="text-[9px] font-mono text-white/25 flex-shrink-0">{timeAgo(doc.uploadedAt)}</span>
          {(doc as any).isFavorite && <Star className="w-3.5 h-3.5 text-yellow-400 fill-current flex-shrink-0" />}
        </>
      )}
    </motion.div>
  );

  // ── Render sidebar content ────────────────────────────────────────────────────
  const renderSidebarContent = () => {
    if (sidebarView === 'favorites') {
      return (
        <div className="space-y-3">
          {favoriteFolders.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-white/30 uppercase px-2 mb-1">Folders</p>
              {favoriteFolders.map(f => (
                <button key={f.id} onClick={() => { setSidebarView('browser'); navigateTo(f.id); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
                  <Folder className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                  <span className="text-[11px] text-white/70 truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}
          {favoriteFiles.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-white/30 uppercase px-2 mb-1">Files</p>
              {favoriteFiles.map(d => (
                <button key={d.id} onClick={() => { recordOpen(d.id); onOpenFile?.(d); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
                  <span className="text-base flex-shrink-0">{getFileEmoji(d.fileName)}</span>
                  <span className="text-[11px] text-white/70 truncate">{d.fileName}</span>
                </button>
              ))}
            </div>
          )}
          {favoriteFolders.length === 0 && favoriteFiles.length === 0 && (
            <p className="text-[10px] text-white/30 text-center py-6 italic">No favorites yet</p>
          )}
        </div>
      );
    }

    if (sidebarView === 'recent') {
      return (
        <div className="space-y-1">
          {recentFiles.length === 0 && <p className="text-[10px] text-white/30 text-center py-6 italic">Nothing opened yet</p>}
          {recentFiles.map(d => (
            <button key={d.id} onClick={() => { recordOpen(d.id); onOpenFile?.(d); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left">
              <span className="text-base flex-shrink-0">{getFileEmoji(d.fileName)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white/70 truncate">{d.fileName}</p>
                <p className="text-[9px] font-mono text-white/30">{timeAgo(d.uploadedAt)}</p>
              </div>
            </button>
          ))}
        </div>
      );
    }

    if (sidebarView === 'downloads') {
      return (
        <div className="space-y-1">
          {downloadFiles.length === 0 && <p className="text-[10px] text-white/30 text-center py-6 italic">No downloadable files</p>}
          {downloadFiles.map(d => (
            <div key={d.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group cursor-default">
              <span className="text-base flex-shrink-0">{getFileEmoji(d.fileName)}</span>
              <span className="text-[11px] text-white/70 truncate flex-1">{d.fileName}</span>
              {(d as any).fileUrl && (
                <a href={(d as any).fileUrl} download className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded">
                  <Download className="w-3.5 h-3.5 text-[#7c5cfc]" />
                </a>
              )}
            </div>
          ))}
        </div>
      );
    }

    // Default: browser — folder tree
    return (
      <div className="space-y-0.5">
        <button
          onClick={() => navigateTo(effectiveRootFolderId)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-colors text-left ${(currentDirId === effectiveRootFolderId && sidebarView === 'browser') ? 'bg-[#7c5cfc]/20 text-[#9b82ff]' : 'text-white/50 hover:text-white/90 hover:bg-white/5'}`}
        >
          <Home className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{rootName}</span>
        </button>
        {renderFolderTree(effectiveRootFolderId)}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`flex h-full bg-[#0b0b12] text-white transition-all duration-300 ${isMaximized ? 'fixed inset-0 z-[100]' : ''}`}
      onClick={() => { setSelectedItemId(null); setContextMenu(null); }}
    >
      {/* ── LEFT SIDEBAR ───────────────────────────────────────────────────────── */}
      <div className="w-52 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0d0d16]">
        {/* Sidebar Nav Icons */}
        <div className="flex flex-col gap-1 p-2 border-b border-white/[0.06]">
          {[
            { id: 'browser' as SidebarView, icon: <Folder className="w-4 h-4" />, label: 'Files' },
            { id: 'favorites' as SidebarView, icon: <Star className="w-4 h-4" />, label: 'Favorites' },
            { id: 'recent' as SidebarView, icon: <Clock className="w-4 h-4" />, label: 'Recent' },
            { id: 'downloads' as SidebarView, icon: <Download className="w-4 h-4" />, label: 'Downloads' },
          ].map(item => (
            <button
              key={item.id}
              onClick={(e) => { e.stopPropagation(); setSidebarView(item.id); }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors text-left ${sidebarView === item.id ? 'bg-[#7c5cfc]/20 text-[#9b82ff]' : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Sidebar Content (tree or list) */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-2">
          {renderSidebarContent()}
        </div>
      </div>

      {/* ── MAIN EXPLORER PANE ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top Bar: Back/Forward + Breadcrumbs + Controls ─────────────────────── */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-[#0d0d16] flex-shrink-0">
          {/* Back / Forward */}
          <button onClick={goBack} disabled={!canGoBack}
            className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <button onClick={goForward} disabled={!canGoForward}
            className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-25 transition-colors flex-shrink-0">
            <ArrowRight className="w-4 h-4 text-white/60" />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 font-mono text-[10px] text-white/40 overflow-x-auto scrollbar-none flex-1">
            <button onClick={() => navigateTo(effectiveRootFolderId)} className="hover:text-white/80 transition-colors whitespace-nowrap flex-shrink-0">
              {rootName}
            </button>
            {pathSegments.map((seg, i) => (
              <React.Fragment key={seg.id}>
                <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />
                <button
                  onClick={() => navigateTo(seg.id)}
                  className={`hover:text-white/80 transition-colors whitespace-nowrap flex-shrink-0 ${i === pathSegments.length - 1 ? 'text-white/80 font-semibold' : ''}`}
                >
                  {seg.name}
                </button>
              </React.Fragment>
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* View toggle */}
            <div className="flex items-center bg-white/5 border border-white/[0.06] rounded-lg overflow-hidden">
              <button onClick={(e) => { e.stopPropagation(); setViewMode('list'); }}
                className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-[#7c5cfc]/30 text-[#9b82ff]' : 'text-white/30 hover:text-white/70'}`}>
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setViewMode('grid'); }}
                className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-[#7c5cfc]/30 text-[#9b82ff]' : 'text-white/30 hover:text-white/70'}`}>
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              onClick={e => e.stopPropagation()}
              className="bg-white/5 border border-white/[0.06] text-[9px] font-mono rounded-lg px-2 py-1.5 focus:outline-none text-white/50 cursor-pointer hover:text-white/80 hover:border-white/20 transition-colors"
            >
              <option value="date-desc">Newest</option>
              <option value="date-asc">Oldest</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
              <option value="size-desc">Largest</option>
              <option value="size-asc">Smallest</option>
            </select>

            {/* New Folder */}
            <button onClick={(e) => { e.stopPropagation(); setIsCreatingFolder(p => !p); }}
              className="p-1.5 rounded-lg border border-white/[0.06] bg-white/5 text-white/40 hover:text-[#7c5cfc] hover:border-[#7c5cfc]/40 transition-colors"
              title="New Folder">
              <FolderPlus className="w-3.5 h-3.5" />
            </button>

            {/* Upload */}
            <UploadButton
              endpoint="materialUploader"
              onClientUploadComplete={async (res) => {
                if (res && res.length > 0) {
                  const file = res[0];
                  
                  // Optimistically add to UI
                  const tempId = `doc-${Date.now()}`;
                  addRepositoryItem({
                    id: tempId,
                    fileName: file.name,
                    fileUrl: file.url,
                    sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                    mimeType: file.type,
                    folderId: currentDirId === 'general' ? null : currentDirId,
                    category: 'other',
                  });

                  // Then try to sync to backend
                  try {
                    const token = getAuthToken();
                    await fetch(`${getBackendUrl()}/materials`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({
                        fileName: file.name, fileUrl: file.url,
                        sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                        mimeType: file.type,
                        subjectId: currentDirId === 'general' ? null : currentDirId,
                        category: 'other',
                      }),
                    });
                  } catch (e) { console.warn('Failed to sync upload to backend:', e); }
                }
              }}
              onUploadError={(error: Error) => alert(`Upload error: ${error.message}`)}
              appearance={{
                container: 'overflow-hidden flex items-center justify-center shrink-0',
                button: 'bg-[#7c5cfc]/15 border border-[#7c5cfc]/40 text-[#7c5cfc] hover:bg-[#7c5cfc]/30 rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] font-mono font-bold shadow-sm',
                allowedContent: 'hidden text-[0px] h-0 w-0 opacity-0 pointer-events-none',
              }}
              content={{
                button({ ready, isUploading }) {
                  if (isUploading) return 'Uploading...';
                  if (ready) return 'Upload File';
                  return 'Loading...';
                },
              }}
            />

            {/* Maximize */}
            <button onClick={(e) => { e.stopPropagation(); setIsMaximized(p => !p); }}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/70 transition-colors">
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ── Search Bar ──────────────────────────────────────────────────────── */}
        <div className="px-4 py-2 border-b border-white/[0.04] flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
            <input
              type="text"
              placeholder={`Search in ${pathSegments.length > 0 ? pathSegments[pathSegments.length - 1].name : rootName}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="w-full pl-9 pr-8 py-2 bg-white/[0.03] border border-white/[0.06] rounded-xl text-[11px] text-white/80 placeholder-white/20 outline-none focus:border-[#7c5cfc]/40 transition-colors"
            />
            {searchQuery && (
              <button onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/70">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ── New Folder Inline Form ──────────────────────────────────────────── */}
        <AnimatePresence>
          {isCreatingFolder && (
            <motion.form
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onSubmit={handleCreateFolder}
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#7c5cfc]/5 border-b border-[#7c5cfc]/20 flex-shrink-0"
            >
              <Folder className="w-4 h-4 text-[#7c5cfc] flex-shrink-0" />
              <input
                type="text" autoFocus required
                placeholder="New folder name..."
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                className="flex-1 bg-transparent text-[11px] text-white placeholder-white/30 outline-none"
              />
              <button type="submit" className="px-3 py-1 bg-[#7c5cfc] text-white text-[9px] font-bold uppercase rounded-lg">Create</button>
              <button type="button" onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                className="p-1 text-white/30 hover:text-white/70">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* ── Directory Contents ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-none p-4" onClick={() => setSelectedItemId(null)}>
          {displayedFolders.length === 0 && displayedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 overflow-y-auto w-full">
              {!searchQuery ? (
                <div className="w-full max-w-sm mx-auto">
                  <UploadButton
                    endpoint="materialUploader"
                    onClientUploadComplete={async (res) => {
                      if (res && res.length > 0) {
                        const file = res[0];
                        const tempId = `doc-${Date.now()}`;
                        addRepositoryItem({
                          id: tempId,
                          fileName: file.name,
                          fileUrl: file.url,
                          sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                          mimeType: file.type,
                          folderId: currentDirId === 'general' ? null : currentDirId,
                          category: 'other',
                        });
                        try {
                          const token = getAuthToken();
                          await fetch(`${getBackendUrl()}/materials`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({
                              fileName: file.name, fileUrl: file.url,
                              sizeLabel: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                              mimeType: file.type,
                              subjectId: currentDirId === 'general' ? null : currentDirId,
                              category: 'other',
                            }),
                          });
                        } catch (e) { console.warn('Failed to sync upload to backend:', e); }
                      }
                    }}
                    onUploadError={(error: Error) => alert(`Upload error: ${error.message}`)}
                  />
                  <p className="text-[10px] font-mono text-white/25 mt-4 uppercase text-center">Or create a subfolder using the + button above</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center opacity-50">
                  <Folder className="w-10 h-10 text-white/20 mb-3" />
                  <p className="text-[11px] font-mono text-white/40 uppercase">No results</p>
                </div>
              )}
            </div>

          ) : (
            <div className="flex flex-col gap-6">
              {/* Folders */}
              {displayedFolders.length > 0 && (
                <section>
                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2 px-1">Folders</p>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2' : 'flex flex-col gap-1'}>
                    {displayedFolders.map(folder => <FolderCard key={folder.id} folder={folder} />)}
                  </div>
                </section>
              )}
              {/* Files */}
              {displayedFiles.length > 0 && (
                <section>
                  <p className="text-[9px] font-mono text-white/30 uppercase tracking-widest mb-2 px-1">Files</p>
                  <div className={viewMode === 'grid' ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2' : 'flex flex-col gap-1'}>
                    <AnimatePresence>
                      {displayedFiles.map(doc => <FileCard key={doc.id} doc={doc} />)}
                    </AnimatePresence>
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTEXT MENU ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            style={{ top: contextMenu.y, left: contextMenu.x, position: 'fixed' }}
            className="z-[200] w-52 bg-[#1a1a26] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
            onClick={e => e.stopPropagation()}
          >
            {contextMenu.type === 'folder' ? (
              <>
                <CtxItem icon={<Edit3 className="w-3.5 h-3.5" />} label="Rename"
                  onClick={() => { const f = folders.find(x => x.id === contextMenu.id); if (f) startRename(f.id, f.name); }} />
                <CtxItem icon={<FolderInput className="w-3.5 h-3.5" />} label="Move"
                  onClick={() => { setMovingItem({ type: 'folder', id: contextMenu.id, name: contextMenu.name }); setContextMenu(null); }} />
                <CtxItem icon={<Star className="w-3.5 h-3.5" />} label={folders.find(f => f.id === contextMenu.id)?.isFavorite ? 'Unfavorite' : 'Add to Favorites'}
                  onClick={() => { const f = folders.find(x => x.id === contextMenu.id); toggleFavoriteFolder(contextMenu.id, f?.isFavorite); }} />
                <CtxItem icon={<Pin className="w-3.5 h-3.5" />} label={folders.find(f => f.id === contextMenu.id)?.isPinned ? 'Unpin' : 'Pin to Top'}
                  onClick={() => { const f = folders.find(x => x.id === contextMenu.id); togglePinFolder(contextMenu.id, f?.isPinned); }} />
                <div className="my-1 border-t border-white/[0.06]" />
                <CtxItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete" danger
                  onClick={() => { deleteFolder(contextMenu.id); setContextMenu(null); }} />
              </>
            ) : (
              <>
                <CtxItem icon={<Edit3 className="w-3.5 h-3.5" />} label="Rename"
                  onClick={() => { const d = repository.find(x => x.id === contextMenu.id); if (d) startRename(d.id, d.fileName); }} />
                <CtxItem icon={<FolderInput className="w-3.5 h-3.5" />} label="Move to Folder"
                  onClick={() => { setMovingItem({ type: 'file', id: contextMenu.id, name: contextMenu.name }); setContextMenu(null); }} />
                <CtxItem icon={<Copy className="w-3.5 h-3.5" />} label="Duplicate"
                  onClick={() => { const d = repository.find(x => x.id === contextMenu.id); if (d) duplicateFile(d); }} />
                <CtxItem icon={<Star className="w-3.5 h-3.5" />}
                  label={(repository.find(x => x.id === contextMenu.id) as any)?.isFavorite ? 'Unfavorite' : 'Add to Favorites'}
                  onClick={() => { const d = repository.find(x => x.id === contextMenu.id); toggleFavoriteFile(contextMenu.id, (d as any)?.isFavorite); }} />
                <div className="my-1 border-t border-white/[0.06]" />
                <CtxItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Delete" danger
                  onClick={() => { removeRepositoryItem(contextMenu.id); setContextMenu(null); }} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MOVE MODAL ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {movingItem && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setMovingItem(null); setSelectedDestId(null); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-[#1a1a26] border border-white/10 rounded-2xl shadow-2xl p-5 flex flex-col max-h-[70vh]"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[12px] font-bold text-white uppercase tracking-wider">Move to Folder</h3>
                <button onClick={() => { setMovingItem(null); setSelectedDestId(null); }} className="text-white/30 hover:text-white/80 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-white/40 font-mono mb-3">Moving: <span className="text-white/80">{movingItem.name}</span></p>
              <div className="flex-1 overflow-y-auto scrollbar-none space-y-0.5 border border-white/[0.06] rounded-xl bg-black/20 p-2 mb-4 min-h-[140px]">
                {moveDestinations.map(dest => (
                  <button key={dest.id}
                    onClick={() => setSelectedDestId(dest.id)}
                    style={{ paddingLeft: `${dest.level * 14 + 10}px` }}
                    className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-[11px] transition-colors ${selectedDestId === dest.id ? 'bg-[#7c5cfc]/25 text-[#9b82ff]' : 'text-white/60 hover:bg-white/5 hover:text-white/90'}`}
                  >
                    <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                    {dest.name}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 flex-shrink-0">
                <button onClick={() => { setMovingItem(null); setSelectedDestId(null); }}
                  className="px-4 py-2 border border-white/10 rounded-xl text-[10px] font-mono text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button disabled={!selectedDestId} onClick={handleMoveConfirm}
                  className="px-4 py-2 bg-[#7c5cfc] text-white text-[10px] font-bold uppercase rounded-xl hover:bg-[#9b82ff] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
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

// ─── Context Menu Item ────────────────────────────────────────────────────────

function CtxItem({ icon, label, onClick, danger = false }: { icon: React.ReactElement; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-[11px] transition-colors text-left ${danger ? 'text-[#ff2d55] hover:bg-[#ff2d55]/10' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'}`}
    >
      {icon}
      {label}
    </button>
  );
}
