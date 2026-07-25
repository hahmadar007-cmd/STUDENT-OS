'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Search,
  Calendar,
  Upload,
  FileText,
  Trash2,
  Zap,
  RefreshCw,
  Plus,
  User,
  Send,
  MessageSquare,
  Minus,
  Pin,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFouzar, FouzarFriendProfile, deriveInitials } from '../../../lib/FouzarContext';
import { filterRepositoryByFolder, safeLowerCase } from '../../../lib/filterUtils';
import { FolderSelector } from '../../ui/FolderSelector';
import { getDeadlines } from '../../../lib/api';
import { DocumentViewer } from '../../documents/DocumentViewer';
import { FileExplorer } from '../../documents/FileExplorer';
import type { LmsRepositoryItem } from '../../../lib/FouzarContext';
import { IntegratedAiChat } from '../../ai/IntegratedAiChat';
import { SharedGroupDrive } from '../../groups/SharedGroupDrive';

/** Remote peer directory for ID lookup until backend search ships. */
const NETWORK_DIRECTORY: FouzarFriendProfile[] = [
  {
    id: 'usr-5',
    name: 'Mira Chen',
    handle: 'mira_chen',
    fouzarId: 'FOUZAR-H3K9',
    avatarInitials: 'MC',
    presence: 'online',
    activeGroup: 'PHY-201',
  },
  {
    id: 'usr-6',
    name: 'Jordan Blake',
    handle: 'jordan_blake',
    fouzarId: 'FOUZAR-W8L1',
    avatarInitials: 'JB',
    presence: 'offline',
  },
];

interface DeadlineItem {
  id: string;
  course: string;
  title: string;
  timeLeftLabel: string;
}

interface ChatMessage {
  id: string;
  senderName: string;
  content: string;
  timestamp: string;
  slideContext: string | null;
}

interface SlideData {
  number: number;
  title: string;
  subtitle: string;
  content: string;
}

interface SocialColumnProps {
  roomId: string;
  className?: string;
  activeDoc?: LmsRepositoryItem | null;
  setActiveDoc?: (doc: LmsRepositoryItem | null) => void;
  chatMessages?: ChatMessage[];
  chatInput?: string;
  setChatInput?: (input: string) => void;
  handleSendChat?: (e: React.FormEvent) => void;
  chatEndRef?: React.RefObject<HTMLDivElement | null>;
  currentSlide?: number;
  slides?: SlideData[];
  /** Bubbles up to WorkspaceLayout to start a live presentation via useLivePresentation */
  onPresentFile?: (fileId: string, fileName: string) => void;
  onMinimize?: () => void;
}

/**
 * Column 2 — Instagram-inspired friend status rail + contextual LMS feed.
 * Implements Pillar 3 (identity/social graph) and Pillar 4 (personal LMS hub).
 */
