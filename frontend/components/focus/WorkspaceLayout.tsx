'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Bot } from 'lucide-react';
import { useFouzar, LmsRepositoryItem } from '../../lib/FouzarContext';
import { getBackendUrl } from '../../lib/api';
import { MessageSquare } from 'lucide-react';
import { NavRail } from './workspace/NavRail';
import { SocialColumn } from './workspace/SocialColumn';
import { ResizablePanel } from '../ui/ResizablePanel';
import { SanctuaryCanvas } from './workspace/SanctuaryCanvas';
import { GroupWorkspace } from '../groups/GroupWorkspace';

/* =============================================================================
   FOUZAR WORKSPACE LAYOUT — Phase 3
   Mobile-first 3-column sanctuary architecture:
     Col 1 → NavRail (Fouzar logo + system controls)
     Col 2 → SocialColumn (Pillar 3 social + Pillar 4 LMS hub)
     Col 3 → SanctuaryCanvas (Pillar 1 unified live workspace)
   Deep Flow triggers progressive disclosure: cols 1 & 2 blur/fade via
   .fouzar-chrome CSS + Framer Motion, isolating the active canvas.
   ============================================================================= */

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
  originalMessage: { sender: string; content: string; timestamp: string };
  replies: ThreadReply[];
  isExpanded: boolean;
}

interface SlideData {
  number: number;
  title: string;
  subtitle: string;
  content: string;
}

export interface WorkspaceLayoutProps {
  roomId: string;
  groupName?: string;
  isGroupRoom?: boolean;
  currentSlide: number;
  syncMode: boolean;
  isLeader: boolean;
  setIsLeader: (leader: boolean) => void;
  setSyncMode: (sync: boolean) => void;
  slides: SlideData[];
  connectedMembers: ConnectedMember[];
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  handleSendChat: (e: React.FormEvent) => void;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  threads: Thread[];
  newThreadTitle: string;
  setNewThreadTitle: (title: string) => void;
  showNewThreadInput: boolean;
  setShowNewThreadInput: (show: boolean) => void;
  handleCreateThread: (e: React.FormEvent) => void;
  toggleExpandThread: (id: string) => void;
  threadReplyInputs: { [threadId: string]: string };
  setThreadReplyInputs: (inputs: { [threadId: string]: string }) => void;
  handleThreadReplySubmit: (e: React.FormEvent, threadId: string) => void;
  handleToggleFocus: () => void;
  handleNavigateSlide: (direction: 'prev' | 'next') => void;
  handleAiAssist: () => void;
  onLeave: () => void;
  activeDoc: LmsRepositoryItem | null;
  setActiveDoc: (doc: LmsRepositoryItem | null) => void;
}

const API_BASE = getBackendUrl();

/**
 * Root workspace shell consumed by /room/[id].
 * Orchestrates the 3-column layout and Deep Flow shield overlay (Pillar 2).
 */
