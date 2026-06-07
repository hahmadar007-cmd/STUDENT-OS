'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Play,
  Lock,
  Unlock,
  MessageSquare,
  BookOpen,
  MonitorPlay,
  Globe,
  ExternalLink,
  Search,
  Sparkles,
} from 'lucide-react';
import { useFouzar } from '../../../lib/FouzarContext';
import { DocumentViewer } from '../../documents/DocumentViewer';

interface SlideData {
  number: number;
  title: string;
  subtitle: string;
  content: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  timestamp: string;
  slideContext: string | null;
}

interface SanctuaryCanvasProps {
  roomId: string;
  currentSlide: number;
  syncMode: boolean;
  isLeader: boolean;
  setIsLeader: (leader: boolean) => void;
  setSyncMode: (sync: boolean) => void;
  slides: SlideData[];
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  handleSendChat: (e: React.FormEvent) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  handleNavigateSlide: (direction: 'prev' | 'next') => void;
  activeDoc: any | null;
  setActiveDoc: (doc: any | null) => void;
}

type CanvasView = 'material' | 'split' | 'media' | 'web';

/**
 * Column 3 — Unified Live Sanctuary Canvas (Pillar 1).
 * Fuses Material Hub, Embedded Media Sandbox, and Contextual Peer Chat
 * into a single closed-loop workspace — no external browser tabs required.
 */
