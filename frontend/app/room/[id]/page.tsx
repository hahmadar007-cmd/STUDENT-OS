'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  Plus, 
  X, 
  Bot, 
  Sparkles, 
  LogOut,
  Hash,
  Lock,
  Unlock,
  MessageCircle,
  Users,
  Maximize2,
  Minimize2,
  Minus
} from 'lucide-react';
import { 
  joinGroup, 
  leaveGroup, 
  sendMessage, 
  syncSlide, 
  updateFocusState,
  useOnMessage, 
  useOnSlideChanged, 
  useOnFocusStateChanged 
} from '../../../lib/socket';
import { useFouzar, LmsRepositoryItem } from '../../../lib/FouzarContext';
import { FascaButton } from '../../../components/ui/FascaButton';
import { FascaCard } from '../../../components/ui/FascaCard';
import { FascaInput } from '../../../components/ui/FascaInput';
import { toast } from '../../../components/ui/Toast';
import { WorkspaceLayout } from '../../../components/focus/WorkspaceLayout';
import { IntegratedAiChat } from '../../../components/ai/IntegratedAiChat';

interface ConnectedMember {
  id: string;
  name: string;
  initials: string;
  status: 'online' | 'flow' | 'offline';
}

interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  timestamp: string;
  slideContext: string | null;
}

interface ThreadReply {
  sender: string;
  content: string;
  timestamp: string;
}

interface Thread {
  id: string;
  slideNumber: number;
  title: string;
  replyCount: number;
  lastActivity: string;
  originalMessage: {
    sender: string;
    content: string;
    timestamp: string;
  };
  replies: ThreadReply[];
  isExpanded: boolean;
}

interface SlideData {
  number: number;
  title: string;
  subtitle: string;
  content: string;
}

