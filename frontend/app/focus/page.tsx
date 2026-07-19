'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '../../lib/socket';
import { FascaCard } from '../../components/ui/FascaCard';

interface PeerInFlow {
  id: string;
  name: string;
  initials: string;
} 

export default function FocusTakeoverPage() {
  const router = useRouter();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60); // 25 minutes
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [peersInFlow, setPeersInFlow] = useState<PeerInFlow[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Timer logic
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= totalSeconds) {
          if (timerRef.current) clearInterval(timerRef.current);
          return totalSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [totalSeconds]);

  // 2. Socket.io status update on mount/unload
  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    socket.emit('updateFocusState', { isFocusing: true });

    // Listen to peer changes
    socket.on('friendFocusStateChanged', (data: { userId: string; name: string; isFocusing: boolean }) => {
      setPeersInFlow((prev) => {
        const initials = data.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
        if (data.isFocusing) {
          if (prev.some((p) => p.id === data.userId)) return prev;
          if (data.userId === 'usr-1' || data.name.includes('Alex')) return prev; // exclude self
          return [...prev, { id: data.userId, name: data.name.split(' ')[0], initials }];
        } else {
          return prev.filter((p) => p.id !== data.userId && !p.name.includes(data.name.split(' ')[0]));
        }
      });
    });

    const handleBeforeUnload = () => {
      socket.emit('updateFocusState', { isFocusing: false });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      socket.emit('updateFocusState', { isFocusing: false });
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.disconnect();
    };
  }, []);

  // 3. Escape key listener for termination confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfirmModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleExit = () => {
    const socket = getSocket();
    socket.emit('updateFocusState', { isFocusing: false });
    router.push('/dashboard');
  };

  const timeLeft = Math.max(0, totalSeconds - elapsedSeconds);
  const progress = elapsedSeconds / totalSeconds;
  
  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // SVG parameters
  const strokeLength = 80;
  const strokeDashoffset = strokeLength * (1 - progress);

  return (
    <div className="min-h-screen w-screen bg-fouzar-bg text-fouzar-text-primary flex flex-col items-center justify-between py-12 relative overflow-hidden select-none">
      
      {/* 4s breathing radial pulse inline style */}
      <style>{`
        @keyframes radialBreathe {
          0%, 100% { opacity: 0.05; transform: scale(0.95); }
          50% { opacity: 0.16; transform: scale(1.05); }
        }
        .breathing-pulse {
          animation: radialBreathe 4s ease-in-out infinite;
        }
        .text-glow {
          text-shadow: 0 0 12px rgba(124, 92, 252, 0.3);
        }
      `}</style>

      {/* Breathing background pulse */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,92,252,0.15)_0%,transparent_60%)] breathing-pulse pointer-events-none z-0" />

      {/* Spacer to push contents down */}
      <div className="shrink-0" />

      {/* Main Focus Frame Content */}
      <div className="flex flex-col items-center space-y-12 z-10">
        
        {/* Large sharp square targeting frame */}
        <div className="relative w-64 h-64 flex flex-col items-center justify-center">
          
          {/* Target Bracket Box SVG */}
          <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full pointer-events-none">
            {/* Guide background corners */}
            <path d="M 10,50 L 10,10 L 50,10" stroke="#2a2a3a" strokeWidth="2" fill="none" strokeOpacity="0.4" />
            <path d="M 150,10 L 190,10 L 190,50" stroke="#2a2a3a" strokeWidth="2" fill="none" strokeOpacity="0.4" />
            <path d="M 190,150 L 190,190 L 150,190" stroke="#2a2a3a" strokeWidth="2" fill="none" strokeOpacity="0.4" />
            <path d="M 50,190 L 10,190 L 10,150" stroke="#2a2a3a" strokeWidth="2" fill="none" strokeOpacity="0.4" />

            {/* Active violet brackets clockwise fill */}
            <path d="M 10,50 L 10,10 L 50,10" stroke="#7c5cfc" strokeWidth="2.5" fill="none" strokeDasharray="80" strokeDashoffset={strokeDashoffset} strokeLinecap="square" />
            <path d="M 150,10 L 190,10 L 190,50" stroke="#7c5cfc" strokeWidth="2.5" fill="none" strokeDasharray="80" strokeDashoffset={strokeDashoffset} strokeLinecap="square" />
            <path d="M 190,150 L 190,190 L 150,190" stroke="#7c5cfc" strokeWidth="2.5" fill="none" strokeDasharray="80" strokeDashoffset={strokeDashoffset} strokeLinecap="square" />
            <path d="M 50,190 L 10,190 L 10,150" stroke="#7c5cfc" strokeWidth="2.5" fill="none" strokeDasharray="80" strokeDashoffset={strokeDashoffset} strokeLinecap="square" />
          </svg>

          {/* Time content centered inside the frame */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-light tracking-widest text-fouzar-text-primary text-glow select-none">
              {formatTime(timeLeft)}
            </span>
            <div className="flex flex-col items-center mt-3 text-center">
              <span className="text-[7px] font-mono text-fouzar-text-secondary uppercase tracking-[0.25em]">
                SESSION DURATION
              </span>
              <span className="text-[8.5px] font-mono text-[#7c5cfc] mt-0.5 uppercase tracking-wider">
                {formatTime(elapsedSeconds)} ELAPSED
              </span>
            </div>
          </div>

        </div>

        {/* Peers In Flow Row Section */}
        <div className="space-y-4 text-center">
          <span className="text-[8px] font-mono text-fouzar-text-secondary uppercase tracking-[0.25em] block">
            IN FLOW
          </span>

          <div className="flex justify-center items-center gap-6">
            {peersInFlow.map((peer) => (
              <div key={peer.id} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-8 h-8 rounded-none border border-[#ff2d55] shadow-[0_0_8px_rgba(255,45,85,0.25)] bg-fouzar-card flex items-center justify-center font-mono text-[9px] font-bold text-[#ff2d55]">
                  {peer.initials}
                </div>
                <span className="text-[7.5px] font-mono text-fouzar-text-secondary uppercase tracking-wider">
                  {peer.name}
                </span>
              </div>
            ))}
            {peersInFlow.length === 0 && (
              <span className="text-[8.5px] font-mono text-fouzar-text-secondary uppercase tracking-widest block italic py-1">
                No peers in flow. Hold the signal.
              </span>
            )}
          </div>
        </div>

        {/* Muted Signal footer statement */}
        <p className="text-[8px] font-mono text-fouzar-text-secondary italic uppercase tracking-[0.15em] select-none text-center">
          The signal is clear. Your peers are watching.
        </p>

      </div>

      {/* Exit rectangular button at very bottom */}
      <div className="shrink-0 z-10 mt-6">
        <button
          onClick={() => setShowConfirmModal(true)}
          className="px-8 py-2.5 bg-transparent border border-[#ff2d55] hover:bg-[#ff2d55]/10 text-[#ff2d55] font-mono text-[9px] uppercase tracking-[0.25em] rounded-none transition-colors cursor-pointer"
        >
          EXIT SESSION
        </button>
      </div>

      {/* 5. Custom Modal Termination Overlay on keydown escape/exit click */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-fouzar-bg/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <FascaCard className="w-full max-w-xs p-6 border-[#ff2d55] rounded-none text-center space-y-4 shadow-[0_0_30px_rgba(255,45,85,0.15)]">
              <h4 className="font-serif text-xs font-bold text-[#ff2d55] tracking-widest uppercase">
                CONFIRM TERMINATION
              </h4>
              <p className="text-[9px] font-sans text-fouzar-text-secondary leading-relaxed">
                Are you sure you want to disconnect from this deep flow session? Your peers will detect the signal break.
              </p>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2 bg-[#7c5cfc] hover:opacity-90 text-[#0a0a0f] font-mono text-[9px] uppercase tracking-wider rounded-none cursor-pointer"
                >
                  RESUME
                </button>
                <button
                  onClick={handleExit}
                  className="flex-1 py-2 bg-transparent border border-[#ff2d55] text-[#ff2d55] hover:bg-[#ff2d55]/10 font-mono text-[9px] uppercase tracking-wider rounded-none cursor-pointer"
                >
                  EXIT
                </button>
              </div>
            </FascaCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Watermark in bottom right corner */}
      <div className="absolute bottom-4 right-4 z-10 font-serif text-[9px] font-bold tracking-[0.2em] text-fouzar-text-secondary/20 select-none uppercase pointer-events-none">
        FASCA SECURE DEPTH
      </div>

    </div>
  );
}
