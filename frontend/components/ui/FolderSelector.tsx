'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, FolderPlus, ChevronDown, Check, Plus, Trash2, X, CornerDownRight } from 'lucide-react';
import { useFouzar, FouzarFolder } from '../../lib/FouzarContext';

interface HierarchicalFolder extends FouzarFolder {
  level: number;
}

const getHierarchicalFolders = (
  folderList: FouzarFolder[],
  parentId: string | null = null,
  level = 0
): HierarchicalFolder[] => {
  const levelFolders = folderList.filter((f) => f.parentFolderId === parentId && f.id !== 'all');
  const result: HierarchicalFolder[] = [];
  for (const f of levelFolders) {
    result.push({ ...f, level });
    const children = getHierarchicalFolders(folderList, f.id, level + 1);
    result.push(...children);
  }
  return result;
};

export const FolderSelector: React.FC = () => {
  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    addFolder,
    deleteFolder,
    mode,
  } = useFouzar();

  const dropdownFolders = React.useMemo(() => {
    const allFolder = folders.find((f) => f.id === 'all');
    const tree = getHierarchicalFolders(folders, null, 0);
    if (allFolder) {
      return [{ ...allFolder, level: 0 }, ...tree];
    }
    return tree;
  }, [folders]);

  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCode, setNewFolderCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeFolder = folders.find((f) => f.id === activeFolderId) || folders[0];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowAddForm(false);
        setError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = newFolderName.trim();
    const code = newFolderCode.trim().toUpperCase();

    if (!name || !code) {
      setError('Please provide name and code.');
      return;
    }

    if (folders.some((f) => f.code === code)) {
      setError('Subject code already exists.');
      return;
    }

    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase() && f.parentFolderId === null)) {
      setError('Subject name already exists.');
      return;
    }

    addFolder(name, code);
    setNewFolderName('');
    setNewFolderCode('');
    setShowAddForm(false);
  };

  return (
    <div className="relative w-full z-20 font-sans" ref={containerRef}>
      <span className="font-mono text-[7.5px] uppercase tracking-widest text-fouzar-text-secondary block mb-1.5">
        Active Subject
      </span>

      {/* Main Select Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-fouzar-elevated border border-fouzar-border hover:border-fouzar-accent px-3 py-2 text-[11px] font-semibold rounded-[var(--fouzar-radius-md)] focus:outline-none transition-colors cursor-pointer select-none text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Folder className="w-3.5 h-3.5 text-fouzar-accent shrink-0" />
          <span className="truncate">{activeFolder?.name}</span>
          {activeFolder?.code && activeFolder.id !== 'all' && (
            <span className="px-1 py-0.5 bg-fouzar-accent/10 border border-fouzar-accent/20 text-fouzar-accent font-mono text-[6.5px] rounded uppercase shrink-0">
              {activeFolder.code}
            </span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-fouzar-text-secondary shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 right-0 mt-1 border border-fouzar-border rounded-[var(--fouzar-radius-lg)] shadow-2xl overflow-hidden z-50 flex flex-col max-h-[300px] ${
              mode === 'onyx' ? 'bg-[#14141c]' : 'bg-[#0a1018]'
            }`}
          >
            {/* List of Folders */}
            <div className="overflow-y-auto p-1.5 space-y-0.5 max-h-[190px] scrollbar-none flex-1">
              {dropdownFolders.map((folder) => {
                const isActive = folder.id === activeFolderId;
                const parentFolder = folder.parentFolderId ? folders.find((f) => f.id === folder.parentFolderId) : null;
                return (
                  <div
                    key={folder.id}
                    className={`group w-full flex items-center justify-between p-2 rounded-[var(--fouzar-radius-md)] transition-colors ${
                      isActive
                        ? 'bg-fouzar-accent/10 text-fouzar-accent'
                        : 'hover:bg-white/5 text-fouzar-text-primary'
                    }`}
                    style={{ paddingLeft: `${folder.level * 16 + 8}px` }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveFolderId(folder.id);
                        setIsOpen(false);
                      }}
                      className="flex items-center gap-1.5 flex-1 text-left min-w-0 font-mono text-[9px] uppercase tracking-wider cursor-pointer"
                    >
                      {folder.level > 0 && (
                        <CornerDownRight className="w-3 h-3 text-fouzar-text-secondary shrink-0 mr-0.5 opacity-60" />
                      )}
                      <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-fouzar-accent' : 'text-fouzar-text-secondary'} shrink-0`} />
                      {parentFolder ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate opacity-50 max-w-[60px]">{parentFolder.name}</span>
                          <span className="text-fouzar-accent shrink-0 select-none">──➔</span>
                          <span className="truncate font-semibold">{folder.name}</span>
                        </div>
                      ) : (
                        <span className="truncate">{folder.name}</span>
                      )}
                      {folder.code && folder.id !== 'all' && (
                        <span className="text-[7px] opacity-60 font-semibold font-mono shrink-0">
                          [{folder.code}]
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && (
                        <Check className="w-3 h-3 text-fouzar-accent" />
                      )}
                      {folder.id !== 'all' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-fouzar-text-tertiary hover:text-fouzar-signal transition-all cursor-pointer"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions Form */}
            <div className="border-t border-fouzar-border bg-fouzar-elevated/40 p-2 shrink-0">
              {!showAddForm ? (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-fouzar-border hover:border-fouzar-accent/50 rounded-[var(--fouzar-radius-md)] font-mono text-[8px] uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add Subject Folder
                </button>
              ) : (
                <form onSubmit={handleAddFolderSubmit} className="space-y-2">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Subject Name (e.g. Computer Networks)"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="flex-1 bg-fouzar-bg border border-fouzar-border px-2 py-1.5 text-[8.5px] font-mono rounded-[var(--fouzar-radius-sm)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                    />
                    <input
                      type="text"
                      placeholder="Code (e.g. CN)"
                      value={newFolderCode}
                      onChange={(e) => setNewFolderCode(e.target.value)}
                      className="w-16 bg-fouzar-bg border border-fouzar-border px-2 py-1.5 text-[8.5px] font-mono rounded-[var(--fouzar-radius-sm)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                    />
                  </div>

                  {error && (
                    <p className="text-[7.5px] font-mono text-fouzar-signal uppercase tracking-wider">
                      {error}
                    </p>
                  )}

                  <div className="flex gap-1.5 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setError(null);
                      }}
                      className="px-2.5 py-1 border border-fouzar-border rounded-[var(--fouzar-radius-sm)] font-mono text-[7.5px] uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-fouzar-accent text-fouzar-text-inverse rounded-[var(--fouzar-radius-sm)] font-mono text-[7.5px] uppercase font-bold hover:opacity-90 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