export const SocialColumn: React.FC<SocialColumnProps> = ({
  roomId,
  className = '',
  activeDoc: propActiveDoc,
  setActiveDoc: propSetActiveDoc,
  chatMessages = [],
  chatInput = '',
  setChatInput,
  handleSendChat,
  chatEndRef,
  currentSlide,
  slides,
  onPresentFile,
  onMinimize,
}) => {
  const router = useRouter();
  const {
    mode,
    friends,
    addFriend,
    findFriendByIdentifier,
    createGroupNode,
    repository,
    addRepositoryItem,
    removeRepositoryItem,
    user,
    folders,
    activeFolderId,
  } = useFouzar();

  const [friendQuery, setFriendQuery] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loadingDeadlines, setLoadingDeadlines] = useState(false);
  const [lmsSource, setLmsSource] = useState<'live' | 'demo' | 'error'>('demo');
  const [activeTab, setActiveTab] = useState<'circles' | 'chat' | 'ai' | 'lms' | 'repository' | 'drive'>('circles');
  const [localActiveDoc, setLocalActiveDoc] = useState<LmsRepositoryItem | null>(null);
  const [dbFriends, setDbFriends] = useState<any[]>([]);

  const [pinnedMessages, setPinnedMessages] = useState<string[]>([
    '📌 Exam on Friday - review Routing chapter',
    '📌 Use Lecture 6 slides for today\'s discussion',
  ]);
  const [pinnedInput, setPinnedInput] = useState('');
  const [showAddPin, setShowAddPin] = useState(false);
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupCreatorId, setGroupCreatorId] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [contextMenuFriend, setContextMenuFriend] = useState<any | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const loadGroupMembers = async () => {
    if (!roomId || roomId.startsWith('personal-')) {
      setGroupMembers([]);
      setGroupCreatorId(null);
      return;
    }
    setLoadingMembers(true);
    try {
      const { getGroupMembers } = await import('../../../lib/api');
      const list = await getGroupMembers(roomId);
      setGroupMembers(list || []);
      if (list && list.length > 0 && list[0].group) {
        setGroupCreatorId(list[0].group.creatorId);
      }
    } catch (e) {
      console.warn('Failed to load group members:', e);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    loadGroupMembers();
  }, [roomId]);

  const handleFriendContextMenu = (e: React.MouseEvent, friend: any) => {
    e.preventDefault();
    if (!roomId || roomId.startsWith('personal-')) return;
    setContextMenuFriend(friend);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleOpenFriendMenu = (e: React.MouseEvent, friend: any) => {
    if (!roomId || roomId.startsWith('personal-')) return;
    e.preventDefault();
    setContextMenuFriend(friend);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleAddFriendToCircleDirect = async (friendId: string) => {
    setAddError(null);
    setAddSuccess(null);
    if (!roomId || roomId.startsWith('personal-')) {
      setAddError('You must be inside a shared study circle to invite.');
      return;
    }
    try {
      const { inviteMemberToGroup } = await import('../../../lib/api');
      await inviteMemberToGroup(roomId, friendId);
      const isAdmin = user && user.id === groupCreatorId;
      if (isAdmin) {
        setAddSuccess('Successfully added friend to this circle!');
      } else {
        setAddSuccess('Invite sent! Pending admin approval.');
      }
      loadGroupMembers();
    } catch (err: any) {
      setAddError(err.message || 'Failed to add friend to circle.');
    }
  };

  const handleAcceptMember = async (targetUserId: string) => {
    try {
      const { acceptGroupMember } = await import('../../../lib/api');
      await acceptGroupMember(roomId, targetUserId);
      loadGroupMembers();
    } catch (e: any) {
      console.error('Failed to accept member:', e);
    }
  };

  const handleRejectMember = async (targetUserId: string) => {
    try {
      const { rejectGroupMember } = await import('../../../lib/api');
      await rejectGroupMember(roomId, targetUserId);
      loadGroupMembers();
    } catch (e: any) {
      console.error('Failed to reject member:', e);
    }
  };

  const activeDoc = propActiveDoc !== undefined ? propActiveDoc : localActiveDoc;
  const setActiveDoc = propSetActiveDoc !== undefined ? propSetActiveDoc : setLocalActiveDoc;

  const isGreenhouse = mode === 'greenhouse';

  const activeFolder = folders?.find((f) => f.id === activeFolderId);
  const filteredRepository = filterRepositoryByFolder(repository, activeFolderId, activeFolder);

  const loadFriendsList = async () => {
    try {
      const { getFriends } = await import('../../../lib/api');
      const list = await getFriends();
      setDbFriends(list || []);
    } catch (e) {
      console.warn('Failed to load friends from database:', e);
    }
  };

  useEffect(() => {
    loadFriendsList();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoadingDeadlines(true);
      try {
        const data = await getDeadlines();
        setDeadlines(data.deadlines ?? []);
        setLmsSource(data.source);
      } catch {
        setDeadlines([]);
      } finally {
        setLoadingDeadlines(false);
      }
    };
    load();
  }, []);

  const presenceRing = (presence: string) => {
    if (presence === 'flow') return 'border-fouzar-signal shadow-[var(--fouzar-glow-signal)] animate-pulse';
    if (presence === 'online') return isGreenhouse ? 'border-fouzar-accent' : 'border-fouzar-ice';
    return 'border-fouzar-border';
  };

  const handleAddFriend = async () => {
    setAddError(null);
    setAddSuccess(null);
    const query = friendQuery.trim();
    if (!query) return;

    try {
      const { sendFriendRequest } = await import('../../../lib/api');
      const res = await sendFriendRequest(query);
      if (res.success) {
        setAddSuccess(res.message || 'Friend request sent!');
        setFriendQuery('');
        loadFriendsList();
      }
    } catch (err: any) {
      setAddError(err.message || 'Failed to send friend request.');
    }
  };

  const handleInviteDirectToCircle = async () => {
    setAddError(null);
    setAddSuccess(null);
    const query = friendQuery.trim();
    if (!query) return;

    if (!roomId || roomId.startsWith('personal-')) {
      setAddError('You must be inside a shared study circle to invite.');
      return;
    }

    try {
      const { inviteMemberToGroup } = await import('../../../lib/api');
      await inviteMemberToGroup(roomId, query);
      setAddSuccess('Successfully added user to this circle!');
      setFriendQuery('');
      loadFriendsList();
    } catch (err: any) {
      setAddError(err.message || 'Failed to invite user to circle.');
    }
  };

  const handleInviteSelectedToCircle = async () => {
    setAddError(null);
    setAddSuccess(null);
    if (selectedFriendIds.length === 0) {
      setAddError('Please select at least one friend from the list above.');
      return;
    }

    if (!roomId || roomId.startsWith('personal-')) {
      setAddError('You must be inside a shared study circle to invite.');
      return;
    }

    try {
      const { inviteMemberToGroup } = await import('../../../lib/api');
      let successCount = 0;
      for (const friendId of selectedFriendIds) {
        const friend = dbFriends.find((f) => f.id === friendId);
        if (friend && friend.fouzarId) {
          await inviteMemberToGroup(roomId, friend.fouzarId);
          successCount++;
        }
      }
      setAddSuccess(`Successfully invited ${successCount} friend(s) to this circle!`);
      setSelectedFriendIds([]);
    } catch (err: any) {
      setAddError(err.message || 'Failed to invite selected friends to circle.');
    }
  };

  const toggleFriendSelect = (id: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSpinGroupNode = () => {
    const ids = selectedFriendIds.length > 0 ? selectedFriendIds : dbFriends.slice(0, 2).map((f) => f.id);
    const roomName = `Sync Node · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const newRoomId = createGroupNode(ids, roomName);
    router.push(`/room/${newRoomId}`);
  };

  return (
    <div
      className={`fouzar-chrome flex flex-col h-full overflow-hidden border-l border-fouzar-border ${
        isGreenhouse ? 'fouzar-glass' : 'bg-fouzar-surface'
      } ${className}`}
    >
      {/* User identity strip */}
      <div className="px-4 py-3 border-b border-fouzar-border shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-fouzar-elevated border border-fouzar-border flex items-center justify-center font-mono text-[10px] font-bold">
            {user?.avatarInitials ?? 'FZ'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold truncate">{user?.name ?? 'Guest Scholar'}</p>
            <p className="font-mono text-[8px] text-fouzar-text-secondary uppercase tracking-wider">
              {user?.fouzarId ?? 'FOUZAR-XXXX'}
            </p>
          </div>
        </div>
        {onMinimize && (
          <button onClick={onMinimize} className="text-fouzar-text-tertiary hover:text-fouzar-text-primary cursor-pointer p-1" title="Minimize Panel">
            <Minus className="w-4 h-4" />
          </button>
        )}
      </div>

      {roomId && !roomId.startsWith('personal-') ? (
        <div className="px-4 py-3 border-b border-fouzar-border shrink-0 flex items-center justify-between bg-fouzar-surface/40">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-[#7c5cfc] animate-pulse shrink-0" />
            <span className="font-serif text-xs font-bold text-fouzar-text-primary truncate uppercase tracking-wider">
              Group Circle Workspace
            </span>
          </div>
          <span className="px-2 py-0.5 text-[7.5px] font-mono text-fouzar-accent border border-fouzar-accent/30 bg-fouzar-accent/10 rounded-full uppercase tracking-wider">
            Group Hub
          </span>
        </div>
      ) : (
        <div className="px-4 py-3 border-b border-fouzar-border shrink-0 flex items-center justify-between">
          <FolderSelector />
        </div>
      )}

      {/* Section tabs */}
      <div className="flex border-b border-fouzar-border shrink-0 overflow-x-auto scrollbar-none">
        {[
          { id: 'circles' as const, label: roomId && !roomId.startsWith('personal-') ? 'Members' : 'Circles' },
          { id: 'chat' as const, label: 'Chat' },
          { id: 'lms' as const, label: 'LMS Feed' },
          ...(roomId && !roomId.startsWith('personal-')
            ? [{ id: 'drive' as const, label: 'Drive' }]
            : [{ id: 'repository' as const, label: 'Archive' }]),
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex-1 py-2.5 font-mono text-[8px] uppercase tracking-widest transition-colors ${
              activeTab === tab.id
                ? 'text-fouzar-accent border-b-2 border-fouzar-accent'
                : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        <AnimatePresence mode="wait">
          {activeTab === 'circles' && (
            <motion.div
              key="circles"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="p-4 space-y-4"
            >
              {/* Header: Roster title + Invite trigger */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-fouzar-text-primary block">
                    Circle Members
                  </span>
                  <span className="px-1.5 py-0.5 text-[8px] font-mono text-fouzar-accent border border-fouzar-accent/20 bg-fouzar-accent/10 rounded-full font-bold">
                    {groupMembers.filter(m => m.status === 'ACCEPTED').length || 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddDrawer(!showAddDrawer)}
                  className={`px-2.5 py-1 text-[8px] font-mono uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] border transition-all flex items-center gap-1.5 cursor-pointer ${
                    showAddDrawer
                      ? 'border-fouzar-accent text-fouzar-accent bg-fouzar-accent/10 font-bold shadow-[0_0_10px_rgba(124,92,252,0.2)]'
                      : 'border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-white/20'
                  }`}
                >
                  <UserPlus className="w-3 h-3" />
                  {showAddDrawer ? 'Close Invite' : '+ Add Member'}
                </button>
              </div>

              {/* Collapsible Add Member Drawer */}
              <AnimatePresence>
                {showAddDrawer && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden border-b border-fouzar-border/60 pb-4 mb-3 bg-fouzar-surface/30 p-3 rounded-[var(--fouzar-radius-md)] border border-fouzar-border/40"
                  >
                    {/* Pending Requests if creator */}
                    {user?.id === groupCreatorId && groupMembers.some(m => m.status === 'PENDING') && (
                      <div className="space-y-2">
                        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-[#ff2d55] block font-bold">
                          Pending Join Requests
                        </span>
                        <div className="space-y-2 max-h-36 overflow-y-auto scrollbar-none">
                          {groupMembers.filter(m => m.status === 'PENDING').map((mem) => {
                            const initials = deriveInitials(mem.user.name);
                            return (
                              <div key={mem.userId} className="flex items-center justify-between p-2 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)]">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-7 h-7 rounded-full bg-fouzar-elevated border border-fouzar-border flex items-center justify-center font-mono text-[9px] font-bold overflow-hidden shrink-0">
                                    {mem.user.avatarUrl ? (
                                      <img src={mem.user.avatarUrl} alt={mem.user.name} className="w-full h-full object-cover" />
                                    ) : (
                                      initials
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-semibold truncate leading-tight">{mem.user.name}</p>
                                    <p className="font-mono text-[7px] text-fouzar-text-secondary truncate uppercase">{mem.user.fouzarId}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptMember(mem.userId)}
                                    className="px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 text-[8px] font-mono uppercase rounded transition-colors cursor-pointer"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectMember(mem.userId)}
                                    className="px-2 py-1 bg-[#ff2d55]/15 border border-[#ff2d55]/30 text-[#ff2d55] hover:bg-[#ff2d55]/30 text-[8px] font-mono uppercase rounded transition-colors cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Friends list */}
                    <div className="space-y-2">
                      <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-fouzar-text-secondary block">
                        Invite Friends
                      </span>
                      <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-none bg-fouzar-elevated/10 border border-fouzar-border/60 p-2 rounded-[var(--fouzar-radius-md)]">
                        {dbFriends.length === 0 ? (
                          <p className="font-mono text-[7px] text-fouzar-text-tertiary uppercase py-2 text-center">
                            No friends available to invite
                          </p>
                        ) : (
                          dbFriends.map((friend) => {
                            const selected = selectedFriendIds.includes(friend.id);
                            const presence = friend.isFocusing ? 'flow' : 'online';
                            const initials = deriveInitials(friend.name);
                            return (
                              <div
                                key={friend.id}
                                className={`flex items-center justify-between p-2 bg-fouzar-elevated/10 border rounded-[var(--fouzar-radius-md)] ${
                                  selected ? 'border-fouzar-accent bg-fouzar-accent/5' : 'border-fouzar-border/60'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div className={`p-[1.5px] rounded-full border transition-all ${presenceRing(presence)}`}>
                                    <div className="w-6 h-6 rounded-full bg-fouzar-elevated flex items-center justify-center font-mono text-[8px] font-bold overflow-hidden shrink-0">
                                      {friend.avatarUrl ? (
                                        <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover" />
                                      ) : (
                                        initials
                                      )}
                                    </div>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[9.5px] font-semibold truncate leading-tight">{friend.name}</p>
                                    <p className="font-mono text-[7px] text-fouzar-text-secondary truncate uppercase">{friend.fouzarId}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await handleAddFriendToCircleDirect(friend.id);
                                  }}
                                  className="px-2 py-0.5 bg-fouzar-accent/15 border border-fouzar-accent/30 text-fouzar-accent hover:bg-fouzar-accent/25 text-[8px] font-mono uppercase rounded transition-colors cursor-pointer"
                                >
                                  Add
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* ID Search */}
                    <div className="space-y-1.5">
                      <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-fouzar-text-secondary block">
                        Add by Connection ID
                      </span>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-fouzar-text-tertiary" />
                          <input
                            value={friendQuery}
                            onChange={(e) => setFriendQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (roomId && !roomId.startsWith('personal-')) {
                                  handleInviteDirectToCircle();
                                } else {
                                  handleAddFriend();
                                }
                              }
                            }}
                            placeholder="Enter 6-digit ID"
                            className="w-full pl-7 pr-2 py-1.5 bg-fouzar-elevated/50 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-[9px] font-mono focus:outline-none focus:shadow-[var(--fouzar-focus-ring)]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleInviteDirectToCircle}
                          title="Invite to Circle"
                          className="px-2.5 py-1.5 bg-fouzar-accent/15 border border-fouzar-accent/40 text-fouzar-accent rounded-[var(--fouzar-radius-md)] hover:bg-fouzar-accent/30 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Roster List (Only Active Accepted Members) */}
              <div className="space-y-2">
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-none bg-fouzar-elevated/10 border border-fouzar-border/60 p-3 rounded-[var(--fouzar-radius-md)]">
                  {(!roomId || roomId.startsWith('personal-')) ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-[1.5px] rounded-full border border-fouzar-ice">
                          <div className="w-7 h-7 rounded-full bg-fouzar-elevated flex items-center justify-center font-mono text-[9px] font-bold overflow-hidden shrink-0">
                            {user?.avatarInitials ?? 'FZ'}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold truncate leading-tight flex items-center gap-1">
                            {user?.name ?? 'Guest Scholar'}
                            <span className="text-[7.5px] text-fouzar-text-tertiary font-mono lowercase">(you)</span>
                          </p>
                          <p className="font-mono text-[7px] text-fouzar-text-secondary truncate uppercase">{user?.fouzarId ?? 'FOUZAR-XXXX'}</p>
                        </div>
                      </div>
                      <span className="px-1.5 py-0.5 bg-fouzar-accent/15 border border-fouzar-accent/30 text-fouzar-accent font-mono text-[7px] uppercase tracking-wider rounded shrink-0">
                        Solo Owner
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groupMembers.filter(m => m.status === 'ACCEPTED').map((mem) => {
                        const presence = mem.user.isFocusing ? 'flow' : 'online';
                        const initials = deriveInitials(mem.user.name);
                        const isCreator = mem.userId === groupCreatorId;
                        const isSelf = user && user.id === mem.userId;
                        return (
                          <div key={mem.userId} className="flex items-center justify-between p-2.5 bg-fouzar-elevated/10 border border-fouzar-border/60 rounded-[var(--fouzar-radius-md)] hover:bg-fouzar-elevated/20 transition-colors">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`p-[1.5px] rounded-full border transition-all ${presenceRing(presence)}`}>
                                <div className="w-7 h-7 rounded-full bg-fouzar-elevated flex items-center justify-center font-mono text-[9px] font-bold overflow-hidden shrink-0">
                                  {mem.user.avatarUrl ? (
                                    <img src={mem.user.avatarUrl} alt={mem.user.name} className="w-full h-full object-cover" />
                                  ) : (
                                    initials
                                  )}
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-semibold truncate leading-tight flex items-center gap-1">
                                  {mem.user.name}
                                  {isSelf && <span className="text-[7.5px] text-fouzar-text-tertiary font-mono lowercase">(you)</span>}
                                </p>
                                <p className="font-mono text-[7px] text-fouzar-text-secondary truncate uppercase">{mem.user.fouzarId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isCreator && (
                                <span className="px-1.5 py-0.5 bg-fouzar-accent/15 border border-fouzar-accent/30 text-fouzar-accent font-mono text-[7px] uppercase tracking-wider rounded">
                                  Admin
                                </span>
                              )}
                              {user?.id === groupCreatorId && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(mem.userId)}
                                  title="Remove member"
                                  className="p-1 text-fouzar-text-tertiary hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {addError && (
                <p className="text-[8px] font-mono text-fouzar-signal uppercase">{addError}</p>
              )}
              {addSuccess && (
                <p className="text-[8px] font-mono text-fouzar-accent uppercase">{addSuccess}</p>
              )}

              {/* Instant group node */}
              {roomId && !roomId.startsWith('personal-') ? (
                <button
                  type="button"
                  onClick={handleInviteSelectedToCircle}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase tracking-widest font-bold rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-glow-primary)] hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Invite Selected to Circle
                  {selectedFriendIds.length > 0 && (
                    <span className="opacity-70">({selectedFriendIds.length})</span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSpinGroupNode}
                  className="w-full py-3 flex items-center justify-center gap-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase tracking-widest font-bold rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-glow-primary)] hover:opacity-90"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Spin Group Node
                  {selectedFriendIds.length > 0 && (
                    <span className="opacity-70">({selectedFriendIds.length})</span>
                  )}
                </button>
              )}
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="p-4 flex-1 flex flex-col overflow-hidden h-full min-h-[320px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#7c5cfc]" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-fouzar-text-primary">
                    Circle Peer Chat
                  </span>
                </div>
                <span className="flex items-center gap-1 text-[7.5px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Sync
                </span>
              </div>

              {/* Pinned Notes */}
              {roomId && !roomId.startsWith('personal-') && pinnedMessages.length > 0 && (
                <div className="mb-3 shrink-0 p-2.5 bg-fouzar-surface/60 border border-[#7c5cfc]/20 rounded-[var(--fouzar-radius-md)] space-y-1 backdrop-blur-md">
                  <div className="flex items-center justify-between font-mono text-[7.5px] uppercase tracking-wider text-[#7c5cfc] font-bold">
                    <span className="flex items-center gap-1">
                      <Pin className="w-2.5 h-2.5" /> Pinned Notes
                    </span>
                    <span className="opacity-70">({pinnedMessages.length})</span>
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto scrollbar-none">
                    {pinnedMessages.map((pin, i) => (
                      <p key={i} className="text-[9px] font-mono text-fouzar-text-secondary leading-snug truncate">
                        {pin}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-none mb-3">
                {chatMessages.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-fouzar-border/40 rounded-[var(--fouzar-radius-md)] p-4">
                    <MessageSquare className="w-6 h-6 text-fouzar-text-tertiary/40 mb-2" />
                    <p className="font-mono text-[8px] text-fouzar-text-secondary uppercase">
                      No messages in this circle yet
                    </p>
                    <p className="text-[7.5px] font-mono text-fouzar-text-tertiary mt-1">
                      Type below to message all members in real-time
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const initials = deriveInitials(msg.senderName);
                    const isSelf = user && safeLowerCase(user.name) === safeLowerCase(msg.senderName);
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="w-6 h-6 rounded-full bg-fouzar-elevated border border-fouzar-border flex items-center justify-center font-mono text-[8px] font-bold shrink-0 mt-0.5">
                          {initials}
                        </div>
                        <div className={`flex flex-col max-w-[82%] ${isSelf ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span 
                              onClick={(e) => {
                                const friend = dbFriends.find(f => safeLowerCase(f.name) === safeLowerCase(msg.senderName) || safeLowerCase(f.name.split(' ')[0]) === safeLowerCase(msg.senderName));
                                if (friend) handleOpenFriendMenu(e, friend);
                              }}
                              className="font-mono text-[7px] text-fouzar-text-secondary uppercase hover:text-[#7c5cfc] cursor-pointer transition-colors font-bold"
                            >
                              {msg.senderName}
                            </span>
                            {msg.slideContext && (
                              <span className="px-1 py-0.2 text-[6.5px] font-mono text-[#7c5cfc] bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 rounded uppercase">
                                {msg.slideContext}
                              </span>
                            )}
                          </div>
                          <div className={`p-2.5 rounded-[var(--fouzar-radius-md)] text-[10px] leading-snug border ${
                            isSelf
                              ? 'bg-[#7c5cfc]/15 border-[#7c5cfc]/30 text-white rounded-tr-none'
                              : 'bg-fouzar-elevated/40 border-fouzar-border/60 text-fouzar-text-primary rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="flex gap-2 shrink-0 border-t border-fouzar-border/40 pt-3">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput?.(e.target.value)}
                  placeholder="Type message to circle members..."
                  className="flex-1 bg-fouzar-elevated/50 border border-fouzar-border px-3 py-2 text-[10px] rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-[#7c5cfc]"
                />
                <button 
                  type="submit" 
                  disabled={!chatInput?.trim()}
                  className="p-2 bg-[#7c5cfc] hover:bg-[#6b4ce6] disabled:opacity-40 text-white rounded-[var(--fouzar-radius-md)] transition-all cursor-pointer shadow-[0_0_10px_rgba(124,92,252,0.3)]"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          )}

          {activeTab === 'lms' && (
            <motion.div
              key="lms"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="p-4 space-y-4"
            >
              {/* LMS Slides & Course Materials */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-fouzar-text-primary block">
                    Course Slides & Decks
                  </span>
                  <span className="px-1.5 py-0.5 text-[8px] font-mono text-[#7c5cfc] border border-[#7c5cfc]/20 bg-[#7c5cfc]/10 rounded-full font-bold">
                    {repository.length || 2} Decks
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto scrollbar-none">
                  {repository.length === 0 ? (
                    <>
                      <div className="p-3 bg-fouzar-elevated/20 border border-fouzar-border/60 rounded-[var(--fouzar-radius-md)] flex items-center justify-between hover:border-[#7c5cfc]/40 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-fouzar-text-primary truncate">Lecture 5: Routing Algorithms.pdf</p>
                            <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">CS-301 · 12 Slides · Shared Deck</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onPresentFile?.('lms-1', 'Lecture 5: Routing Algorithms.pdf')}
                          className="px-2 py-1 text-[7.5px] font-mono uppercase bg-[#7c5cfc]/15 text-[#7c5cfc] border border-[#7c5cfc]/30 rounded hover:bg-[#7c5cfc]/25 cursor-pointer shrink-0"
                        >
                          Present
                        </button>
                      </div>
                      <div className="p-3 bg-fouzar-elevated/20 border border-fouzar-border/60 rounded-[var(--fouzar-radius-md)] flex items-center justify-between hover:border-[#7c5cfc]/40 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-fouzar-text-primary truncate">Lab Manual 4: IPv6 Subnetting.pdf</p>
                            <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">CS-301 · Lab Manual</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onPresentFile?.('lms-2', 'Lab Manual 4: IPv6 Subnetting.pdf')}
                          className="px-2 py-1 text-[7.5px] font-mono uppercase bg-[#7c5cfc]/15 text-[#7c5cfc] border border-[#7c5cfc]/30 rounded hover:bg-[#7c5cfc]/25 cursor-pointer shrink-0"
                        >
                          Present
                        </button>
                      </div>
                    </>
                  ) : (
                    repository.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-fouzar-elevated/20 border border-fouzar-border/60 rounded-[var(--fouzar-radius-md)] flex items-center justify-between hover:border-[#7c5cfc]/40 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 text-[#7c5cfc] shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-fouzar-text-primary truncate">{item.fileName}</p>
                            <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">
                              {item.course || 'LMS Slide Deck'} · {item.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => (propSetActiveDoc ? propSetActiveDoc(item) : setLocalActiveDoc(item))}
                            className="px-2 py-1 text-[7.5px] font-mono uppercase bg-white/5 text-white/80 border border-white/10 rounded hover:bg-white/10 cursor-pointer"
                          >
                            Open
                          </button>
                          <button
                            type="button"
                            onClick={() => onPresentFile?.(item.id, item.fileName)}
                            className="px-2 py-1 text-[7.5px] font-mono uppercase bg-[#7c5cfc]/15 text-[#7c5cfc] border border-[#7c5cfc]/30 rounded hover:bg-[#7c5cfc]/25 cursor-pointer"
                          >
                            Present
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* LMS Deadlines Section */}
              <div className="space-y-2 border-t border-fouzar-border/40 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] font-bold text-fouzar-text-primary block">
                    Upcoming Assignment Deadlines
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      setLoadingDeadlines(true);
                      try {
                        const lmsData = await getDeadlines();
                        setDeadlines(lmsData.deadlines ?? []);
                      } finally {
                        setLoadingDeadlines(false);
                      }
                    }}
                    className="text-fouzar-text-secondary hover:text-fouzar-accent cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDeadlines ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-none">
                  {deadlines.length === 0 ? (
                    <div className="p-3 bg-fouzar-elevated/20 border border-fouzar-border/60 rounded-[var(--fouzar-radius-md)] flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[7.5px] text-[#f5a623] uppercase font-bold tracking-wider block">
                          Computer Networks (CS-301)
                        </span>
                        <p className="text-[10px] font-medium text-fouzar-text-primary mt-0.5">Lab Quiz 3: Distance Vector Routing</p>
                      </div>
                      <span className="px-2 py-0.5 text-[7.5px] font-mono text-[#ff2d55] border border-[#ff2d55]/30 bg-[#ff2d55]/10 rounded-full font-bold uppercase shrink-0">
                        Due Tomorrow
                      </span>
                    </div>
                  ) : (
                    deadlines.map((dl) => (
                      <div
                        key={dl.id}
                        className="p-3 bg-fouzar-elevated/20 border border-fouzar-border/60 rounded-[var(--fouzar-radius-md)] flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono text-[7.5px] text-[#f5a623] uppercase font-bold tracking-wider block">
                            {dl.course}
                          </span>
                          <p className="text-[10px] font-medium text-fouzar-text-primary mt-0.5">{dl.title}</p>
                        </div>
                        <span className="px-2 py-0.5 text-[7.5px] font-mono text-[#ff2d55] border border-[#ff2d55]/30 bg-[#ff2d55]/10 rounded-full uppercase shrink-0">
                          {dl.timeLeftLabel}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'repository' && (
            <motion.div
              key="repository"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="p-4 flex-1 overflow-hidden"
            >
              <FileExplorer
                isCompact
                rootFolderId={activeFolderId === 'all' ? null : activeFolderId}
                onOpenFile={(doc) => setActiveDoc(doc)}
              />
            </motion.div>
          )}

          {/* Feature A — Shared Group Drive */}
          {activeTab === 'drive' && roomId && !roomId.startsWith('personal-') && (
            <motion.div
              key="drive"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="p-4 flex-1 overflow-hidden flex flex-col"
            >
              <SharedGroupDrive
                groupId={roomId}
                onPresentFile={onPresentFile}
                currentUserId={user?.id}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Only render DocumentViewer locally if we are managing it locally */}
      {!propSetActiveDoc && (
        <DocumentViewer document={activeDoc} onClose={() => setActiveDoc(null)} />
      )}

      {/* Direct Invite Context Menu */}
      <AnimatePresence>
        {contextMenuFriend && (
          <div
            className="fixed inset-0 z-50 cursor-default"
            onClick={() => setContextMenuFriend(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenuFriend(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
              className="fixed z-50 bg-fouzar-card/95 border border-[#7c5cfc]/60 shadow-2xl p-1.5 rounded-[4px] w-36 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={async () => {
                  const friendId = contextMenuFriend.id;
                  setContextMenuFriend(null);
                  await handleAddFriendToCircleDirect(friendId);
                }}
                className="w-full px-2 py-1.5 text-[8.5px] font-mono uppercase tracking-wider text-fouzar-text-primary hover:bg-[#7c5cfc]/15 rounded flex items-center gap-1.5 cursor-pointer text-left transition-colors"
              >
                Add to Circle
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
