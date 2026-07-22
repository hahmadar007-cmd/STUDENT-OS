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
} from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';
import { useLivePresentation } from '../../hooks/useLivePresentation';
import { PresenterToast } from './PresenterToast';
import { GroupExplorer } from './GroupExplorer';
import { GroupActivityFeed, type ActivityEvent } from './GroupActivityFeed';
import { DocumentViewer } from '../documents/DocumentViewer';

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
  const { mode, user, closeDoc } = useFouzar();
  const isGreenhouse = mode === 'greenhouse';

  // Live presentation engine
  const livePresentation = useLivePresentation(user?.id);

  // Activity events state (in-memory for current session)
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([
    {
      id: 'evt-init',
      type: 'info',
      userInitials: 'SYS',
      userName: 'System',
      description: 'Room session initialized',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
      <div className="fouzar-chrome relative z-10 flex items-center justify-between px-5 py-3 border-b border-fouzar-border shrink-0 bg-fouzar-surface/80 backdrop-blur-xl">
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
      <div className="p-4 shrink-0">
        <div className="p-4 rounded-[var(--fouzar-radius-lg)] border border-fouzar-accent/30 bg-gradient-to-r from-fouzar-accent/10 via-fouzar-elevated/40 to-fouzar-surface/40 backdrop-blur-xl relative overflow-hidden shadow-[var(--fouzar-shadow-md)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Session info */}
            <div className="space-y-1.5 min-w-0">
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
                  <p className="text-[10px] text-fouzar-text-secondary font-mono">
                    Select a document in the Group Explorer below and click "Present ⊙" to lead the session.
                  </p>
                </div>
              )}

              {/* Study Goal Row */}
              <div className="flex items-center gap-2 pt-1">
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
                    className="bg-fouzar-elevated/80 border border-fouzar-border px-2 py-0.5 text-[10px] font-mono rounded text-fouzar-text-primary focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <p
                    onClick={() => setIsEditingGoal(true)}
                    className="text-[10px] font-mono text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer truncate"
                    title="Click to edit session goal"
                  >
                    <span className="text-amber-400 font-bold uppercase text-[8px] mr-1">Goal:</span>
                    {sessionGoal}
                  </p>
                )}
              </div>
            </div>

            {/* CTA & Up Next */}
            <div className="flex flex-col items-end gap-2 shrink-0">
              {activeBroadcast ? (
                <button
                  type="button"
                  onClick={livePresentation.followPresenter}
                  className="px-4 py-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase tracking-wider font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-[var(--fouzar-glow-primary)] cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Join Session →
                </button>
              ) : (
                <span className="font-mono text-[8px] uppercase tracking-widest text-fouzar-text-tertiary border border-fouzar-border/40 px-3 py-1.5 rounded-[var(--fouzar-radius-md)]">
                  Ready for Presenter
                </span>
              )}

              {/* Up Next Strip (Phase 2 slot) */}
              <div className="font-mono text-[8px] text-fouzar-text-tertiary uppercase flex items-center gap-1">
                <span>Up Next:</span>
                <span className="text-fouzar-text-secondary font-semibold">Lab Manual 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Main Workspace Area ─────────────────────────────────────── */}
      <div className="flex-1 min-h-0 px-4 pb-4 flex flex-col overflow-hidden">
        {activeDoc ? (
          /* Active Document Viewer Overlay inside Group Workspace */
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
          /* Main Group Explorer + Activity Feed Layout */
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
    </div>
  );
};
