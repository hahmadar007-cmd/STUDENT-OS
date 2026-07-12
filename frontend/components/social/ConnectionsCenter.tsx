'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Users, Check, X, ShieldAlert, UserMinus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFriendRequests, acceptFriendRequest, rejectFriendRequest, getBlockedUsers, unblockUser } from '../../lib/api';
import { toast } from '../ui/Toast';

interface ConnectionsCenterProps {
  align?: 'left' | 'right' | 'left-up' | 'right-up';
}

export const ConnectionsCenter: React.FC<ConnectionsCenterProps> = ({ align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'blocked'>('incoming');
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    try {
      const [reqs, blocks] = await Promise.all([
        getFriendRequests(),
        getBlockedUsers(),
      ]);
      setIncomingRequests(reqs.incoming || []);
      setOutgoingRequests(reqs.outgoing || []);
      setBlockedUsers(blocks || []);
    } catch (e) {
      console.warn('Failed to load connections data:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('click', handleOutsideClick);
    }
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isOpen]);

  const handleAccept = async (requestId: string, senderName: string) => {
    setLoading(true);
    try {
      const res = await acceptFriendRequest(requestId);
      if (res.success) {
        toast(`Accepted friend request from ${senderName}!`, 'violet');
        loadData();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('friend-accepted'));
        }
      }
    } catch (err: any) {
      toast(err.message || 'Failed to accept request', 'crimson');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async (requestId: string, senderName: string) => {
    setLoading(true);
    try {
      const res = await rejectFriendRequest(requestId);
      if (res.success) {
        toast(`Declined request from ${senderName}`, 'violet');
        loadData();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to decline request', 'crimson');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOutgoing = async (requestId: string, receiverName: string) => {
    setLoading(true);
    try {
      const res = await rejectFriendRequest(requestId);
      if (res.success) {
        toast(`Cancelled request to ${receiverName}`, 'violet');
        loadData();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to cancel request', 'crimson');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (friendId: string, name: string) => {
    setLoading(true);
    try {
      const res = await unblockUser(friendId);
      if (res.success) {
        toast(`Unblocked ${name}`, 'violet');
        loadData();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to unblock user', 'crimson');
    } finally {
      setLoading(false);
    }
  };

  const totalActionable = incomingRequests.length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-fouzar-elevated/60 transition-colors cursor-pointer"
        title="Connections Center"
      >
        <Users className="w-4 h-4" />
        {totalActionable > 0 && (
          <span className="absolute top-2 right-1.5 w-2 h-2 rounded-full bg-fouzar-signal shadow-[0_0_8px_var(--fouzar-glow-signal)] animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: align.includes('up') ? -8 : 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: align.includes('up') ? -8 : 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute ${align.includes('right') ? 'right-0' : 'left-0'} ${
              align.includes('up') ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'
            } w-80 bg-[var(--fouzar-base)] border border-fouzar-border/30 rounded-xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.5)] z-50 overflow-hidden flex flex-col`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-fouzar-border/20 bg-fouzar-elevated/30">
              <h3 className="text-sm font-semibold text-fouzar-text-primary">Connections</h3>
            </div>
            
            <div className="flex items-center px-4 pt-3 gap-4 border-b border-fouzar-border/20">
              <button
                onClick={() => setActiveTab('incoming')}
                className={`pb-2 text-xs font-medium transition-colors border-b-2 ${activeTab === 'incoming' ? 'border-fouzar-primary text-fouzar-primary' : 'border-transparent text-fouzar-text-secondary hover:text-fouzar-text-primary'}`}
              >
                Requests {incomingRequests.length > 0 && `(${incomingRequests.length})`}
              </button>
              <button
                onClick={() => setActiveTab('outgoing')}
                className={`pb-2 text-xs font-medium transition-colors border-b-2 ${activeTab === 'outgoing' ? 'border-fouzar-primary text-fouzar-primary' : 'border-transparent text-fouzar-text-secondary hover:text-fouzar-text-primary'}`}
              >
                Sent
              </button>
              <button
                onClick={() => setActiveTab('blocked')}
                className={`pb-2 text-xs font-medium transition-colors border-b-2 ${activeTab === 'blocked' ? 'border-fouzar-signal text-fouzar-signal' : 'border-transparent text-fouzar-text-secondary hover:text-fouzar-text-primary'}`}
              >
                Blocked
              </button>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-fouzar-elevated">
              {activeTab === 'incoming' && (
                <>
                  {incomingRequests.length === 0 ? (
                    <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-fouzar-text-tertiary mx-auto" />
                      <p className="text-xs text-fouzar-text-secondary">No pending friend requests.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {incomingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-fouzar-elevated/40 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {req.sender.avatarUrl ? (
                              <img src={req.sender.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-fouzar-border/30 object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-fouzar-primary/20 text-fouzar-primary flex items-center justify-center font-bold text-xs border border-fouzar-primary/30 flex-shrink-0">
                                {req.sender.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex flex-col">
                              <span className="text-sm font-medium text-fouzar-text-primary truncate">{req.sender.name}</span>
                              <span className="text-[10px] text-fouzar-text-tertiary truncate">Fouzar ID: {req.sender.fouzarId}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              disabled={loading}
                              onClick={() => handleAccept(req.id, req.sender.name)}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-fouzar-primary/20 text-fouzar-primary hover:bg-fouzar-primary hover:text-white transition-colors"
                              title="Accept"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              disabled={loading}
                              onClick={() => handleDecline(req.id, req.sender.name)}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-fouzar-text-secondary/10 text-fouzar-text-secondary hover:bg-fouzar-signal hover:text-white transition-colors"
                              title="Decline"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'outgoing' && (
                <>
                  {outgoingRequests.length === 0 ? (
                    <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                      <UserMinus className="w-8 h-8 text-fouzar-text-tertiary mx-auto" />
                      <p className="text-xs text-fouzar-text-secondary">No outgoing requests.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {outgoingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-fouzar-elevated/40 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {req.receiver.avatarUrl ? (
                              <img src={req.receiver.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-fouzar-border/30 object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-fouzar-primary/20 text-fouzar-primary flex items-center justify-center font-bold text-xs border border-fouzar-primary/30 flex-shrink-0">
                                {req.receiver.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex flex-col">
                              <span className="text-sm font-medium text-fouzar-text-primary truncate">{req.receiver.name}</span>
                              <span className="text-[10px] text-fouzar-text-tertiary truncate">Pending approval</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              disabled={loading}
                              onClick={() => handleCancelOutgoing(req.id, req.receiver.name)}
                              className="px-2 py-1 flex items-center justify-center rounded bg-fouzar-text-secondary/10 text-[10px] text-fouzar-text-secondary hover:bg-fouzar-signal hover:text-white transition-colors"
                              title="Cancel"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'blocked' && (
                <>
                  {blockedUsers.length === 0 ? (
                    <div className="px-4 py-8 text-center flex flex-col items-center gap-2">
                      <ShieldAlert className="w-8 h-8 text-fouzar-text-tertiary mx-auto" />
                      <p className="text-xs text-fouzar-text-secondary">No blocked users.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {blockedUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-fouzar-elevated/40 transition-colors group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-fouzar-border/30 object-cover flex-shrink-0 grayscale" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-fouzar-signal/20 text-fouzar-signal flex items-center justify-center font-bold text-xs border border-fouzar-signal/30 flex-shrink-0">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex flex-col">
                              <span className="text-sm font-medium text-fouzar-text-primary truncate">{user.name}</span>
                              <span className="text-[10px] text-fouzar-signal truncate">Blocked</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button
                              disabled={loading}
                              onClick={() => handleUnblock(user.id, user.name)}
                              className="px-2 py-1 flex items-center justify-center rounded bg-fouzar-text-secondary/10 text-[10px] font-medium text-fouzar-text-secondary hover:bg-fouzar-primary hover:text-white transition-colors"
                              title="Unblock"
                            >
                              Unblock
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