export default function StudyRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = (params.id as string) || 'group-1';
  
  const { isFlowActive, setIsFlowActive, activeDoc, setActiveDoc, closeDoc } = useFouzar();
  const [currentSlide, setCurrentSlide] = useState(1);
  const [syncMode, setSyncMode] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiModalSize, setAiModalSize] = useState<'minimized' | 'default' | 'maximized'>('default');

  // 1. Connected Members state
  const [connectedMembers, setConnectedMembers] = useState<ConnectedMember[]>([]);

  // 2. Chat messages state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // 3. Threads state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [showNewThreadInput, setShowNewThreadInput] = useState(false);
  const [threadReplyInputs, setThreadReplyInputs] = useState<{ [threadId: string]: string }>({});

  // Slide content database
  const slides: SlideData[] = [];

  // Socket Emitters on Mount
  useEffect(() => {
    joinGroup(roomId);
    
    return () => {
      leaveGroup(roomId);
    };
  }, [roomId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeDoc) closeDoc(activeDoc.id);
        setShowAiModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Hook up typed listeners from lib/socket.ts
  useOnMessage((message: any) => {
    const isUser = message.sender?.id === 'usr-1' || message.sender?.name?.includes('You') || message.senderName?.includes('You') || message.senderName === 'Alex (You)';
    if (!isUser) {
      toast(`New message from ${message.sender?.name || message.senderName || 'Peer'}`, 'violet');
    }
    setChatMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      const filtered = prev.filter((m) => !(m.id.startsWith('local-') && m.content === message.content));
      return [
        ...filtered,
        {
          id: message.id,
          senderName: message.sender?.name || message.senderName || 'Peer',
          content: message.content || message.text,
          timestamp: message.createdAt 
            ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          slideContext: message.slideId ? `SLIDE ${message.slideId.replace('slide-', '')}` : null,
        },
      ];
    });
  });

  useOnSlideChanged((data: { slideId: string }) => {
    if (syncMode && !isLeader) {
      const slideNum = parseInt(data.slideId.replace('slide-', ''));
      if (!isNaN(slideNum)) {
        setCurrentSlide(slideNum);
      }
    }
  });

  useOnFocusStateChanged((data: any) => {
    toast(`${data.name || 'A peer'} ${data.isFocusing ? 'entered Deep Flow' : 'exited Deep Flow'}`, data.isFocusing ? 'crimson' : 'violet');
    setConnectedMembers((prev) =>
      prev.map((m) => {
        if (m.id === data.userId || (m.name || '').toLowerCase().includes((data.name || '').split(' ')[0].toLowerCase())) {
          return { ...m, status: data.isFocusing ? 'flow' : 'online' };
        }
        return m;
      })
    );
  });

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Trigger focus mode across peers
  const handleToggleFocus = () => {
    const nextState = !isFlowActive;
    setIsFlowActive(nextState);
    
    // Use real socket emitter
    updateFocusState(nextState);
    
    setConnectedMembers((prev) =>
      prev.map((m) => {
        if (m.id === 'usr-1') {
          return { ...m, status: nextState ? 'flow' : 'online' };
        }
        return m;
      })
    );
  };

  // Navigate Slide
  const handleNavigateSlide = (direction: 'prev' | 'next') => {
    let target = currentSlide;
    if (direction === 'prev' && currentSlide > 1) target = currentSlide - 1;
    if (direction === 'next' && currentSlide < slides.length) target = currentSlide + 1;
    
    if (target !== currentSlide) {
      setCurrentSlide(target);
      if (syncMode && isLeader) {
        // Use real socket emitter
        syncSlide(roomId, `slide-${target}`);
      }
    }
  };

  // Submit Chat Message
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const text = chatInput.trim();
    setChatInput('');

    // Optimistic local add
    const localId = `local-${Date.now()}`;
    setChatMessages((prev) => [
      ...prev,
      {
        id: localId,
        senderName: 'Alex (You)',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        slideContext: `SLIDE ${currentSlide}`,
      },
    ]);

    // Use real socket emitter
    sendMessage(roomId, text, `slide-${currentSlide}`);
  };

  // Create Thread
  const handleCreateThread = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim()) return;

    const title = newThreadTitle.trim();
    const newTh: Thread = {
      id: `th-${Date.now()}`,
      slideNumber: currentSlide,
      title,
      replyCount: 0,
      lastActivity: 'Just now',
      originalMessage: {
        sender: 'Alex (You)',
        content: `Initiated thread for Slide ${currentSlide}: "${title}"`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      replies: [],
      isExpanded: true,
    };

    setThreads([newTh, ...threads.map((t) => ({ ...t, isExpanded: false }))]);
    setNewThreadTitle('');
    setShowNewThreadInput(false);
  };

  // Expand Thread
  const toggleExpandThread = (id: string) => {
    setThreads(threads.map((t) => (t.id === id ? { ...t, isExpanded: !t.isExpanded } : t)));
  };

  // Reply to Thread
  const handleThreadReplySubmit = (e: React.FormEvent, threadId: string) => {
    e.preventDefault();
    const replyText = threadReplyInputs[threadId];
    if (!replyText || !replyText.trim()) return;

    setThreads(
      threads.map((t) => {
        if (t.id === threadId) {
          return {
            ...t,
            replyCount: t.replyCount + 1,
            lastActivity: 'Just now',
            replies: [
              ...t.replies,
              {
                sender: 'Alex (You)',
                content: replyText.trim(),
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ],
          };
        }
        return t;
      })
    );

    setThreadReplyInputs({ ...threadReplyInputs, [threadId]: '' });
  };

  const handleAiAssist = () => {
    setShowAiModal(true);
  };

  return (
    <>
      <WorkspaceLayout
        roomId={roomId}
        currentSlide={currentSlide}
        syncMode={syncMode}
        isLeader={isLeader}
        setIsLeader={setIsLeader}
        setSyncMode={setSyncMode}
        slides={slides}
        connectedMembers={connectedMembers}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleSendChat={handleSendChat}
        chatEndRef={chatEndRef}
        threads={threads}
        newThreadTitle={newThreadTitle}
        setNewThreadTitle={setNewThreadTitle}
        showNewThreadInput={showNewThreadInput}
        setShowNewThreadInput={setShowNewThreadInput}
        handleCreateThread={handleCreateThread}
        toggleExpandThread={toggleExpandThread}
        threadReplyInputs={threadReplyInputs}
        setThreadReplyInputs={setThreadReplyInputs}
        handleThreadReplySubmit={handleThreadReplySubmit}
        handleToggleFocus={handleToggleFocus}
        handleNavigateSlide={handleNavigateSlide}
        handleAiAssist={handleAiAssist}
        onLeave={() => router.push('/dashboard')}
        activeDoc={activeDoc}
        setActiveDoc={setActiveDoc}
      />

      {/* AI COMPANION ASSIST OVERLAY DIALOG */}
      <AnimatePresence>
        {showAiModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed z-50 ${
              aiModalSize === 'minimized' 
                ? 'bottom-6 right-6 flex items-end justify-end pointer-events-none' 
                : 'inset-0 bg-fouzar-bg/90 backdrop-blur-md flex items-center justify-center p-4'
            }`}
          >
            <motion.div
              layout
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className={`w-full bg-fouzar-card border border-[#7c5cfc] shadow-2xl relative overflow-hidden flex flex-col pointer-events-auto ${
                aiModalSize === 'maximized' ? 'max-w-7xl h-[90vh] p-8' :
                aiModalSize === 'minimized' ? 'w-[320px] h-[60px] p-0 shadow-lg cursor-pointer border-[#7c5cfc]/50 hover:border-[#7c5cfc]' :
                'max-w-md h-[80vh] p-6'
              }`}
              onClick={() => {
                if (aiModalSize === 'minimized') setAiModalSize('default');
              }}
            >
              {aiModalSize === 'minimized' ? (
                <div className="flex items-center justify-between w-full h-full px-4 bg-[#7c5cfc]/10">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-[#7c5cfc]" />
                    <span className="font-serif text-[10px] font-bold tracking-widest text-fouzar-text-primary uppercase">AI Assist Active</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setAiModalSize('default'); }} className="p-1 text-fouzar-text-secondary hover:text-fouzar-text-primary">
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setShowAiModal(false); }} className="p-1 text-fouzar-text-secondary hover:text-fouzar-text-primary">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-4 border-b border-fouzar-border-strong/40 pb-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-[#7c5cfc]" />
                      <div>
                        <h4 className="font-serif text-xs font-bold tracking-widest text-fouzar-text-primary uppercase">
                          FASCA AI ROOM ASSIST
                        </h4>
                        <p className="text-[7.5px] font-mono text-fouzar-text-secondary uppercase">Slide Context Co-pilot</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {aiModalSize === 'maximized' ? (
                        <button
                          onClick={() => setAiModalSize('default')}
                          className="p-1 hover:bg-white/5 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
                        >
                          <Minimize2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => setAiModalSize('maximized')}
                          className="p-1 hover:bg-white/5 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => setAiModalSize('minimized')}
                        className="p-1 hover:bg-white/5 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setShowAiModal(false)}
                        className="p-1 hover:bg-white/5 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden my-2 border border-fouzar-border-strong/30 rounded-md">
                    <IntegratedAiChat
                      contextLabel={`Room · Slide ${currentSlide}`}
                      slideId={String(currentSlide)}
                      slideContextText={slides[currentSlide - 1] ? `Slide ${slides[currentSlide - 1].number}: ${slides[currentSlide - 1].title}\n${slides[currentSlide - 1].subtitle}\n${slides[currentSlide - 1].content}` : ''}
                      storageKey={`fouzar-room-ai-${roomId}`}
                      compact={aiModalSize !== 'maximized'}
                    />
                  </div>

                  <FascaButton
                    onClick={() => setShowAiModal(false)}
                    variant="solid-violet"
                    className="w-full shrink-0 rounded-none font-bold py-2 text-[9px] mt-2"
                  >
                    DISMISS
                  </FascaButton>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
