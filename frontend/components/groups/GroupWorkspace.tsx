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
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden m-1">
          <LiveLounge groupId={roomId} />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-fouzar-bg relative">
      {/* Presenter Toast Overlay */}
      <PresenterToast
        activeBroadcast={livePresentation.activeBroadcast}
        isFollowingPresenter={livePresentation.isFollowingPresenter}
        onFollow={livePresentation.followPresenter}
        onIgnore={livePresentation.ignorePresenter}
        onLeave={livePresentation.leavePresenterFeed}
      />

      {/* ── 1. Group Header Bar ────────────────────────────────────────── */}
      <div className="fouzar-chrome relative z-10 flex items-center justify-between px-5 py-2.5 border-b border-fouzar-border shrink-0 bg-fouzar-surface/80 backdrop-blur-xl">
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

      {/* ── 2. Session Hero Card ────────────────────────────────────────── */}
      <div className="p-3 shrink-0">
        <div className="p-3.5 rounded-[var(--fouzar-radius-lg)] border border-fouzar-accent/30 bg-gradient-to-r from-fouzar-accent/10 via-fouzar-elevated/40 to-fouzar-surface/40 backdrop-blur-xl relative overflow-hidden shadow-[var(--fouzar-shadow-md)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Session info */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-fouzar-accent font-bold flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse text-fouzar-accent" />
                  CURRENT SESSION
                </span>
              </div>

              {activeBroadcast ? (
                <div>
                  <h3 className="font-serif text-sm font-bold text-fouzar-text-primary flex items-center gap-2">
                    <span>{activeBroadcast.presenterName} is Presenting:</span>
                    <span className="text-fouzar-accent underline">{activeBroadcast.fileName}</span>
                  </h3>
                  <p className="text-[10px] text-fouzar-text-secondary font-mono">
                    Page {currentSlide} · 11 Members Synced
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="font-serif text-sm font-bold text-fouzar-text-primary">
                    No active presentation running
                  </h3>
                  <p className="text-[9.5px] text-fouzar-text-secondary font-mono">
                    Select a document in the Group Explorer below and click "Present ⊙" to lead the session.
                  </p>
                </div>
              )}

              {/* Study Goal Row */}
              <div className="flex items-center gap-2 pt-0.5">
                <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {isEditingGoal ? (
                  <input
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSessionGoal(goalInput);
                        setIsEditingGoal(false);
                      }
                    }}
                    onBlur={() => {
                      setSessionGoal(goalInput);
                      setIsEditingGoal(false);
                    }}
                    className="bg-fouzar-elevated/80 border border-fouzar-border px-2 py-0.5 text-[9.5px] font-mono rounded text-fouzar-text-primary focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <p
                    onClick={() => setIsEditingGoal(true)}
                    className="text-[9.5px] font-mono text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer truncate"
                    title="Click to edit session goal"
                  >
                    <span className="text-amber-400 font-bold uppercase text-[8px] mr-1">Goal:</span>
                    {sessionGoal}
                  </p>
                )}
              </div>
            </div>

            {/* CTA & Up Next */}
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {activeBroadcast ? (
                <button
                  type="button"
                  onClick={livePresentation.followPresenter}
                  className="px-3.5 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8.5px] uppercase tracking-wider font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-[var(--fouzar-glow-primary)] cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Join Session →
                </button>
              ) : (
                <span className="font-mono text-[7.5px] uppercase tracking-widest text-fouzar-text-tertiary border border-fouzar-border/40 px-2.5 py-1 rounded-[var(--fouzar-radius-md)]">
                  Ready for Presenter
                </span>
              )}

              {/* Up Next Strip */}
              <div className="font-mono text-[7.5px] text-fouzar-text-tertiary uppercase flex items-center gap-1">
                <span>Up Next:</span>
                <span className="text-fouzar-text-secondary font-semibold">Lab Manual 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Workspace Navigation Toolbar ──────────────────────────────── */}
      <div className="px-3 py-1.5 border-b border-t border-fouzar-border bg-fouzar-surface/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {[
            { id: 'explorer', icon: BookOpen, label: 'Explorer' },
            { id: 'youtube', icon: Play, label: 'YouTube' },
            { id: 'notes', icon: FileText, label: 'Notes' },
            { id: 'web', icon: Globe, label: 'Web AI Hub' },
            { id: 'lounge', icon: Video, label: 'Live Lounge' },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveSplitTabs((prev) => ({ ...prev, left: v.id }))}
                className={`px-2.5 py-1 flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] transition-colors cursor-pointer ${
                  activeSplitTabs.left === v.id
                    ? 'bg-fouzar-accent/20 text-fouzar-accent font-bold border border-fouzar-accent/30'
                    : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
                }`}
              >
                <Icon className="w-3 h-3" />
                {v.label}
              </button>
            );
          })}
        </div>

        {/* Split view toggle */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveSplitTabs((prev) => ({ ...prev, right: prev.right ? null : 'youtube' }))}
            className={`px-2.5 py-1 flex items-center gap-1 font-mono text-[7.5px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] transition-colors cursor-pointer ${
              activeSplitTabs.right
                ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30'
                : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
            }`}
          >
            <Columns className="w-3 h-3" />
            Split
          </button>
          {activeSplitTabs.right && (
            <div className="flex items-center gap-0.5 bg-fouzar-elevated/40 border border-fouzar-border/50 rounded-full px-1 py-0.5">
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
                      : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary'
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
            <div className="h-full w-full flex flex-col p-1 overflow-hidden">
              {renderTabContent(activeSplitTabs.left)}
            </div>
            <div className="h-full w-full flex flex-col p-1 overflow-hidden">
              {renderTabContent(activeSplitTabs.right)}
            </div>
          </ResizablePanel>
        ) : (
          renderTabContent(activeSplitTabs.left)
        )}
      </div>
    </div>
  );
};
