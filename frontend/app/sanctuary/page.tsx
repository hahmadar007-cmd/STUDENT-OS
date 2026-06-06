'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Flame,
  Users,
  FileText,
  Upload,
  Trash2,
  Calendar,
  Sparkles,
  Layers,
  Shield,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { FouzarLogo } from '../../components/logo/FouzarLogo';
import { IntegratedAiChat } from '../../components/ai/IntegratedAiChat';
import { DocumentViewer } from '../../components/documents/DocumentViewer';
import { FileExplorer } from '../../components/documents/FileExplorer';
import { useFouzar, LmsRepositoryItem } from '../../lib/FouzarContext';
import { FolderSelector } from '../../components/ui/FolderSelector';
import { useAuth } from '../../hooks/useAuth';
import { buildRepositoryEntryFromFile } from '../../lib/repositoryUpload';
import {
  getPersonalSanctuary,
  getMyGroups,
  getDeadlines,
  updateFocusState,
} from '../../lib/api';

/**
 * Personal Sanctuary — private solo study space for a full semester.
 * Separate from shared group rooms. Includes notes, archive, deadlines,
 * and API-integrated AI (same engine as group study rooms).
 */
export default function PersonalSanctuaryPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const {
    repository,
    addRepositoryItem,
    removeRepositoryItem,
    armDeepFlow,
    user: fouzarUser,
    folders,
    activeFolderId,
    isFlowActive,
    disarmDeepFlow,
    bypass,
    activateBypass,
    clearBypass,
    mode,
  } = useFouzar();

  const [semester, setSemester] = useState('Spring 2026');
  const [notes, setNotes] = useState('');
  const [sanctuaryName, setSanctuaryName] = useState('My Sanctuary');
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [deadlines, setDeadlines] = useState<
    { id: string; course: string; title: string; timeLeftLabel: string }[]
  >([]);
  const [lmsSource, setLmsSource] = useState<'live' | 'demo' | 'error'>('demo');
  const [lmsError, setLmsError] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<LmsRepositoryItem | null>(null);
  const [centerTab, setCenterTab] = useState<'notes' | 'slides'>('notes');
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSidebarDocId, setSelectedSidebarDocId] = useState<string | null>(null);

  const [bypassSecondsLeft, setBypassSecondsLeft] = useState(0);

  useEffect(() => {
    if (!bypass.isActive || !bypass.expiresAt) return;
    
    const update = () => {
      const left = Math.max(0, Math.floor((new Date(bypass.expiresAt!).getTime() - Date.now()) / 1000));
      setBypassSecondsLeft(left);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [bypass.isActive, bypass.expiresAt]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveDoc(null);
        setSelectedSidebarDocId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatBypass = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEmergencyBypass = (minutes: 5 | 10 = 5) => {
    activateBypass(minutes);
  };

  const handleReLock = () => {
    clearBypass();
  };

  const handleDisarmFlow = async () => {
    disarmDeepFlow();
    try {
      await updateFocusState(false);
    } catch {
      /* optional */
    }
  };

  const isShielded = isFlowActive && !bypass.isActive;

  const notesKey = fouzarUser?.id
    ? `fouzar-sanctuary-notes-${fouzarUser.id}-${activeFolderId}`
    : `fouzar-sanctuary-notes-guest-${activeFolderId}`;
  const semesterKey = fouzarUser?.id
    ? `fouzar-semester-${fouzarUser.id}`
    : 'fouzar-semester-guest';
  const aiStorageKey = fouzarUser?.id
    ? `fouzar-sanctuary-ai-${fouzarUser.id}`
    : 'fouzar-sanctuary-ai-guest';

  const activeFolder = folders.find((f) => f.id === activeFolderId);
  const filteredRepository = repository.filter((doc) => {
    if (activeFolderId === 'all') return true;
    return doc.courseCode.toLowerCase() === activeFolder?.code.toLowerCase();
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/auth');
      return;
    }

    const init = async () => {
      try {
        const sanctuary = await getPersonalSanctuary();
        if (sanctuary?.name) setSanctuaryName(sanctuary.name);
      } catch {
        /* dev fallback */
      }
      try {
        const g = await getMyGroups();
        setGroups(g ?? []);
      } catch {
        setGroups([]);
      }
      try {
        const lms = await getDeadlines();
        setDeadlines(lms.deadlines ?? []);
        setLmsSource(lms.source);
        setLmsError(lms.error ?? null);
      } catch {
        setDeadlines([]);
      }
    };
    init();
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSemester = localStorage.getItem(semesterKey);
    if (savedSemester) setSemester(savedSemester);
  }, [semesterKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedNotes = localStorage.getItem(notesKey);
    setNotes(savedNotes || '');
  }, [notesKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentSaved = localStorage.getItem(notesKey) || '';
    if (notes === currentSaved) return;

    setIsSaving(true);
    const t = setTimeout(() => {
      localStorage.setItem(notesKey, notes);
      setIsSaving(false);
    }, 800);
    return () => clearTimeout(t);
  }, [notes, notesKey]);

  const handleSemesterChange = (value: string) => {
    setSemester(value);
    localStorage.setItem(semesterKey, value);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const folderCode = activeFolder && activeFolder.id !== 'all' ? activeFolder.code : (semester.split(' ')[0]?.toUpperCase() ?? 'SEM');
      const entry = await buildRepositoryEntryFromFile(
        file,
        folderCode,
      );
      addRepositoryItem(entry);
      setCenterTab('slides');
    } catch {
      /* storage quota etc */
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeepFlow = async () => {
    armDeepFlow();
    try {
      await updateFocusState(true);
    } catch {
      /* optional */
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fouzar-bg flex items-center justify-center">
        <span className="font-mono text-[10px] text-fouzar-text-secondary animate-pulse uppercase">
          Loading sanctuary...
        </span>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setSelectedSidebarDocId(null)}
      className="h-screen bg-fouzar-bg text-fouzar-text-primary flex flex-col overflow-hidden pb-20 md:pb-0"
    >
      {/* Header */}
      <header className="border-b border-fouzar-border px-4 md:px-8 py-4 flex items-center justify-between shrink-0 bg-fouzar-surface/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 font-mono text-[8px] uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
          <FouzarLogo showWordmark size={22} linkTo="/dashboard" />
          <span className="w-[1px] h-4 bg-fouzar-border" />
          <div className="flex flex-col text-left">
            <span className="font-serif text-[11px] font-bold text-fouzar-text-primary leading-none">
              {sanctuaryName}
            </span>
            <span className="font-mono text-[6.5px] text-fouzar-text-secondary uppercase tracking-wider mt-0.5">
              {fouzarUser?.fouzarId ?? 'FOUZAR-XXXX'} · Only You
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:inline font-mono text-[7px] text-fouzar-ice uppercase tracking-widest">
            Private · Solo
          </span>
          <button
            type="button"
            onClick={handleDeepFlow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8px] uppercase font-bold rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-glow-primary)]"
          >
            <Flame className="w-3.5 h-3.5" /> Deep Flow
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left — Semester hub */}
        <motion.aside
          className={`border-b lg:border-b-0 lg:border-r border-fouzar-border p-4 space-y-5 overflow-y-auto shrink-0 ${
            isShielded ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none lg:p-0 lg:border-r-0' : 'lg:w-72 xl:w-80'
          }`}
          animate={{
            opacity: isShielded ? 0 : 1,
            width: isShielded ? 0 : undefined,
          }}
          transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
        >
          <div>
            <label className="font-mono text-[7px] uppercase tracking-widest text-fouzar-text-secondary block mb-1.5">
              Semester
            </label>
            <input
              value={semester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className="w-full bg-fouzar-elevated border border-fouzar-border px-3 py-2 text-[11px] font-semibold rounded-[var(--fouzar-radius-md)] focus:outline-none focus:shadow-[var(--fouzar-focus-ring)]"
            />
          </div>

          <FolderSelector />



          {/* Deadlines */}
          <div>
            <span className="font-mono text-[7px] uppercase tracking-widest text-fouzar-text-secondary flex items-center gap-1 mb-2">
              <Calendar className="w-3 h-3" /> Deadlines
            </span>
            <div className="space-y-2">
              {deadlines.slice(0, 4).map((dl) => (
                <div
                  key={dl.id}
                  className="p-2.5 bg-fouzar-elevated/40 border border-fouzar-border rounded-[var(--fouzar-radius-md)]"
                >
                  <p className="text-[9px] font-medium leading-snug">{dl.title}</p>
                  <p className="font-mono text-[6.5px] text-fouzar-amber mt-0.5 uppercase">
                    {dl.course} · {dl.timeLeftLabel}
                  </p>
                </div>
              ))}
              {lmsSource === 'demo' && (
                <p className="font-mono text-[7px] text-fouzar-amber uppercase">
                  Demo data — connect LMS on dashboard
                </p>
              )}
              {lmsSource === 'error' && lmsError && (
                <p className="font-mono text-[7px] text-fouzar-signal uppercase">{lmsError}</p>
              )}
              {deadlines.length === 0 && lmsSource === 'live' && (
                <p className="font-mono text-[7px] text-fouzar-text-tertiary uppercase">
                  LMS connected — no upcoming deadlines
                </p>
              )}
            </div>
          </div>

          {/* Archive */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[7px] uppercase tracking-widest text-fouzar-text-secondary flex items-center gap-1">
                <FileText className="w-3 h-3" /> Materials
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-fouzar-accent hover:opacity-80"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-none">
              {filteredRepository.map((doc) => (
                <div
                  key={doc.id}
                  onClick={(e) => e.stopPropagation()}
                  className={`group flex items-center gap-2 p-2 bg-fouzar-elevated/30 border rounded-[var(--fouzar-radius-sm)] transition-colors ${
                    selectedSidebarDocId === doc.id
                      ? 'border-fouzar-accent bg-fouzar-accent/5'
                      : 'border-fouzar-border hover:border-fouzar-accent/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSidebarDocId(doc.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setActiveDoc(doc);
                      setCenterTab('slides');
                      setSelectedSidebarDocId(null);
                    }}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-fouzar-ice shrink-0" />
                    <span className="text-[8px] truncate">{doc.fileName}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRepositoryItem(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-fouzar-signal shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {uploading && (
                <p className="font-mono text-[7px] text-fouzar-accent animate-pulse uppercase">
                  Storing file...
                </p>
              )}
            </div>
          </div>

          {/* Shared groups shortcut */}
          <div>
            <span className="font-mono text-[7px] uppercase tracking-widest text-fouzar-text-secondary flex items-center gap-1 mb-2">
              <Users className="w-3 h-3" /> Your Groups
            </span>
            <div className="space-y-1.5">
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => router.push(`/room/${g.id}`)}
                  className="w-full text-left p-2.5 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)] hover:border-fouzar-accent/40 transition-colors"
                >
                  <p className="text-[9px] font-medium truncate">{g.name}</p>
                  <p className="font-mono text-[6.5px] text-fouzar-text-tertiary uppercase mt-0.5">
                    Shared room
                  </p>
                </button>
              ))}
              {groups.length === 0 && (
                <p className="font-mono text-[7px] text-fouzar-text-tertiary uppercase">
                  No shared groups yet
                </p>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Center — Notes + lecture viewer */}
        <main className="flex-1 flex flex-col min-w-0 p-4 md:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {[
                { id: 'notes' as const, label: 'Notebook' },
                { id: 'slides' as const, label: 'Lecture Slides' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCenterTab(tab.id)}
                  className={`px-3 py-1.5 font-mono text-[8px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] ${
                    centerTab === tab.id
                      ? 'bg-fouzar-accent/15 text-fouzar-accent'
                      : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="font-mono text-[7px] text-fouzar-text-secondary uppercase">
              {centerTab === 'notes' ? (isSaving ? 'Saving...' : 'Saved locally') : 'Click a file to open'}
            </span>
          </div>

          {centerTab === 'notes' ? (
            <>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Your private ${semester} workspace — lecture notes, exam prep, project ideas...`}
                className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-5 font-mono text-[11px] leading-relaxed resize-none focus:outline-none focus:shadow-[var(--fouzar-focus-ring)]"
              />
              <p className="mt-2 font-mono text-[7px] text-fouzar-text-tertiary uppercase">
                Private — not shared with any group
              </p>
            </>
          ) : activeDoc ? (
            <div className="flex-1 min-h-[280px] lg:min-h-0 flex flex-col overflow-hidden relative">
              <DocumentViewer
                document={activeDoc}
                onClose={() => setActiveDoc(null)}
                isInline={true}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/30 border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-4 flex flex-col overflow-hidden">
              <FileExplorer
                rootFolderId={activeFolderId === 'all' ? null : activeFolderId}
                onOpenFile={(doc) => setActiveDoc(doc)}
              />
            </div>
          )}
        </main>

        {/* Right — Integrated AI */}
        <aside
          className="border-t lg:border-t-0 lg:border-l border-fouzar-border p-4 flex flex-col shrink-0 min-h-[360px] lg:min-h-0 lg:w-80 xl:w-96 overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <Sparkles className="w-4 h-4 text-fouzar-accent" />
            <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
              AI Study Partner
            </h2>
          </div>
          <div className="flex-1 min-h-[300px]">
            <IntegratedAiChat
              contextLabel={`${semester} · Personal`}
              slideId={null}
              storageKey={aiStorageKey}
              placeholder="Ask AI to explain concepts, plan your week, or summarize notes..."
            />
          </div>
        </aside>
      </div>

      {/* Mobile quick nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 h-14 bg-fouzar-bg/95 backdrop-blur-xl border-t border-fouzar-border flex items-center justify-around z-30">
        <Link href="/dashboard" className="flex flex-col items-center text-fouzar-text-secondary">
          <Layers className="w-5 h-5" />
          <span className="font-mono text-[6px] uppercase">Hub</span>
        </Link>
        <span className="flex flex-col items-center text-fouzar-accent">
          <BookOpen className="w-5 h-5" />
          <span className="font-mono text-[6px] uppercase">Sanctuary</span>
        </span>
        <button
          type="button"
          onClick={handleDeepFlow}
          className="flex flex-col items-center text-fouzar-signal"
        >
          <Flame className="w-5 h-5" />
          <span className="font-mono text-[6px] uppercase">Flow</span>
        </button>
      </nav>

      {/* Pillar 2 — Deep Flow shield overlay */}
      <AnimatePresence>
        {isFlowActive && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 md:right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-shadow-lg)] ${
              mode === 'greenhouse' ? 'fouzar-glass' : 'bg-fouzar-overlay backdrop-blur-xl border border-fouzar-border'
            }`}
          >
            <Shield className="w-4 h-4 text-fouzar-signal" />
            <span className="font-mono text-[8px] uppercase tracking-widest text-fouzar-text-secondary">
              Shield Active
            </span>

            {bypass.isActive ? (
              <div className="flex items-center gap-2 border-l border-fouzar-border pl-3">
                <Clock className="w-3 h-3 text-fouzar-amber" />
                <span className="font-mono text-[8px] text-fouzar-amber font-bold">
                  {formatBypass(bypassSecondsLeft)}
                </span>
                <button
                  type="button"
                  onClick={handleReLock}
                  className="font-mono text-[7px] text-fouzar-text-secondary hover:text-fouzar-text-primary uppercase underline"
                >
                  Re-lock
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 border-l border-fouzar-border pl-3">
                <button
                  type="button"
                  onClick={() => handleEmergencyBypass(5)}
                  className="font-mono text-[7px] text-fouzar-signal border border-fouzar-signal/30 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] hover:bg-fouzar-signal/10 uppercase"
                >
                  5m Valve
                </button>
                <button
                  type="button"
                  onClick={() => handleEmergencyBypass(10)}
                  className="font-mono text-[7px] text-fouzar-amber border border-fouzar-amber/30 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] hover:bg-fouzar-amber/10 uppercase"
                >
                  10m
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDisarmFlow}
              className="font-mono text-[7px] text-fouzar-text-secondary hover:text-fouzar-text-primary border border-fouzar-border px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] uppercase ml-1"
            >
              Exit Flow
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