export const SanctuaryCanvas: React.FC<SanctuaryCanvasProps> = ({
  roomId,
  currentSlide,
  syncMode,
  isLeader,
  setIsLeader,
  setSyncMode,
  slides,
  chatMessages,
  chatInput,
  setChatInput,
  handleSendChat,
  chatEndRef,
  handleNavigateSlide,
  activeDoc,
  setActiveDoc,
}) => {
  const { mode, isFlowActive, activeFolderId, setActiveVideoUrl, setActiveVideoTimestamp, setActiveDocText, setAiTriggerQuery } = useFouzar();
  const isGreenhouse = mode === 'greenhouse';

  const [canvasView, setCanvasView] = useState<CanvasView>('split');
  const [videoInput, setVideoInput] = useState('');
  const [embedUrl, setEmbedUrl] = useState('https://www.youtube.com/embed/jfKfPfyJRdk?rel=0&modestbranding=1&enablejsapi=1');
  const [notes, setNotes] = useState('');
  const [chatExpanded, setChatExpanded] = useState(true);

  const [searchResults, setSearchResults] = useState<{ title: string; link: string; snippet: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fedUrls, setFedUrls] = useState<Record<string, boolean>>({});

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

  const notesKey = `fouzar-notes-${roomId}-${activeFolderId}`;

  useEffect(() => {
    setActiveVideoUrl(embedUrl);
  }, [embedUrl, setActiveVideoUrl]);

  useEffect(() => {
    const handleYoutubeMessage = (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (data && data.event === 'infoDelivery' && data.info && typeof data.info.currentTime === 'number') {
        setActiveVideoTimestamp(Math.round(data.info.currentTime));
      }
    };

    window.addEventListener('message', handleYoutubeMessage);
    return () => window.removeEventListener('message', handleYoutubeMessage);
  }, [setActiveVideoTimestamp]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(notesKey);
    setNotes(saved || '');
  }, [notesKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentSaved = localStorage.getItem(notesKey) || '';
    if (notes === currentSaved) return;

    const t = setTimeout(() => localStorage.setItem(notesKey, notes), 1200);
    return () => clearTimeout(t);
  }, [notes, notesKey]);

  useEffect(() => {
    if (isFlowActive) setCanvasView('material');
  }, [isFlowActive]);

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

  const activeSlide = slides[currentSlide - 1];

  return (
    <div className="fouzar-canvas flex flex-col h-full overflow-hidden bg-fouzar-bg relative">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute -top-1/4 -left-1/4 w-1/2 h-1/2 rounded-full blur-[120px] opacity-[0.07] ${
            isGreenhouse ? 'bg-fouzar-accent' : 'bg-fouzar-accent'
          }`}
        />
      </div>

      {/* Canvas toolbar */}
      <div
        className={`fouzar-chrome relative z-10 flex items-center justify-between px-4 py-2.5 border-b border-fouzar-border shrink-0 ${
          isGreenhouse ? 'bg-fouzar-surface-glass backdrop-blur-xl' : 'bg-fouzar-surface'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-serif text-[11px] font-bold tracking-wider uppercase">
            Sanctuary Canvas
          </span>
          <span className="font-mono text-[7px] text-fouzar-text-secondary border border-fouzar-border px-1.5 py-0.5 rounded-[var(--fouzar-radius-sm)] uppercase">
            {roomId}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {[
            { id: 'material' as const, icon: BookOpen, label: 'Slides' },
            { id: 'split' as const, icon: MonitorPlay, label: 'Split' },
            { id: 'media' as const, icon: Play, label: 'Media' },
            { id: 'web' as const, icon: Globe, label: 'Web Hub' },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setCanvasView(v.id)}
                disabled={isFlowActive && v.id !== 'material'}
                className={`px-2.5 py-1 flex items-center gap-1 font-mono text-[7px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] transition-colors ${
                  canvasView === v.id
                    ? 'bg-fouzar-accent/15 text-fouzar-accent'
                    : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
                } disabled:opacity-30`}
              >
                <Icon className="w-3 h-3" />
                {v.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLeader(!isLeader)}
            disabled={isFlowActive}
            className={`px-2 py-0.5 font-mono text-[7px] uppercase border rounded-[var(--fouzar-radius-sm)] ${
              isLeader
                ? 'border-fouzar-ice/40 text-fouzar-ice bg-fouzar-ice/5'
                : 'border-fouzar-border text-fouzar-text-secondary'
            }`}
          >
            {isLeader ? 'Leader' : 'Follow'}
          </button>
          <button
            type="button"
            onClick={() => setSyncMode(!syncMode)}
            disabled={isFlowActive}
            className="p-1 text-fouzar-text-secondary hover:text-fouzar-accent disabled:opacity-30"
          >
            {syncMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main canvas grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
        {/* Material Hub */}
        <AnimatePresence mode="popLayout">
          {(canvasView === 'material' || canvasView === 'split') && (
            <motion.section
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex flex-col overflow-hidden border-fouzar-border ${
                canvasView === 'split' ? 'md:w-1/2 border-r' : 'flex-1'
              } ${isGreenhouse ? 'fouzar-glass m-2 rounded-[var(--fouzar-radius-lg)]' : ''}`}
            >
              {activeDoc ? (
                <div className="flex-1 flex flex-col overflow-hidden relative p-4">
                  <DocumentViewer
                    document={activeDoc}
                    onClose={() => setActiveDoc(null)}
                    isInline={true}
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1 flex items-center justify-between p-4 relative">
                    <button
                      type="button"
                      onClick={() => handleNavigateSlide('prev')}
                      disabled={currentSlide === 1 || (syncMode && !isLeader)}
                      className="p-2 rounded-[var(--fouzar-radius-md)] bg-fouzar-elevated/80 border border-fouzar-border disabled:opacity-20 z-10"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="flex-1 max-w-3xl mx-4 h-[88%] fouzar-card p-6 flex flex-col justify-between shadow-[var(--fouzar-shadow-lg)]"
                      >
                        <div className="space-y-3">
                          <span className="font-mono text-[7px] text-fouzar-ice uppercase tracking-widest">
                            {activeSlide?.subtitle}
                          </span>
                          <h2 className="font-serif text-sm font-bold uppercase tracking-wide border-b border-fouzar-border pb-2">
                            {activeSlide?.title}
                          </h2>
                          <p className="text-[11px] text-fouzar-text-primary/90 leading-relaxed font-light">
                            {activeSlide?.content}
                          </p>
                        </div>
                        <div className="font-mono text-[7px] text-fouzar-text-secondary flex justify-between uppercase">
                          <span>Slide {currentSlide}/{slides.length}</span>
                          <span className="text-fouzar-accent">Secured</span>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    <button
                      type="button"
                      onClick={() => handleNavigateSlide('next')}
                      disabled={currentSlide === slides.length || (syncMode && !isLeader)}
                      className="p-2 rounded-[var(--fouzar-radius-md)] bg-fouzar-elevated/80 border border-fouzar-border disabled:opacity-20 z-10"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {!isFlowActive && (
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Sanctuary notebook — capture formulas, definitions, insights..."
                      className="mx-4 mb-4 h-14 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)] p-2 font-mono text-[9px] resize-none focus:outline-none focus:shadow-[var(--fouzar-focus-ring)]"
                    />
                  )}
                </>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Embedded Media Sandbox */}
        <AnimatePresence mode="popLayout">
          {(canvasView === 'media' || canvasView === 'split') && (
            <motion.section
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`flex flex-col overflow-hidden ${
                canvasView === 'split' ? 'md:w-1/2' : 'flex-1'
              }`}
            >
              <div className="flex-1 bg-black/50 relative">
                <iframe
                  src={embedUrl}
                  title="Fouzar lecture sandbox"
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {!isFlowActive && (
                <form onSubmit={handleSetVideo} className="p-3 border-t border-fouzar-border flex gap-2 bg-fouzar-surface">
                  <input
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    placeholder="Paste YouTube lecture URL..."
                    className="flex-1 bg-fouzar-elevated border border-fouzar-border px-3 py-1.5 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-fouzar-accent/10 border border-fouzar-accent/30 text-fouzar-accent font-mono text-[8px] uppercase rounded-[var(--fouzar-radius-md)]"
                  >
                    Load
                  </button>
                </form>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Web & Free AI Hub */}
        <AnimatePresence mode="popLayout">
          {canvasView === 'web' && (
            <motion.section
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-hidden p-6 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] m-2"
            >
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
                              className={`px-3 py-1.5 font-mono text-[7.5px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] border cursor-pointer shrink-0 transition-all ${
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
            </motion.section>
          )}
          </AnimatePresence>
      </div>
    </div>
  );
};
