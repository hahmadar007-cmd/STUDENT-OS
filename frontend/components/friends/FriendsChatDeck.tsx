'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  MessageSquare,
  Search,
  Paperclip,
  FileText,
  FileImage,
  FileVideo,
  FileArchive,
  File,
  Download,
  X,
  Loader2,
} from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { getBackendUrl } from '../../lib/api';
import { getFriends } from '../../lib/api';

interface Peer {
  id: string;
  name: string;
  initials: string;
  status: 'online' | 'flow' | 'offline';
  fouzarId?: string;
}

interface FriendsChatDeckProps {
  peers: Peer[];
}

interface DirectMessage {
  id: string;
  content: string;
  senderName: string;
  senderInitials: string;
  createdAt: string;
  isSelf: boolean;
}

interface UploadingFile {
  name: string;
  size: number;
  progress: number;
}

const FILE_MSG_PREFIX = '__fouzar_file__:';

function encodeFileMessage(name: string, url: string, size: number, mime: string): string {
  return FILE_MSG_PREFIX + JSON.stringify({ name, url, size, mime });
}

function decodeFileMessage(content: string): { name: string; url: string; size: number; mime: string } | null {
  if (!content.startsWith(FILE_MSG_PREFIX)) return null;
  try {
    return JSON.parse(content.slice(FILE_MSG_PREFIX.length));
  } catch {
    return null;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mime: string) {
  if (mime.startsWith('image/')) return FileImage;
  if (mime.startsWith('video/')) return FileVideo;
  if (mime === 'application/pdf' || mime.includes('document') || mime.includes('word') || mime.includes('text')) return FileText;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('7z')) return FileArchive;
  return File;
}

