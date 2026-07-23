'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Flame,
  FileText,
  Upload,
  Loader2,
  Trash2,
  Sparkles,
  Layers,
  Shield,
  Globe,
  ExternalLink,
  Search,
  PanelLeft,
  PanelRight,
  ChevronRight as ChevronRightIcon,
  FolderOpen,
  Tv2,
  ScanSearch,
  Hash,
  ChevronDown,
  X,
  NotebookPen,
  Film,
  PlaySquare,
  Notebook,
  BookMarked,
  Plus,
  Bot,
} from 'lucide-react';
import ThemeSwitcher from '../../components/ui/ThemeSwitcher';
import { IntegratedAiChat } from '../../components/ai/IntegratedAiChat';
import { DocumentViewer } from '../../components/documents/DocumentViewer';
import { FileExplorer } from '../../components/documents/FileExplorer';
import { useFouzar, LmsRepositoryItem } from '../../lib/FouzarContext';
import { MediaHubStandalone } from '../../components/sanctuary/MediaHubStandalone';
import { useAuth } from '../../hooks/useAuth';
import { WorkspaceProvider, useWorkspace } from '../../lib/workspace/WorkspaceContext';
import { NotesTool } from '../../components/workspace/tools/NotesTool';
import { BrowserTool } from '../../components/workspace/tools/BrowserTool';
import { LiveContext } from '../../components/workspace/LiveContext';
import { WorkspacePanel } from '../../components/workspace/WorkspacePanel';
import { StageCanvas } from '../../components/workspace/StageCanvas';
import { filterRepositoryByFolder, safeIncludes } from '../../lib/filterUtils';
import { buildRepositoryEntryFromFile } from '../../lib/repositoryUpload';
import {
  getPersonalSanctuary,
  getMyGroups,
  getDeadlines,
  updateFocusState,
  addSubjectVideo,
  getSubjectVideos,
} from '../../lib/api';
import { DiaryPanel } from '../../components/diary/DiaryPanel';
import { ErrorBoundary } from '../../components/ErrorBoundary';
type SectionId = 'notes' | 'slides' | 'files' | 'web' | 'media' | 'youtube' | 'journal';

const SECTIONS: { id: SectionId; label: string; icon: React.FC<any>; desc: string; color: string }[] = [
  { id: 'notes',   label: 'Notebook',  icon: NotebookPen, desc: 'Private notes & lecture write-ups', color: '#7c5cfc' },
  { id: 'files',   label: 'Files',     icon: FileText,    desc: 'All uploaded docs & PDFs',          color: '#00b4d8' },
  { id: 'web',     label: 'Web Hub',   icon: Globe,       desc: 'Search & browse the web',           color: '#4cd964' },
  { id: 'media',   label: 'Media',     icon: Film,        desc: 'Saved YouTube videos & links',      color: '#ff2d55' },
  { id: 'youtube', label: 'YT Search', icon: PlaySquare,  desc: 'Search & watch YouTube live',       color: '#ff3b30' },
  { id: 'journal', label: 'Journal',   icon: BookMarked,  desc: 'Encrypted personal diary',          color: '#af52de' },
];

export default function PersonalSanctuaryPage() {
  return (
    <WorkspaceProvider initialRoomId="sanctuary-local">
      <SanctuaryContent />
    </WorkspaceProvider>
  );
}

