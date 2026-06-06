'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Radio, Clock } from 'lucide-react';
import { getSocket } from '../../lib/socket';

interface Friend {
  id: string;
  name: string;
  email: string;
  isOnline: boolean;
  isFocusing: boolean;
  focusStartedAt: string | null;
}

export const FriendActivity: React.FC = () => {
  const [friends, setFriends] = useState<Friend[]>([
    {
      id: '1',
      name: 'Elena Rostova',
      email: 'elena@mit.edu',
      isOnline: true,
      isFocusing: true,
      focusStartedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: '2',
      name: 'Kai Takahashi',
      email: 'kai@mit.edu',
      isOnline: true,
      isFocusing: false,
      focusStartedAt: null,
    },
    {
      id: '3',
      name: 'Lila Thorne',
      email: 'lila@mit.edu',
      isOnline: false,
      isFocusing: false,
      focusStartedAt: null,
    },
    {
      id: '4',
      name: 'Devon Vance',
      email: 'devon@mit.edu',
      isOnline: true,
      isFocusing: true,
      focusStartedAt: new Date(Date.now() - 42 * 60000).toISOString(),
    },
  ]);

  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.on('friendFocusStateChanged', (data: {
      userId: string;
      name: string;
      isFocusing: boolean;
      focusStartedAt: string | null;
    }) => {
      setFriends((prevFriends) => {
        return prevFriends.map((friend) => {
          if (friend.id === data.userId || friend.email.split('@')[0] === data.name?.toLowerCase()) {
            return {
              ...friend,
              isOnline: true,
              isFocusing: data.isFocusing,
              focusStartedAt: data.focusStartedAt,
            };
          }
          return friend;
        });
      });
    });

    return () => {
      socket.off('friendFocusStateChanged');
    };
  }, []);

  const sortedFriends = [...friends].sort((a, b) => {
    if (a.isFocusing && !b.isFocusing) return -1;
    if (!a.isFocusing && b.isFocusing) return 1;
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return a.name.localeCompare(b.name);
  });

  const getFocusTime = (isoString: string | null) => {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    return `${mins}m in flow`;
  };

  return (
    <div className="flex flex-col h-full bg-fouzar-surface/35 border border-fouzar-border p-4 rounded-[8px] min-h-[300px]">
      <div className="flex items-center justify-between pb-3 border-b border-fouzar-border mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-fouzar-accent animate-pulse" strokeWidth={1.5} />
          <span className="font-sans font-light text-[10px] uppercase tracking-[0.2em] text-fouzar-text-primary">
            Garden Presence
          </span>
        </div>
        <span className="text-[9px] font-mono bg-white/5 border border-fouzar-border/30 px-2 py-0.5 rounded-full text-fouzar-text-secondary">
          {friends.filter((f) => f.isOnline).length} ONLINE
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[240px] scrollbar-none">
        <AnimatePresence initial={false}>
          {sortedFriends.map((friend) => (
            <motion.div
              key={friend.id}
              layout
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between p-2 rounded-[8px] bg-transparent border border-transparent hover:border-fouzar-border/40 hover:bg-fouzar-surface/30 transition-all duration-150 group"
            >
              <div className="flex items-center gap-3">
                {/* Rounded Circle Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-fouzar-border flex items-center justify-center font-mono text-xs font-bold text-fouzar-text-secondary">
                    {friend.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  
                  {/* Status Indicator (online green, flow crimson flame) */}
                  {friend.isOnline && !friend.isFocusing && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-fouzar-accent border-2 border-fouzar-surface rounded-full animate-pulse" />
                  )}
                  {friend.isFocusing && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-red-500 border border-fouzar-surface rounded-full flex items-center justify-center shadow-lg">
                      <Flame className="w-1.5 h-1.5 text-fouzar-bg fill-white text-white" />
                    </span>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-light text-fouzar-text-primary group-hover:text-fouzar-accent transition-colors">
                    {friend.name}
                  </span>
                  <span className="text-[9px] font-mono text-fouzar-text-secondary/60">
                    {friend.email}
                  </span>
                </div>
              </div>

              {/* Status Tags */}
              <div>
                {friend.isFocusing ? (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[8px] font-mono uppercase tracking-wider text-glow-accent">
                    <Flame className="w-2.5 h-2.5 fill-red-400 text-red-400" />
                    <span>In Flow</span>
                  </div>
                ) : friend.isOnline ? (
                  <span className="text-[8px] font-mono text-fouzar-accent bg-fouzar-accent/5 border border-fouzar-accent/15 px-2.5 py-0.5 rounded-full text-glow-accent font-bold uppercase tracking-wider">
                    Online
                  </span>
                ) : (
                  <span className="text-[8px] font-mono text-fouzar-text-secondary/60 uppercase">
                    Offline
                  </span>
                )}
                {friend.isFocusing && friend.focusStartedAt && (
                  <div className="text-[8px] text-fouzar-text-secondary text-right mt-1 flex items-center justify-end gap-1 font-mono">
                    <Clock className="w-2.5 h-2.5" />
                    {getFocusTime(friend.focusStartedAt)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
