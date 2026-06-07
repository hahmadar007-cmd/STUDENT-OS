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
  Users
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
  
  const { isFlowActive, setIsFlowActive, activeDoc, setActiveDoc } = useFouzar();
  const [currentSlide, setCurrentSlide] = useState(1);
  const [syncMode, setSyncMode] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // 1. Connected Members state
  const [connectedMembers, setConnectedMembers] = useState<ConnectedMember[]>([
    { id: 'usr-1', name: 'Alex (You)', initials: 'AM', status: 'online' },
    { id: 'usr-2', name: 'Elena', initials: 'ER', status: 'online' },
    { id: 'usr-3', name: 'Kai', initials: 'KT', status: 'flow' },
    { id: 'usr-4', name: 'Devon', initials: 'DV', status: 'offline' },
  ]);

  // 2. Chat messages state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      senderName: 'Kai',
      content: 'Hey! Did everyone finish reading Slide 3? The hidden representations logic is key.',
      timestamp: '02:02 AM',
      slideContext: 'SLIDE 3',
    },
    {
      id: 'msg-2',
      senderName: 'Elena',
      content: 'Yes, but I think the backpropagation equations on Slide 5 are much trickier to implement.',
      timestamp: '02:04 AM',
      slideContext: 'SLIDE 5',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // 3. Threads state
  const [threads, setThreads] = useState<Thread[]>([
    {
      id: 'th-1',
      slideNumber: 3,
      title: 'Universal Approximation Theorem',
      replyCount: 2,
      lastActivity: '4m ago',
      originalMessage: {
        sender: 'Elena',
        content: 'Why does adding a single hidden layer with ReLU allow approximating any continuous function?',
        timestamp: '01:50 AM',
      },
      replies: [
        { sender: 'Kai', content: 'Because we can combine linear segments to create arbitrary bounding boxes/bumps.', timestamp: '01:52 AM' },
        { sender: 'Devon', content: 'Yes, Sigmoid worked too, but ReLU helps avoid early gradient vanishing.', timestamp: '01:55 AM' },
      ],
      isExpanded: false,
    },
    {
      id: 'th-2',
      slideNumber: 5,
      title: 'Backprop weight update matrix math',
      replyCount: 0,
      lastActivity: '12m ago',
      originalMessage: {
        sender: 'Kai',
        content: 'Let\'s double check if we need to transpose the weight matrix when backward propagating delta values.',
        timestamp: '01:40 AM',
      },
      replies: [],
      isExpanded: false,
    },
  ]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [showNewThreadInput, setShowNewThreadInput] = useState(false);
  const [threadReplyInputs, setThreadReplyInputs] = useState<{ [threadId: string]: string }>({});

  // Slide content database
  const slides: SlideData[] = [
    {
      number: 1,
      title: 'Neural Networks & Backpropagation',
      subtitle: 'Fasca Study Circle • Course CS-229',
      content: 'Welcome to the Neural Networks review session. We will cover the structure of Multi-Layer Perceptrons (MLPs), gradient descent optimization, and how backpropagation propagates error derivatives backward to update weight matrices.',
    },
    {
      number: 2,
      title: 'The Single-Layer Perceptron',
      subtitle: 'Linear Classifier & Activation Limits',
      content: 'A perceptron computes a weighted sum of inputs and applies a step function. Limits: cannot solve non-linearly separable problems like XOR. Equation: y = \\sigma(\\sum w_i x_i + b). Sigmoid or Step function acts as the threshold gating function.',
    },
    {
      number: 3,
      title: 'Multi-Layer Feedforward Networks',
      subtitle: 'Hidden Representations & Non-linearities',
      content: 'By introducing hidden layers with non-linear activation functions (ReLU, Sigmoid, GeLU), neural networks become universal function approximators. Hidden layers extract hierarchical representations of inputs.',
    },
    {
      number: 4,
      title: 'Loss Function & Gradient Descent',
      subtitle: 'Navigating the Optimization Surface',
      content: 'We define a cost function C (like Mean Squared Error or Cross Entropy) and update weights in the opposite direction of the gradient: W_{new} = W_{old} - \\eta \\nabla C(W). Gradient descent slides down the loss surface to reach a local minima.',
    },
    {
      number: 5,
      title: 'The Backpropagation Algorithm',
      subtitle: 'Efficient Gradient Computation via Chain Rule',
      content: 'Backpropagation calculates the gradient of the loss function with respect to each weight. By caching partial derivatives on the backward pass, we avoid duplicate computations. Computational complexity scales linearly with net edges.',
    },
  ];

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
        setActiveDoc(null);
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
        if (m.id === data.userId || m.name.toLowerCase().includes(data.name?.split(' ')[0].toLowerCase())) {
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
            className="fixed inset-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-[#16161f] border border-[#7c5cfc] shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4 border-b border-[#2a2a3a]/40 pb-2">
                <div className="flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-[#7c5cfc]" />
                  <div>
                    <h4 className="font-serif text-xs font-bold tracking-widest text-[#f0f0ff] uppercase">
                      FASCA AI ROOM ASSIST
                    </h4>
                    <p className="text-[7.5px] font-mono text-[#6b6b8a] uppercase">Slide Context Co-pilot</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="p-1 hover:bg-white/5 rounded text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="my-4 min-h-[320px]">
                <IntegratedAiChat
                  contextLabel={`Room · Slide ${currentSlide}`}
                  slideId={String(currentSlide)}
                  storageKey={`fouzar-room-ai-${roomId}`}
                  compact
                />
              </div>

              <FascaButton
                onClick={() => setShowAiModal(false)}
                variant="solid-violet"
                className="w-full rounded-none font-bold py-2 text-[9px]"
              >
                DISMISS
              </FascaButton>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