function getFileAccentColor(mime: string): string {
  if (mime.startsWith('image/')) return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  if (mime.startsWith('video/')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  if (mime === 'application/pdf') return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  if (mime.includes('document') || mime.includes('word')) return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  if (mime.includes('zip') || mime.includes('rar')) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
}

function groupMessagesByDate(messages: DirectMessage[]) {
  const groups: { date: string; messages: DirectMessage[] }[] = [];
  let currentDate = '';
  messages.forEach((msg) => {
    const d = new Date(msg.createdAt);
    const now = new Date();
    const todayStr = new Date().toDateString();
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const isToday = d.toDateString() === todayStr;
    const isYesterday = d.toDateString() === yesterdayDate.toDateString();
    const label = isNaN(d.getTime())
      ? 'Today'
      : isToday
      ? 'Today'
      : isYesterday
      ? 'Yesterday'
      : d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    if (label !== currentDate) {
      currentDate = label;
      groups.push({ date: label, messages: [msg] });
    } else {
      groups[groups.length - 1].messages.push(msg);
    }
  });
  return groups;
}

/** Returns a deterministic DM room ID regardless of which side opens the chat first. */
function getDmRoomId(myId: string, friendId: string): string {
  return 'dm-' + [myId, friendId].sort().join('-');
}

export function FriendsChatDeck({ peers }: FriendsChatDeckProps) {
  const [selectedFriend, setSelectedFriend] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [localPeers, setLocalPeers] = useState<Peer[]>(peers);
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<UploadingFile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const pendingSent = useRef<Set<string>>(new Set());
  const dragCounter = useRef(0);

  // Decode the current user's ID from the stored JWT so we can build canonical DM room IDs.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub || '');
      }
    } catch {
      // Token not yet available or malformed — currentUserId stays ''
    }
  }, []);

  useEffect(() => {
    if (peers.length > 0) {
      setLocalPeers(peers);
      return;
    }
    const load = async () => {
      try {
        const list = await getFriends();
        const mapped: Peer[] = (list || []).map((f: any) => ({
          id: f.id,
          name: f.name || f.email.split('@')[0],
          initials: f.name
            ? f.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            : 'FR',
          status: f.isFocusing ? 'flow' : 'online',
          fouzarId: f.fouzarId,
        }));
        setLocalPeers(mapped);
      } catch {
        setLocalPeers([]);
      }
    };
    load();
  }, [peers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!selectedFriend) return;
    inputRef.current?.focus();

    // Use a canonical room ID: both sides sort their IDs so they always resolve the same room.
    // If currentUserId is not yet available (edge case on first render), fall back to friend-only
    // ID — it will be corrected once the token is decoded.
    const roomId = currentUserId
      ? getDmRoomId(currentUserId, selectedFriend.id)
      : `dm-${selectedFriend.id}`;
    activeRoomRef.current = roomId;
    setMessages([]);

    const socket = getSocket();
    socketRef.current = socket;
    if (!socket.connected) socket.connect();
    socket.emit('joinGroup', { groupId: roomId });

    const apiBase = getBackendUrl();
    fetch(`${apiBase}/groups/${roomId}/messages`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        const mapped: DirectMessage[] = data.map((m: any) => ({
          id: m.id,
          content: m.content,
          senderName: m.sender?.name || m.sender?.email?.split('@')[0] || 'User',
          senderInitials: (m.sender?.name || m.sender?.email?.split('@')[0] || 'U')
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
          createdAt: m.createdAt,
          isSelf: false,
        }));
        setMessages(mapped);
      })
      .catch(() => setMessages([]));

    const onMessage = (msg: any) => {
      if (msg.groupId !== roomId) return;
      const isSelf = pendingSent.current.has(msg.content);
      if (isSelf) pendingSent.current.delete(msg.content);
      const senderDisplay = msg.sender?.name || msg.sender?.email?.split('@')[0] || 'User';
      const senderInitials = senderDisplay.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id || String(Date.now()),
          content: msg.content,
          senderName: isSelf ? 'You' : senderDisplay,
          senderInitials: isSelf ? 'YO' : senderInitials,
          createdAt: msg.createdAt || new Date().toISOString(),
          isSelf,
        },
      ]);
    };

    socket.on('onMessage', onMessage);
    return () => { socket.off('onMessage', onMessage); };
  }, [selectedFriend]);

  const uploadAndSendFile = useCallback(async (file: File) => {
    if (!selectedFriend || !socketRef.current) return;

    const roomId = currentUserId
      ? getDmRoomId(currentUserId, selectedFriend.id)
      : `dm-${selectedFriend.id}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    setUploadingFile({ name: file.name, size: file.size, progress: 0 });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadingFile((prev) => prev ? { ...prev, progress: Math.round((e.loaded / e.total) * 100) } : null);
        }
      };

      const apiBase = getBackendUrl();
      const result = await new Promise<any>((resolve, reject) => {
        xhr.open('POST', `${apiBase}/groups/${roomId}/files`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      const fileUrl: string = result?.file?.fileUrl || result?.file?.url || '';
      const content = encodeFileMessage(file.name, fileUrl, file.size, file.type);
      pendingSent.current.add(content);
      socketRef.current.emit('sendMessage', { groupId: roomId, content, slideId: null });
    } catch {
    } finally {
      setUploadingFile(null);
    }
  }, [selectedFriend]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((f) => uploadAndSendFile(f));
  }, [uploadAndSendFile]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => uploadAndSendFile(f));
    e.target.value = '';
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socketRef.current || !selectedFriend) return;
    const roomId = currentUserId
      ? getDmRoomId(currentUserId, selectedFriend.id)
      : `dm-${selectedFriend.id}`;
    const content = inputText.trim();
    pendingSent.current.add(content);
    socketRef.current.emit('sendMessage', { groupId: roomId, content, slideId: null });
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
  };

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  const statusDot = (s: string) => {
    if (s === 'flow') return 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]';
    if (s === 'online') return 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]';
    return 'bg-zinc-600';
  };

  const statusLabel = (s: string) => {
    if (s === 'flow') return 'In Flow';
    if (s === 'online') return 'Online';
    return 'Offline';
  };

  const filteredPeers = localPeers.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const messageGroups = groupMessagesByDate(messages);

  const renderMessageContent = (msg: DirectMessage) => {
    const fileData = decodeFileMessage(msg.content);

    if (fileData) {
      const IconComponent = getFileIcon(fileData.mime);
      const accentClass = getFileAccentColor(fileData.mime);
      return (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${accentClass} min-w-[200px] max-w-[280px]`}>
          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            <IconComponent className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] font-medium text-zinc-100 truncate">{fileData.name}</span>
            <span className="text-[9px] text-zinc-500 mt-0.5">{formatBytes(fileData.size)}</span>
          </div>
          {fileData.url && (
            <a
              href={fileData.url}
              target="_blank"
              rel="noopener noreferrer"
              download={fileData.name}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-3.5 h-3.5 text-zinc-300" />
            </a>
          )}
        </div>
      );
    }

    return (
      <div
        className={`px-3.5 py-2.5 text-[12px] leading-relaxed break-words ${
          msg.isSelf
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-2xl rounded-tr-none shadow-md'
            : 'bg-zinc-900/50 border border-white/5 text-zinc-100 rounded-2xl rounded-tl-none shadow-md'
        }`}
      >
        {msg.content}
        <span className="block text-right mt-1 ml-4 text-[9px] text-zinc-600 select-none">
          {formatTime(msg.createdAt)}
        </span>
      </div>
    );
  };

  return (
    <div
      className="flex w-full overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-950/80 shadow-2xl backdrop-blur-sm"
      style={{ height: 'calc(100vh - 180px)', minHeight: '520px' }}
    >
      {/* ── Sidebar ─────────────────────────────────── */}
      <div className="w-60 shrink-0 flex flex-col border-r border-white/[0.05] bg-zinc-900/40">
        <div className="px-3 pt-4 pb-3 shrink-0">
          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-zinc-500 mb-3 px-1">Friends</p>
          <div className="flex items-center gap-2 bg-zinc-800/50 border border-white/[0.06] rounded-lg px-3 py-2 focus-within:border-zinc-600 transition-colors">
            <Search className="w-3 h-3 text-zinc-600 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent text-[10px] text-zinc-300 focus:outline-none placeholder:text-zinc-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none px-2 pb-3 space-y-0.5">
          {filteredPeers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-10 text-center">
              <MessageSquare className="w-5 h-5 text-zinc-700" />
              <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
                {search ? 'No results' : 'No friends yet'}
              </span>
            </div>
          ) : (
            filteredPeers.map((peer) => {
              const isSelected = selectedFriend?.id === peer.id;
              return (
                <button
                  key={peer.id}
                  type="button"
                  onClick={() => setSelectedFriend(peer)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-150 cursor-pointer text-left group ${
                    isSelected
                      ? 'bg-white/[0.07] border border-white/[0.08]'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {peer.initials}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${statusDot(peer.status)}`} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-[11px] font-medium truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-300'}`}>{peer.name}</span>
                    <span className={`text-[9px] ${peer.status === 'flow' ? 'text-amber-400' : peer.status === 'online' ? 'text-emerald-400' : 'text-zinc-600'}`}>
                      {statusLabel(peer.status)}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat area ─────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950/60 relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleFileDrop}
      >
        {/* Drag overlay */}
        {isDragging && selectedFriend && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/85 backdrop-blur-sm border-2 border-dashed border-emerald-500/50 rounded-r-xl pointer-events-none">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4">
              <Paperclip className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-[14px] font-semibold text-zinc-200">Drop to send</p>
            <p className="text-[10px] text-zinc-500 mt-1 font-mono">PDF, DOCX, images, and more</p>
          </div>
        )}

        {!selectedFriend ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 select-none">
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/[0.06] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-zinc-700" />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-medium text-zinc-400">No conversation selected</p>
              <p className="text-[9px] text-zinc-600 mt-1 font-mono uppercase tracking-wider">Pick a friend to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05] bg-zinc-900/30 shrink-0">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/[0.08] flex items-center justify-center font-mono text-[10px] font-bold text-zinc-200">
                  {selectedFriend.initials}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${statusDot(selectedFriend.status)}`} />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-zinc-100 leading-none">{selectedFriend.name}</p>
                <p className={`text-[9px] mt-0.5 ${selectedFriend.status === 'flow' ? 'text-amber-400' : selectedFriend.status === 'online' ? 'text-emerald-400' : 'text-zinc-600'}`}>
                  {statusLabel(selectedFriend.status)}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[8px] font-mono text-zinc-600 bg-zinc-900 border border-white/[0.04] px-2 py-0.5 rounded-full">Encrypted</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-7 h-7 rounded-lg bg-zinc-800/60 border border-white/[0.06] flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all cursor-pointer"
                  title="Attach file"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Upload progress bar */}
            {uploadingFile && (
              <div className="shrink-0 px-5 py-2 bg-zinc-900/60 border-b border-white/[0.04]">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-zinc-300 truncate">{uploadingFile.name}</span>
                      <span className="text-[9px] text-zinc-500 ml-2 shrink-0">{uploadingFile.progress}%</span>
                    </div>
                    <div className="h-0.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-200"
                        style={{ width: `${uploadingFile.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages scroll area */}
            <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2 scrollbar-none">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 select-none">
                  <div className="w-11 h-11 rounded-full bg-zinc-900 border border-white/[0.06] flex items-center justify-center font-mono text-sm font-bold text-zinc-500">
                    {selectedFriend.initials}
                  </div>
                  <div className="text-center">
                    <p className="text-[11px] font-medium text-zinc-400">Say hi to {selectedFriend.name}</p>
                    <p className="text-[9px] text-zinc-600 mt-0.5 font-mono">Drag & drop files to share</p>
                  </div>
                </div>
              ) : (
                messageGroups.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-[1px] bg-white/[0.04]" />
                      <span className="text-[8.5px] font-mono text-zinc-600 uppercase tracking-wider shrink-0">{group.date}</span>
                      <div className="flex-1 h-[1px] bg-white/[0.04]" />
                    </div>
                    <div className="space-y-2">
                      {group.messages.map((msg, idx) => {
                        const prev = idx > 0 ? group.messages[idx - 1] : null;
                        const isGrouped = prev && prev.isSelf === msg.isSelf;
                        const isFile = msg.content.startsWith(FILE_MSG_PREFIX);
                        return (
                          <div key={msg.id} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'} ${isGrouped ? '' : 'mt-3'}`}>
                            <div className={`${isFile ? '' : 'max-w-[68%]'} ${msg.isSelf ? 'ml-auto' : 'mr-auto'}`}>
                              {!isGrouped && !msg.isSelf && !isFile && (
                                <p className="text-[9px] font-medium text-zinc-500 mb-1 px-1">{msg.senderName}</p>
                              )}
                              {renderMessageContent(msg)}
                              {isFile && (
                                <p className="text-[8.5px] text-zinc-600 mt-1 px-1 text-right select-none">
                                  {formatTime(msg.createdAt)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Glassmorphic pill input */}
            <div className="shrink-0 px-4 pb-4 pt-2">
              <form onSubmit={handleSend}>
                <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-1.5 rounded-full flex items-center shadow-lg gap-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all cursor-pointer shrink-0"
                    title="Attach file"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${selectedFriend.name}… or drop a file`}
                    className="bg-transparent border-0 focus:ring-0 text-sm py-1.5 px-2 flex-1 outline-none text-zinc-200 placeholder-zinc-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0 shadow-[0_2px_12px_rgba(52,211,153,0.35)]"
                  >
                    <Send className="w-3.5 h-3.5 text-zinc-900" />
                  </button>
                </div>
              </form>
              <p className="text-[7.5px] font-mono text-zinc-700 mt-1.5 px-2">
                Drag & drop any file · Click 📎 to browse · Enter to send
              </p>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
