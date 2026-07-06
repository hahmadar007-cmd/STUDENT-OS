"use client";

import { useState, useEffect } from "react";
import { Play, Users, Radio, Search } from "lucide-react";
import { getSocket } from "../../lib/socket";

interface GroupWatchPartyProps {
  groupId: string;
}

export function GroupWatchParty({ groupId }: GroupWatchPartyProps) {
  const [isLive, setIsLive] = useState(false);
  const [listeners, setListeners] = useState(1);
  const [currentVideo, setCurrentVideo] = useState("");
  const [videoInput, setVideoInput] = useState("");

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join_group_stream", groupId);

    const handleSync = (data: any) => {
      if (data.videoId) {
        setCurrentVideo(data.videoId);
        setIsLive(true);
      }
    };

    socket.on("group_stream_sync", handleSync);
    return () => {
      socket.off("group_stream_sync", handleSync);
    };
  }, [groupId]);

  const handleSetVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#&?]*).*/;
    const match = videoInput.match(regExp);
    let videoId = "";
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      videoId = videoInput; // fallback if it's just an ID
    }
    
    if (videoId) {
      setCurrentVideo(videoId);
      setVideoInput("");
      
      // Auto go-live if not live
      if (!isLive) {
        setIsLive(true);
      }
      
      const socket = getSocket();
      socket.emit("group_stream_broadcast", {
        groupId,
        videoId,
        action: "play",
        timestamp: 0,
      });
    }
  };

  const toggleLive = () => {
    const socket = getSocket();
    const newStatus = !isLive;
    setIsLive(newStatus);
    if (newStatus && currentVideo) {
      socket.emit("group_stream_broadcast", {
        groupId,
        videoId: currentVideo,
        action: "play",
        timestamp: 0,
      });
    }
  };

  return (
    <div className="w-full bg-fouzar-surface/50 border border-fouzar-border rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-fouzar-border/60 flex items-center justify-between bg-fouzar-surface/80">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-fouzar-accent/10 rounded-lg">
            <Radio className="w-4 h-4 text-fouzar-accent" />
          </div>
          <h3 className="font-semibold text-base">Watch Party</h3>
        </div>

        <div className="flex items-center space-x-3">
          {isLive && (
            <div className="flex items-center space-x-1.5 text-xs text-fouzar-text-secondary">
              <Users className="w-3.5 h-3.5" />
              <span>{listeners} Listening</span>
            </div>
          )}
          <button
            onClick={toggleLive}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
              isLive
                ? "bg-fouzar-signal/20 text-fouzar-signal border border-fouzar-signal/30"
                : "bg-fouzar-elevated text-fouzar-text-secondary hover:bg-fouzar-surface"
            }`}
          >
            {isLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-fouzar-signal animate-pulse" />
                <span>Live</span>
              </>
            ) : (
              <span>Go Live</span>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[200px]">
        {isLive && currentVideo ? (
          <div className="w-full aspect-video rounded-lg overflow-hidden border border-fouzar-border">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${currentVideo}?autoplay=1`}
              title="YouTube Watch Party"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-md mx-auto">
            <div className="flex flex-col items-center space-y-3 text-fouzar-text-secondary">
              <div className="w-12 h-12 rounded-full bg-fouzar-elevated/50 flex items-center justify-center">
                <Play className="w-5 h-5 text-fouzar-text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-fouzar-text-secondary">No Active Stream</p>
                <p className="text-xs mt-1">Paste a YouTube link below to start a synced watch party.</p>
              </div>
            </div>
            
            <form onSubmit={handleSetVideo} className="flex items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-secondary" />
                <input
                  type="text"
                  placeholder="Paste YouTube URL or ID"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-fouzar-elevated/50 border border-fouzar-border/50 rounded-lg text-sm text-fouzar-text-primary placeholder:text-fouzar-text-secondary focus:outline-none focus:border-fouzar-accent/50 focus:ring-1 focus:ring-fouzar-accent/50 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!videoInput.trim()}
                className="px-5 py-2.5 bg-fouzar-accent/20 hover:bg-fouzar-accent text-fouzar-accent hover:text-fouzar-text-primary border border-fouzar-accent/30 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:hover:bg-fouzar-accent/20 disabled:hover:text-fouzar-accent"
              >
                Host
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