export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({
  roomId,
  groupName,
  isGroupRoom = false,
  currentSlide,
  syncMode,
  isLeader,
  setIsLeader,
  setSyncMode,
  slides,
  connectedMembers = [],
  chatMessages,
  chatInput,
  setChatInput,
  handleSendChat,
  chatEndRef,
  handleToggleFocus,
  handleNavigateSlide,
  handleAiAssist,
  onLeave,
  activeDoc,
  setActiveDoc,
}) => {
  const {
    mode,
    isFlowActive,
    armDeepFlow,
    disarmDeepFlow,
    bypass,
    activateBypass,
    clearBypass,
  } = useFouzar();

  const [isSocialMinimized, setIsSocialMinimized] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'nav' | 'social' | 'canvas'>('canvas');

  const syncBypassToBackend = useCallback(async (isBypassed: boolean, durationMinutes?: number) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/users/me/bypass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isBypassed, durationMinutes }),
      });
    } catch {
      /* OS locker service optional in dev */
    }
  }, []);

  const handleArmFlow = () => {
    armDeepFlow();
    handleToggleFocus();
    syncBypassToBackend(false);
  };

  const handleDisarmFlow = () => {
    disarmDeepFlow();
    handleToggleFocus();
  };

  const handleEmergencyBypass = (minutes: 5 | 10 = 5) => {
    activateBypass(minutes);
    syncBypassToBackend(true, minutes);
  };

  const handleReLock = () => {
    clearBypass();
    syncBypassToBackend(false);
  };

  const bypassSecondsLeft = bypass.expiresAt
    ? Math.max(0, Math.floor((new Date(bypass.expiresAt).getTime() - Date.now()) / 1000))
    : 0;

  const formatBypass = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isGreenhouse = mode === 'greenhouse';

  return (
    <div className="h-screen w-screen bg-fouzar-bg text-fouzar-text-primary flex overflow-hidden relative font-sans select-none pb-14 md:pb-0">
      {/* Column 1 — Navigation rail */}
      <div className={`${mobilePanel !== 'nav' ? 'hidden md:block' : 'block'} md:shrink-0`}>
        <NavRail
          roomId={roomId}
          onArmFlow={handleArmFlow}
          onAiAssist={handleAiAssist}
          onLeave={onLeave}
          mobileActivePanel={mobilePanel}
          onMobilePanelChange={setMobilePanel}
        />
      </div>

            <div className="flex-1 flex overflow-hidden">
        <ResizablePanel direction="horizontal" initialSize={320} minSize={250} maxSize={500} collapsed={isSocialMinimized} fixedPanel={1}>
{/* Column 2 — Unified sanctuary canvas */}
      <div
        className={`flex-1 min-w-0 ${
          mobilePanel === 'canvas' ? 'flex' : 'hidden md:flex'
        } flex-col relative`}
      >
        {isSocialMinimized && (
          <button
            onClick={() => setIsSocialMinimized(false)}
            className="absolute top-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-fouzar-surface/90 border border-fouzar-border text-[10px] font-mono font-medium hover:bg-fouzar-surface-hover shadow-lg backdrop-blur text-fouzar-text-primary uppercase tracking-wider"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Show Hub</span>
          </button>
        )}
        {isGroupRoom ? (
          <GroupWorkspace
            roomId={roomId}
            groupName={groupName}
            connectedMembers={connectedMembers}
            currentSlide={currentSlide}
            syncMode={syncMode}
            isLeader={isLeader}
            setIsLeader={setIsLeader}
            setSyncMode={setSyncMode}
            onLeave={onLeave}
            activeDoc={activeDoc}
            setActiveDoc={setActiveDoc}
          />
        ) : (
          <SanctuaryCanvas
            roomId={roomId}
            currentSlide={currentSlide}
            syncMode={syncMode}
            isLeader={isLeader}
            setIsLeader={setIsLeader}
            setSyncMode={setSyncMode}
            slides={slides}
            chatMessages={chatMessages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            handleSendChat={handleSendChat}
            chatEndRef={chatEndRef}
            handleNavigateSlide={handleNavigateSlide}
            activeDoc={activeDoc}
            setActiveDoc={setActiveDoc}
          />
        )}
      </div>

      {/* Column 3 — Social + LMS hub (Moved to the Right) */}
      <motion.div
        className="fouzar-chrome h-full w-full flex flex-col"
        animate={{
          opacity: isFlowActive ? 0 : 1,
          width: isFlowActive ? 0 : undefined,
        }}
        transition={{ duration: 0.68, ease: [0.16, 1, 0.3, 1] }}
      >
        <SocialColumn
          roomId={roomId}
          className="w-full"
          activeDoc={activeDoc}
          setActiveDoc={setActiveDoc}
          chatMessages={chatMessages}
          chatInput={chatInput}
          setChatInput={setChatInput}
          handleSendChat={handleSendChat}
          chatEndRef={chatEndRef}
          currentSlide={currentSlide}
          slides={slides}
          onMinimize={() => setIsSocialMinimized(true)}
        />
      </motion.div>
        </ResizablePanel>
      </div>

      {/* Pillar 2 — Deep Flow shield overlay */}
      <AnimatePresence>
        {isFlowActive && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 md:right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-shadow-lg)] ${
              isGreenhouse ? 'fouzar-glass' : 'bg-fouzar-overlay backdrop-blur-xl border border-fouzar-border'
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

      {/* Floating AI trigger during flow */}
      <AnimatePresence>
        {isFlowActive && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            type="button"
            onClick={handleAiAssist}
            className="fixed bottom-20 md:bottom-6 right-4 z-50 w-11 h-11 rounded-full bg-fouzar-accent text-fouzar-text-inverse flex items-center justify-center shadow-[var(--fouzar-glow-primary)]"
          >
            <Bot className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute bottom-16 md:bottom-3 right-4 font-mono text-[7px] text-fouzar-text-tertiary/30 uppercase tracking-[0.3em] z-10">
        Fouzar Sanctuary
      </div>
    </div>
  );
};
