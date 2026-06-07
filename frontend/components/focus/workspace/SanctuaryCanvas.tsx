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

type CanvasView = 'material' | 'split' | 'media';

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
  const { mode, isFlowActive, activeFolderId, setActiveVideoUrl, setActiveVideoTimestamp } = useFouzar();
  const isGreenhouse = mode === 'greenhouse';

  const [canvasView, setCanvasView] = useState<CanvasView>('split');
  const [videoInput, setVideoInput] = useState('');
  const [embedUrl, setEmbedUrl] = useState('https://www.youtube.com/embed/jfKfPfyJRdk?rel=0&modestbranding=1&enablejsapi=1');
  const [notes, setNotes] = useState('');
  const [chatExpanded, setChatExpanded] = useState(true);

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
      </div>
    </div>
  );
};
