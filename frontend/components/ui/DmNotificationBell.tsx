'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { getAuthToken } from '../../lib/api';

interface DmNotificationBellProps {
  /** Called when user clicks the icon — use this to navigate to DMs */
  onClick: () => void;
}

export function DmNotificationBell({ onClick }: DmNotificationBellProps) {
  const [unread, setUnread] = useState(0);
  const myUserIdRef = useRef<string>('');

  // Decode current user id from JWT once
  useEffect(() => {
    try {
      const token = getAuthToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        myUserIdRef.current = payload.sub || '';
      }
    } catch {}
  }, []);

  // Listen for incoming DM messages and increment badge
  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleMessage = (msg: any) => {
      // Only count messages from DM rooms that I didn't send
      if (
        typeof msg.groupId === 'string' &&
        msg.groupId.startsWith('dm-') &&
        msg.senderId !== myUserIdRef.current
      ) {
        setUnread((prev) => prev + 1);
      }
    };

    socket.on('onMessage', handleMessage);
    return () => { socket.off('onMessage', handleMessage); };
  }, []);

  const handleClick = () => {
    setUnread(0); // clear badge on open
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Direct Messages"
      className="relative p-2 rounded-full bg-fouzar-surface/60 border border-fouzar-border/40 text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-white/5 transition-all cursor-pointer"
    >
      <MessageSquare className="w-4 h-4" />

      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 bg-emerald-500 rounded-full flex items-center justify-center text-[9px] font-bold text-zinc-900 shadow-[0_0_8px_rgba(52,211,153,0.7)] border border-zinc-950 animate-pulse">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
