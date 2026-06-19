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
  Loader2,
  Trash2,
  Calendar,
  Sparkles,
  Layers,
  Shield,
  Clock,
  Globe,
  ExternalLink,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { FouzarLogo } from '../../components/logo/FouzarLogo';
import { IntegratedAiChat } from '../../components/ai/IntegratedAiChat';
import { DocumentViewer } from '../../components/documents/DocumentViewer';
import { FileExplorer } from '../../components/documents/FileExplorer';
import { useFouzar, LmsRepositoryItem } from '../../lib/FouzarContext';
import { MediaHubStandalone } from '../../components/sanctuary/MediaHubStandalone';
import { FolderSelector } from '../../components/ui/FolderSelector';
import { useAuth } from '../../hooks/useAuth';
import { buildRepositoryEntryFromFile } from '../../lib/repositoryUpload';
import { ResizablePanel } from '../../components/ui/ResizablePanel';
import {
  getPersonalSanctuary,
  getMyGroups,
  getDeadlines,
  updateFocusState,
  addSubjectVideo,
  getSubjectVideos,
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
    setActiveFolderId,
    addFolder,
    deleteFolder,
    isFlowActive,
    disarmDeepFlow,
    bypass,
    activateBypass,
    clearBypass,
    mode,
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
    {
      id: '1',
      title: 'Course Overview & Setup',
      topic: 'Introduction to Machine Learning',
      bullets: [
        'Course logistics, grading policies, and prerequisites.',
        'Core paradigm: fitting functions to data rather than manual rules.',
        'Setup environment: Python 3.10+, NumPy, and PyTorch.',
      ],
    },
    {
      id: '2',
      title: 'Supervised vs Unsupervised Learning',
      topic: 'Core Machine Learning Paradigms',
      bullets: [
        'Supervised learning: datasets contain inputs (x) and correct outputs (y).',
        'Unsupervised learning: datasets contain inputs only; looking for hidden clusters.',
        'Reinforcement learning: agent acts in environment to maximize reward.',
      ],
    },
    {
      id: '3',
      title: 'Deep Neural Networks Foundations',
      topic: 'Neural Network Architectures',
      bullets: [
        'Structure: Input layer, multiple Hidden layers, and an Output layer.',
        'Neurons: Compute weighted sum of inputs and apply non-linear activations.',
        'Common activation functions: ReLU, Sigmoid, and Tanh.',
      ],
    },
    {
      id: '4',
      title: 'Gradient Descent & Backpropagation',
      topic: 'Mathematical Training & Optimization',
      bullets: [
        'Loss function: measures average error between predicted and target values.',
        'Gradient descent: update weights in the direction of steepest loss descent.',
        'Backpropagation: use Chain Rule of Calculus to compute local derivatives.',
      ],
    },
    {
      id: '5',
      title: 'Loss Functions & Cross Entropy',
      topic: 'Optimization Target Formulations',
      bullets: [
        'Mean Squared Error (MSE): used for regression tasks.',
        'Binary Cross Entropy: used for two-class categorization.',
        'Categorical Cross Entropy: used for multi-class classification.',
      ],
    },
  ];

  const handleSlideChange = (dir: 'next' | 'prev') => {
    if (dir === 'next' && currentSlideIndex < dummySlides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    } else if (dir === 'prev' && currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const activeSlide = dummySlides[currentSlideIndex];
  const [sanctuaryName, setSanctuaryName] = useState('My Sanctuary');
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [deadlines, setDeadlines] = useState<
    { id: string; course: string; title: string; timeLeftLabel: string }[]
  >([]);
  const [lmsSource, setLmsSource] = useState<'live' | 'demo' | 'error'>('demo');
  const [lmsError, setLmsError] = useState<string | null>(null);
  const [centerTab, setCenterTab] = useState<string>('notes'); // notes | slides | web | media
  const [uploading, setUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Media Theater
  const [videos, setVideos] = useState<{ id: string; url: string; title: string }[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [activePlayer, setActivePlayer] = useState<{ videoId: string; title: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedSidebarDocId, setSelectedSidebarDocId] = useState<string | null>(null);
  const [showDemoSlides, setShowDemoSlides] = useState(false);

  const [bypassSecondsLeft, setBypassSecondsLeft] = useState(0);

  const [searchResults, setSearchResults] = useState<{ title: string; link: string; snippet: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fedUrls, setFedUrls] = useState<Record<string, boolean>>({});

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectCode, setNewSubjectCode] = useState('');
  const [addSubjectError, setAddSubjectError] = useState<string | null>(null);

  useEffect(() => {
    if (activeDoc?.id) {
      setCenterTab(activeDoc.id);
    }
  }, [activeDoc?.id]);

  const handleWebSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { webSearch } = await import('../../lib/api');
      const results = await webSearch(searchQuery);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Failed to query search:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubjectError(null);
    const name = newSubjectName.trim();
    const code = newSubjectCode.trim().toUpperCase();

    if (!name || !code) {
      setAddSubjectError('Name and code required.');
      return;
    }
    if (folders.some(f => f.code === code)) {
      setAddSubjectError('Code already exists.');
      return;
    }
    addFolder(name, code, null);
    setNewSubjectName('');
    setNewSubjectCode('');
    setShowAddSubject(false);
  };

  const handleSlideUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const activeFolder = folders.find((f) => f.id === activeFolderId);
      const folderCode = activeFolder ? activeFolder.code : 'GEN';
      const entry = await buildRepositoryEntryFromFile(file, folderCode);
      addRepositoryItem({
        ...entry,
        folderId: activeFolderId || 'general',
      });
    } catch (err) {
      console.error('Failed to upload slide file:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


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
    if (!user || !activeFolderId) return;
    getSubjectVideos(activeFolderId).then(data => {
      setVideos(data || []);
    }).catch(() => setVideos([]));
  }, [activeFolderId, user]);

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
        <ResizablePanel 
          direction="horizontal" 
          initialSize={280} 
          minSize={200} 
          maxSize={400} 
          collapsed={isShielded}
        >
          {/* Left — Subject Spaces */}
          <motion.aside
            className={`border-b lg:border-b-0 lg:border-r border-fouzar-border p-4 space-y-6 overflow-y-auto scrollbar-none shrink-0 ${
              isShielded ? 'lg:w-0 lg:opacity-0 lg:pointer-events-none lg:p-0 lg:border-r-0' : 'h-full'
            }`}
            animate={{
              opacity: isShielded ? 0 : 1,
              width: isShielded ? 0 : '100%',
            }}
            transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
          >
            <div>
              <span className="font-mono text-[7px] uppercase tracking-widest text-fouzar-text-secondary flex items-center gap-1 mb-3">
                <Layers className="w-3 h-3" /> Spaces
              </span>
              <div className="space-y-1.5">
                {folders.filter(f => !f.parentFolderId || f.parentFolderId === 'general' || f.id === 'general').map((folder) => (
                  <div key={folder.id} className="relative group">
                    <button
                      type="button"
                      onClick={() => setActiveFolderId(folder.id)}
                      className={`w-full text-left p-2.5 border rounded-[var(--fouzar-radius-md)] transition-colors flex items-center justify-between ${
                        activeFolderId === folder.id
                          ? 'bg-fouzar-accent/20 border-fouzar-accent/50'
                          : 'bg-fouzar-elevated/30 border-fouzar-border hover:border-fouzar-accent/40'
                      }`}
                    >
                      <div className="min-w-0 pr-6">
                        <p className={`text-[10px] font-medium truncate ${
                          activeFolderId === folder.id ? 'text-fouzar-accent font-bold' : 'text-fouzar-text-primary'
                        }`}>
                          {folder.name}
                        </p>
                        {folder.id !== 'general' && (
                          <p className="font-mono text-[6.5px] text-fouzar-text-tertiary uppercase mt-0.5">
                            {folder.code}
                          </p>
                        )}
                      </div>
                    </button>
                    {folder.id !== 'general' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-fouzar-text-tertiary hover:text-fouzar-signal transition-all cursor-pointer"
                        title="Delete Space"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Subject Inline Form */}
                {showAddSubject ? (
                  <form
                    onSubmit={handleAddSubjectSubmit}
                    className="p-3 mt-2 bg-fouzar-elevated/30 border border-fouzar-accent/40 rounded-[var(--fouzar-radius-md)] space-y-2.5"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Subject Name (e.g. Algorithms)"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      className="w-full bg-fouzar-bg border border-fouzar-border px-2 py-1.5 text-[10px] font-mono rounded-[var(--fouzar-radius-sm)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Code (e.g. CS101)"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                      className="w-full bg-fouzar-bg border border-fouzar-border px-2 py-1.5 text-[10px] font-mono rounded-[var(--fouzar-radius-sm)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary uppercase"
                    />
                    {addSubjectError && (
                      <p className="text-[8px] font-mono text-fouzar-signal uppercase tracking-wider">
                        {addSubjectError}
                      </p>
                    )}
                    <div className="flex gap-1.5 justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddSubject(false)}
                        className="px-2.5 py-1 border border-fouzar-border rounded-[var(--fouzar-radius-sm)] font-mono text-[8px] uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 bg-fouzar-accent text-fouzar-text-inverse rounded-[var(--fouzar-radius-sm)] font-mono text-[8px] uppercase font-bold hover:opacity-90 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddSubject(true)}
                    className="w-full mt-2 text-left p-2.5 border border-dashed border-fouzar-border rounded-[var(--fouzar-radius-md)] hover:border-fouzar-accent/40 hover:bg-fouzar-accent/5 transition-colors text-fouzar-text-tertiary hover:text-fouzar-accent flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-3 h-3" />
                    <span className="font-mono text-[8px] uppercase tracking-wider font-bold">Add Subject</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-fouzar-border/30 flex-1 flex flex-col overflow-hidden">
              <span className="font-mono text-[7px] uppercase tracking-widest text-fouzar-text-secondary flex items-center gap-1 mb-3">
                <FileText className="w-3 h-3" /> Space Explorer
              </span>
              <div className="flex-1 overflow-y-auto scrollbar-none min-h-[200px]">
                <FileExplorer
                  isCompact={true}
                  rootFolderId={activeFolderId}
                  onOpenFile={(doc) => {
                    setActiveDoc(doc);
                  }}
                />
              </div>
            </div>
          </motion.aside>

          <ResizablePanel 
            direction="horizontal" 
            initialSize={600} 
            minSize={400} 
            maxSize={1200}
          >
            {/* Center — Notes + lecture viewer */}
            <main className="flex-1 flex flex-col min-w-0 p-4 md:p-6 overflow-hidden h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setCenterTab('notes')}
                    className={`px-4 py-2 rounded-[var(--fouzar-radius-md)] text-[9px] font-mono uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                      centerTab === 'notes'
                        ? 'bg-fouzar-accent text-fouzar-text-inverse shadow-[0_0_12px_var(--fouzar-accent-glow)]'
                        : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-fouzar-accent/5'
                    }`}
                  >
                    Notebook
                  </button>
                  
                  {openDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center">
                      <button
                        onClick={() => setCenterTab(doc.id)}
                        className={`pl-4 pr-2 py-2 rounded-l-[var(--fouzar-radius-md)] text-[9px] font-mono uppercase tracking-wider font-bold transition-all whitespace-nowrap max-w-[150px] truncate ${
                          centerTab === doc.id
                            ? 'bg-fouzar-accent text-fouzar-text-inverse shadow-[0_0_12px_var(--fouzar-accent-glow)]'
                            : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary bg-fouzar-accent/5 hover:bg-fouzar-accent/10 border border-transparent border-r-fouzar-border/30'
                        }`}
                      >
                        {doc.fileName}
                      </button>
                      <button
                        onClick={() => {
                          closeDoc(doc.id);
                          if (centerTab === doc.id) setCenterTab('notes');
                        }}
                        className={`pr-3 pl-1 py-2 rounded-r-[var(--fouzar-radius-md)] text-[9px] font-mono transition-all ${
                          centerTab === doc.id
                            ? 'bg-fouzar-accent text-fouzar-text-inverse shadow-[0_0_12px_var(--fouzar-accent-glow)] hover:text-red-300'
                            : 'text-fouzar-text-tertiary hover:text-fouzar-signal bg-fouzar-accent/5 hover:bg-fouzar-accent/10 border border-transparent'
                        }`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => setCenterTab('slides')}
                    className={`px-4 py-2 rounded-[var(--fouzar-radius-md)] text-[9px] font-mono uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                      centerTab === 'slides'
                        ? 'bg-fouzar-accent text-fouzar-text-inverse shadow-[0_0_12px_var(--fouzar-accent-glow)]'
                        : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-fouzar-accent/5'
                    }`}
                  >
                    Slides
                  </button>

                  <button
                    onClick={() => setCenterTab('web')}
                    className={`px-4 py-2 rounded-[var(--fouzar-radius-md)] text-[9px] font-mono uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                      centerTab === 'web'
                        ? 'bg-fouzar-accent text-fouzar-text-inverse shadow-[0_0_12px_var(--fouzar-accent-glow)]'
                        : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-fouzar-accent/5'
                    }`}
                  >
                    Web Hub
                  </button>

                  <button
                    onClick={() => setCenterTab('media')}
                    className={`px-4 py-2 rounded-[var(--fouzar-radius-md)] text-[9px] font-mono uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                      centerTab === 'media'
                        ? 'bg-fouzar-accent text-fouzar-text-inverse shadow-[0_0_12px_var(--fouzar-accent-glow)]'
                        : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-fouzar-accent/5'
                    }`}
                  >
                    Media Hub
                  </button>

                  <button
                    onClick={() => setCenterTab('youtube')}
                    className={`px-4 py-2 rounded-[var(--fouzar-radius-md)] text-[9px] font-mono uppercase tracking-wider font-bold transition-all whitespace-nowrap ${
                      centerTab === 'youtube'
                        ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                        : 'text-fouzar-text-tertiary hover:text-white hover:bg-red-500/10'
                    }`}
                  >
                    YT Search
                  </button>
                </div>
                <span className="font-mono text-[7px] text-fouzar-text-secondary uppercase">
                  {centerTab === 'notes' ? (isSaving ? 'Saving...' : 'Saved locally') : centerTab === 'slides' ? 'Click a file to open' : centerTab === 'media' ? 'YouTube Theater' : 'Quick launch links'}
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
              ) : openDocs.find(d => d.id === centerTab) ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 flex flex-col overflow-hidden relative">
                  <DocumentViewer
                    document={openDocs.find(d => d.id === centerTab)!}
                    onClose={() => {
                      closeDoc(centerTab);
                      setCenterTab('notes');
                    }}
                    isInline={true}
                  />
                </div>
              ) : centerTab === 'slides' && !showDemoSlides ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-none space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-fouzar-border/30 pb-4">
                      <div>
                        <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-white">Slides Library</h3>
                        <p className="text-[9px] text-fouzar-text-secondary uppercase mt-0.5 font-mono">
                          {activeFolder?.name || 'General Space'} · Slides & Presentations
                        </p>
                      </div>
                      
                      {/* Upload slide trigger */}
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8px] uppercase font-bold rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-glow-primary)] flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        {uploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Slide (.pdf, .pptx)</span>
                          </>
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.pptx"
                        className="hidden"
                        onChange={handleSlideUpload}
                      />
                    </div>

                    {/* Slides grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Interactive Demo Slides Card */}
                      <div
                        onClick={() => setShowDemoSlides(true)}
                        className="p-4 rounded-[var(--fouzar-radius-md)] border border-fouzar-accent/30 hover:border-fouzar-accent/60 bg-fouzar-accent/5 hover:bg-fouzar-accent/10 text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer shadow-[var(--fouzar-shadow-sm)]"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-serif text-[11px] font-bold uppercase text-fouzar-accent">
                              Demo Slides
                            </span>
                            <Sparkles className="w-4 h-4 text-fouzar-accent animate-pulse" />
                          </div>
                          <h4 className="font-sans text-xs font-bold text-fouzar-text-primary leading-snug mb-1">
                            ML Foundations
                          </h4>
                          <p className="text-[9px] text-fouzar-text-secondary leading-relaxed">
                            Learn loss functions, cross-entropy, backpropagation, and machine learning paradigms.
                          </p>
                        </div>
                        <span className="font-mono text-[7px] text-fouzar-accent uppercase tracking-widest border border-fouzar-accent/20 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] inline-block w-fit mt-4">
                          Open Presentation ↗
                        </span>
                      </div>

                      {/* Filter repository files to show only slide-like files (pdf, pptx) in activeFolderId */}
                      {filteredRepository
                        .filter(
                          (doc) =>
                            doc.fileName.toLowerCase().endsWith('.pdf') ||
                            doc.fileName.toLowerCase().endsWith('.pptx') ||
                            doc.fileName.toLowerCase().endsWith('.ppt')
                        )
                        .map((doc) => {
                          const isPpt = doc.fileName.toLowerCase().endsWith('.pptx') || doc.fileName.toLowerCase().endsWith('.ppt');
                          return (
                            <div
                              key={doc.id}
                              onClick={() => setActiveDoc(doc)}
                              className="p-4 rounded-[var(--fouzar-radius-md)] border border-fouzar-border hover:border-fouzar-accent/40 bg-fouzar-elevated/20 hover:bg-fouzar-elevated/35 text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer shadow-[var(--fouzar-shadow-sm)]"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`font-mono text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                    isPpt 
                                      ? 'bg-fouzar-amber/10 border-fouzar-amber/20 text-fouzar-amber' 
                                      : 'bg-fouzar-signal/10 border-fouzar-signal/20 text-fouzar-signal'
                                  }`}>
                                    {isPpt ? 'PPTX Presentation' : 'PDF Document'}
                                  </span>
                                  <FileText className={`w-4 h-4 ${isPpt ? 'text-fouzar-amber' : 'text-fouzar-signal'}`} />
                                </div>
                                <h4 className="font-sans text-xs font-bold text-fouzar-text-primary leading-snug truncate" title={doc.fileName}>
                                  {doc.fileName}
                                </h4>
                                <p className="text-[8px] font-mono text-fouzar-text-secondary uppercase mt-1">
                                  Size: {doc.sizeLabel}
                                </p>
                              </div>
                              <span className="font-mono text-[7px] text-fouzar-text-primary uppercase tracking-widest border border-fouzar-border/30 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] inline-block w-fit mt-4">
                                View Slides ↗
                              </span>
                            </div>
                          );
                        })}
                    </div>

                    {filteredRepository.filter(
                      (doc) =>
                        doc.fileName.toLowerCase().endsWith('.pdf') ||
                        doc.fileName.toLowerCase().endsWith('.pptx') ||
                        doc.fileName.toLowerCase().endsWith('.ppt')
                    ).length === 0 && (
                      <div className="py-12 text-center border border-dashed border-fouzar-border rounded-[var(--fouzar-radius-lg)] bg-fouzar-elevated/10 flex flex-col items-center justify-center">
                        <FileText className="w-8 h-8 text-fouzar-text-tertiary mb-2" />
                        <p className="font-mono text-[9px] text-fouzar-text-secondary uppercase">
                          No presentations uploaded yet
                        </p>
                        <p className="text-[7.5px] font-mono text-fouzar-text-tertiary uppercase mt-1">
                          Upload slide decks for this space above or drag them to the explorer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : centerTab === 'slides' && showDemoSlides ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
                  <div className="flex flex-col flex-1 justify-between h-full">
                    <div className="flex justify-between items-center border-b border-fouzar-border/30 pb-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowDemoSlides(false)}
                          className="flex items-center gap-1 font-mono text-[8px] uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary border border-fouzar-border/30 px-2 py-1 rounded-[var(--fouzar-radius-sm)] cursor-pointer bg-fouzar-elevated/30"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to Library
                        </button>
                        <span className="w-[1px] h-4 bg-fouzar-border" />
                        <span className="text-fouzar-accent uppercase tracking-widest text-[8px] font-mono">{activeSlide.topic}</span>
                      </div>
                      <span className="text-fouzar-text-secondary uppercase text-[8px] font-mono">PAGE {currentSlideIndex + 1} OF {dummySlides.length}</span>
                    </div>

                    <div className="my-auto py-8">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeSlide.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25 }}
                          className="space-y-6 max-w-xl mx-auto"
                        >
                          <h2 className="font-sans text-2xl font-light text-fouzar-text-primary tracking-wide leading-snug text-glow-accent">
                            {activeSlide.title}
                          </h2>
                          <ul className="space-y-4">
                            {activeSlide.bullets.map((bullet, idx) => (
                              <li key={idx} className="text-fouzar-text-secondary text-[11px] flex items-start gap-3 leading-relaxed">
                                <span className="w-1 h-1 bg-fouzar-accent shrink-0 mt-2 rounded-full" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <div className="flex items-center justify-between border-t border-fouzar-border/30 pt-4 mt-auto">
                      <button
                        disabled={currentSlideIndex === 0}
                        onClick={() => handleSlideChange('prev')}
                        className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Previous
                      </button>

                      <div className="flex gap-1.5">
                        {dummySlides.map((_, idx) => (
                          <span 
                            key={idx}
                            className={`block h-1 rounded-full transition-all duration-300 ${
                              idx === currentSlideIndex ? 'w-4 bg-fouzar-accent' : 'w-1.5 bg-fouzar-border'
                            }`}
                          />
                        ))}
                      </div>

                      <button
                        disabled={currentSlideIndex === dummySlides.length - 1}
                        onClick={() => handleSlideChange('next')}
                        className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      >
                        Next <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : centerTab === 'web' ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
                  <div className="flex flex-col h-full overflow-y-auto scrollbar-none space-y-6">
                    <div className="text-center max-w-xl mx-auto space-y-2 mt-4">
                      <Sparkles className="w-8 h-8 text-fouzar-accent mx-auto mb-2 animate-pulse" />
                      <h3 className="font-serif text-sm font-bold uppercase tracking-wider">
                        Web & Free AI Hub
                      </h3>
                      <p className="text-[10px] text-fouzar-text-secondary leading-relaxed">
                        Access free AI models and study tools directly using your personal accounts. 
                        No API keys, credits, or subscriptions required.
                      </p>
                    </div>

                    {/* Quick AI & Study Launches */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto w-full px-4">
                      {[
                        {
                          name: 'DeepSeek Chat',
                          desc: 'Free conversational AI by DeepSeek. High quality reasoning models.',
                          url: 'https://chat.deepseek.com',
                          color: 'border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5',
                          textColor: 'text-blue-400',
                        },
                        {
                          name: 'ChatGPT',
                          desc: 'Free access to GPT-4o mini and standard chat by OpenAI.',
                          url: 'https://chatgpt.com',
                          color: 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5',
                          textColor: 'text-emerald-400',
                        },
                        {
                          name: 'Claude AI',
                          desc: 'Free access to Claude 3.5 Sonnet conversational model by Anthropic.',
                          url: 'https://claude.ai',
                          color: 'border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5',
                          textColor: 'text-amber-400',
                        },
                      ].map((preset) => (
                        <a
                          key={preset.name}
                          href={preset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-4 rounded-[var(--fouzar-radius-md)] border text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer shadow-[var(--fouzar-shadow-sm)] ${preset.color}`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`font-serif text-[11px] font-bold uppercase ${preset.textColor}`}>
                                {preset.name}
                              </span>
                              <ExternalLink className="w-3.5 h-3.5 text-fouzar-text-secondary" />
                            </div>
                            <p className="text-[9px] text-fouzar-text-secondary leading-relaxed mb-3">
                              {preset.desc}
                            </p>
                          </div>
                          <span className="font-mono text-[7px] text-fouzar-text-primary uppercase tracking-widest border border-fouzar-border/30 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] inline-block w-fit">
                            Launch Free AI ↗
                          </span>
                        </a>
                      ))}
                    </div>

                    {/* Integrated Web Search Engine */}
                    <div className="max-w-2xl mx-auto w-full space-y-4 pt-4 border-t border-fouzar-border/20 px-4">
                      <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-fouzar-text-secondary block text-center">
                        Integrated Web Search Engine
                      </span>
                      <form
                        onSubmit={handleWebSearchSubmit}
                        className="flex gap-2"
                      >
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-tertiary" />
                          <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search the web (e.g. neural networks, photosynthesis)..."
                            className="w-full pl-9 pr-4 py-2.5 bg-fouzar-elevated/40 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-[10px] font-mono focus:outline-none focus:shadow-[var(--fouzar-focus-ring)]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSearching}
                          className="px-4 py-2.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase tracking-wider font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-opacity disabled:opacity-40"
                        >
                          {isSearching ? 'Searching...' : 'Search'}
                        </button>
                      </form>

                      {isSearching && (
                        <p className="font-mono text-[8px] text-fouzar-accent animate-pulse text-center">
                          Querying index & scraping search results...
                        </p>
                      )}

                      {searchResults.length > 0 && (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto scrollbar-none pr-1 mt-2">
                          {searchResults.map((res, index) => {
                            const isFed = !!fedUrls[res.link];
                            return (
                              <div
                                key={index}
                                className="p-3 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:bg-fouzar-elevated/40"
                              >
                                <div className="min-w-0 flex-1 text-left">
                                  <a
                                    href={res.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-serif text-[10px] font-bold text-fouzar-accent hover:underline flex items-center gap-1.5"
                                  >
                                    {res.title} <ExternalLink className="w-3 h-3 text-fouzar-text-secondary" />
                                  </a>
                                  <p className="text-[9px] text-fouzar-text-secondary leading-relaxed mt-1">
                                    {res.snippet}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDocText(`[Web Search context]\nSource Title: ${res.title}\nSource Link: ${res.link}\nContent:\n${res.snippet}`);
                                    setAiTriggerQuery({
                                      text: `Please analyze this search result context:\n\nTitle: ${res.title}\nLink: ${res.link}\nSnippet: ${res.snippet}`,
                                      id: Date.now().toString()
                                    });
                                    setFedUrls((prev) => ({ ...prev, [res.link]: true }));
                                    setTimeout(() => {
                                      setFedUrls((prev) => ({ ...prev, [res.link]: false }));
                                    }, 2000);
                                  }}
                                  className={`px-3 py-1.5 font-mono text-[8px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] border transition-all ${
                                    isFed
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                                      : 'bg-fouzar-elevated hover:bg-fouzar-accent/15 border-fouzar-border hover:border-fouzar-accent/30 text-fouzar-text-primary'
                                  }`}
                                >
                                  {isFed ? '✓ Fed to AI' : 'Feed to AI ✦'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="p-3 bg-fouzar-elevated/20 border border-fouzar-border rounded-[var(--fouzar-radius-md)]">
                        <p className="font-mono text-[7px] text-fouzar-text-secondary leading-relaxed uppercase text-center">
                          🔒 Privacy &amp; Security Note: Search results are parsed in real-time. 
                          You can click any title to read the article or click "Feed to AI" to send the text snippet as study context directly into your AI study partner chat.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : centerTab === 'media' ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
                  <div className="flex flex-col h-full overflow-y-auto scrollbar-none space-y-6">
                    <div className="flex justify-between items-center border-b border-fouzar-border/30 pb-4">
                      <div>
                        <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-white">Media Theater</h3>
                        <p className="text-[9px] text-fouzar-text-secondary uppercase mt-0.5 font-mono">
                          {activeFolder?.name || 'General Space'} · YouTube & Video Resources
                        </p>
                      </div>
                      
                      {/* Add Video Trigger */}
                      <button
                        type="button"
                        onClick={() => setIsAddingVideo(!isAddingVideo)}
                        className="px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8px] uppercase font-bold rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-glow-primary)] flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{isAddingVideo ? 'Cancel' : 'Add Video Link'}</span>
                      </button>
                    </div>

                    {isAddingVideo && (
                      <div className="p-4 bg-fouzar-elevated/30 border border-fouzar-accent/40 rounded-[var(--fouzar-radius-md)]">
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!newVideoUrl || !activeFolderId) return;
                            try {
                              // basic youtube parser
                              let embedUrl = newVideoUrl;
                              if (newVideoUrl.includes('youtube.com/watch?v=')) {
                                const v = new URL(newVideoUrl).searchParams.get('v');
                                if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
                              } else if (newVideoUrl.includes('youtu.be/')) {
                                const v = newVideoUrl.split('youtu.be/')[1].split('?')[0];
                                if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
                              }
                              
                              const vid = await addSubjectVideo(embedUrl, newVideoTitle || 'Untitled Video', activeFolderId);
                              setVideos(prev => [vid, ...prev]);
                              setNewVideoUrl('');
                              setNewVideoTitle('');
                              setIsAddingVideo(false);
                            } catch (err) {
                              console.error('Failed to add video', err);
                            }
                          }}
                          className="space-y-3"
                        >
                          <input
                            type="text"
                            required
                            placeholder="Video Title (e.g. Backpropagation Explained)"
                            value={newVideoTitle}
                            onChange={(e) => setNewVideoTitle(e.target.value)}
                            className="w-full bg-fouzar-bg border border-fouzar-border px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-sm)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                          />
                          <input
                            type="url"
                            required
                            placeholder="YouTube URL (e.g. https://youtube.com/watch?v=...)"
                            value={newVideoUrl}
                            onChange={(e) => setNewVideoUrl(e.target.value)}
                            className="w-full bg-fouzar-bg border border-fouzar-border px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-sm)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                          />
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="px-4 py-2 bg-fouzar-accent text-fouzar-text-inverse rounded-[var(--fouzar-radius-sm)] font-mono text-[9px] uppercase font-bold hover:opacity-90 cursor-pointer"
                            >
                              Save to Library
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {videos.map(video => (
                        <div key={video.id} className="flex flex-col gap-2 p-3 bg-fouzar-elevated/20 border border-fouzar-border rounded-[var(--fouzar-radius-md)] hover:border-fouzar-accent/40 transition-colors">
                          <div className="aspect-video w-full rounded overflow-hidden border border-fouzar-border/30">
                            <iframe 
                              src={video.url}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <div className="flex justify-between items-center px-1">
                            <span className="font-sans font-bold text-xs truncate max-w-[80%] text-fouzar-text-primary">{video.title}</span>
                            <span className="text-[7px] font-mono uppercase text-fouzar-text-tertiary">YouTube</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {videos.length === 0 && !isAddingVideo && (
                      <div className="py-12 text-center border border-dashed border-fouzar-border rounded-[var(--fouzar-radius-lg)] bg-fouzar-elevated/10 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 text-fouzar-text-tertiary mb-2" />
                        <p className="font-mono text-[9px] text-fouzar-text-secondary uppercase">
                          No Videos Available
                        </p>
                        <p className="text-[7.5px] font-mono text-fouzar-text-tertiary uppercase mt-1">
                          Click "Add Video Link" to save a YouTube tutorial to this space.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : centerTab === 'youtube' ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
                  {/* Full-size theater player — shows when a video is selected */}
                  {activePlayer ? (
                    <div className="flex flex-col h-full gap-3">
                      <div className="flex items-center justify-between shrink-0">
                        <h3 className="font-sans font-semibold text-sm text-fouzar-text-primary truncate max-w-[80%]">{activePlayer.title}</h3>
                        <button
                          onClick={() => setActivePlayer(null)}
                          className="text-xs font-mono text-fouzar-text-tertiary hover:text-fouzar-text-primary transition-colors px-2 py-1 border border-fouzar-border rounded"
                        >← Back to Search</button>
                      </div>
                      <div className="flex-1 rounded-xl overflow-hidden border border-fouzar-border/40">
                        <iframe
                          src={`https://www.youtube.com/embed/${activePlayer.videoId}?autoplay=1&rel=0&modestbranding=1`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  ) : (
                    <MediaHubStandalone
                      folderId={activeFolderId}
                      onVideoSelect={(url, videoId, title) => {
                        // Play immediately in full-size theater
                        setActivePlayer({ videoId, title });
                        // Also save to library
                        if (activeFolderId) {
                          getSubjectVideos(activeFolderId).then(setVideos);
                        }
                      }}
                    />
                  )}
                </div>
              ) : null}
            </main>

            {/* Right — Integrated AI */}
            <aside
              className="border-t lg:border-t-0 lg:border-l border-fouzar-border p-4 flex flex-col shrink-0 min-h-[360px] lg:min-h-0 h-full overflow-hidden"
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
          </ResizablePanel>
        </ResizablePanel>
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
}
