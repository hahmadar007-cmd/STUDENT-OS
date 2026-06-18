"use client";

import { useState } from "react";
import { Search, Play, Loader2 } from "lucide-react";

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
  onVideoSelect: (url: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${getBackendUrl()}/videos/standalone-search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setResults(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch results.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (video: SearchResult) => {
    const videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    if (folderId) {
      try {
        await fetch(
          `${getBackendUrl()}/videos`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify({ folderId, videoUrl }),
          }
        );
      } catch (err) {
        console.error("Failed to save video to folder", err);
      }
    }
    onVideoSelect(videoUrl);
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      <form onSubmit={handleSearch} className="flex space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search YouTube for educational videos..."
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-20">
        {results.map((video) => (
          <div
            key={video.videoId}
            onClick={() => handleSelect(video)}
            className="group relative bg-slate-900/40 rounded-xl overflow-hidden border border-slate-800/60 hover:border-purple-500/50 transition-all cursor-pointer"
          >
            <div className="aspect-video relative">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-mono">
                {video.duration}
              </div>
            </div>
            <div className="p-3">
              <h4 className="font-medium text-sm line-clamp-2 leading-snug">
                {video.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1">{video.author}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
