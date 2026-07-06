'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bell, UserPlus, MessageSquare, Flame, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFouzar } from '../../lib/FouzarContext';

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { accentColor } = useFouzar();

  const [notifications, setNotifications] = useState<{
    id: string;
    type: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  }[]>([]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request': return <UserPlus className="w-3.5 h-3.5 text-fouzar-accent" />;
      case 'message': return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'system': return <Flame className="w-3.5 h-3.5 text-[#ff2d55]" />;
      default: return <Bell className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full bg-fouzar-surface/60 border border-fouzar-border/40 text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-white/5 transition-all cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-2 h-2 bg-[#ff2d55] rounded-full animate-pulse shadow-[0_0_8px_#ff2d55] border border-[#0a0a0f]" />
        )}
      </button>

      {/* Glassmorphic Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-3 w-80 bg-zinc-950/80 backdrop-blur-2xl border border-fouzar-border-subtle rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-fouzar-border-subtle flex items-center justify-between bg-zinc-900/50">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[9px] text-fouzar-accent hover:text-fouzar-text-primary transition-colors cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto scrollbar-none">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-fouzar-text-secondary text-[10px] font-mono uppercase tracking-widest">
                  No new notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`relative p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-3 group ${!n.read ? 'bg-fouzar-accent/5' : ''}`}
                  >
                    {!n.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-fouzar-accent" />
                    )}
                    <div className="mt-0.5 shrink-0 bg-zinc-900 p-1.5 rounded-full border border-fouzar-border-subtle">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-zinc-200">{n.title}</span>
                        <span className="text-[9px] text-fouzar-text-secondary font-mono">{n.time}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{n.message}</p>
                      
                      {/* Action Buttons for Friend Requests */}
                      {n.type === 'friend_request' && (
                        <div className="flex gap-2 mt-2">
                          <button className="flex-1 bg-fouzar-accent/20 hover:bg-fouzar-accent/30 text-fouzar-accent border border-fouzar-accent/20 py-1 rounded text-[9px] font-bold uppercase transition-colors">
                            Accept
                          </button>
                          <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 py-1 rounded text-[9px] font-bold uppercase transition-colors">
                            Ignore
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={(e) => removeNotification(n.id, e)}
                      className="absolute right-2 top-2 p-1 text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <CloseIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-2 bg-zinc-950 text-center border-t border-white/5">
              <button className="text-[9px] font-mono text-fouzar-text-secondary hover:text-zinc-300 uppercase tracking-widest cursor-pointer transition-colors">
                View Archive
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
