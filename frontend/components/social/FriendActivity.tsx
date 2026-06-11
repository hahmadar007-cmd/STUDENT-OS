'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Radio, Clock, Users, UserCheck, UserX, Loader2 } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { getFriends, getFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../../lib/api';

interface ActiveFriend {
  id: string;
  name: string;
  email: string;
  fouzarId?: string;
  avatarUrl?: string;
  isFocusing: boolean;
  focusStartedAt: string | null;
}

interface FriendRequest {
  id: string;
  createdAt: string;
  // incoming: sender info
  sender?: { id: string; name: string; email: string; fouzarId?: string; avatarUrl?: string };
  // outgoing: receiver info
  receiver?: { id: string; name: string; email: string; fouzarId?: string; avatarUrl?: string };
}

export const FriendActivity: React.FC = () => {
  const [connections, setConnections] = useState<ActiveFriend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
      ]);
      setConnections(friendsData || []);
      setIncomingRequests(requestsData?.incoming || []);
      setOutgoingRequests(requestsData?.outgoing || []);
    } catch (e) {
      console.warn('FriendActivity: failed to load social data', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.on('friendFocusStateChanged', (data: {
      userId: string;
      isFocusing: boolean;
      focusStartedAt: string | null;
    }) => {
      setConnections((prev) =>
        prev.map((f) =>
          f.id === data.userId
            ? { ...f, isFocusing: data.isFocusing, focusStartedAt: data.focusStartedAt }
            : f
        )
      );
    });

    return () => {
      socket.off('friendFocusStateChanged');
    };
  }, [loadData]);

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await acceptFriendRequest(requestId);
      await loadData();
    } catch (e) {
      console.warn('Failed to accept request', e);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await rejectFriendRequest(requestId);
      await loadData();
    } catch (e) {
      console.warn('Failed to reject/cancel request', e);
    } finally {
      setActionLoading(null);
    }
  };

  const getFocusTime = (isoString: string | null) => {
    if (!isoString) return '';
    const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
    return `${mins}m in flow`;
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const sortedConnections = [...connections].sort((a, b) => {
    if (a.isFocusing && !b.isFocusing) return -1;
    if (!a.isFocusing && b.isFocusing) return 1;
    return a.name.localeCompare(b.name);
  });

  const hasPendingRequests = incomingRequests.length > 0 || outgoingRequests.length > 0;

  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── Section A: Active Connections ── */}
      <div className="flex flex-col bg-white/[0.03] backdrop-blur-xl border border-fouzar-border/60 p-4 rounded-[10px] flex-1 min-h-0">
        <div className="flex items-center justify-between pb-3 border-b border-fouzar-border/50 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5 text-fouzar-accent" strokeWidth={1.5} />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fouzar-text-primary">
              Active Connections
            </span>
          </div>
          <span className="text-[8px] font-mono bg-fouzar-accent/10 border border-fouzar-accent/20 px-2 py-0.5 rounded-full text-fouzar-accent">
            {connections.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-none">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 text-fouzar-text-tertiary animate-spin" />
            </div>
          ) : sortedConnections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Users className="w-5 h-5 text-fouzar-text-tertiary opacity-40" />
              <span className="font-mono text-[7.5px] uppercase tracking-wider text-fouzar-text-tertiary">
                No connections yet
              </span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {sortedConnections.map((friend) => (
                <motion.div
                  key={friend.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between p-2 rounded-[7px] border border-transparent hover:border-fouzar-border/40 hover:bg-white/[0.03] transition-all duration-150 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-white/5 border border-fouzar-border overflow-hidden flex items-center justify-center font-mono text-[10px] font-bold text-fouzar-text-secondary">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt={friend.name} className="w-full h-full object-cover" />
                        ) : (
                          getInitials(friend.name)
                        )}
                      </div>
                      {/* Focus flame indicator */}
                      {friend.isFocusing ? (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 border border-fouzar-surface rounded-full flex items-center justify-center shadow">
                          <Flame className="w-1.5 h-1.5 text-white fill-white" />
                        </span>
                      ) : (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-fouzar-accent border-2 border-fouzar-surface rounded-full animate-pulse" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-light text-fouzar-text-primary group-hover:text-fouzar-accent transition-colors truncate">
                        {friend.name}
                      </span>
                      <span className="text-[8px] font-mono text-fouzar-text-secondary/60 truncate">
                        {friend.fouzarId ? `ID: ${friend.fouzarId}` : friend.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    {friend.isFocusing ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[7.5px] font-mono uppercase tracking-wider">
                        <Flame className="w-2 h-2 fill-red-400" />
                        <span>In Flow</span>
                      </div>
                    ) : (
                      <span className="text-[7.5px] font-mono text-fouzar-accent bg-fouzar-accent/5 border border-fouzar-accent/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Online
                      </span>
                    )}
                    {friend.isFocusing && friend.focusStartedAt && (
                      <div className="text-[7px] text-fouzar-text-secondary flex items-center gap-1 font-mono">
                        <Clock className="w-2 h-2" />
                        {getFocusTime(friend.focusStartedAt)}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Section B: Sent & Incoming Requests ── */}
      {hasPendingRequests && (
        <div className="flex flex-col bg-white/[0.03] backdrop-blur-xl border border-fouzar-border/60 p-4 rounded-[10px] shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-fouzar-border/50 mb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-fouzar-accent animate-pulse" strokeWidth={1.5} />
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fouzar-text-primary">
                Sent &amp; Incoming Requests
              </span>
            </div>
            <span className="text-[8px] font-mono bg-white/5 border border-fouzar-border/30 px-2 py-0.5 rounded-full text-fouzar-text-secondary">
              {incomingRequests.length + outgoingRequests.length}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto scrollbar-none">
            <AnimatePresence initial={false}>
              {/* Incoming requests */}
              {incomingRequests.map((req) => (
                <motion.div
                  key={`in-${req.id}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="flex items-center justify-between p-2.5 bg-fouzar-accent/5 border border-fouzar-accent/20 rounded-[7px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-fouzar-accent/10 border border-fouzar-accent/25 flex items-center justify-center font-mono text-[9px] font-bold text-fouzar-accent shrink-0 overflow-hidden">
                      {req.sender?.avatarUrl ? (
                        <img src={req.sender.avatarUrl} alt={req.sender.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(req.sender?.name || '??')
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-fouzar-text-primary truncate">
                        {req.sender?.name}
                      </p>
                      <p className="font-mono text-[7px] text-fouzar-text-tertiary truncate">
                        ID: {req.sender?.fouzarId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* INCOMING badge */}
                    <span className="font-mono text-[6.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-fouzar-accent/15 text-fouzar-accent border border-fouzar-accent/25 font-bold">
                      INCOMING
                    </span>
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleAccept(req.id)}
                      className="p-1 border border-fouzar-accent bg-fouzar-accent/10 text-fouzar-accent rounded hover:bg-fouzar-accent/25 transition-colors cursor-pointer disabled:opacity-50"
                      title="Accept"
                    >
                      {actionLoading === req.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserCheck className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleReject(req.id)}
                      className="p-1 border border-fouzar-border/40 hover:border-red-500/40 text-fouzar-text-secondary hover:text-red-400 rounded hover:bg-red-500/5 transition-colors cursor-pointer disabled:opacity-50"
                      title="Decline"
                    >
                      <UserX className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {/* Outgoing requests */}
              {outgoingRequests.map((req) => (
                <motion.div
                  key={`out-${req.id}`}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-fouzar-border/40 rounded-[7px]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-white/5 border border-fouzar-border flex items-center justify-center font-mono text-[9px] font-bold text-fouzar-text-secondary shrink-0 overflow-hidden">
                      {req.receiver?.avatarUrl ? (
                        <img src={req.receiver.avatarUrl} alt={req.receiver.name} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(req.receiver?.name || '??')
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-fouzar-text-primary truncate">
                        {req.receiver?.name}
                      </p>
                      <p className="font-mono text-[7px] text-fouzar-text-tertiary truncate">
                        ID: {req.receiver?.fouzarId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* SENT badge */}
                    <span className="font-mono text-[6.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-fouzar-text-secondary border border-fouzar-border/40 font-bold">
                      SENT
                    </span>
                    <button
                      type="button"
                      disabled={actionLoading !== null}
                      onClick={() => handleReject(req.id)}
                      className="p-1 text-fouzar-text-tertiary hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                      title="Cancel Invitation"
                    >
                      {actionLoading === req.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserX className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
