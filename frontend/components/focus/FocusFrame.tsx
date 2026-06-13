'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, Volume2, VolumeX, Edit2, Check, Clock, ShieldAlert } from 'lucide-react';
import { getSocket } from '../../lib/socket';
import { useFouzar } from '../../lib/FouzarContext';

interface FocusFrameProps {
  onStateChange?: (isFocusing: boolean) => void;
  peersCount?: number;
  initialMinutes?: number;
  autoStart?: boolean;
}

export const FocusFrame: React.FC<FocusFrameProps> = ({
  onStateChange,
  peersCount = 3,
  initialMinutes = 25,
  autoStart = false,
}) => {
  const { isFlowActive, setIsFlowActive, mode } = useFouzar();
  const [minutes, setMinutes] = useState(initialMinutes);
  const [customMinutes, setCustomMinutes] = useState('');
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSeconds = minutes * 60;
  const progressPercent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  useEffect(() => {
    setSecondsLeft(minutes * 60);
  }, [minutes]);

  useEffect(() => {
    if (autoStart) {
      handleStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (isFlowActive && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isFlowActive) {
      playAlarm();
      handleStop();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isFlowActive, secondsLeft]);

  const playAlarm = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5 note (calm chime)
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 1.2); // G5 note
      
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.8);
    } catch (e) {
      console.error('Audio synthesis failed', e);
    }
  };

  const handleStart = () => {
    setIsFlowActive(true);
    onStateChange?.(true);

    const socket = getSocket();
    if (socket.connected) {
      socket.emit('updateFocusState', { isFocusing: true });
    }
  };

  const handleStop = () => {
    setIsFlowActive(false);
    setSecondsLeft(minutes * 60);
    onStateChange?.(false);

    if (timerRef.current) clearInterval(timerRef.current);

    const socket = getSocket();
    if (socket.connected) {
      socket.emit('updateFocusState', { isFocusing: false });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customMinutes, 10);
    if (!isNaN(val) && val > 0 && val <= 180) {
      setMinutes(val);
      setIsEditingTime(false);
    }
  };

  const presetTimes = [15, 25, 45, 60];
  const peers: any[] = [];

  return (
    <>
      {/* 1. IDLE WIDGET (Clean, borderless, contextual space card) */}
      <div className="flex flex-col items-center justify-between h-full w-full p-4 select-none">
        
        {/* Header Options */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-fouzar-border/30">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-fouzar-accent" />
            <span className="font-sans font-light text-[9px] uppercase tracking-[0.25em] text-fouzar-text-primary">
              Focus Core
            </span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 hover:bg-white/5 rounded-[4px] text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-fouzar-accent" />}
          </button>
        </div>

        {/* Preset selections */}
        {!isFlowActive && (
          <div className="flex items-center gap-1.5 mt-4">
            {presetTimes.map((preset) => (
              <button
                key={preset}
                onClick={() => setMinutes(preset)}
                className={`px-3 py-1 rounded-[4px] text-[9px] font-mono transition-colors cursor-pointer border ${
                  minutes === preset
                    ? 'border-fouzar-accent text-fouzar-accent bg-fouzar-accent/5 font-semibold text-glow-accent'
                    : 'border-fouzar-border/30 text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-fouzar-border'
                }`}
              >
                {preset}M
              </button>
            ))}

            <button
              onClick={() => setIsEditingTime(!isEditingTime)}
              className="p-1 rounded-[4px] border border-fouzar-border/30 text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Custom Form */}
        {!isFlowActive && isEditingTime && (
          <motion.form
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCustomTimeSubmit}
            className="flex gap-2 items-center mt-3 w-full max-w-[150px]"
          >
            <input
              type="number"
              placeholder="Minutes"
              min="1"
              max="180"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="flex-1 bg-transparent border-b border-fouzar-border text-center font-mono text-xs text-fouzar-text-primary focus:outline-none focus:border-fouzar-accent py-0.5"
            />
            <button
              type="submit"
              className="p-1 bg-fouzar-accent/10 text-fouzar-accent border border-fouzar-accent/20 rounded-[4px] cursor-pointer"
            >
              <Check className="w-3 h-3" />
            </button>
          </motion.form>
        )}

        {/* Glowing circle timer */}
        <div className="relative w-36 h-36 flex items-center justify-center my-6">
          {/* Ambient Glow ring */}
          <div className="absolute inset-0 rounded-full border border-fouzar-border flex items-center justify-center">
            <div className="w-[90%] h-[90%] rounded-full border border-dashed border-fouzar-border/40" />
          </div>

          <span className="text-3xl font-mono text-fouzar-text-primary tracking-wider text-glow-accent font-light">
            {formatTime(secondsLeft)}
          </span>
        </div>

        <button
          onClick={handleStart}
          className="w-full py-2 bg-fouzar-accent hover:opacity-90 text-fouzar-bg text-[10px] font-sans font-medium uppercase tracking-[0.2em] rounded-[4px] transition-all cursor-pointer shadow-[0_0_15px_var(--fouzar-accent-glow)]"
        >
          Start Flow
        </button>
      </div>

      {/* 2. SPATIAL TAKEVER BACKDROP (Centering spatial focus, blurs rest of page) */}
      <AnimatePresence>
        {isFlowActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[100] bg-fouzar-bg/95 flex flex-col items-center justify-center text-center p-8 select-none"
          >
            {/* Dynamic glowing radial hardware effect */}
            <motion.div
              animate={{ opacity: [0.1, 0.22, 0.1] }}
              transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--fouzar-accent-glow)_0%,transparent_60%)] pointer-events-none"
            />

            <motion.div
              initial={{ scale: 0.97, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 15 }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="max-w-md w-full flex flex-col items-center z-10"
            >
              {/* Header Status */}
              <div className="mb-10 text-center">
                <span className="text-[9px] uppercase tracking-[0.3em] text-fouzar-accent text-glow-accent font-light">
                  Deep Flow Mode
                </span>
                <h2 className="font-sans text-xl text-fouzar-text-primary mt-2.5 tracking-wide font-light">
                  Calm your thoughts.
                </h2>
              </div>

              {/* Large ambient glowing countdown */}
              <div className="relative w-48 h-48 flex items-center justify-center mb-10">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="var(--fouzar-border)"
                    strokeWidth="1.5"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke="var(--fouzar-accent)"
                    strokeWidth="2"
                    fill="transparent"
                    strokeDasharray="283"
                    animate={{ strokeDashoffset: 283 - (283 * progressPercent) / 100 }}
                    transition={{ duration: 0.5, ease: 'linear' }}
                    className="filter drop-shadow-[0_0_4px_var(--fouzar-accent)]"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-mono text-fouzar-text-primary tracking-widest font-extralight text-glow-accent">
                    {formatTime(secondsLeft)}
                  </span>
                  <span className="text-[7px] font-sans text-fouzar-text-secondary uppercase tracking-widest mt-1">
                    Remaining
                  </span>
                </div>
              </div>

              {/* Active desk presence list */}
              <div className="flex flex-col items-center gap-2 mb-12">
                <span className="text-[8px] font-sans uppercase tracking-[0.25em] text-fouzar-text-secondary">
                  Focusing in garden
                </span>
                <div className="flex gap-2">
                  {peers.map((peer, idx) => (
                    <div
                      key={idx}
                      className="w-7 h-7 rounded-full border border-fouzar-border bg-fouzar-card/50 flex items-center justify-center text-[9px] font-mono font-medium text-fouzar-text-primary shadow-lg"
                      title={`${peer.name} is focusing`}
                    >
                      {peer.initials}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStop}
                className="px-8 py-2 bg-transparent hover:bg-white/5 border border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-text-primary text-[9px] font-sans uppercase tracking-[0.2em] rounded-[4px] transition-colors cursor-pointer"
              >
                Exit Flow
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
