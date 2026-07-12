'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, MessageSquare, Smile, CornerUpLeft, Pin, Sparkles, X } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { getBackendUrl } from '../../lib/api';
import { useFouzar } from '../../lib/FouzarContext';

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

type ReactionsMap = Record<string, Record<string, { count: number; reacted: boolean }>>;

interface ChatPanelProps {
  groupId: string;
  currentSlideId: string | null;
  userId: string;
  /** Called whenever a new message arrives (used for unread badge) */
  onNewMessage?: () => void;
  /** Called when user clicks a #slideId tag */
  onSlideJump?: (slideId: string) => void;
  /** Whether the current user is the group leader (enables pin) */
  isLeader?: boolean;
}

const EMOJIS = ['👍', '❤️', '🔥', '😂', '🤔'];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  groupId,
  currentSlideId,
  userId,
  onNewMessage,
  onSlideJump,
  isLeader = false,
}) => {
  const { setAiTriggerQuery } = useFouzar();

  const [messages, setMessages]           = useState<Message[]>([]);
  const [inputText, setInputText]         = useState('');
  const [typingUsers, setTypingUsers]     = useState<string[]>([]);
  const [reactions, setReactions]         = useState<ReactionsMap>({});
  const [replyingTo, setReplyingTo]       = useState<Message | null>(null);
  const [pinnedMsgId, setPinnedMsgId]     = useState<string | null>(null);
  const [hoveredId, setHoveredId]         = useState<string | null>(null);
  const [showEmojiFor, setShowEmojiFor]   = useState<string | null>(null);

  const messagesEndRef  = useRef<HTMLDivElement | null>(null);
  const socketRef       = useRef<any>(null);
  const typingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef        = useRef<HTMLTextAreaElement>(null);

  /* ─── Socket setup ─── */
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiBase = getBackendUrl();
        const res = await fetch(`${apiBase}/groups/${groupId}/messages`);
        if (res.ok) setMessages(await res.json());
      } catch (err) {
        console.error('Failed to load chat history', err);
      }
    };
    fetchHistory();

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();
    socket.emit('joinGroup', { groupId });

    socket.on('onMessage', (msg: Message) => {
      if (msg.groupId === groupId) {
        setMessages((prev) => [...prev, msg]);
        onNewMessage?.();
      }
    });

    socket.on('userTyping', ({ userName }: { userName: string }) => {
      setTypingUsers((prev) => (prev.includes(userName) ? prev : [...prev, userName]));
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== userName));
      }, 3000);
    });

    return () => {
      socket.off('onMessage');
      socket.off('userTyping');
    };
  }, [groupId]);

  /* ─── Auto-scroll ─── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  /* ─── Send ─── */
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !socketRef.current) return;

    const prefix = replyingTo
      ? `> *${replyingTo.sender.name || replyingTo.sender.email.split('@')[0]}*: ${replyingTo.content.slice(0, 80)}${replyingTo.content.length > 80 ? '…' : ''}\n`
      : '';

    socketRef.current.emit('sendMessage', {
      groupId,
      content: prefix + inputText,
      slideId: currentSlideId,
    });

    setInputText('');
    setReplyingTo(null);
    // reset textarea height
    if (inputRef.current) inputRef.current.style.height = '20px';
  };

  /* ─── Keyboard ─── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !(e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      // Insert newline
      return;
    }
    if (e.key === 'Escape') {
      setReplyingTo(null);
      return;
    }
    // Typing indicator
    if (socketRef.current) {
      socketRef.current.emit('typing', { groupId, userName: userId });
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  /* ─── Reactions ─── */
  const handleReaction = (msgId: string, emoji: string) => {
    setReactions((prev) => {
      const msgR = { ...(prev[msgId] || {}) };
      const cur  = msgR[emoji] || { count: 0, reacted: false };
      msgR[emoji] = cur.reacted
        ? { count: Math.max(0, cur.count - 1), reacted: false }
        : { count: cur.count + 1, reacted: true };
      return { ...prev, [msgId]: msgR };
    });
    setShowEmojiFor(null);
  };

  /* ─── AI Summarize ─── */
  const handleSummarize = () => {
    const recent = messages.slice(-30);
    if (!recent.length) return;
    const text = recent
      .map((m) => `${m.sender.name || m.sender.email.split('@')[0]}: ${m.content}`)
      .join('\n');
    setAiTriggerQuery({
      text: `Please summarize this group study chat and highlight the key study points discussed:\n\n${text}`,
      id: Date.now().toString(),
    });
  };

  /* ─── Helpers ─── */
  const senderName = (msg: Message) =>
    msg.sender.name || msg.sender.email.split('@')[0];

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const formatTs = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isSameGroup = (a: Message, b: Message) =>
    a.senderId === b.senderId &&
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() < 5 * 60 * 1000;

  /* ─── Render message content ─── */
  const renderContent = (content: string, slideId: string | null) => {
    const lines = content.split('\n');
    const quoteLines: string[] = [];
    const bodyLines:  string[] = [];
    for (const line of lines) {
      if (line.startsWith('>')) quoteLines.push(line.slice(1).trim());
      else bodyLines.push(line);
    }

    const highlightMentions = (text: string) =>
      text.split(/(@\w+)/g).map((part, i) =>
        part.startsWith('@')
          ? <span key={i} className="text-fouzar-accent font-semibold">{part}</span>
          : part
      );

    return (
      <div className="space-y-1">
        {quoteLines.length > 0 && (
          <div className="border-l-2 border-fouzar-accent/40 pl-2 py-0.5 bg-fouzar-accent/5 rounded-sm">
            <p className="text-[11px] font-mono text-fouzar-text-tertiary italic leading-relaxed">
              {quoteLines.join(' ')}
            </p>
          </div>
        )}
        <p className="text-sm font-normal text-fouzar-text-primary leading-relaxed break-words whitespace-pre-wrap">
          {highlightMentions(bodyLines.join('\n'))}
        </p>
        {slideId && onSlideJump && (
          <button
            type="button"
            onClick={() => onSlideJump(slideId)}
            className="inline-flex items-center gap-0.5 text-[10px] font-mono bg-fouzar-accent/10 text-fouzar-accent border border-fouzar-accent/20 px-1.5 py-0.5 rounded-full hover:bg-fouzar-accent/20 transition-colors cursor-pointer mt-0.5"
          >
            <Hash className="w-2 h-2" />
            Slide {slideId}
          </button>
        )}
      </div>
    );
  };

  const pinnedMsg = pinnedMsgId ? messages.find((m) => m.id === pinnedMsgId) : null;

  /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <div className="flex flex-col h-full bg-fouzar-surface/35 overflow-hidden">

      {/* ── Pinned Banner ── */}
      {pinnedMsg && (
        <div className="flex items-center gap-2 px-3 py-2 bg-fouzar-accent/10 border-b border-fouzar-accent/20 shrink-0">
          <Pin className="w-3 h-3 text-fouzar-accent shrink-0" />
          <p className="text-[10px] font-mono text-fouzar-text-secondary flex-1 truncate">
            <span className="text-fouzar-accent font-bold">{senderName(pinnedMsg)}:</span>{' '}
            {pinnedMsg.content.slice(0, 90)}
          </p>
          {isLeader && (
            <button type="button" onClick={() => setPinnedMsgId(null)} className="text-fouzar-text-tertiary hover:text-fouzar-text-primary cursor-pointer shrink-0">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-none">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-fouzar-text-secondary p-8 select-none">
            <MessageSquare className="w-8 h-8 text-fouzar-border mb-3" />
            <span className="text-sm font-sans uppercase tracking-wider">No logs yet.</span>
            <span className="text-xs text-fouzar-text-secondary/60 mt-1">Start typing below to broadcast.</span>
          </div>
        ) : (
          <div>
            {messages.map((msg, index) => {
              const prev     = index > 0 ? messages[index - 1] : null;
              const grouped  = prev ? isSameGroup(prev, msg) : false;
              const name     = senderName(msg);
              const msgR     = reactions[msg.id] || {};
              const hasReactions = Object.values(msgR).some((r) => r.count > 0);

              return (
                <div
                  key={msg.id}
                  className="relative"
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => { setHoveredId(null); setShowEmojiFor(null); }}
                >
                  <div className={`flex items-start gap-3 px-1.5 py-1 rounded-[4px] hover:bg-white/[0.025] transition-colors ${grouped ? 'mt-0.5' : 'mt-3'}`}>

                    {/* Avatar / spacer */}
                    {grouped ? (
                      <div className="w-9 shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/5 border border-fouzar-border shrink-0 flex items-center justify-center font-sans text-sm font-bold text-fouzar-text-secondary">
                        {initials(name)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Header row (hidden when grouped) */}
                      {!grouped && (
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-fouzar-text-primary">{name}</span>
                          <span className="text-[11px] font-mono text-fouzar-text-secondary/50">{formatTs(msg.createdAt)}</span>
                        </div>
                      )}

                      {renderContent(msg.content, msg.slideId)}

                      {/* Reactions */}
                      {hasReactions && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.entries(msgR).filter(([, r]) => r.count > 0).map(([emoji, r]) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleReaction(msg.id, emoji)}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-all cursor-pointer ${
                                r.reacted
                                  ? 'bg-fouzar-accent/15 border-fouzar-accent/40 text-fouzar-accent'
                                  : 'bg-fouzar-elevated/40 border-fouzar-border/40 text-fouzar-text-secondary hover:border-fouzar-accent/30'
                              }`}
                            >
                              <span>{emoji}</span>
                              <span className="font-mono text-[9px]">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Hover Action Bar ── */}
                  {hoveredId === msg.id && (
                    <div className="absolute right-2 -top-4 flex items-center gap-0.5 bg-fouzar-surface/95 backdrop-blur-md border border-fouzar-border/60 rounded-full px-1.5 py-1 shadow-lg z-10">
                      <button
                        type="button"
                        onClick={() => setShowEmojiFor((p) => (p === msg.id ? null : msg.id))}
                        className="p-1 text-fouzar-text-tertiary hover:text-fouzar-accent transition-colors cursor-pointer rounded-full hover:bg-fouzar-accent/10"
                        title="React"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReplyingTo(msg); inputRef.current?.focus(); }}
                        className="p-1 text-fouzar-text-tertiary hover:text-fouzar-text-primary transition-colors cursor-pointer rounded-full hover:bg-white/5"
                        title="Reply"
                      >
                        <CornerUpLeft className="w-3.5 h-3.5" />
                      </button>
                      {isLeader && (
                        <button
                          type="button"
                          onClick={() => setPinnedMsgId((p) => (p === msg.id ? null : msg.id))}
                          className={`p-1 transition-colors cursor-pointer rounded-full hover:bg-white/5 ${pinnedMsgId === msg.id ? 'text-fouzar-accent' : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary'}`}
                          title={pinnedMsgId === msg.id ? 'Unpin' : 'Pin message'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Emoji Picker Popover ── */}
                  {showEmojiFor === msg.id && (
                    <div className="absolute right-2 top-3 flex gap-1.5 bg-fouzar-surface/95 backdrop-blur-md border border-fouzar-border rounded-full px-3 py-1.5 shadow-xl z-20">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="text-base hover:scale-125 transition-transform cursor-pointer leading-none"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 px-1.5 py-2 mt-1">
                <div className="flex gap-0.5 items-end">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1 h-1 bg-fouzar-accent/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-fouzar-text-tertiary italic">
                  {typingUsers.length === 1
                    ? `${typingUsers[0]} is typing…`
                    : `${typingUsers.slice(0, -1).join(', ')} & ${typingUsers.at(-1)} are typing…`}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Reply Preview ── */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-3 py-2 bg-fouzar-accent/5 border-t border-fouzar-accent/20 shrink-0">
          <CornerUpLeft className="w-3 h-3 text-fouzar-accent shrink-0" />
          <p className="text-[10px] font-mono text-fouzar-text-secondary flex-1 truncate">
            Replying to{' '}
            <span className="text-fouzar-accent font-bold">{senderName(replyingTo)}</span>
            {': '}{replyingTo.content.replace(/^>.*\n?/gm, '').trim().slice(0, 60)}
          </p>
          <button type="button" onClick={() => setReplyingTo(null)} className="text-fouzar-text-tertiary hover:text-fouzar-text-primary cursor-pointer shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* ── Input ── */}
      <div className="px-3 pb-3 pt-2 border-t border-fouzar-border/40 shrink-0">
        {/* Toolbar row */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-mono text-fouzar-text-tertiary/50 uppercase tracking-wider">
            Enter to send · Shift+Enter for newline
          </span>
          <button
            type="button"
            onClick={handleSummarize}
            disabled={messages.length === 0}
            className="flex items-center gap-1 text-[9px] font-mono text-fouzar-text-tertiary hover:text-fouzar-accent uppercase tracking-wider disabled:opacity-30 cursor-pointer transition-colors"
            title="Summarize chat with AI"
          >
            <Sparkles className="w-3 h-3" />
            AI Summary
          </button>
        </div>

        <form onSubmit={handleSend} className="flex items-end gap-2">
          <div className="flex-1 bg-fouzar-card/50 border border-fouzar-border rounded-[8px] px-3 py-2 focus-within:border-fouzar-accent transition-colors">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="w-full bg-transparent text-sm text-fouzar-text-primary focus:outline-none placeholder:text-fouzar-text-secondary/35 resize-none leading-relaxed scrollbar-none"
              style={{ height: '20px', maxHeight: '100px' }}
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
    </div>
  );
};
