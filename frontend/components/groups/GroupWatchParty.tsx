"use client";

import { useState, useEffect } from "react";
import { Play, Users, Radio } from "lucide-react";
import { getSocket } from "../../lib/socket";

interface GroupWatchPartyProps {
  groupId: string;
}

export function GroupWatchParty({ groupId }: GroupWatchPartyProps) {
  const [isLive, setIsLive] = useState(false);
  const [listeners, setListeners] = useState(1);
  const [currentVideo, setCurrentVideo] = useState("");

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
    <div className="w-full bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/80">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <Radio className="w-4 h-4 text-purple-400" />
          </div>
          <h3 className="font-semibold text-sm">Watch Party</h3>
        </div>

        <div className="flex items-center space-x-3">
          {isLive && (
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Users className="w-3.5 h-3.5" />
              <span>{listeners} Listening</span>
            </div>
          )}
          <button
            onClick={toggleLive}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center space-x-1.5 ${
              isLive
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {isLive ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
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
          <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-800">
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
          <div className="flex flex-col items-center text-center space-y-3 text-slate-500">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Play className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">No Active Stream</p>
              <p className="text-xs mt-1">Start a watch party to sync videos with your group.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
