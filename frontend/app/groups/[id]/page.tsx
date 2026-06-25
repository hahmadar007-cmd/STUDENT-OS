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
  MonitorPlay
} from 'lucide-react';
import { ResizablePanel } from '../../../components/ui/ResizablePanel';
import { useFouzar } from '../../../lib/FouzarContext';
import { ChatPanel } from '../../../components/chat/ChatPanel';
import { AiOrb } from '../../../components/ai/AiOrb';
import { FocusFrame } from '../../../components/focus/FocusFrame';
import { getSocket, useOnGroupNotesSync, syncGroupNotes } from '../../../lib/socket';
import { FouzarLogo } from '../../../components/logo/FouzarLogo';
import { GroupWatchParty } from '../../../components/groups/GroupWatchParty';

interface SlideData {
  id: string;
  title: string;
  topic: string;
  bullets: string[];
}

export default function StudyGroupRoom() {
  const { mode, setMode, isFlowActive, setIsFlowActive } = useFouzar();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLeader, setIsLeader] = useState(true);
  const [syncSlides, setSyncSlides] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [memberCount, setMemberCount] = useState(4);
  const [activeSplitTabs, setActiveSplitTabs] = useState<{ left: string | null, right: string | null }>({ left: 'slides', right: null });
  const [videoInput, setVideoInput] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const socketRef = useRef<any>(null);

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

  const renderTabContent = (tab: string | null) => {
    if (!tab) return null;

    if (tab === 'slides') {
      return (
        <div className="flex flex-col flex-1 justify-between h-full w-full">
          {/* Slide Header */}
          <div className="flex justify-between items-start text-[8px] font-mono border-b border-transparent pb-3">
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

          {/* Slide navigations */}
          <div className="flex items-center justify-between border-t border-fouzar-border/30 pt-4 mt-auto">
            <button
              disabled={currentSlideIndex === 0}
              onClick={() => handleSlideChange('prev')}
              className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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
              className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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
            className="flex-1 bg-transparent text-fouzar-text-primary font-mono text-[11px] leading-relaxed resize-none focus:outline-none placeholder:text-fouzar-text-tertiary"
          />
        </div>
      );
    }

    if (tab === 'youtube') {
      return (
        <section className={`flex flex-col overflow-hidden flex-1 h-full w-full`}>
          <div className="flex-1 bg-black/50 relative border border-fouzar-border/30 rounded-t-xl overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title="YouTube Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full absolute inset-0"
              />
            ) : (
              <div className="flex items-center justify-center h-full opacity-30 text-xs font-mono uppercase tracking-widest text-white">
                <MonitorPlay className="w-6 h-6 mb-2 text-white/50" />
                No Video Loaded
              </div>
            )}
          </div>
          <div className="bg-black/60 border-t border-fouzar-border/30 p-3 rounded-b-xl backdrop-blur-md z-10 shrink-0 shadow-lg">
            <form onSubmit={handleSetVideo} className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-secondary" />
                <input
                  type="text"
                  placeholder="Paste YouTube URL or 'watch?v=...' ID"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-fouzar-surface/40 border border-fouzar-border/50 rounded-lg text-xs font-mono text-fouzar-text-primary placeholder:text-fouzar-text-tertiary focus:outline-none focus:border-fouzar-accent focus:ring-1 focus:ring-fouzar-accent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!videoInput.trim()}
                className="px-4 py-2 bg-fouzar-accent/20 hover:bg-fouzar-accent text-fouzar-accent hover:text-black border border-fouzar-accent/30 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fouzar-accent"
              >
                Load
              </button>
            </form>
          </div>
        </section>
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
            className="p-1 hover:bg-white/5 rounded-[4px] text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer flex items-center gap-1 text-[9px] uppercase tracking-wider font-sans"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <span className="w-[1.5px] h-3 bg-fouzar-border/30" />
          <span className="font-sans font-light text-[10px] uppercase tracking-[0.2em] text-fouzar-text-primary">
            {groupId === 'group-1' ? 'CS-229 Study room' : 'CS-109 Study Desk'}
          </span>
          <span className="w-[1.5px] h-3 bg-fouzar-border/30" />
          <div className="flex items-center gap-1.5 text-[9px] text-fouzar-text-secondary uppercase">
            <Users className="w-3 h-3 text-fouzar-accent animate-pulse" />
            <span>{memberCount} PEERS ACTIVE</span>
          </div>
        </div>

        {/* Sync / Actions controls */}
        <div className="flex items-center gap-3">
          
          {/* Sync Switcher */}
          <div className="flex items-center gap-2 bg-fouzar-surface/60 px-3 py-1 rounded-[4px] border border-fouzar-border/30">
            <span className="text-[9px] font-mono uppercase text-fouzar-text-secondary">Sync</span>
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
            className="px-3 py-1 border border-fouzar-border/30 hover:border-fouzar-accent rounded-[4px] text-[8px] font-mono text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
          >
            {isLeader ? 'LEADER' : 'VIEWER'}
          </button>

          {/* Toggle Chat (Progressive Disclosure) */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-2 border rounded-[4px] cursor-pointer transition-colors ${
              isChatOpen 
                ? 'bg-fouzar-accent/10 border-fouzar-accent text-fouzar-accent' 
                : 'border-fouzar-border/30 text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-fouzar-border'
            }`}
            title="Toggle Group Logs"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          {/* Start Deep Flow */}
          <button
            onClick={() => setIsFlowActive(true)}
            className="px-3.5 py-1 bg-fouzar-accent hover:opacity-95 text-fouzar-bg text-[8px] font-mono uppercase tracking-widest rounded-[4px] cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_var(--fouzar-accent-glow)]"
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
        </div>
      </header>

      {/* Main Study space body */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden z-10 max-h-[calc(100vh-56px)]">
        
        {/* Left slide canvas (grows if chat is closed) */}
        <div className={`flex flex-col justify-between h-full transition-all duration-500 ease-out ${
          isChatOpen ? 'w-[65%]' : 'w-full'
        } ${isFlowActive ? 'deep-flow-blur' : ''}`}>
          
          <div className="flex-1 flex flex-col p-8 bg-fouzar-surface/40 backdrop-blur-md border border-fouzar-border/60 rounded-[8px] relative overflow-hidden shadow-2xl">
            
            {/* Toolbar Tabs / Split Controls */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-fouzar-border/30">
              <div className="flex gap-2">
                {[
                  { id: 'slides', label: 'Slides' },
                  { id: 'notepad', label: 'Notepad' },
                  { id: 'watch', label: 'Watch Party' },
                  { id: 'youtube', label: 'YouTube' }
                ].map((v) => {
                  const isActive = activeSplitTabs.left === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setActiveSplitTabs(prev => ({ ...prev, left: v.id }))}
                      disabled={isFlowActive}
                      className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider rounded-[4px] transition-colors ${
                        isActive 
                          ? (v.id === 'watch' || v.id === 'youtube' ? 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-fouzar-accent text-white')
                          : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-white/5'
                      } disabled:opacity-30`}
                    >
                      {v.label}
                    </button>
                  );
                })}
                
                <div className="w-[1px] h-4 bg-fouzar-border/30 mx-1 self-center" />
                <button
                  onClick={() => setActiveSplitTabs(prev => ({ ...prev, right: prev.right ? null : 'youtube' }))}
                  disabled={isFlowActive}
                  className={`px-2.5 py-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider rounded-[4px] transition-colors ${
                    activeSplitTabs.right
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-white/5'
                  } disabled:opacity-30`}
                >
                  <MonitorPlay className="w-3 h-3" />
                  Split
                </button>
                
                {activeSplitTabs.right && !isFlowActive && (
                  <select
                    value={activeSplitTabs.right}
                    onChange={(e) => setActiveSplitTabs(prev => ({ ...prev, right: e.target.value }))}
                    className="bg-transparent border border-fouzar-border/30 rounded-[4px] text-[9px] font-mono uppercase tracking-wider text-fouzar-text-primary px-2 py-1 outline-none"
                  >
                    <option value="slides">Slides</option>
                    <option value="notepad">Notepad</option>
                    <option value="watch">Watch Party</option>
                    <option value="youtube">YouTube</option>
                  </select>
                )}
              </div>
              
              {activeSplitTabs.left === 'notepad' && (
                <span className="text-[8px] font-mono text-fouzar-text-tertiary uppercase">
                  {isSaving ? 'Saving...' : 'Saved to local storage'}
                </span>
              )}
            </div>

            {/* Main Canvas Grid */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {activeSplitTabs.right ? (
                <ResizablePanel direction="horizontal" initialSize={500} minSize={300}>
                  <div className="h-full w-full flex flex-col pr-3 overflow-hidden">
                    {renderTabContent(activeSplitTabs.left)}
                  </div>
                  <div className="h-full w-full flex flex-col pl-3 border-l border-fouzar-border/30 overflow-hidden">
                    {renderTabContent(activeSplitTabs.right)}
                  </div>
                </ResizablePanel>
              ) : (
                <div className="h-full w-full flex flex-col overflow-hidden">
                  {renderTabContent(activeSplitTabs.left)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right chat panel (slides in conditionally) */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, x: 200, width: 0 }}
              animate={{ opacity: 1, x: 0, width: '35%' }}
              exit={{ opacity: 0, x: 200, width: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`h-full flex flex-col shrink-0 ${isFlowActive ? 'deep-flow-blur' : ''}`}
            >
              <ChatPanel groupId={groupId} currentSlideId={activeSlide.id} userId="user-1" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating AI companion Orb */}
      <AiOrb />
      
      {/* Deep flow spatial takeover */}
      <FocusFrame />

    </div>
  );
}
