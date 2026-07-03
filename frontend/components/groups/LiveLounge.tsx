'use client';

import React, { useState } from 'react';
import { Video, MicOff, VideoOff, PhoneOff, Mic, Camera } from 'lucide-react';

interface LiveLoungeProps {
  groupId: string;
}

export function LiveLounge({ groupId }: LiveLoungeProps) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  const jitsiUrl = `https://meet.jit.si/student-os-group-${groupId}`;

  if (!isCallActive) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full w-full p-8">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fouzar-accent/20 via-transparent to-fouzar-accent-ice/10 blur-xl pointer-events-none" />
          <div className="relative border border-fouzar-border/60 bg-fouzar-surface/60 backdrop-blur-md rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-fouzar-accent/10 border border-fouzar-accent/30 flex items-center justify-center shadow-[0_0_24px_rgba(124,92,252,0.2)]">
              <Video className="w-8 h-8 text-fouzar-accent" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="font-sans text-lg font-light text-fouzar-text-primary tracking-wide">
                Live Lounge
              </h2>
              <p className="text-[10px] font-mono text-fouzar-text-secondary uppercase tracking-widest">
                Group · {groupId}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[8px] font-mono text-fouzar-text-tertiary uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-fouzar-accent-success animate-pulse" />
              Powered by Jitsi Meet · End-to-end encrypted
            </div>

            <button
              type="button"
              onClick={() => setIsCallActive(true)}
              className="flex items-center gap-2.5 px-7 py-3 bg-fouzar-accent hover:opacity-90 text-white font-mono text-[10px] uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(124,92,252,0.35)] hover:shadow-[0_0_32px_rgba(124,92,252,0.5)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span className="text-base">🎙️</span>
              Enter Live Lounge
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden">
      <iframe
        src={jitsiUrl}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="flex-1 w-full h-full border-0 rounded-[6px]"
        style={{ minHeight: '400px' }}
      />

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-fouzar-surface/80 backdrop-blur-xl border border-fouzar-border/50 rounded-full shadow-2xl">
        <button
          type="button"
          onClick={() => setIsMuted((p) => !p)}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            isMuted
              ? 'bg-fouzar-signal/20 border border-fouzar-signal/40 text-fouzar-signal'
              : 'bg-fouzar-surface/60 border border-fouzar-border/40 text-fouzar-text-secondary hover:text-fouzar-text-primary'
          }`}
        >
          {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          {isMuted ? 'Unmute' : 'Mute'}
        </button>

        <button
          type="button"
          onClick={() => setIsCameraOff((p) => !p)}
          title={isCameraOff ? 'Camera On' : 'Camera Off'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            isCameraOff
              ? 'bg-fouzar-signal/20 border border-fouzar-signal/40 text-fouzar-signal'
              : 'bg-fouzar-surface/60 border border-fouzar-border/40 text-fouzar-text-secondary hover:text-fouzar-text-primary'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
          {isCameraOff ? 'Cam On' : 'Cam Off'}
        </button>

        <div className="w-[1px] h-4 bg-fouzar-border/40 mx-1" />

        <button
          type="button"
          onClick={() => setIsCallActive(false)}
          title="Leave call"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fouzar-signal/20 border border-fouzar-signal/40 text-fouzar-signal hover:bg-fouzar-signal/30 text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer"
        >
          <PhoneOff className="w-3 h-3" />
          Leave
        </button>
      </div>
    </div>
  );
}
