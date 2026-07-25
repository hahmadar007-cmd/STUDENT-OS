'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Radio,
  Play,
  CheckCircle2,
  Target,
  ChevronRight,
  LogOut,
  X,
  Sparkles,
  BookOpen,
  Lock,
  Unlock,
  FileText,
  Globe,
  ExternalLink,
  Search,
  Columns,
  Video,
  Minimize2,
  Maximize2,
  Bot,
  MessageSquare,
} from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';
import { useLivePresentation } from '../../hooks/useLivePresentation';
import { PresenterToast } from './PresenterToast';
import { GroupExplorer } from './GroupExplorer';
import { GroupActivityFeed, type ActivityEvent } from './GroupActivityFeed';
import { DocumentViewer } from '../documents/DocumentViewer';
import { MediaHubStandalone } from '../sanctuary/MediaHubStandalone';
import { LiveLounge } from './LiveLounge';
import { ResizablePanel } from '../ui/ResizablePanel';
import { IntegratedAiChat } from '../ai/IntegratedAiChat';

interface ConnectedMember {
  id: string;
  name: string;
  initials: string;
  status: 'online' | 'flow' | 'offline';
}

interface GroupWorkspaceProps {
  roomId: string;
  groupName?: string;
  semesterTag?: string;
  connectedMembers?: ConnectedMember[];
  currentSlide?: number;
  syncMode?: boolean;
  isLeader?: boolean;
  setIsLeader?: (leader: boolean) => void;
  setSyncMode?: (sync: boolean) => void;
  onLeave?: () => void;
  activeDoc?: any | null;
  setActiveDoc?: (doc: any | null) => void;
  isHubOpen?: boolean;
  onToggleHub?: () => void;
}

