'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, MessageSquare } from 'lucide-react';
import { getSocket } from '../../lib/socket';

interface Message {
  id: string;
  groupId: string;
  senderId: string;
  sender: {
    name: string | null;
    email: string;
  };
  content: string;
  slideId: string | null;
  createdAt: string;
}

interface ChatPanelProps {
  groupId: string;
  currentSlideId: string | null;
  userId: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  groupId,
  currentSlideId,
  userId,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const apiBase = process.env.NEXT_PUBLIC_API_URL || (isLocal ? 'http://localhost:3001' : 'https://ammeeee-student-os.hf.space');
        const res = await fetch(`${apiBase}/groups/${groupId}/messages`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    fetchChatHistory();

    const socket = getSocket();
    socketRef.current = socket;

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('joinGroup', { groupId });

    socket.on('onMessage', (message: Message) => {
      if (message.groupId === groupId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.off('onMessage');
    };
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    socketRef.current.emit('sendMessage', {
      groupId,
      content: inputText,
      slideId: currentSlideId,
    });

    setInputText('');
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full border border-fouzar-border bg-fouzar-surface/35 rounded-[8px] p-4 min-h-[450px]">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-fouzar-border mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-fouzar-accent animate-pulse" />
          <span className="font-sans font-light text-[10px] uppercase tracking-[0.2em] text-fouzar-text-primary">
            Group Logs
          </span>
        </div>
        {currentSlideId && (
          <div className="flex items-center gap-1 text-[8px] font-mono bg-fouzar-accent/10 text-fouzar-accent border border-fouzar-accent/20 px-2.5 py-0.5 rounded-full text-glow-accent">
            <Hash className="w-2.5 h-2.5" />
            <span>Slide {currentSlideId}</span>
          </div>
        )}
      </div>

      {/* Messages (Discord Style Inline rendering) */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[380px] scrollbar-none">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-fouzar-text-secondary p-8 select-none">
            <span className="text-[10px] font-mono uppercase tracking-widest">No logs yet.</span>
            <span className="text-[9px] text-fouzar-text-secondary/60 mt-1">Start typing below to broadcast.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const senderInitials = (msg.sender.name || msg.sender.email.split('@')[0])
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={msg.id} className="flex items-start gap-3 group/msg hover:bg-white/2 p-1.5 rounded-[4px] transition-colors">
                  {/* Discord Circular Avatar */}
                  <div className="w-9 h-9 rounded-full bg-white/5 border border-fouzar-border shrink-0 flex items-center justify-center font-mono text-xs font-bold text-fouzar-text-secondary">
                    {senderInitials}
                  </div>

                  {/* Message details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-fouzar-text-primary hover:underline cursor-pointer">
                        {msg.sender.name || msg.sender.email.split('@')[0]}
                      </span>
                      <span className="text-[8px] font-mono text-fouzar-text-secondary/50">
                        {formatTimestamp(msg.createdAt)}
                      </span>
                      {msg.slideId && (
                        <span className="text-[7px] font-mono bg-fouzar-border/40 text-fouzar-text-secondary px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                          <Hash className="w-2 h-2" />
                          {msg.slideId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-light text-fouzar-text-primary mt-1 leading-relaxed break-words">
                      {msg.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form (Discord Rounded Capsule style) */}
      <form onSubmit={handleSend} className="mt-4 flex items-center gap-2 border-t border-fouzar-border pt-4">
        <div className="flex-1 flex items-center bg-fouzar-card/50 border border-fouzar-border rounded-full px-4 py-2 focus-within:border-fouzar-accent transition-colors">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent text-xs text-fouzar-text-primary focus:outline-none placeholder:text-fouzar-text-secondary/35"
          />
        </div>
        <button
          type="submit"
          className="p-2.5 bg-fouzar-accent hover:opacity-90 text-fouzar-bg rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5 text-fouzar-bg" />
        </button>
      </form>
    </div>
  );
};