export function SanctuaryContent() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { state: workspaceState, setStage, openTool, closeTool } = useWorkspace();
  const {
    repository,
    addRepositoryItem,
    removeRepositoryItem,
    armDeepFlow,
    user: fouzarUser,
    folders,
    activeFolderId,
    setActiveFolderId,
    addFolder,
    deleteFolder,
    isFlowActive,
    disarmDeepFlow,
    bypass,
    activateBypass,
    clearBypass,
    activeDoc,
    setActiveDoc,
    openDocs,
    closeDoc,
    setActiveDocText,
    setAiTriggerQuery,
  } = useFouzar();

  const [semester, setSemester] = useState('Spring 2026');
  const [notes, setNotes] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const dummySlides = [
    { id: '1', title: 'Course Overview & Setup',             topic: 'Introduction to Machine Learning', bullets: ['Course logistics and prerequisites.', 'Core paradigm: fitting functions to data.', 'Setup environment: Python 3.10+, NumPy, PyTorch.'] },
    { id: '2', title: 'Supervised vs Unsupervised',          topic: 'Core ML Paradigms',                bullets: ['Supervised: inputs (x) with correct outputs (y).', 'Unsupervised: inputs only; find hidden structure.', 'Reinforcement: agent maximises cumulative reward.'] },
    { id: '3', title: 'Deep Neural Networks Foundations',    topic: 'Neural Architectures',             bullets: ['Layers, activations, and depth.', 'Forward pass computes predictions.', 'Backward pass propagates gradients.'] },
  ];
  const activeSlide = dummySlides[currentSlideIndex];
  const handleSlideChange = (dir: 'prev' | 'next') => {
    setCurrentSlideIndex(i => dir === 'prev' ? Math.max(0, i - 1) : Math.min(dummySlides.length - 1, i + 1));
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const [sanctuaryName, setSanctuaryName] = useState('Personal Sanctuary');
  const [groups, setGroups] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<{ id: string; course: string; title: string; timeLeftLabel: string }[]>([]);
  const [lmsSource, setLmsSource] = useState<'live' | 'demo' | 'error'>('demo');
  const [lmsError, setLmsError] = useState<string | null>(null);

  // layout
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);

  // active section — null means "home" (section picker grid)
  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  // sidebar tree state
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ general: true });

  // command palette
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');

  // flow
  const [bypassSecondsLeft, setBypassSecondsLeft] = useState(0);

  // file upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // slides state
  const [showDemoSlides, setShowDemoSlides] = useState(false);

  // web search
  const [searchResults, setSearchResults] = useState<{ title: string; link: string; snippet: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fedUrls, setFedUrls] = useState<Record<string, boolean>>({});

  // subject add
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [addSubjectError, setAddSubjectError] = useState<string | null>(null);

  // media / youtube
  const [videos, setVideos] = useState<{ id: string; url: string; title: string }[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [activePlayer, setActivePlayer] = useState<{ videoId: string; title: string } | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeFolder = folders.find(f => f.id === activeFolderId);
  const filteredRepository = filterRepositoryByFolder(repository, activeFolderId, activeFolder);

  // storage keys
  const notesKey  = fouzarUser?.id ? `fouzar-sanctuary-notes-${fouzarUser.id}-${activeFolderId}` : `fouzar-sanctuary-notes-guest-${activeFolderId}`;
  const semesterKey = fouzarUser?.id ? `fouzar-semester-${fouzarUser.id}` : 'fouzar-semester-guest';
  const aiStorageKey = fouzarUser?.id ? `fouzar-sanctuary-ai-${fouzarUser.id}` : `fouzar-sanctuary-ai-guest`;

  const isShielded = isFlowActive && !bypass.isActive;

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!bypass.isActive || !bypass.expiresAt) return;
    const update = () => setBypassSecondsLeft(Math.max(0, Math.floor((new Date(bypass.expiresAt!).getTime() - Date.now()) / 1000)));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [bypass.isActive, bypass.expiresAt]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActiveDoc(null); setCmdOpen(false); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(p => !p); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth'); return; }
    const init = async () => {
      try { const s = await getPersonalSanctuary(); if (s?.name) setSanctuaryName(s.name); } catch {}
      try { const g = await getMyGroups(); setGroups(g ?? []); } catch { setGroups([]); }
      try { const lms = await getDeadlines(); setDeadlines(lms.deadlines ?? []); setLmsSource(lms.source); setLmsError(lms.error ?? null); } catch { setDeadlines([]); }
    };
    init();
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !activeFolderId) return;
    getSubjectVideos(activeFolderId).then(d => setVideos(d || [])).catch(() => setVideos([]));
  }, [activeFolderId, user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(semesterKey);
    if (saved) setSemester(saved);
  }, [semesterKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(notesKey);
    if (saved !== null) setNotes(saved);
  }, [notesKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => { localStorage.setItem(notesKey, notes); }, 500);
    return () => clearTimeout(timer);
  }, [notes, notesKey]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSemesterChange = (v: string) => { setSemester(v); localStorage.setItem(semesterKey, v); };
  const handleDeepFlow = async () => { armDeepFlow(); try { await updateFocusState(true); } catch {} };
  const handleDisarmFlow = async () => { disarmDeepFlow(); try { await updateFocusState(false); } catch {} };
  const handleEmergencyBypass = (m: 5 | 10 = 5) => activateBypass(m);
  const handleReLock = () => clearBypass();

  const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const folderCode = activeFolder ? activeFolder.code : 'GEN';
      const entry = await buildRepositoryEntryFromFile(file, folderCode);
      addRepositoryItem({ ...entry, folderId: activeFolderId || 'general' });
    } catch {}
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleAddSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubjectError(null);
    const name = newSubjectName.trim();
    const code = newSubjectCode.trim().toUpperCase();
    if (!name || !code) { setAddSubjectError('Name and code required.'); return; }
    if (folders.some(f => f.code === code)) { setAddSubjectError('Code already exists.'); return; }
    addFolder(name, code, null);
    setNewSubjectName(''); setNewSubjectCode(''); setShowAddSubject(false);
    setExpandedFolders(p => ({ ...p, [code]: true }));
  };

  const handleWebSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try { const { webSearch } = await import('../../lib/api'); setSearchResults(await webSearch(searchQuery) || []); }
    catch { setSearchResults([]); }
    finally { setIsSearching(false); }
  };

  const formatBypass = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-fouzar-bg flex items-center justify-center">
        <span className="font-mono text-xs text-fouzar-text-secondary animate-pulse uppercase tracking-widest">Loading sanctuary...</span>
      </div>
    );
  }

  // ── Command Palette data ───────────────────────────────────────────────────
  const cmdCommands = [
    ...SECTIONS.map(s => ({ label: s.label, icon: s.id === 'notes' ? '📓' : s.id === 'files' ? '📁' : s.id === 'web' ? '🌐' : s.id === 'media' ? '🎬' : s.id === 'youtube' ? '📺' : '📖', action: () => setActiveSection(s.id) })),
    { label: 'Deep Flow', icon: '🔥', action: handleDeepFlow },
    { label: 'Add Subject', icon: '➕', action: () => setShowAddSubject(true) },
    { label: 'Upload PDF', icon: '📄', action: () => fileInputRef.current?.click() },
    { label: 'AI Assistant', icon: '🤖', action: () => setIsAiOpen(p => !p) },
    { label: 'Back to Dashboard', icon: '←', action: () => router.push('/dashboard') },
  ];
  const filteredCmds = cmdCommands.filter(c => safeIncludes(c.label, cmdQuery));

  // ── Sidebar tree toggle ────────────────────────────────────────────────────
  const toggleFolder = (id: string) => setExpandedFolders(p => ({ ...p, [id]: !p[id] }));

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div className="h-screen bg-fouzar-bg text-fouzar-text-primary flex flex-col overflow-hidden">

      {/* ── Command Palette ── */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24"
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg bg-[#111118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
                <Search className="w-4 h-4 text-white/30" />
                <input autoFocus value={cmdQuery} onChange={e => setCmdQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') setCmdOpen(false); }}
                  placeholder="Jump to section, action..." className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none" />
                <kbd className="text-[9px] font-mono text-white/25 border border-white/10 px-1.5 py-0.5 rounded">ESC</kbd>
              </div>
              <div className="py-2 max-h-72 overflow-y-auto">
                {filteredCmds.map((cmd, i) => (
                  <button key={i} onClick={() => { cmd.action(); setCmdOpen(false); setCmdQuery(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left cursor-pointer">
                    <span className="text-base">{cmd.icon}</span>
                    <span className="text-sm text-white/80">{cmd.label}</span>
                  </button>
                ))}
                {filteredCmds.length === 0 && <p className="text-center text-white/25 text-xs py-6 font-mono">No commands found</p>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ── */}
      <header className="h-11 border-b border-white/[0.06] px-4 flex items-center justify-between shrink-0 bg-[#0d0d14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { if (activeSection) { setActiveSection(null); } else { router.back(); } }}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-white/10">|</span>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <button onClick={() => setActiveSection(null)} className="text-white/30 hover:text-white/60 cursor-pointer transition-colors">Sanctuary</button>
            <span className="text-white/15">›</span>
            <button onClick={() => setActiveSection(null)} className="text-white/50 hover:text-white/80 cursor-pointer transition-colors">{activeFolder?.name || 'General'}</button>
            {activeSection && (
              <>
                <span className="text-white/15">›</span>
                <span className="text-[#7c5cfc] font-semibold truncate max-w-[150px]">
                  {SECTIONS.find(s => s.id === activeSection)?.label || openDocs.find(d => d.id === activeSection)?.fileName || ''}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCmdOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 text-[10px] font-mono transition-all cursor-pointer">
            <Search className="w-3 h-3" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="ml-1 text-[8px] border border-white/10 px-1 py-0.5 rounded text-white/25">⌘K</kbd>
          </button>
          <ThemeSwitcher />
          <span className="w-px h-4 bg-white/[0.06]" />
          <select value={semester} onChange={e => handleSemesterChange(e.target.value)}
            className="bg-transparent border border-white/[0.07] text-white/50 text-[10px] font-mono px-2 py-1 rounded-lg cursor-pointer hover:border-white/20 transition-colors focus:outline-none">
            {['Fall 2025', 'Spring 2026', 'Summer 2026', 'Fall 2026'].map(s => (
              <option key={s} value={s} className="bg-[#0d0d14]">{s}</option>
            ))}
          </select>
          {/* AI toggle */}
          <button onClick={() => {
            setIsAiOpen(!isAiOpen);
          }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-mono text-[9px] uppercase font-bold transition-all cursor-pointer border ${isAiOpen ? 'bg-[#7c5cfc]/15 border-[#7c5cfc]/40 text-[#7c5cfc]' : 'border-white/[0.07] text-white/30 hover:text-white/60'}`}>
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI</span>
          </button>
          <button type="button" onClick={handleDeepFlow}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase font-bold transition-all cursor-pointer ${isFlowActive ? 'bg-[#ff2d55]/15 border border-[#ff2d55]/40 text-[#ff2d55]' : 'bg-[#7c5cfc] text-white shadow-[0_2px_12px_rgba(124,92,252,0.4)] hover:bg-[#6d4ef0]'}`}>
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFlowActive ? 'Exit Flow' : 'Deep Flow'}</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left Sidebar (Subject Tree) ── */}
        <motion.nav
          animate={{ width: isSidebarMinimized ? 48 : 220 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="shrink-0 h-full border-r border-white/[0.05] bg-[#0b0b12] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.05]">
            {!isSidebarMinimized && <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25">Subjects</span>}
            <button onClick={() => setIsSidebarMinimized(!isSidebarMinimized)} className="ml-auto text-white/25 hover:text-white/60 transition-colors cursor-pointer">
              {isSidebarMinimized ? <PanelLeft className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
            </button>
          </div>

          {/* Semester chip */}
          {!isSidebarMinimized && (
            <div className="px-3 py-2 border-b border-white/[0.04]">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05]">
                <Hash className="w-2.5 h-2.5 text-[#7c5cfc]/50 shrink-0" />
                <span className="text-[10px] text-white/40 font-mono truncate">{semester}</span>
              </div>
            </div>
          )}

          {/* Subject tree */}
          <div className="flex-1 overflow-y-auto scrollbar-none py-2">
            {folders.map(folder => {
              const isActive = activeFolderId === folder.id;
              const isExpanded = expandedFolders[folder.id];
              return (
                <div key={folder.id}>
                  {/* Subject row */}
                  <div
                    className={`flex items-center gap-0 mx-2 rounded-lg transition-all cursor-pointer group ${isActive ? 'bg-[#7c5cfc]/12' : 'hover:bg-white/[0.025]'}`}
                  >
                    {/* Expand arrow (only when expanded, not minimized) */}
                    {!isSidebarMinimized && (
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="p-1 text-white/20 hover:text-white/50 transition-colors cursor-pointer shrink-0"
                      >
                        <ChevronRightIcon className={`w-3 h-3 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    )}
                    {/* Folder name */}
                    <button
                      onClick={() => { setActiveFolderId(folder.id); setActiveSection(null); if (isSidebarMinimized) toggleFolder(folder.id); }}
                      title={folder.name}
                      className={`flex-1 flex items-center gap-2 py-2 ${isSidebarMinimized ? 'px-2 justify-center' : 'pr-2'} min-w-0`}
                    >
                      <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#7c5cfc]' : 'text-white/35'}`} />
                      {!isSidebarMinimized && (
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`text-[11px] font-medium truncate leading-none ${isActive ? 'text-[#7c5cfc]' : 'text-white/55'}`}>{folder.name}</p>
                          {folder.id !== 'general' && <p className="text-[8px] font-mono text-white/20 mt-0.5 uppercase">{folder.code}</p>}
                        </div>
                      )}
                    </button>
                    {/* Delete */}
                    {!isSidebarMinimized && folder.id !== 'general' && (
                      <button onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20 hover:text-[#ff2d55] transition-all cursor-pointer shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Section children — only shown when folder is active & expanded & sidebar visible */}
                  {!isSidebarMinimized && isActive && isExpanded && (
                    <div className="ml-4 mr-2 mb-1 border-l border-white/[0.06] pl-2 space-y-0.5">
                      {SECTIONS.map(({ id, label, icon: Icon, color }) => (
                        <button
                          key={id}
                          onClick={() => {
                            if (id === 'notes' || id === 'web') {
                              setActiveSection(id);
                              closeTool();
                            } else {
                              setActiveSection(id);
                              closeTool(); // Hide tools if switching to a center view
                            }
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all cursor-pointer text-left ${activeSection === id ? 'bg-[#7c5cfc]/12 text-white/80' : 'text-white/35 hover:text-white/65 hover:bg-white/[0.02]'}`}
                        >
                          <Icon className="w-3 h-3 shrink-0" style={{ color: activeSection === id ? color : undefined }} />
                          <span className="text-[10px] font-medium">{label}</span>
                          {activeSection === id && <div className="ml-auto w-1 h-1 rounded-full" style={{ background: color }} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add subject */}
            {!isSidebarMinimized && (
              <div className="px-3 mt-2">
                {showAddSubject ? (
                  <form onSubmit={handleAddSubjectSubmit} className="p-2.5 bg-white/[0.03] border border-[#7c5cfc]/20 rounded-lg space-y-2">
                    <input type="text" required placeholder="Subject Name" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)}
                      className="w-full bg-transparent border border-white/10 px-2 py-1 text-[10px] font-mono rounded-md focus:outline-none focus:border-[#7c5cfc] text-white" />
                    <input type="text" required placeholder="Code (e.g. CS101)" value={newSubjectCode} onChange={e => setNewSubjectCode(e.target.value)}
                      className="w-full bg-transparent border border-white/10 px-2 py-1 text-[10px] font-mono rounded-md focus:outline-none focus:border-[#7c5cfc] text-white uppercase" />
                    {addSubjectError && <p className="text-[9px] text-[#ff2d55]">{addSubjectError}</p>}
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setShowAddSubject(false)} className="flex-1 py-1 text-[9px] font-mono border border-white/10 rounded-md text-white/40 hover:text-white cursor-pointer">Cancel</button>
                      <button type="submit" className="flex-1 py-1 text-[9px] font-mono bg-[#7c5cfc] text-white rounded-md font-bold hover:bg-[#6d4ef0] cursor-pointer">Add</button>
                    </div>
                  </form>
                ) : (
                  <button onClick={() => setShowAddSubject(true)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/25 hover:text-white/55 hover:bg-white/[0.02] transition-all cursor-pointer text-[10px] font-mono">
                    <Plus className="w-3 h-3" />
                    <span>Add Subject</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Save status */}
          {!isSidebarMinimized && (
            <div className="border-t border-white/[0.04] px-4 py-2.5 flex items-center justify-between">
              <span className="text-[8px] font-mono text-white/20 uppercase tracking-wider">✓ Synced</span>
              <span className="text-[8px] font-mono text-white/20">{isSaving ? 'Saving...' : 'Local'}</span>
            </div>
          )}
        </motion.nav>

        {/* ── Center Content ── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Section sub-header */}
          <div className="h-10 px-5 flex items-center justify-between border-b border-white/[0.04] shrink-0 bg-[#0c0c13]/60">
            <div className="flex items-center gap-2">
              {activeSection ? (
                <>
                  {(() => {
                    const s = SECTIONS.find(x => x.id === activeSection);
                    if (s) {
                      return (
                        <>
                          <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                          <span className="text-[11px] font-semibold text-white/70">{s.label}</span>
                        </>
                      );
                    }
                    const doc = openDocs.find(d => d.id === activeSection);
                    if (doc) {
                      return (
                        <>
                          <FileText className="w-3.5 h-3.5 text-[#7c5cfc]" />
                          <span className="text-[11px] font-semibold text-white/70 truncate max-w-[200px]">{doc.fileName}</span>
                        </>
                      );
                    }
                    return null;
                  })()}
                  <span className="text-white/15 text-xs">·</span>
                  <span className="text-[10px] font-mono text-white/30">{activeFolder?.name || 'General'}</span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-3.5 h-3.5 text-[#7c5cfc]" />
                  <span className="text-[11px] font-semibold text-white/70">{activeFolder?.name || 'General'}</span>
                  <span className="text-[10px] font-mono text-white/25 ml-1">{activeFolder?.code || '—'}</span>
                </>
              )}
            </div>
            {/* Quick actions for current section */}
            <div className="flex items-center gap-1.5">
              {activeSection === 'slides' && (
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] text-white/50 hover:text-white/80 text-[9px] font-mono uppercase rounded-lg cursor-pointer transition-all">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Upload
                </button>
              )}
              {activeSection === 'media' && (
                <button onClick={() => setIsAddingVideo(p => !p)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.07] text-white/50 hover:text-white/80 text-[9px] font-mono uppercase rounded-lg cursor-pointer transition-all">
                  <Plus className="w-3 h-3" /> Add Video
                </button>
              )}
              {activeSection && (
                <button onClick={() => setActiveSection(null)}
                  className="text-[9px] font-mono text-white/20 hover:text-white/50 px-2 py-1 rounded-lg hover:bg-white/[0.03] cursor-pointer transition-colors">
                  ← Sections
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {workspaceState.shared.activeStage.type !== 'empty' ? (
              <StageCanvas />
            ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection ?? 'home'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-h-0 w-full flex flex-col h-full"
              >
                {/* ── HOME — section picker ── */}
                {!activeSection && (
                  <div className="h-full overflow-y-auto p-6">
                    {/* Subject info */}
                    <div className="mb-8">
                      <p className="text-[10px] font-mono text-white/25 uppercase tracking-[0.2em] mb-1">Current Subject</p>
                      <h2 className="text-lg font-bold text-white/80">{activeFolder?.name || 'General Playground'}</h2>
                      {activeFolder?.code && <span className="inline-block mt-1 px-2 py-0.5 bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 rounded font-mono text-[9px] text-[#7c5cfc] uppercase">{activeFolder.code}</span>}
                      <p className="text-[10px] text-white/30 mt-2 font-mono">{semester} · {filteredRepository.length} file{filteredRepository.length !== 1 ? 's' : ''} uploaded</p>
                    </div>

                    {/* Section grid */}
                    <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/20 mb-4">— Choose a section</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {SECTIONS.map(({ id, label, icon: Icon, desc, color }) => {
                        // Mock presence for the Shared Sanctuary feel
                        const mockPresence = 
                          id === 'notes' ? { name: 'Ahmed', color: '#ff2d55', img: 'https://i.pravatar.cc/150?u=a042581f4e29026024d' } :
                          id === 'slides' ? { name: 'Sarah', color: '#4cd964', img: 'https://i.pravatar.cc/150?u=a042581f4e29026704d' } :
                          null;

                        return (
                          <motion.button
                            key={id}
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              if (id === 'notes' || id === 'web') {
                                setActiveSection(id);
                                closeTool();
                              } else {
                                setActiveSection(id); setExpandedFolders(p => ({ ...p, [activeFolderId || 'general']: true }));
                                closeTool(); 
                              }
                            }}
                            className="relative flex flex-col items-start gap-3 p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer group text-left"
                          >
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                              <Icon className="w-4 h-4" style={{ color }} />
                            </div>
                            <div className="flex-1">
                              <p className="text-[12px] font-semibold text-white/75 group-hover:text-white/90 transition-colors">{label}</p>
                              <p className="text-[10px] text-white/30 mt-0.5 leading-snug">{desc}</p>
                            </div>
                            
                            {/* Presence Indicator */}
                            {mockPresence && (
                              <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 border border-white/[0.05] backdrop-blur-md">
                                <img src={mockPresence.img} className="w-3.5 h-3.5 rounded-full object-cover" alt={mockPresence.name} />
                                <span className="text-[8px] font-mono text-white/50">{mockPresence.name}</span>
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Recent files strip */}
                    {filteredRepository.length > 0 && (
                      <div className="mt-10">
                        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/20 mb-3">— Recent Files</p>
                        <div className="space-y-1.5">
                          {filteredRepository.slice(0, 5).map(doc => (
                            <button key={doc.id} onClick={() => { setActiveDoc(doc); setActiveSection(doc.id as any); }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all cursor-pointer text-left group">
                              <FileText className="w-3.5 h-3.5 text-[#7c5cfc]/60 shrink-0" />
                              <span className="text-[11px] text-white/55 group-hover:text-white/75 truncate flex-1 transition-colors">{doc.fileName}</span>
                              <span className="text-[9px] font-mono text-white/20 uppercase">{doc.sizeLabel}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* ── NOTES ── */}
                {activeSection === 'notes' && (
                  <div className="h-full flex flex-col overflow-hidden rounded-none border-0">
                    <NotesTool isActive={true} />
                  </div>
                )}

                {/* ── WEB ── */}
                {activeSection === 'web' && (
                  <div className="h-full flex flex-col overflow-hidden rounded-none border-0">
                    <BrowserTool isActive={true} />
                  </div>
                )}

                {/* ── JOURNAL ── */}
                {activeSection === 'journal' && (
                  <div className="h-full flex flex-col overflow-hidden rounded-none border-0">
                    <DiaryPanel />
                  </div>
                )}

                {/* ── FILES ── */}
                {activeSection === 'files' && (
                  <div className="h-full flex flex-col">
                    <FileExplorer isCompact={false} rootFolderId={activeFolderId} onOpenFile={doc => setActiveDoc(doc)} />
                  </div>
                )}


                {/* ── MEDIA ── */}
                {activeSection === 'media' && (
                  <div className="h-full overflow-y-auto p-5 space-y-4">
                    {/* Add video form */}
                    {isAddingVideo && (
                      <form onSubmit={async e => {
                        e.preventDefault();
                        if (!newVideoUrl || !activeFolderId) return;
                        try {
                          let url = newVideoUrl;
                          if (newVideoUrl.includes('youtube.com/watch?v=')) { const v = new URL(newVideoUrl).searchParams.get('v'); if (v) url = `https://www.youtube.com/embed/${v}`; }
                          else if (newVideoUrl.includes('youtu.be/')) { const v = newVideoUrl.split('youtu.be/')[1].split('?')[0]; if (v) url = `https://www.youtube.com/embed/${v}`; }
                          const vid = await addSubjectVideo(url, newVideoTitle || 'Untitled Video', activeFolderId);
                          setVideos(p => [vid, ...p]); setNewVideoUrl(''); setNewVideoTitle(''); setIsAddingVideo(false);
                        } catch {}
                      }} className="p-4 bg-white/[0.02] border border-[#ff2d55]/20 rounded-xl space-y-3">
                        <input required placeholder="Video Title" value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} className="w-full bg-transparent border border-white/[0.08] px-3 py-2 text-sm text-white/70 rounded-lg focus:outline-none focus:border-[#ff2d55]/40" />
                        <input required type="url" placeholder="YouTube URL" value={newVideoUrl} onChange={e => setNewVideoUrl(e.target.value)} className="w-full bg-transparent border border-white/[0.08] px-3 py-2 text-sm text-white/70 rounded-lg focus:outline-none focus:border-[#ff2d55]/40" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setIsAddingVideo(false)} className="flex-1 py-1.5 text-[10px] font-mono border border-white/[0.08] rounded-lg text-white/35 cursor-pointer">Cancel</button>
                          <button type="submit" className="flex-1 py-1.5 text-[10px] font-mono bg-[#ff2d55] text-white rounded-lg font-bold cursor-pointer">Save</button>
                        </div>
                      </form>
                    )}

                    {activePlayer ? (
                      <div className="flex flex-col h-full gap-3 min-h-[400px]">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white/70 truncate">{activePlayer.title}</p>
                          <button onClick={() => setActivePlayer(null)} className="text-[10px] font-mono text-white/30 hover:text-white/60 cursor-pointer">← Back</button>
                        </div>
                        <div className="flex-1 rounded-xl overflow-hidden border border-white/[0.06]">
                          <iframe src={`https://www.youtube.com/embed/${activePlayer.videoId}?autoplay=1&rel=0&modestbranding=1`} className="w-full h-full min-h-[360px]" allowFullScreen />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {videos.map(v => (
                          <div key={v.id} className="rounded-xl border border-white/[0.06] overflow-hidden bg-white/[0.02]">
                            <div className="aspect-video">
                              <iframe src={v.url} className="w-full h-full" allowFullScreen />
                            </div>
                            <div className="px-3 py-2 flex items-center justify-between">
                              <span className="text-[11px] font-semibold text-white/60 truncate">{v.title}</span>
                              <span className="text-[8px] font-mono text-white/20 uppercase ml-2 shrink-0">YT</span>
                            </div>
                          </div>
                        ))}
                        {videos.length === 0 && !isAddingVideo && (
                          <div className="col-span-2 py-16 flex flex-col items-center gap-3 border border-dashed border-white/[0.07] rounded-xl">
                            <Film className="w-8 h-8 text-white/20" />
                            <p className="text-[11px] font-mono text-white/30 uppercase">No saved videos yet</p>
                            <button onClick={() => setIsAddingVideo(true)} className="px-4 py-1.5 bg-[#ff2d55]/10 border border-[#ff2d55]/20 text-[#ff2d55] text-[10px] font-mono rounded-lg cursor-pointer hover:bg-[#ff2d55]/20 transition-colors">+ Add Video Link</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── YOUTUBE SEARCH ── */}
                {activeSection === 'youtube' && (
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <MediaHubStandalone
                      folderId={activeFolderId}
                      onVideoSelect={(url, videoId, title) => {
                        if (activeFolderId) getSubjectVideos(activeFolderId).then(setVideos);
                      }}
                    />
                  </div>
                )}

                {/* ── Open document viewer (when a doc is "active") ── */}
                {activeSection && openDocs.find(d => d.id === activeSection) && (
                  <div className="h-full flex flex-col overflow-hidden">
                    <DocumentViewer
                      document={openDocs.find(d => d.id === activeSection)!}
                      onClose={() => { closeDoc(activeSection); setActiveSection('slides'); }}
                      isInline={true}
                    />
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
            )}
          </div>
          
          {/* Docked Workspace Panel (Bottom) */}
          <div className="shrink-0 z-40">
            <WorkspacePanel />
          </div>
        </main>

      </div>

      {/* ── Deep Flow Shield Indicator ── */}
      <AnimatePresence>
        {isFlowActive && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="fixed top-14 right-4 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#0d0d14]/90 backdrop-blur-xl border border-white/[0.07] rounded-xl shadow-2xl"
          >
            <Shield className="w-4 h-4 text-[#ff2d55]" />
            <span className="font-mono text-[8px] uppercase tracking-widest text-white/40">Shield Active</span>
            <div className="flex items-center gap-1 border-l border-white/[0.07] pl-3">
              <button onClick={() => handleEmergencyBypass(5)} className="font-mono text-[7px] text-[#f5a623] border border-[#f5a623]/30 px-2 py-0.5 rounded-lg hover:bg-[#f5a623]/10 uppercase cursor-pointer">5m</button>
              <button onClick={handleDisarmFlow} className="font-mono text-[7px] text-white/40 border border-white/10 px-2 py-0.5 rounded-lg hover:text-white uppercase cursor-pointer">Exit</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Assistant Sidebar */}
      <AnimatePresence>
        {isAiOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-12 right-0 bottom-0 w-[400px] z-50 border-l border-white/[0.05] shadow-2xl bg-[#0b0b12] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05] shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#7c5cfc]" />
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">AI Assistant</span>
              </div>
              <button onClick={() => setIsAiOpen(false)} className="text-white/40 hover:text-white/80 p-1 rounded-lg hover:bg-white/[0.05] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <IntegratedAiChat storageKey="sanctuary_ai_chat" compact={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" accept=".pdf,.pptx" className="hidden" onChange={handleSlideUpload} />
    </div>
    </ErrorBoundary>
  );
}