export const GroupWorkspace: React.FC<GroupWorkspaceProps> = ({
  roomId,
  groupName = 'Study Circle',
  semesterTag = 'Spring 2026',
  connectedMembers = [],
  currentSlide = 1,
  syncMode = true,
  isLeader = false,
  setIsLeader,
  setSyncMode,
  onLeave,
  activeDoc,
  setActiveDoc,
  isHubOpen = true,
  onToggleHub,
}) => {
  const { mode, user, closeDoc, activeFolderId, setActiveDocText, setAiTriggerQuery } = useFouzar();
  const isGreenhouse = mode === 'greenhouse';

  // Live presentation engine
  const livePresentation = useLivePresentation(user?.id);

  // Tabs & Split state
  const [activeSplitTabs, setActiveSplitTabs] = useState<{ left: string; right: string | null }>({
    left: 'explorer',
    right: null,
  });

  // Notes state
  const [notes, setNotes] = useState('');
  const notesKey = `fouzar-group-notes-${roomId}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(notesKey);
    setNotes(saved || '');
  }, [notesKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => localStorage.setItem(notesKey, notes), 1000);
    return () => clearTimeout(t);
  }, [notes, notesKey]);

  // Web search engine state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ title: string; link: string; snippet: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [fedUrls, setFedUrls] = useState<Record<string, boolean>>({});

  const handleWebSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const { webSearch } = await import('../../lib/api');
      const results = await webSearch(searchQuery);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Failed web search:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Activity events state (in-memory for current session)
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([
    {
      id: 'evt-init',
      type: 'info',
      userInitials: 'SYS',
      userName: 'System',
      description: 'Room session initialized',
      timestamp: 'Just now',
    },
  ]);

  // Session goal state
  const [sessionGoal, setSessionGoal] = useState<string>('Finish Routing Algorithms & Lab Manual');
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(sessionGoal);

  // Track file activity additions
  const handleFileActionActivity = useCallback(
    (type: 'upload' | 'delete', fileName: string) => {
      const newEvt: ActivityEvent = {
        id: `evt-${Date.now()}`,
        type,
        userInitials: user?.avatarInitials || 'YOU',
        userName: user?.name || 'You',
        description: type === 'upload' ? `uploaded ${fileName}` : `deleted ${fileName}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setActivityEvents((prev) => [newEvt, ...prev]);
    },
    [user],
  );

  // Presenter trigger handler
  const handlePresentFile = useCallback(
    (fileId: string, fileName: string) => {
      livePresentation.startPresenting(roomId, fileId, fileName);
      const newEvt: ActivityEvent = {
        id: `evt-${Date.now()}`,
        type: 'presentation',
        userInitials: user?.avatarInitials || 'YOU',
        userName: user?.name || 'You',
        description: `started presenting ${fileName}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setActivityEvents((prev) => [newEvt, ...prev]);
    },
    [livePresentation, roomId, user],
  );

  const activeBroadcast = livePresentation.activeBroadcast;

  const [isViewingPresentation, setIsViewingPresentation] = useState(false);
  const [isPresentationMaximized, setIsPresentationMaximized] = useState(false);

  // Auto-join if you are the presenter, or reset if broadcast ends
  useEffect(() => {
    if (activeBroadcast) {
      if (activeBroadcast.presenterId === user?.id) {
        setIsViewingPresentation(true);
        setIsPresentationMaximized(false);
      }
    } else {
      setIsViewingPresentation(false);
      setIsPresentationMaximized(false);
    }
  }, [activeBroadcast, user?.id]);

  const renderTabContent = (tab: string | null) => {
    if (!tab) return null;

    if (tab === 'explorer') {
      return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeDoc ? (
            <div className="flex-1 flex flex-col overflow-hidden border border-fouzar-border rounded-[var(--fouzar-radius-lg)] bg-fouzar-elevated relative">
              <div className="flex items-center justify-between px-4 py-2 border-b border-fouzar-border bg-fouzar-surface/80 shrink-0">
                <span className="font-mono text-[9px] font-bold uppercase text-fouzar-accent truncate">
                  Viewing: {activeDoc.fileName}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveDoc?.(null)}
                  className="p-1 text-fouzar-text-secondary hover:text-fouzar-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden relative">
                <DocumentViewer
                  document={activeDoc}
                  onClose={() => setActiveDoc?.(null)}
                  isInline={true}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <GroupExplorer
                groupId={roomId}
                onOpenFile={(doc) => setActiveDoc?.(doc)}
                onPresentFile={handlePresentFile}
                onFileActionActivity={handleFileActionActivity}
              />
              <GroupActivityFeed events={activityEvents} />
            </div>
          )}
        </div>
      );
    }

    if (tab === 'youtube') {
      return (
        <div className="flex-1 min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-4 flex flex-col overflow-hidden m-1">
          <MediaHubStandalone
            folderId={activeFolderId}
            onVideoSelect={(url, videoId, title) => {
              // Video selected in YouTube sandbox
            }}
          />
        </div>
      );
    }

    if (tab === 'notes') {
      return (
        <div className="flex-1 min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-5 flex flex-col overflow-hidden m-1">
          <div className="mb-3 shrink-0">
            <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-fouzar-text-primary">
              Group Study Notebook
            </h3>
            <p className="text-[9.5px] text-fouzar-text-secondary mt-0.5 font-mono">
              Capture formulas, definitions, and collaborative group notes. Auto-saves locally.
            </p>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Type formulas, discussion points, key takeaways for this group..."
            className="flex-1 bg-fouzar-elevated/40 border border-fouzar-border rounded-[var(--fouzar-radius-md)] p-4 font-mono text-sm resize-none focus:outline-none focus:shadow-[var(--fouzar-focus-ring)] text-fouzar-text-primary"
          />
        </div>
      );
    }

    if (tab === 'web') {
      return (
        <div className="flex-1 min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-5 flex flex-col overflow-hidden m-1">
          <div className="flex flex-col h-full overflow-y-auto scrollbar-none space-y-5">
            <div className="text-center max-w-xl mx-auto space-y-1.5 mt-2">
              <Sparkles className="w-7 h-7 text-fouzar-accent mx-auto mb-1 animate-pulse" />
              <h3 className="font-serif text-sm font-bold uppercase tracking-wider">
                Web & Free AI Hub
              </h3>
              <p className="text-[10px] text-fouzar-text-secondary leading-relaxed">
                Access free AI models and study tools directly using your personal accounts. No API keys required.
              </p>
            </div>

            {/* Free AI Models Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto w-full px-2">
              {[
                {
                  name: 'DeepSeek Chat',
                  desc: 'Free reasoning AI model by DeepSeek.',
                  url: 'https://chat.deepseek.com',
                  color: 'border-blue-500/20 bg-blue-500/5',
                  textColor: 'text-blue-400',
                },
                {
                  name: 'ChatGPT',
                  desc: 'Free access to GPT-4o mini by OpenAI.',
                  url: 'https://chatgpt.com',
                  color: 'border-fouzar-accent/20 bg-fouzar-accent/5',
                  textColor: 'text-fouzar-accent',
                },
                {
                  name: 'Claude AI',
                  desc: 'Free access to Claude 3.5 Sonnet by Anthropic.',
                  url: 'https://claude.ai',
                  color: 'border-amber-500/20 bg-amber-500/5',
                  textColor: 'text-amber-400',
                },
              ].map((preset) => (
                <a
                  key={preset.name}
                  href={preset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-3 rounded-[var(--fouzar-radius-md)] border text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer ${preset.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-serif text-[10.5px] font-bold uppercase ${preset.textColor}`}>
                        {preset.name}
                      </span>
                      <ExternalLink className="w-3 h-3 text-fouzar-text-secondary" />
                    </div>
                    <p className="text-[8.5px] text-fouzar-text-secondary leading-relaxed mb-2">
                      {preset.desc}
                    </p>
                  </div>
                  <span className="font-mono text-[7px] text-fouzar-text-primary uppercase tracking-widest border border-fouzar-border/30 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] inline-block w-fit">
                    Launch AI ↗
                  </span>
                </a>
              ))}
            </div>

            {/* Web Search */}
            <div className="max-w-2xl mx-auto w-full space-y-3 pt-3 border-t border-fouzar-border/20 px-2 pb-2">
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-fouzar-text-secondary block text-center">
                Integrated Web Search Engine
              </span>
              <form onSubmit={handleWebSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-tertiary" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search topics (e.g. routing algorithms, subnetting)..."
                    className="w-full pl-9 pr-4 py-2 bg-fouzar-elevated/40 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-[10px] font-mono focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase tracking-wider font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-none pr-1">
                  {searchResults.map((res, index) => {
                    const isFed = !!fedUrls[res.link];
                    return (
                      <div
                        key={index}
                        className="p-2.5 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                      >
                        <div className="min-w-0 flex-1 text-left">
                          <a
                            href={res.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-serif text-[9.5px] font-bold text-fouzar-accent hover:underline flex items-center gap-1"
                          >
                            {res.title} <ExternalLink className="w-2.5 h-2.5 text-fouzar-text-secondary" />
                          </a>
                          <p className="text-[8.5px] text-fouzar-text-secondary leading-relaxed mt-0.5">
                            {res.snippet}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveDocText?.(`[Web Search context]\nSource Title: ${res.title}\nSource Link: ${res.link}\nContent:\n${res.snippet}`);
                            setAiTriggerQuery?.({
                              text: `Please analyze this search result context:\n\nTitle: ${res.title}\nLink: ${res.link}\nSnippet: ${res.snippet}`,
                              id: Date.now().toString(),
                            });
                            setFedUrls((prev) => ({ ...prev, [res.link]: true }));
                            setTimeout(() => {
                              setFedUrls((prev) => ({ ...prev, [res.link]: false }));
                            }, 2000);
                          }}
                          className={`px-2.5 py-1 font-mono text-[7px] uppercase tracking-wider rounded border cursor-pointer shrink-0 transition-all ${
                            isFed
                              ? 'bg-fouzar-accent/10 border-fouzar-accent/30 text-fouzar-accent font-bold'
                              : 'bg-black/20 border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-text-primary'
                          }`}
                        >
                          {isFed ? 'Context Sent!' : 'Send to AI'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (tab === 'lounge') {
      return (
        <div className="flex-1 min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-4 flex flex-col overflow-hidden m-1">
          <LiveLounge roomId={roomId} />
        </div>
      );
    }

    if (tab === 'ai') {
      return (
        <div className="flex-1 min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-4 flex flex-col overflow-hidden m-1">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-fouzar-border shrink-0">
            <div className="p-1 rounded bg-[#7c5cfc]/20 border border-[#7c5cfc]/40 text-[#7c5cfc]">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fouzar-text-primary">
              Robot AI Copilot
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <IntegratedAiChat
              contextLabel={`Group: ${groupName}`}
              slideId={currentSlide?.toString() || '1'}
              storageKey={`fouzar-group-ai-${roomId}`}
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#050505] relative">
      {/* ── 1. Group Header Bar ────────────────────────────────────────── */}
      <div className="relative z-10 flex items-center justify-between px-5 py-2.5 border-b border-white/[0.05] shrink-0 bg-[#0b0b12]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-serif text-sm md:text-base font-bold tracking-wide uppercase text-fouzar-text-primary truncate">
              {groupName}
            </h2>
            {semesterTag && (
              <span className="font-mono text-[8px] text-fouzar-accent border border-fouzar-accent/30 px-2 py-0.5 rounded-full uppercase shrink-0">
                {semesterTag}
              </span>
            )}
          </div>

          <div className="h-4 w-[1px] bg-fouzar-border shrink-0 hidden sm:block" />

          {/* Member count & Live badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[8px] text-fouzar-text-secondary flex items-center gap-1">
              <Users className="w-3 h-3 text-fouzar-text-tertiary" />
              {connectedMembers.length > 0 ? connectedMembers.length : 1} Members
            </span>

            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[7.5px] uppercase tracking-wider rounded-full font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              LIVE
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleHub && (
            <button
              type="button"
              onClick={onToggleHub}
              className={`px-2.5 py-1 font-mono text-[8px] uppercase tracking-wider border rounded-[var(--fouzar-radius-md)] transition-all flex items-center gap-1.5 cursor-pointer ${
                isHubOpen
                  ? 'border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-text-primary bg-white/5'
                  : 'border-[#7c5cfc]/50 text-[#7c5cfc] bg-[#7c5cfc]/15 hover:bg-[#7c5cfc]/25 font-bold shadow-[0_0_12px_rgba(124,92,252,0.3)]'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              {isHubOpen ? 'Hide Hub' : 'Show Hub'}
            </button>
          )}

          {setIsLeader && (
            <button
              type="button"
              onClick={() => setIsLeader(!isLeader)}
              title="Toggle Leader status to sync slides for all peers"
              className={`px-2.5 py-1 font-mono text-[7.5px] uppercase tracking-wider border rounded-[var(--fouzar-radius-sm)] transition-colors ${
                isLeader
                  ? 'border-fouzar-ice/50 text-fouzar-ice bg-fouzar-ice/10 font-bold'
                  : 'border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-text-primary'
              }`}
            >
              {isLeader ? 'Leader (Syncing)' : 'Follow'}
            </button>
          )}

          {setSyncMode && (
            <button
              type="button"
              onClick={() => setSyncMode(!syncMode)}
              title={syncMode ? 'Room lock active — synchronized with presenter' : 'Room lock off — independent browsing'}
              className="p-1.5 text-fouzar-text-secondary hover:text-fouzar-accent transition-colors"
            >
              {syncMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
          )}

          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-mono text-[8px] uppercase tracking-wider rounded-[var(--fouzar-radius-md)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              Leave Room
            </button>
          )}
        </div>
      </div>

      {/* ── 2. Presentation Area ────────────────────────────────────────── */}
      {isViewingPresentation ? (
        <div className={`shrink-0 flex flex-col p-4 border-b border-white/[0.05] bg-[#0b0b12] relative overflow-hidden transition-all duration-300 ease-in-out ${isPresentationMaximized ? 'flex-1' : 'h-[300px]'}`}>
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,92,252,0.08),transparent_70%)] pointer-events-none" />
          </div>
          
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-1.5 backdrop-blur-md">
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] uppercase tracking-wider rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
              <div className="w-[1px] h-3 bg-white/[0.1]" />
              <span className="font-serif text-sm font-bold text-white/90">
                {activeBroadcast?.presenterId === user?.id ? 'You are presenting' : `${activeBroadcast?.presenterName} is presenting`}
              </span>
              <span className="text-fouzar-accent font-mono text-[10px] underline">
                {activeBroadcast?.fileName || 'Document'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setIsPresentationMaximized(!isPresentationMaximized)} className="p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] text-white/50 hover:text-white/90 transition-all cursor-pointer">
                {isPresentationMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setIsViewingPresentation(false)} className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 font-mono text-[10px] uppercase font-bold transition-all cursor-pointer">
                Minimize
              </button>
            </div>
          </div>

          <div className="flex-1 bg-[#0b0b12] border border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl relative">
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               {/* When viewing someone else's presentation, DocumentViewer would sync here */}
               <Radio className="w-8 h-8 text-[#7c5cfc]/30 animate-pulse mb-3" />
               <p className="text-white/40 font-mono text-xs uppercase tracking-widest text-center px-4">
                 {activeBroadcast?.presenterId === user?.id ? (
                    <>You are leading the session.<br/>Open a document in the explorer below and click "Present" to broadcast it.</>
                 ) : (
                    <>You have joined {activeBroadcast?.presenterName}'s session.<br/>The synced document will appear here.</>
                 )}
               </p>
             </div>
          </div>
        </div>
      ) : activeBroadcast ? (
        <div className="shrink-0 p-3 bg-[#0b0b12] border-b border-white/[0.05]">
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#7c5cfc]/30 bg-gradient-to-r from-[#7c5cfc]/10 via-[#7c5cfc]/5 to-transparent backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-[#7c5cfc] animate-pulse" />
              <div>
                <span className="font-serif text-sm font-bold text-white/90 mr-2">{activeBroadcast.presenterName}</span>
                <span className="text-white/50 text-xs">started a live presentation</span>
                <span className="text-[#7c5cfc] font-mono text-[10px] ml-2 border border-[#7c5cfc]/20 px-2 py-0.5 rounded-md bg-[#7c5cfc]/10">{activeBroadcast.fileName}</span>
              </div>
            </div>
            <button onClick={() => {
                livePresentation.followPresenter();
                setIsViewingPresentation(true);
            }} className="px-4 py-1.5 bg-[#7c5cfc] text-white font-mono text-[10px] uppercase tracking-wider font-bold rounded-lg hover:opacity-90 shadow-[0_0_15px_rgba(124,92,252,0.4)] transition-all flex items-center gap-2 cursor-pointer">
              <Play className="w-3 h-3 fill-current" />
              Join Presentation
            </button>
          </div>
        </div>
      ) : null}

      {/* ── 3. Workspace Navigation Toolbar ──────────────────────────────── */}
      <div className="px-3 py-1.5 border-b border-t border-white/[0.05] bg-[#0b0b12]/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {[
            { id: 'explorer', icon: BookOpen, label: 'Explorer' },
            { id: 'youtube', icon: Play, label: 'YouTube' },
            { id: 'notes', icon: FileText, label: 'Notes' },
            { id: 'web', icon: Globe, label: 'Web AI Hub' },
            { id: 'lounge', icon: Video, label: 'Live Lounge' },
            { id: 'ai', icon: Bot, label: '' },
          ].map((v) => {
            const Icon = v.icon;
            const isRobot = v.id === 'ai';
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveSplitTabs((prev) => ({ ...prev, left: v.id }))}
                title={isRobot ? 'Robot AI Copilot' : v.label}
                className={`px-2.5 py-1 flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                  activeSplitTabs.left === v.id
                    ? 'bg-[#7c5cfc]/15 text-[#7c5cfc] font-bold border border-[#7c5cfc]/30 shadow-[0_0_8px_rgba(124,92,252,0.3)]'
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isRobot ? 'text-[#7c5cfc]' : ''}`} />
                {v.label ? <span>{v.label}</span> : null}
              </button>
            );
          })}
        </div>

        {/* Split view toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSplitTabs((prev) => ({ ...prev, right: prev.right ? null : 'youtube' }))}
            className={`px-2.5 py-1 flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-wider rounded-md transition-colors cursor-pointer ${
              activeSplitTabs.right
                ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30'
                : 'text-white/40 hover:text-white/80'
            }`}
          >
            <Columns className="w-3 h-3" />
            Split
          </button>
          {activeSplitTabs.right && (
            <div className="flex items-center gap-0.5 bg-white/[0.02] border border-white/[0.05] rounded-full px-1 py-0.5">
              {[
                { id: 'explorer', label: 'Files' },
                { id: 'notes', label: 'Notes' },
                { id: 'youtube', label: 'YouTube' },
                { id: 'web', label: 'Web' },
                { id: 'lounge', label: 'Lounge' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setActiveSplitTabs((prev) => ({ ...prev, right: opt.id }))}
                  className={`px-2 py-0.5 font-mono text-[7px] uppercase tracking-wider rounded-full transition-all cursor-pointer ${
                    activeSplitTabs.right === opt.id
                      ? 'bg-indigo-500/30 text-indigo-300 font-bold'
                      : 'text-white/30 hover:text-white/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Main Workspace Area ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 p-2 flex flex-col overflow-hidden">
        {activeSplitTabs.right ? (
          <ResizablePanel direction="horizontal" initialSize={500} minSize={300}>
            <div className="flex-1 min-h-0 w-full flex flex-col p-1 overflow-hidden">
              {renderTabContent(activeSplitTabs.left)}
            </div>
            <div className="flex-1 min-h-0 w-full flex flex-col p-1 overflow-hidden">
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
  );
};
