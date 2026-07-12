'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Flame,
  MessageSquare,
  Moon,
  Leaf,
  ArrowLeft,
  Search,
  Minus,
  Sparkles,
  ExternalLink,
  Columns,
} from 'lucide-react';
import { ResizablePanel } from '../../../components/ui/ResizablePanel';
import { useFouzar } from '../../../lib/FouzarContext';
import { ChatPanel } from '../../../components/chat/ChatPanel';
import { AiOrb } from '../../../components/ai/AiOrb';
import { FocusFrame } from '../../../components/focus/FocusFrame';
import { getSocket, useOnGroupNotesSync, syncGroupNotes } from '../../../lib/socket';
import { GroupWatchParty } from '../../../components/groups/GroupWatchParty';
import { MediaHubStandalone } from '../../../components/sanctuary/MediaHubStandalone';
import { LiveLounge } from '../../../components/groups/LiveLounge';
import { ThemeSwitcher } from '../../../components/theme/ThemeSwitcher';
import { IntegratedAiChat } from '../../../components/ai/IntegratedAiChat';
import { formatSlideContext } from '../../../lib/aiConfig';

interface SlideData {
  id: string;
  title: string;
  topic: string;
  bullets: string[];
}

export default function StudyGroupRoom() {
  const { mode, setMode, isFlowActive, setIsFlowActive, setAiTriggerQuery } = useFouzar();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLeader, setIsLeader] = useState(true);
  const [syncSlides, setSyncSlides] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [memberCount, setMemberCount] = useState(4);
  const [activeSplitTabs, setActiveSplitTabs] = useState<{ left: string | null, right: string | null }>({ left: 'slides', right: null });
  const [videoInput, setVideoInput] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const socketRef = useRef<any>(null);

  // Web Hub state
  const [searchResults, setSearchResults] = useState<{ title: string; link: string; snippet: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fedUrls, setFedUrls] = useState<Record<string, boolean>>({});

  const slides: SlideData[] = [
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

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('joinGroup', { groupId });

    socket.on('slideUpdated', (data: { slideId: string }) => {
      if (syncSlides) {
        const slideIndex = slides.findIndex((s) => s.id === data.slideId);
        if (slideIndex !== -1) {
          setCurrentSlideIndex(slideIndex);
        }
      }
    });

    return () => {
      socket.off('slideUpdated');
    };
  }, [groupId, syncSlides]);

  const handleSlideChange = (direction: 'next' | 'prev') => {
    let nextIndex = currentSlideIndex;
    if (direction === 'next' && currentSlideIndex < slides.length - 1) {
      nextIndex = currentSlideIndex + 1;
    } else if (direction === 'prev' && currentSlideIndex > 0) {
      nextIndex = currentSlideIndex - 1;
    }

    if (nextIndex !== currentSlideIndex) {
      setCurrentSlideIndex(nextIndex);

      if (syncSlides && isLeader && socketRef.current) {
        socketRef.current.emit('syncSlide', {
          groupId,
          slideId: slides[nextIndex].id,
        });
      }
    }
  };

  const toggleSync = () => {
    setSyncSlides((prev) => {
      const nextSync = !prev;
      if (nextSync && isLeader && socketRef.current) {
        socketRef.current.emit('syncSlide', {
          groupId,
          slideId: slides[currentSlideIndex].id,
        });
      }
      return nextSync;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedNotes = localStorage.getItem(`fouzar-group-notes-${groupId}`);
    if (savedNotes) setNotes(savedNotes);
  }, [groupId]);

  useOnGroupNotesSync((data) => {
    if (data.groupId === groupId) {
      setNotes(data.notes);
      localStorage.setItem(`fouzar-group-notes-${groupId}`, data.notes);
    }
  });

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    syncGroupNotes(groupId, val);
    
    setIsSaving(true);
    setTimeout(() => {
      localStorage.setItem(`fouzar-group-notes-${groupId}`, val);
      setIsSaving(false);
    }, 1000);
  };

  const activeSlide = slides[currentSlideIndex];

  const handleSetVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#&?]*).*/;
    const match = videoInput.match(regExp);
    if (match && match[2].length === 11) {
      setEmbedUrl(`https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`);
    } else {
      const separator = videoInput.includes('?') ? '&' : '?';
      setEmbedUrl(`${videoInput}${videoInput.includes('enablejsapi=1') ? '' : `${separator}enablejsapi=1`}`);
    }
    setVideoInput('');
  };

  const handleWebSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { webSearch } = await import('../../../lib/api');
      const results = await webSearch(searchQuery);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Failed to query search:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const aiStorageKey = `fouzar-group-ai-${groupId}`;

  const renderTabContent = (tab: string | null) => {
    if (!tab) return null;

    if (tab === 'slides') {
      return (
        <div className="flex flex-col flex-1 justify-between h-full w-full">
          {/* Slide Header */}
          <div className="flex justify-between items-start text-xs font-mono border-b border-transparent pb-3">
            <span className="text-fouzar-accent uppercase tracking-widest">{activeSlide.topic}</span>
            <span className="text-fouzar-text-secondary uppercase">PAGE {currentSlideIndex + 1} OF {slides.length}</span>
          </div>

          {/* Slide Body */}
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

          {/* Slide navigations */}
          <div className="flex items-center justify-between border-t border-fouzar-border/30 pt-4 mt-auto">
            <button
              disabled={currentSlideIndex === 0}
              onClick={() => handleSlideChange('prev')}
              className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <div className="flex gap-1.5">
              {slides.map((_, idx) => (
                <span 
                  key={idx}
                  className={`block h-1 rounded-full transition-all duration-300 ${
                    idx === currentSlideIndex ? 'w-4 bg-fouzar-accent' : 'w-1.5 bg-fouzar-border'
                  }`}
                />
              ))}
            </div>

            <button
              disabled={currentSlideIndex === slides.length - 1}
              onClick={() => handleSlideChange('next')}
              className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    if (tab === 'watch') {
      return (
        <div className="flex-1 flex flex-col h-full min-h-[300px] w-full">
          <GroupWatchParty groupId={groupId as string} />
        </div>
      );
    }

    if (tab === 'notepad') {
      return (
        <div className="flex-1 flex flex-col h-full min-h-[300px] w-full">
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder={`Collaborative Group Scratchpad for ${groupId}...`}
            className="flex-1 bg-transparent text-fouzar-text-primary font-sans text-sm leading-relaxed resize-none focus:outline-none placeholder:text-fouzar-text-tertiary"
          />
        </div>
      );
    }

    if (tab === 'youtube') {
      return (
        <section className={`flex flex-col overflow-hidden flex-1 min-h-0 w-full bg-slate-900/40 rounded-xl`}>
          <MediaHubStandalone folderId={null} onVideoSelect={() => {}} />
        </section>
      );
    }
    
    if (tab === 'lounge') {
      return (
        <div className="flex-1 flex flex-col h-full min-h-[300px] w-full">
          <LiveLounge groupId={groupId} />
        </div>
      );
    }

    if (tab === 'web') {
      return (
        <div className="flex-1 flex flex-col h-full min-h-[300px] w-full overflow-y-auto scrollbar-none space-y-6 p-1">
          <div className="text-center max-w-xl mx-auto space-y-2 mt-4">
            <Sparkles className="w-8 h-8 text-fouzar-accent mx-auto mb-2 animate-pulse" />
            <h3 className="font-serif text-sm font-bold uppercase tracking-wider">
              Web & Free AI Hub
            </h3>
            <p className="text-[10px] text-fouzar-text-secondary leading-relaxed">
              Access free AI models and study tools directly. No API keys required.
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
            <form onSubmit={handleWebSearchSubmit} className="flex gap-2">
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
                          setAiTriggerQuery({
                            text: `Please analyze this search result context:\n\nTitle: ${res.title}\nLink: ${res.link}\nSnippet: ${res.snippet}`,
                            id: Date.now().toString()
                          });
                          setFedUrls((prev) => ({ ...prev, [res.link]: true }));
                          // Open AI panel if not open
                          setIsAiPanelOpen(true);
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
                🔒 Search results are parsed in real-time. Click &quot;Feed to AI&quot; to send content as study context to your AI partner.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-fouzar-bg text-fouzar-text-primary flex flex-col relative overflow-hidden select-none transition-colors duration-300">
      
      {/* Background Ambience light */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div 
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full blur-[120px]"
          style={{
            background: mode === 'greenhouse' 
              ? 'radial-gradient(circle, rgba(234, 230, 223, 0.5) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(124, 92, 252, 0.08) 0%, transparent 70%)'
          }}
        />
      </div>

      {/* Header bar */}
      <header className={`w-full h-14 bg-fouzar-surface/40 backdrop-blur-md border-b border-fouzar-border/30 px-6 flex items-center justify-between z-20 shrink-0 transition-all duration-500 ${isFlowActive ? 'deep-flow-blur' : ''}`}>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-1 hover:bg-white/5 rounded-[4px] text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer flex items-center gap-1 text-xs uppercase tracking-wider font-sans"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <span className="w-[1.5px] h-3 bg-fouzar-border/30" />
          <span className="font-sans font-medium text-sm uppercase tracking-wider text-fouzar-text-primary">
            {groupId === 'group-1' ? 'CS-229 Study room' : 'CS-109 Study Desk'}
          </span>
          <span className="w-[1.5px] h-3 bg-fouzar-border/30" />
          <div className="flex items-center gap-1.5 text-xs text-fouzar-text-secondary uppercase">
            <Users className="w-3 h-3 text-fouzar-accent animate-pulse" />
            <span>{memberCount} PEERS ACTIVE</span>
          </div>
        </div>

        {/* Sync / Actions controls */}
        <div className="flex items-center gap-3">
          
          {/* Sync Switcher */}
          <div className="flex items-center gap-2 bg-fouzar-surface/60 px-3 py-1 rounded-[4px] border border-fouzar-border/30">
            <span className="text-xs font-sans uppercase text-fouzar-text-secondary">Sync</span>
            <button
              onClick={toggleSync}
              className={`relative inline-flex h-3.5 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
                syncSlides ? 'bg-fouzar-accent' : 'bg-white/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-fouzar-bg shadow transition duration-150 ease-in-out ${
                  syncSlides ? 'translate-x-3.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Role selector */}
          <button
            onClick={() => setIsLeader(!isLeader)}
            className="px-3 py-1 border border-fouzar-border/30 hover:border-fouzar-accent rounded-[4px] text-xs font-sans text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
          >
            {isLeader ? 'LEADER' : 'VIEWER'}
          </button>

          {/* AI Study Partner Toggle */}
          <button
            onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
            className={`p-2 border rounded-[4px] cursor-pointer transition-colors ${
              isAiPanelOpen 
                ? 'bg-fouzar-accent/10 border-fouzar-accent text-fouzar-accent' 
                : 'border-fouzar-border/30 text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-fouzar-border'
            }`}
            title="Toggle AI Study Partner"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Chat (Progressive Disclosure) */}
          <button
            onClick={() => { setIsChatOpen(!isChatOpen); if (!isChatOpen) setUnreadCount(0); }}
            className={`relative p-2 border rounded-[4px] cursor-pointer transition-colors ${
              isChatOpen 
                ? 'bg-fouzar-accent/10 border-fouzar-accent text-fouzar-accent' 
                : 'border-fouzar-border/30 text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-fouzar-border'
            }`}
            title="Toggle Group Logs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {!isChatOpen && unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[8px] font-bold font-mono rounded-full flex items-center justify-center px-1 leading-none shadow-lg">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Start Deep Flow */}
          <button
            onClick={() => setIsFlowActive(true)}
            className="px-3.5 py-1 bg-fouzar-accent hover:opacity-95 text-fouzar-bg text-xs font-sans uppercase tracking-widest rounded-[4px] cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_var(--fouzar-accent-glow)]"
          >
            <Flame className="w-3.5 h-3.5 text-fouzar-bg fill-fouzar-bg" />
            FLOW
          </button>

          {/* Mode toggle */}
          <button
            onClick={() => setMode(mode === 'onyx' ? 'greenhouse' : 'onyx')}
            className="p-1.5 bg-fouzar-surface/40 border border-fouzar-border/30 rounded-[4px] text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer"
          >
            {mode === 'onyx' ? <Leaf className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <ThemeSwitcher />
        </div>
      </header>

      {/* Main Study space body */}
      <div className="flex-1 flex overflow-hidden z-10 max-h-[calc(100vh-56px)]">
        <ResizablePanel direction="horizontal" initialSize={700} minSize={400} collapsed={!isChatOpen}>
        
        {/* Left slide canvas (grows if chat is closed) */}
        <div className={`flex flex-col justify-between flex-1 min-h-0 w-full p-6 ${isFlowActive ? 'deep-flow-blur' : ''}`}>
          
          <div className="flex-1 flex flex-col p-8 bg-fouzar-surface/40 backdrop-blur-md border border-fouzar-border/60 rounded-[8px] relative overflow-hidden shadow-2xl">
            
            {/* Toolbar Tabs / Split Controls */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-fouzar-border/30">
              <div className="flex gap-2 flex-wrap">
                {[
                  { id: 'slides', label: 'Slides' },
                  { id: 'notepad', label: 'Notepad' },
                  { id: 'watch', label: 'Watch Party' },
                  { id: 'youtube', label: 'YT Search' },
                  { id: 'lounge', label: 'Live Lounge' },
                  { id: 'web', label: 'Web Hub' },
                ].map((v) => {
                  const isActive = activeSplitTabs.left === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setActiveSplitTabs(prev => ({ ...prev, left: v.id }))}
                      disabled={isFlowActive}
                      className={`px-3 py-1 text-xs font-sans uppercase tracking-wider rounded-[4px] transition-colors ${
                        isActive 
                          ? (v.id === 'watch' || v.id === 'youtube' ? 'bg-red-500 text-fouzar-text-primary shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                            : v.id === 'web' ? 'bg-indigo-500 text-fouzar-text-primary shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                            : 'bg-fouzar-accent text-fouzar-text-primary')
                          : (v.id === 'watch' || v.id === 'youtube' ? 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-red-500/10'
                            : v.id === 'web' ? 'text-indigo-400 hover:text-fouzar-text-primary hover:bg-indigo-500/10'
                            : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-white/5')
                      } disabled:opacity-30`}
                    >
                      {v.label}
                    </button>
                  );
                })}
                
                <div className="w-[1px] h-4 bg-fouzar-border/30 mx-1 self-center" />

                {/* Split View Toggle */}
                <button
                  onClick={() => setActiveSplitTabs(prev => ({ 
                    ...prev, 
                    right: prev.right ? null : (prev.left === 'notepad' ? 'slides' : 'notepad') 
                  }))}
                  disabled={isFlowActive}
                  className={`px-2.5 py-1 flex items-center gap-1 font-mono text-[7px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] transition-colors ${
                    activeSplitTabs.right
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-white/5'
                  } disabled:opacity-30`}
                >
                  <Columns className="w-3 h-3" />
                  Split
                </button>
                
                {/* Right panel picker (when split is active) */}
                {activeSplitTabs.right && !isFlowActive && (
                  <div className="flex items-center gap-0.5 ml-1 bg-fouzar-elevated/40 border border-fouzar-border/50 rounded-full px-1 py-0.5">
                    {[
                      { id: 'slides',  label: 'Slides' },
                      { id: 'notepad', label: 'Notepad' },
                      { id: 'watch',   label: 'Watch' },
                      { id: 'youtube', label: 'YT' },
                      { id: 'web',     label: 'Web' },
                      { id: 'lounge',  label: 'Lounge' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setActiveSplitTabs(prev => ({ ...prev, right: opt.id }))}
                        className={`px-2 py-0.5 font-mono text-[7px] uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                          activeSplitTabs.right === opt.id
                            ? 'bg-indigo-500/30 text-indigo-300 font-bold'
                            : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {activeSplitTabs.left === 'notepad' && (
                <span className="text-xs font-mono text-fouzar-text-tertiary uppercase">
                  {isSaving ? 'Saving...' : 'Saved to local storage'}
                </span>
              )}
            </div>

            {/* Main Canvas Grid */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {activeSplitTabs.right ? (
                <ResizablePanel direction="horizontal" initialSize={500} minSize={300}>
                  <div className="flex-1 min-h-0 w-full flex flex-col pr-3 overflow-hidden">
                    {renderTabContent(activeSplitTabs.left)}
                  </div>
                  <div className="flex-1 min-h-0 w-full flex flex-col pl-3 border-l border-fouzar-border/30 overflow-hidden">
                    {renderTabContent(activeSplitTabs.right)}
                  </div>
                </ResizablePanel>
              ) : (
                <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden">
                  {renderTabContent(activeSplitTabs.left)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right chat panel */}
        <aside className={`h-full flex flex-col pt-6 pb-6 pr-6 ${isFlowActive ? 'deep-flow-blur' : ''}`}>
          <div className="flex flex-col h-full bg-fouzar-surface/40 backdrop-blur-md border border-fouzar-border/60 rounded-[8px] overflow-hidden shadow-2xl relative">
            <div className="p-3 border-b border-fouzar-border/30 bg-fouzar-elevated/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-fouzar-accent" />
                <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-fouzar-text-primary">
                  Group Logs
                </h3>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-white/10 rounded cursor-pointer"
              >
                <Minus className="w-4 h-4 text-fouzar-text-secondary" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel 
                groupId={groupId} 
                currentSlideId={activeSlide.id} 
                userId="user-1"
                isLeader={isLeader}
                onNewMessage={() => { if (!isChatOpen) setUnreadCount((n) => n + 1); }}
                onSlideJump={(slideId) => {
                  const idx = slides.findIndex((s) => s.id === slideId);
                  if (idx !== -1) setCurrentSlideIndex(idx);
                }}
              />
            </div>
          </div>
        </aside>
        
        </ResizablePanel>

        {/* Right — AI Study Partner Panel */}
        <AnimatePresence>
          {isAiPanelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full flex flex-col pt-6 pb-6 pr-6 shrink-0 overflow-hidden ${isFlowActive ? 'deep-flow-blur' : ''}`}
            >
              <div className="flex flex-col h-full w-[316px] bg-fouzar-surface/40 backdrop-blur-md border border-fouzar-border/60 rounded-[8px] overflow-hidden shadow-2xl">
                <div className="p-3 border-b border-fouzar-border/30 bg-fouzar-elevated/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-fouzar-accent" />
                    <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-fouzar-text-primary">
                      AI Study Partner
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsAiPanelOpen(false)}
                    className="p-1 hover:bg-white/10 rounded cursor-pointer"
                  >
                    <Minus className="w-4 h-4 text-fouzar-text-secondary" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden p-2">
                  <IntegratedAiChat
                    contextLabel={`Group · Slide ${currentSlideIndex + 1}/${slides.length}`}
                    slideId={activeSlide.id}
                    slideContextText={formatSlideContext(activeSlide)}
                    storageKey={aiStorageKey}
                    placeholder="Ask AI to explain this slide, analyze topics, or help the group..."
                  />
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Chat Re-open Button */}
      <AnimatePresence>
        {!isChatOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-4 bg-fouzar-surface/80 hover:bg-fouzar-surface backdrop-blur-xl border border-fouzar-border/50 rounded-full shadow-2xl cursor-pointer group hover:border-fouzar-accent transition-all"
            title="Open Group Logs"
          >
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-fouzar-accent rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-fouzar-accent rounded-full border-2 border-fouzar-bg" />
            <MessageSquare className="w-5 h-5 text-fouzar-accent group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating AI Re-open Button */}
      <AnimatePresence>
        {!isAiPanelOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => setIsAiPanelOpen(true)}
            className="fixed bottom-6 right-20 z-50 p-4 bg-fouzar-surface/80 hover:bg-fouzar-surface backdrop-blur-xl border border-fouzar-border/50 rounded-full shadow-2xl cursor-pointer group hover:border-fouzar-accent transition-all"
            title="Open AI Study Partner"
          >
            <Sparkles className="w-5 h-5 text-fouzar-accent group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating AI companion Orb */}
      <AiOrb />
      
      {/* Deep flow spatial takeover */}
      <FocusFrame />

    </div>
  );
}
