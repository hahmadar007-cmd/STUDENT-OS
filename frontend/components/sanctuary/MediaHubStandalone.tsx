"use client";

import { useState, useRef } from "react";
import { Search, Play, Loader2, Tv, Clock, User, X, ChevronDown, Minimize2, Maximize2 } from "lucide-react";
import { getBackendUrl, getAuthToken } from "../../lib/api";

interface SearchResult {
  videoId: string;
  title: string;
  thumbnail: string;
  author: string;
  duration: string;
}

export function MediaHubStandalone({
  folderId,
  onVideoSelect,
}: {
  folderId: string | null;
  onVideoSelect: (url: string, videoId: string, title: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [activeVideo, setActiveVideo] = useState<SearchResult | null>(null);
  const [isSearchMinimized, setIsSearchMinimized] = useState(false);
  const [isVideoMinimized, setIsVideoMinimized] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = ["Machine Learning", "Data Structures", "React Tutorial", "Physics Lectures", "Mathematics"];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Check if it's a direct YouTube URL
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#&?]*).*/;
    const match = query.match(regExp);
    if (match && match[2].length === 11) {
      const videoId = match[2];
      setActiveVideo({
        videoId,
        title: "Pasted YouTube Video",
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        author: "Direct Link",
        duration: "Live",
      });
      setIsSearchMinimized(true);
      setIsVideoMinimized(false);
      setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      onVideoSelect(`https://www.youtube.com/watch?v=${videoId}`, videoId, "Pasted YouTube Video");
      setQuery("");
      return;
    }

    setLoading(true);
    setError("");
    setHasSearched(true);
    setActiveVideo(null);
    try {
      const res = await fetch(
        `${getBackendUrl()}/youtube/standalone-search?q=${encodeURIComponent(query)}&maxResults=20&limit=20`,
        { headers: { Authorization: `Bearer ${getAuthToken()}` } }
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data);
      if (data.length === 0) setError("No results found. Try a different search.");
    } catch {
      setError("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (video: SearchResult) => {
    setActiveVideo(video);
    // Auto-minimize search if on smaller screens or just for better view
    setIsSearchMinimized(true);
    setIsVideoMinimized(false);
    // Scroll player into view smoothly
    setTimeout(() => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    if (folderId) {
      fetch(`${getBackendUrl()}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ folderId, videoUrl }),
      }).catch(() => {});
    }
    onVideoSelect(videoUrl, video.videoId, video.title);
  };

  const quickSearch = (term: string) => {
    setQuery(term);
    setTimeout(() => {
      const form = inputRef.current?.closest("form");
      form?.requestSubmit();
    }, 50);
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">

      {/* ── Search bar ─────────────────────────────────────── */}
      <div className={`shrink-0 border-b border-slate-800/50 transition-all ${isSearchMinimized ? 'pb-2' : 'pb-4'}`}>
        <div className="flex items-center justify-between mb-3 mt-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Tv className="w-3.5 h-3.5 text-red-400" />
            </div>
            <span className="text-sm font-sans font-medium uppercase tracking-wider text-slate-400">YT Search</span>
            <div className="ml-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-emerald-400 uppercase">Live</span>
            </div>
          </div>
          
          <button
            onClick={() => setIsSearchMinimized(!isSearchMinimized)}
            className="p-1.5 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-fouzar-text-primary transition-colors cursor-pointer"
            title={isSearchMinimized ? "Expand Search" : "Minimize Search"}
          >
            {isSearchMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>

        {!isSearchMinimized && (
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-secondary pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search YouTube..."
                className="w-full bg-slate-900/70 border border-slate-700/60 hover:border-slate-600 focus:border-red-500/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-fouzar-text-primary placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-red-500/20 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold text-fouzar-text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 0 16px rgba(239,68,68,0.3)' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </form>
        )}
      </div>

      {/* ── Fixed Inline Player ─────────────────────────────── */}
      {activeVideo && (
        <div ref={playerRef} className="shrink-0 mb-4 rounded-2xl overflow-hidden border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
          {/* Player header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800/50">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-fouzar-text-primary truncate">{activeVideo.title}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => setIsVideoMinimized(!isVideoMinimized)}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-fouzar-text-primary transition-colors cursor-pointer"
                title={isVideoMinimized ? "Expand Video" : "Minimize Video"}
              >
                {isVideoMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setActiveVideo(null)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 ml-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Leave Video</span>
              </button>
            </div>
          </div>
          {/* iframe */}
          {!isVideoMinimized && (
            <>
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1&rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                />
              </div>
              {/* Channel info */}
              <div className="px-4 py-2.5 bg-slate-900/60 flex items-center gap-2">
                <User className="w-3 h-3 text-fouzar-text-secondary" />
                <span className="text-xs text-slate-400 font-sans">{activeVideo.author}</span>
                <span className="ml-auto text-[10px] font-mono text-fouzar-text-secondary flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />{activeVideo.duration}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Scrollable content area ─────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-sans">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-slate-800/60 bg-slate-900/40 animate-pulse">
                <div className="aspect-video bg-slate-800/60" />
                <div className="p-2.5 space-y-1.5">
                  <div className="h-2.5 bg-slate-800 rounded w-4/5" />
                  <div className="h-2 bg-slate-800/60 rounded w-2/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Intro / suggestions */}
        {!loading && !hasSearched && (
          <div className="flex flex-col items-center justify-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(168,85,247,0.15))', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Tv className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <p className="text-fouzar-text-primary font-semibold text-sm mb-1">Search & watch in one place</p>
              <p className="text-fouzar-text-secondary text-xs">Click any result to play it right here</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => quickSearch(s)}
                  className="px-3 py-1.5 rounded-full text-xs font-sans uppercase tracking-wider text-slate-400 border border-slate-700 hover:border-red-500/40 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results grid */}
        {!loading && results.length > 0 && (
          <>
            {activeVideo && (
              <div className="flex items-center gap-2">
                <ChevronDown className="w-3 h-3 text-fouzar-text-secondary" />
                <span className="text-xs font-sans uppercase tracking-wider text-fouzar-text-secondary">
                  {results.length} results — click to switch video
                </span>
              </div>
            )}
            {!activeVideo && (
              <span className="text-xs font-sans uppercase tracking-wider text-fouzar-text-secondary block">
                {results.length} results — click to play
              </span>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {results.map((video) => (
                <div
                  key={video.videoId}
                  onClick={() => handleSelect(video)}
                  className={`group cursor-pointer rounded-xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 ${
                    activeVideo?.videoId === video.videoId
                      ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                      : 'border-slate-800/60 hover:border-red-500/30'
                  }`}
                  style={{ background: activeVideo?.videoId === video.videoId ? 'rgba(239,68,68,0.05)' : 'rgba(15,15,25,0.6)' }}
                >
                  {/* Thumbnail */}
                  <div className="aspect-video relative overflow-hidden">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', boxShadow: '0 0 20px rgba(239,68,68,0.5)' }}>
                        <Play className="w-4 h-4 text-fouzar-text-primary ml-0.5" fill="white" />
                      </div>
                    </div>
                    {activeVideo?.videoId === video.videoId && (
                      <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-red-500 text-[8px] font-mono font-bold text-fouzar-text-primary uppercase">
                        Playing
                      </div>
                    )}
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/80 text-[9px] font-mono text-fouzar-text-primary flex items-center gap-1">
                      <Clock className="w-2 h-2" />{video.duration}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-2.5">
                    <h4 className="text-[11px] font-semibold text-fouzar-text-primary line-clamp-2 leading-snug mb-1">{video.title}</h4>
                    <p className="text-xs text-fouzar-text-secondary font-sans truncate">{video.author}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
