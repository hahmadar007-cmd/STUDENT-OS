'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Columns,
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
  Minus,
  PanelLeft,
  PanelRight,
  ChevronRight as ChevronRightIcon,
  FolderOpen,
  NotebookPen,
  Tv2,
  ScanSearch,
  Hash,
  ChevronDown,
  Command,
  X,
} from 'lucide-react';
import ThemeSwitcher from '../../components/ui/ThemeSwitcher';
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
import { DiaryPanel } from '../../components/diary/DiaryPanel';

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
  const [centerTab, setCenterTab] = useState<string>('notes');
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isAiPanelMinimized, setIsAiPanelMinimized] = useState(false);
  const [activeSplitTabs, setActiveSplitTabs] = useState<{ left: string; right: string | null }>({ left: 'notes', right: null });
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

  const [activeSection, setActiveSection] = useState<'notes' | 'slides' | 'files' | 'web' | 'media' | 'youtube' | 'journal'>('notes');
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [semesterExpanded, setSemesterExpanded] = useState(true);
  const [subjectsExpanded, setSubjectsExpanded] = useState(true);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);

  const openSlide = (id: string, type: string, title: string) => {
    // Logic placeholder
  };

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
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
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
    : `fouzar-sanctuary-ai-guest`;

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

  const renderTabContent = (tabId: string) => {
    return (
      <React.Fragment>
        {tabId === 'notes' ? (
                <>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={`Your private ${semester} workspace — lecture notes, exam prep, project ideas...`}
                    className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-5 font-sans text-sm leading-relaxed resize-none focus:outline-none focus:shadow-[var(--fouzar-focus-ring)]"
                  />
                  <p className="mt-2 font-mono text-xs text-fouzar-text-tertiary uppercase">
                    Private — not shared with any group
                  </p>
                </>
              ) : tabId === 'journal' ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 flex flex-col overflow-hidden rounded-[var(--fouzar-radius-lg)] border border-fouzar-border">
                  <DiaryPanel />
                </div>
              ) : openDocs.find(d => d.id === tabId) ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 flex flex-col overflow-hidden relative">
                  <DocumentViewer
                    document={openDocs.find(d => d.id === tabId)!}
                    onClose={() => {
                      closeDoc(tabId);
                      setActiveSection('notes');
                    }}
                    isInline={true}
                  />
                </div>
              ) : tabId === 'slides' && !showDemoSlides ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scrollbar-none space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-fouzar-border/30 pb-4">
                      <div>
                        <h3 className="font-serif text-base font-semibold uppercase tracking-wider text-fouzar-text-primary">Slides Library</h3>
                        <p className="text-xs text-fouzar-text-secondary uppercase mt-0.5 font-mono">
                          {activeFolder?.name || 'General Space'} · Slides & Presentations
                        </p>
                      </div>
                      
                      {/* Upload slide trigger */}
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-sans text-xs uppercase font-bold rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-glow-primary)] flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
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
                            <span className="font-serif text-xs font-bold uppercase text-fouzar-accent">
                              Demo Slides
                            </span>
                            <Sparkles className="w-4 h-4 text-fouzar-accent animate-pulse" />
                          </div>
                          <h4 className="font-sans text-sm font-semibold text-fouzar-text-primary leading-snug mb-1">
                            ML Foundations
                          </h4>
                          <p className="text-xs text-fouzar-text-secondary leading-relaxed">
                            Learn loss functions, cross-entropy, backpropagation, and machine learning paradigms.
                          </p>
                        </div>
                        <span className="font-mono text-[11px] text-fouzar-accent uppercase tracking-widest border border-fouzar-accent/20 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] inline-block w-fit mt-4">
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
                              onClick={() => {
                                if (isPpt) {
                                  setShowDemoSlides(true);
                                } else {
                                  setActiveDoc(doc);
                                  setActiveSection(doc.id as any);
                                }
                              }}
                              className="p-4 rounded-[var(--fouzar-radius-md)] border border-fouzar-border hover:border-fouzar-accent/40 bg-fouzar-elevated/20 hover:bg-fouzar-elevated/35 text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer shadow-[var(--fouzar-shadow-sm)]"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`font-mono text-[11px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                    isPpt 
                                      ? 'bg-fouzar-accent/10 border-fouzar-accent/20 text-fouzar-accent' 
                                      : 'bg-fouzar-accent/10 border-fouzar-accent/20 text-fouzar-accent'
                                  }`}>
                                    {isPpt ? 'PPTX Presentation' : 'PDF Document'}
                                  </span>
                                  <FileText className={`w-4 h-4 text-fouzar-accent`} />
                                </div>
                                <h4 className="font-sans text-sm font-semibold text-fouzar-text-primary leading-snug truncate" title={doc.fileName}>
                                  {doc.fileName}
                                </h4>
                                <p className="text-xs font-mono text-fouzar-text-secondary uppercase mt-1">
                                  Size: {doc.sizeLabel}
                                </p>
                              </div>
                              <span className="font-mono text-[11px] text-fouzar-text-primary uppercase tracking-widest border border-fouzar-border/30 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] inline-block w-fit mt-4">
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
                        <p className="font-sans text-xs text-fouzar-text-secondary uppercase">
                          No presentations uploaded yet
                        </p>
                        <p className="text-[11px] font-sans text-fouzar-text-tertiary uppercase mt-1">
                          Upload slide decks for this space above or drag them to the explorer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : tabId === 'slides' && showDemoSlides ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
                  <div className="flex flex-col flex-1 justify-between h-full">
                    <div className="flex justify-between items-center border-b border-fouzar-border/30 pb-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowDemoSlides(false)}
                          className="flex items-center gap-1 font-sans text-xs uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary border border-fouzar-border/30 px-2 py-1 rounded-[var(--fouzar-radius-sm)] cursor-pointer bg-fouzar-elevated/30"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" /> Back to Library
                        </button>
                        <span className="w-[1px] h-4 bg-fouzar-border" />
                        <span className="text-fouzar-accent uppercase tracking-widest text-xs font-mono">{activeSlide.topic}</span>
                      </div>
                      <span className="text-fouzar-text-secondary uppercase text-xs font-mono">PAGE {currentSlideIndex + 1} OF {dummySlides.length}</span>
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
                          <h2 className="font-sans text-xl font-semibold text-fouzar-text-primary tracking-wide leading-snug text-glow-accent">
                            {activeSlide.title}
                          </h2>
                          <ul className="space-y-4">
                            {activeSlide.bullets.map((bullet, idx) => (
                              <li key={idx} className="text-fouzar-text-secondary text-sm flex items-start gap-3 leading-relaxed">
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
                        className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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
              ) : tabId === 'web' ? (
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
                          color: 'border-fouzar-accent/20 hover:border-fouzar-accent/40 bg-fouzar-accent/5',
                          textColor: 'text-fouzar-accent',
                        },
                        {
                          name: 'ChatGPT',
                          desc: 'Free access to GPT-4o mini and standard chat by OpenAI.',
                          url: 'https://chatgpt.com',
                          color: 'border-fouzar-accent/20 hover:border-fouzar-accent/40 bg-fouzar-accent/5',
                          textColor: 'text-fouzar-accent',
                        },
                        {
                          name: 'Claude AI',
                          desc: 'Free access to Claude 3.5 Sonnet conversational model by Anthropic.',
                          url: 'https://claude.ai',
                          color: 'border-fouzar-accent/20 hover:border-fouzar-accent/40 bg-fouzar-accent/5',
                          textColor: 'text-fouzar-accent',
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
                                      ? 'bg-fouzar-accent/10 border-fouzar-accent/30 text-fouzar-accent font-bold'
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
              ) : tabId === 'media' ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
                  {/* Full-size theater player — shows when a video is selected from YT Search or library */}
                  {activePlayer ? (
                    <div className="flex flex-col h-full gap-3">
                      <div className="flex items-center justify-between shrink-0">
                        <h3 className="font-sans font-semibold text-sm text-fouzar-text-primary truncate max-w-[80%]">{activePlayer.title}</h3>
                        <button
                          onClick={() => setActivePlayer(null)}
                          className="text-xs font-mono text-fouzar-text-tertiary hover:text-fouzar-text-primary transition-colors px-2 py-1 border border-fouzar-border rounded cursor-pointer"
                        >← Back to Library</button>
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
                  <div className="flex flex-col h-full overflow-y-auto scrollbar-none space-y-6">
                    <div className="flex justify-between items-center border-b border-fouzar-border/30 pb-4">
                      <div>
                        <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-fouzar-text-primary">Media Theater</h3>
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
                  )}
                </div>
              ) : tabId === 'youtube' ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
                  <MediaHubStandalone
                    folderId={activeFolderId}
                    onVideoSelect={(url, videoId, title) => {
                      // Save to library silently — player opens inline in this tab
                      if (activeFolderId) {
                        getSubjectVideos(activeFolderId).then(setVideos);
                      }
                    }}
                  />
                </div>
              ) : null}
      </React.Fragment>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fouzar-bg flex items-center justify-center">
        <span className="font-sans text-sm text-fouzar-text-secondary animate-pulse uppercase">
          Loading sanctuary...
        </span>
      </div>
    );
  }

  // Command Palette
  const cmdCommands = [
    { label: 'Notebook', icon: '📓', action: () => setActiveSection('notes') },
    { label: 'Files', icon: '📁', action: () => setActiveSection('files') },
    { label: 'Slides', icon: '📑', action: () => setActiveSection('slides') },
    { label: 'Web Hub', icon: '🌐', action: () => setActiveSection('web') },
    { label: 'Media', icon: '🎬', action: () => setActiveSection('media') },
    { label: 'Journal', icon: '📖', action: () => setActiveSection('journal') },
    { label: 'Deep Flow', icon: '🔥', action: handleDeepFlow },
    { label: 'Add Subject', icon: '➕', action: () => setShowAddSubject(true) },
    { label: 'Upload PDF', icon: '📄', action: () => fileInputRef.current?.click() },
    { label: 'Back to Dashboard', icon: '←', action: () => router.push('/dashboard') },
  ];
  const filteredCommands = cmdCommands.filter(c => c.label.toLowerCase().includes(cmdQuery.toLowerCase()));

  const sectionLabel: Record<string, string> = {
    notes: 'Notebook',
    files: 'Files',
    slides: 'Slides',
    web: 'Web Hub',
    media: 'Media',
    youtube: 'YT Search',
    journal: 'Journal',
  };

  return (
    <div
      onClick={() => setSelectedSidebarDocId(null)}
      className="h-screen bg-fouzar-bg text-fouzar-text-primary flex flex-col overflow-hidden"
    >
      {/* ── Command Palette ── */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24"
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-lg bg-[#111118] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
                <Search className="w-4 h-4 text-white/30" />
                <input
                  autoFocus
                  value={cmdQuery}
                  onChange={e => setCmdQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') setCmdOpen(false); }}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none"
                />
                <kbd className="text-[9px] font-mono text-white/25 border border-white/10 px-1.5 py-0.5 rounded">ESC</kbd>
              </div>
              <div className="py-2 max-h-72 overflow-y-auto">
                {filteredCommands.map((cmd, i) => (
                  <button
                    key={i}
                    onClick={() => { cmd.action(); setCmdOpen(false); setCmdQuery(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left cursor-pointer"
                  >
                    <span className="text-base">{cmd.icon}</span>
                    <span className="text-sm text-white/80">{cmd.label}</span>
                  </button>
                ))}
                {filteredCommands.length === 0 && (
                  <p className="text-center text-white/25 text-xs py-6 font-mono">No commands found</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Bar ── */}
      <header className="h-11 border-b border-white/[0.06] px-4 flex items-center justify-between shrink-0 bg-[#0d0d14]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-white/10">|</span>
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <span className="text-white/30">Sanctuary</span>
            <span className="text-white/15">›</span>
            <span className="text-white/50">{activeFolder?.name || 'General'}</span>
            <span className="text-white/15">›</span>
            <span className="text-[#7c5cfc] font-semibold">{sectionLabel[activeSection]}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Cmd K button */}
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/70 text-[10px] font-mono transition-all cursor-pointer"
          >
            <Search className="w-3 h-3" />
            <span>Search</span>
            <kbd className="ml-1 text-[8px] border border-white/10 px-1 py-0.5 rounded text-white/25">⌘K</kbd>
          </button>
          <ThemeSwitcher />
          <span className="w-px h-4 bg-white/[0.06]" />
          {/* Semester selector */}
          <select
            value={semester}
            onChange={e => handleSemesterChange(e.target.value)}
            className="bg-transparent border border-white/[0.07] text-white/50 text-[10px] font-mono px-2 py-1 rounded-lg cursor-pointer hover:border-white/20 transition-colors focus:outline-none"
          >
            {['Fall 2025', 'Spring 2026', 'Summer 2026', 'Fall 2026'].map(s => (
              <option key={s} value={s} className="bg-[#0d0d14]">{s}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleDeepFlow}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[9px] uppercase font-bold transition-all cursor-pointer ${
              isFlowActive
                ? 'bg-[#ff2d55]/15 border border-[#ff2d55]/40 text-[#ff2d55]'
                : 'bg-[#7c5cfc] text-white shadow-[0_2px_12px_rgba(124,92,252,0.4)] hover:bg-[#6d4ef0]'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            {isFlowActive ? 'Exit Flow' : 'Deep Flow'}
          </button>
        </div>
      </header>

      {/* ── Main 3-column layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Sanctuary Navigation ── */}
        <motion.nav
          animate={{ width: isSidebarMinimized ? 48 : 220 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="shrink-0 h-full border-r border-white/[0.05] bg-[#0b0b12] flex flex-col overflow-hidden"
        >
          {/* Toggle */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.05]">
            {!isSidebarMinimized && (
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/25">Workspace</span>
            )}
            <button
              onClick={() => setIsSidebarMinimized(!isSidebarMinimized)}
              className="ml-auto text-white/25 hover:text-white/60 transition-colors cursor-pointer"
            >
              {isSidebarMinimized ? <PanelLeft className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-none py-2 space-y-1">

            {/* SEMESTER section */}
            {!isSidebarMinimized && (
              <div className="px-3 mb-1">
                <button
                  onClick={() => setSemesterExpanded(!semesterExpanded)}
                  className="w-full flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.18em] text-white/25 hover:text-white/50 transition-colors cursor-pointer py-1"
                >
                  <span>Semester</span>
                  {semesterExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                </button>
                {semesterExpanded && (
                  <div className="mt-1 mb-2 px-1">
                    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                      <Hash className="w-3 h-3 text-[#7c5cfc]/60 shrink-0" />
                      <span className="text-[11px] text-white/60 font-mono truncate">{semester}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBJECTS section */}
            <div className="px-3">
              {!isSidebarMinimized && (
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => setSubjectsExpanded(!subjectsExpanded)}
                    className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.18em] text-white/25 hover:text-white/50 transition-colors cursor-pointer py-1"
                  >
                    {subjectsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                    <span>Subjects</span>
                  </button>
                  <button
                    onClick={() => setShowAddSubject(true)}
                    className="text-white/25 hover:text-[#7c5cfc] transition-colors cursor-pointer text-xs"
                    title="Add Subject"
                  >
                    +
                  </button>
                </div>
              )}
              {(isSidebarMinimized || subjectsExpanded) && (
                <div className="space-y-0.5">
                  {folders.filter(f => !f.parentFolderId || f.parentFolderId === 'general' || f.id === 'general').map(folder => (
                    <div key={folder.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => setActiveFolderId(folder.id)}
                        title={folder.name}
                        className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all cursor-pointer ${
                          activeFolderId === folder.id
                            ? 'bg-[#7c5cfc]/15 text-[#7c5cfc]'
                            : 'text-white/40 hover:bg-white/[0.03] hover:text-white/70'
                        }`}
                      >
                        <FolderOpen className={`w-3.5 h-3.5 shrink-0 ${ activeFolderId === folder.id ? 'text-[#7c5cfc]' : '' }`} />
                        {!isSidebarMinimized && (
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[11px] font-medium truncate leading-none">{folder.name}</p>
                            {folder.id !== 'general' && (
                              <p className="text-[9px] font-mono text-white/25 mt-0.5 uppercase">{folder.code}</p>
                            )}
                          </div>
                        )}
                      </button>
                      {!isSidebarMinimized && folder.id !== 'general' && (
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-white/20 hover:text-[#ff2d55] transition-all cursor-pointer p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {/* Add subject form */}
                  {showAddSubject && !isSidebarMinimized && (
                    <form onSubmit={handleAddSubjectSubmit} className="mt-2 p-2.5 bg-white/[0.03] border border-[#7c5cfc]/20 rounded-lg space-y-2">
                      <input type="text" required placeholder="Subject Name" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="w-full bg-transparent border border-white/10 px-2 py-1 text-[10px] font-mono rounded-md focus:outline-none focus:border-[#7c5cfc] text-white" />
                      <input type="text" required placeholder="Code (e.g. CS101)" value={newSubjectCode} onChange={e => setNewSubjectCode(e.target.value)} className="w-full bg-transparent border border-white/10 px-2 py-1 text-[10px] font-mono rounded-md focus:outline-none focus:border-[#7c5cfc] text-white uppercase" />
                      {addSubjectError && <p className="text-[9px] text-[#ff2d55]">{addSubjectError}</p>}
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setShowAddSubject(false)} className="flex-1 py-1 text-[9px] font-mono border border-white/10 rounded-md text-white/40 hover:text-white cursor-pointer">Cancel</button>
                        <button type="submit" className="flex-1 py-1 text-[9px] font-mono bg-[#7c5cfc] text-white rounded-md font-bold hover:bg-[#6d4ef0] cursor-pointer">Add</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="mx-3 h-px bg-white/[0.04] my-2" />

            {/* WORKSPACE TOOLS */}
            <div className="px-3">
              {!isSidebarMinimized && (
                <button
                  onClick={() => setWorkspaceExpanded(!workspaceExpanded)}
                  className="w-full flex items-center gap-1 text-[9px] font-mono uppercase tracking-[0.18em] text-white/25 hover:text-white/50 transition-colors cursor-pointer py-1 mb-1"
                >
                  {workspaceExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                  <span>Workspace</span>
                </button>
              )}
              {(isSidebarMinimized || workspaceExpanded) && (
                <div className="space-y-0.5">
                  {([
                    { id: 'notes', label: 'Notebook', Icon: BookOpen },
                    { id: 'files', label: 'Files', Icon: FileText },
                    { id: 'slides', label: 'Slides', Icon: Layers },
                    { id: 'web', label: 'Web Hub', Icon: Globe },
                    { id: 'media', label: 'Media', Icon: Tv2 },
                    { id: 'youtube', label: 'YT Search', Icon: ScanSearch },
                    { id: 'journal', label: 'Journal', Icon: BookOpen },
                  ] as { id: typeof activeSection; label: string; Icon: any }[]).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      onClick={() => setActiveSection(id)}
                      title={label}
                      className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all cursor-pointer group ${
                        activeSection === id
                          ? 'bg-[#7c5cfc]/15 text-[#7c5cfc] shadow-[0_0_10px_rgba(124,92,252,0.08)]'
                          : 'text-white/40 hover:bg-white/[0.03] hover:text-white/70'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {!isSidebarMinimized && <span className="text-[11px] font-medium truncate">{label}</span>}
                      {!isSidebarMinimized && activeSection === id && (
                        <div className="ml-auto w-1 h-1 rounded-full bg-[#7c5cfc]" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions footer */}
          {!isSidebarMinimized && (
            <div className="border-t border-white/[0.05] px-3 py-3 space-y-1.5">
              <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-white/20 mb-2">Quick Actions</p>
              <button onClick={() => setActiveSection('notes')} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.03] transition-all cursor-pointer text-[10px] font-mono">
                <span className="text-[#7c5cfc]">+</span> New Note
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.03] transition-all cursor-pointer text-[10px] font-mono">
                <span className="text-[#7c5cfc]">+</span> Upload PDF
              </button>
              <button onClick={() => { setActiveSection('journal'); }} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/[0.03] transition-all cursor-pointer text-[10px] font-mono">
                <span className="text-[#7c5cfc]">+</span> Open Journal
              </button>
              <div className="pt-2 border-t border-white/[0.04] mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-white/20">✓ Synced</span>
                  <span className="text-[9px] font-mono text-white/20">{isSaving ? 'Saving...' : 'Local'}</span>
                </div>
              </div>
            </div>
          )}
        </motion.nav>

        {/* ── Center Content Panel ── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Section Header */}
          <div className="h-12 px-6 flex items-center justify-between border-b border-white/[0.05] shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-semibold text-white/90">{sectionLabel[activeSection]}</h1>
              <span className="text-[10px] font-mono text-white/25">
                {activeFolder?.name && activeFolder.id !== 'general' ? activeFolder.name : 'General Space'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {activeSection === 'slides' && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c5cfc] text-white font-mono text-[9px] uppercase font-bold rounded-lg hover:bg-[#6d4ef0] transition-all cursor-pointer"
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  Upload PDF
                </button>
              )}
              {activeSection === 'media' && (
                <button onClick={() => setIsAddingVideo(!isAddingVideo)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c5cfc] text-white font-mono text-[9px] uppercase font-bold rounded-lg hover:bg-[#6d4ef0] transition-all cursor-pointer">
                  <Upload className="w-3 h-3" /> Add Video
                </button>
              )}
              {/* Inspector toggle */}
              <button
                onClick={() => setInspectorOpen(!inspectorOpen)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg font-mono text-[9px] transition-all cursor-pointer border ${
                  inspectorOpen ? 'bg-[#7c5cfc]/15 border-[#7c5cfc]/30 text-[#7c5cfc]' : 'border-white/[0.07] text-white/30 hover:text-white/60'
                }`}
                title="Toggle Inspector"
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-hidden flex">
            {/* Main view — preserved content from renderTabContent, rendered by section */}
            <div className="flex-1 p-5 overflow-y-auto scrollbar-none flex flex-col">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="flex-1 flex flex-col h-full"
                >
                  {activeSection === 'files' ? (
                    <div className="flex-1 flex flex-col">
                      <FileExplorer
                        isCompact={false}
                        rootFolderId={activeFolderId}
                        onOpenFile={doc => setActiveDoc(doc)}
                      />
                    </div>
                  ) : (
                    renderTabContent(activeSection)
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Inspector Panel */}
            <AnimatePresence>
              {inspectorOpen && (
                <motion.aside
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 240, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="shrink-0 border-l border-white/[0.05] bg-[#0b0b12] overflow-hidden"
                >
                  <div className="p-4 space-y-5 w-60">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">Inspector</span>
                      <button onClick={() => setInspectorOpen(false)} className="text-white/20 hover:text-white/60 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[8px] font-mono uppercase text-white/20 mb-1.5">Properties</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-[10px] text-white/35">Subject</span>
                            <span className="text-[10px] text-white/60 font-mono">{activeFolder?.code || 'GEN'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-white/35">Semester</span>
                            <span className="text-[10px] text-white/60 font-mono">{semester}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-white/35">Section</span>
                            <span className="text-[10px] text-[#7c5cfc] font-mono">{sectionLabel[activeSection]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-white/35">Status</span>
                            <span className="text-[10px] text-emerald-400 font-mono">{isSaving ? 'Saving...' : '✓ Saved'}</span>
                          </div>
                        </div>
                      </div>

                      {activeSection === 'notes' && (
                        <div>
                          <p className="text-[8px] font-mono uppercase text-white/20 mb-1.5">Stats</p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between">
                              <span className="text-[10px] text-white/35">Words</span>
                              <span className="text-[10px] text-white/60 font-mono">{notes.trim() ? notes.trim().split(/\s+/).length : 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] text-white/35">Characters</span>
                              <span className="text-[10px] text-white/60 font-mono">{notes.length}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeSection === 'slides' && (
                        <div>
                          <p className="text-[8px] font-mono uppercase text-white/20 mb-1.5">Files</p>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-white/35">Slides</span>
                            <span className="text-[10px] text-white/60 font-mono">{filteredRepository.filter(d => d.fileName.endsWith('.pdf') || d.fileName.endsWith('.pptx')).length}</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <p className="text-[8px] font-mono uppercase text-white/20 mb-1.5">AI Actions</p>
                        <button
                          onClick={() => setAiTriggerQuery({ text: `Summarize my ${sectionLabel[activeSection]} notes for ${activeFolder?.name || 'this subject'}`, id: Date.now().toString() })}
                          className="w-full text-left text-[10px] text-[#7c5cfc] hover:text-white transition-colors cursor-pointer py-1 font-mono"
                        >
                          ✦ Summarize with AI
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* ── Right AI Chat Panel ── */}
        <ResizablePanel direction="horizontal" initialSize={350} minSize={280} collapsed={isAiPanelMinimized}>
          <div className="h-full border-l border-white/[0.05] flex flex-col">
            <div className="h-12 px-4 flex items-center justify-between border-b border-white/[0.05] shrink-0">
              <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">AI Study Partner</span>
              <button onClick={() => setIsAiPanelMinimized(!isAiPanelMinimized)} className="text-white/20 hover:text-white/60 cursor-pointer transition-colors">
                {isAiPanelMinimized ? <PanelLeft className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <IntegratedAiChat
                contextDocuments={openDocs}
                storageKey={aiStorageKey}
              />
            </div>
          </div>
        </ResizablePanel>
      </div>

      {/* ── Shield Overlay ── */}
      <AnimatePresence>
        {isFlowActive && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
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

      <input ref={fileInputRef} type="file" accept=".pdf,.pptx" className="hidden" onChange={handleSlideUpload} />
    </div>
  );
}
