'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFriendRequests, acceptFriendRequest, rejectFriendRequest } from '../../lib/api';
import { toast } from '../ui/Toast';

interface NotificationsCenterProps {
  align?: 'left' | 'right' | 'left-up' | 'right-up';
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    try {
      const res = await getFriendRequests();
      setIncomingRequests(res.incoming || []);
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Poll every 15 seconds to fetch new requests in real time
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

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
        loadNotifications();
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
        loadNotifications();
      }
    } catch (err: any) {
      toast(err.message || 'Failed to decline request', 'crimson');
    } finally {
      setLoading(false);
    }
  };

  const hasUnread = incomingRequests.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-fouzar-elevated/60 transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {hasUnread && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-fouzar-signal shadow-[0_0_8px_var(--fouzar-glow-signal)] animate-pulse" />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: align.includes('up') ? -8 : 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: align.includes('up') ? -8 : 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`absolute ${
              align === 'left' ? 'left-0 mt-2' :
              align === 'left-up' ? 'left-0 bottom-full mb-2' :
              align === 'right-up' ? 'right-0 bottom-full mb-2' :
              'right-0 mt-2'
            } w-72 bg-[#16161f]/95 backdrop-blur-xl border border-fouzar-border/60 rounded-[var(--fouzar-radius-lg)] shadow-2xl z-50 overflow-hidden`}
          >
            <div className="px-4 py-3 border-b border-fouzar-border/40 bg-[#0a0a0f]/40 flex items-center justify-between">
              <span className="font-serif text-[10px] font-bold uppercase tracking-wider text-fouzar-text-primary">
                Inbox Notifications
              </span>
              {hasUnread && (
                <span className="font-mono text-[7px] text-fouzar-accent bg-fouzar-accent/15 px-1.5 py-0.5 rounded-full font-bold uppercase">
                  {incomingRequests.length} Pending
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-fouzar-border/30 scrollbar-none">
              {incomingRequests.length === 0 ? (
                <div className="py-8 px-4 text-center flex flex-col items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-fouzar-text-tertiary mb-1.5" />
                  <p className="font-mono text-[8px] text-fouzar-text-secondary uppercase">
                    Your inbox is clear
                  </p>
                  <p className="font-mono text-[6.5px] text-fouzar-text-tertiary uppercase mt-1">
                    No pending friend requests
                  </p>
                </div>
              ) : (
                incomingRequests.map((req) => (
                  <div key={req.id} className="p-3 flex flex-col gap-2 hover:bg-fouzar-elevated/25 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-fouzar-accent/10 border border-fouzar-accent/25 flex items-center justify-center shrink-0 font-mono text-[9px] font-bold text-fouzar-accent overflow-hidden">
                        {req.sender.avatarUrl ? (
                          <img
                            src={req.sender.avatarUrl}
                            alt={req.sender.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          req.sender.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold text-fouzar-text-primary truncate">
                          {req.sender.name}
                        </p>
                        <p className="font-mono text-[7px] text-fouzar-text-tertiary uppercase truncate mt-0.5">
                          ID: {req.sender.fouzarId}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1.5 justify-end">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleDecline(req.id, req.sender.name)}
                        className="px-2 py-1 font-mono text-[7px] text-fouzar-text-secondary hover:text-fouzar-signal border border-fouzar-border/40 hover:border-fouzar-signal/30 rounded-[var(--fouzar-radius-sm)] uppercase transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleAccept(req.id, req.sender.name)}
                        className="px-2 py-1 font-mono text-[7px] text-fouzar-text-inverse bg-fouzar-accent rounded-[var(--fouzar-radius-sm)] uppercase font-bold hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
