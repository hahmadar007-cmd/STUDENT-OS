'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Users, 
  Flame, 
  Clock, 
  Lock, 
  Unlock, 
  Layers, 
  Compass, 
  ChevronRight, 
  Settings,
  Plus,
  BarChart2
} from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';
import { getSocket } from '../../lib/socket';

interface PeerPresence {
  name: string;
  initials: string;
  avatarUrl?: string;
  isFocusing: boolean;
  status: 'online' | 'idle' | 'offline';
}

/**
 * @file FocusCard.tsx
 * @description The premium centerpiece of the Fouzar interface, designed as a 
 * highly interactive, glassmorphic, and touch-optimized visual experience.
 * Inspired by high-end Dribbble concepts (Nixtio, RonDesignLab) and futuristic UI,
 * it eliminates traditional borders in favor of deep drop shadows, dynamic glow layers,
 * and high-contrast minimal elements.
 * 
 * Architectural Intent:
 * - Responsive Mobile-First Grid: Adapts seamlessly to standard viewport cards or desktop previews.
 * - Progressive Disclosure: Shifts states cleanly between configuration 'Idle' and high-focus 'Locked/Flow'.
 * - Rich Aesthetic Accents: Incorporates glowing circular gauges, connected node charts, and
 *   translucent project timeline capsules using Framer Motion animations.
 */
export const FocusCard: React.FC = () => {
  const { mode, isFlowActive, setIsFlowActive } = useFouzar();
  const [minutes, setMinutes] = useState(25);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [activeTab, setActiveTab] = useState<'flow' | 'nodes' | 'timeline'>('flow');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalSeconds = minutes * 60;
  const progressPercent = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  // Sync state with minutes selection
  useEffect(() => {
    setSecondsLeft(minutes * 60);
  }, [minutes]);

  // Main countdown loop
  useEffect(() => {
    if (isFlowActive && secondsLeft > 0) {
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isFlowActive) {
      triggerCalmChime();
      handleStopFlow();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isFlowActive, secondsLeft]);

  const triggerCalmChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 1.0); // G5
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    } catch (e) {
      console.warn('Calm Chime failed to play', e);
    }
  };

  const handleStartFlow = () => {
    setIsFlowActive(true);
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('updateFocusState', { isFocusing: true });
    }
  };

  const handleStopFlow = () => {
    setIsFlowActive(false);
    setSecondsLeft(minutes * 60);
    if (timerRef.current) clearInterval(timerRef.current);
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('updateFocusState', { isFocusing: false });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Preset data reflecting RonDesignLab/Nixtio designs
  const activePeers: PeerPresence[] = [
    { name: 'Elena Rostova', initials: 'ER', isFocusing: true, status: 'online' },
    { name: 'Kai Takahashi', initials: 'KT', isFocusing: true, status: 'online' },
    { name: 'Devon Vance', initials: 'DV', isFocusing: false, status: 'idle' },
  ];

  const mockTimelineTasks = [
    { title: 'UX Research Synthesis', time: '10:00 - 11:30', progress: 85, color: '#c5a880', width: 'w-4/5' },
    { title: 'Interactive Framer Prototypes', time: '13:00 - 14:15', progress: 40, color: '#7c5cfc', width: 'w-2/5' },
    { title: 'Client Feedback Overhaul', time: '15:30 - 17:00', progress: 10, color: '#f59e0b', width: 'w-[12%]' },
  ];

  return (
    <div className="relative w-full max-w-xl mx-auto select-none font-sans">
      <AnimatePresence mode="wait">
        {!isFlowActive ? (
          /* ========================================================================= */
          /* IDLE CONFIGURATION STATE: Glassmorphic interactive workspace widget      */
          /* ========================================================================= */
          <motion.div
            key="idle-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full bg-fouzar-surface/40 backdrop-blur-2xl rounded-2xl p-6 md:p-8 flex flex-col shadow-2xl relative overflow-hidden"
          >
            {/* Ambient Background Glow Spotlights */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <div 
                className="absolute -top-20 -right-20 w-48 h-48 rounded-full blur-[80px] opacity-40 transition-colors duration-500"
                style={{
                  background: mode === 'greenhouse' 
                    ? 'radial-gradient(circle, rgba(234, 230, 223, 0.5) 0%, transparent 70%)'
                    : 'radial-gradient(circle, #7c5cfc 0%, transparent 70%)'
                }}
              />
              <div 
                className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full blur-[80px] opacity-30 transition-colors duration-500"
                style={{
                  background: mode === 'greenhouse' 
                    ? 'radial-gradient(circle, rgba(223, 217, 206, 0.4) 0%, transparent 70%)'
                    : 'radial-gradient(circle, #5865f2 0%, transparent 70%)'
                }}
              />
            </div>

            {/* CARD HEADER */}
            <div className="relative z-10 flex items-center justify-between pb-4 border-b border-fouzar-border/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-fouzar-accent animate-pulse" />
                <span className="font-sans font-normal text-[9px] uppercase tracking-[0.3em] text-fouzar-text-primary">
                  Fouzar Workspace Core
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
                  title={soundEnabled ? 'Mute Chimes' : 'Unmute Chimes'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-fouzar-accent" />}
                </button>
                <div className="flex items-center gap-1 text-[8px] font-mono bg-fouzar-accent/10 border border-fouzar-accent/20 px-2 py-0.5 rounded text-fouzar-accent tracking-wider">
                  V2.4
                </div>
              </div>
            </div>

            {/* TAB CONTAINER (SugarCRM / Nixtio Layout Switching) */}
            <div className="relative z-10 flex gap-2 mt-5 p-1 bg-fouzar-bg/50 rounded-lg self-center">
              <button
                onClick={() => setActiveTab('flow')}
                className={`px-4 py-1.5 rounded-md text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'flow' 
                    ? 'bg-fouzar-surface text-fouzar-accent shadow-md' 
                    : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
                }`}
              >
                Focus Timer
              </button>
              <button
                onClick={() => setActiveTab('nodes')}
                className={`px-4 py-1.5 rounded-md text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'nodes' 
                    ? 'bg-fouzar-surface text-fouzar-accent shadow-md' 
                    : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
                }`}
              >
                Study Nodes
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-1.5 rounded-md text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'timeline' 
                    ? 'bg-fouzar-surface text-fouzar-accent shadow-md' 
                    : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
                }`}
              >
                Timeline
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="relative z-10 py-6 min-h-[220px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {activeTab === 'flow' && (
                  <motion.div
                    key="flow-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center"
                  >
                    {/* Time Settings / Preset Grid */}
                    <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary mb-4">
                      Select Focus Session Span
                    </span>
                    <div className="flex gap-2.5 mb-6">
                      {[15, 25, 45, 60].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setMinutes(preset)}
                          className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border text-[11px] transition-all cursor-pointer ${
                            minutes === preset
                              ? 'border-fouzar-accent text-fouzar-accent bg-fouzar-accent/5 font-semibold text-glow-accent'
                              : 'border-fouzar-border/30 text-fouzar-text-secondary hover:border-fouzar-border hover:text-fouzar-text-primary'
                          }`}
                        >
                          <span className="font-mono">{preset}</span>
                          <span className="text-[7px] opacity-75 font-sans">MIN</span>
                        </button>
                      ))}
                    </div>

                    {/* Circular visual clock widget representing Ref 1 glass display */}
                    <div className="relative w-40 h-40 flex items-center justify-center rounded-full bg-fouzar-bg/30 shadow-[inset_0_2px_8px_rgba(255,255,255,0.02)] backdrop-blur-md mb-2">
                      <div className="absolute inset-0 rounded-full border border-fouzar-border/40 opacity-80" />
                      <div className="absolute inset-[8px] rounded-full border border-dashed border-fouzar-border/20" />
                      
                      {/* UI/UX overlay label from Ref 1 */}
                      <div className="absolute top-8 text-[7px] font-mono uppercase tracking-widest text-fouzar-text-secondary">
                        Cognitive Load
                      </div>
                      
                      <span className="text-3xl font-mono text-fouzar-text-primary tracking-widest font-extralight text-glow-accent">
                        {formatTime(secondsLeft)}
                      </span>

                      {/* Custom visual progress arc */}
                      <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          stroke="var(--fouzar-border)"
                          strokeWidth="0.75"
                          fill="transparent"
                          strokeDasharray="2 2"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="46"
                          stroke="var(--fouzar-accent)"
                          strokeWidth="1.5"
                          fill="transparent"
                          strokeDasharray="289"
                          strokeDashoffset={289 - (289 * progressPercent) / 100}
                          className="transition-all duration-300 opacity-60 filter drop-shadow-[0_0_2px_var(--fouzar-accent)]"
                        />
                      </svg>

                      {/* Accent statistics indicators matching Ref 1 */}
                      <div className="absolute bottom-8 flex gap-1.5 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-fouzar-accent animate-ping" />
                        <span className="text-[7px] font-mono uppercase tracking-wider text-fouzar-text-secondary">
                          Idle state active
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'nodes' && (
                  <motion.div
                    key="nodes-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full flex flex-col px-2"
                  >
                    {/* Active study garden node list, inspired by SugarCRM connecting nodes (Ref 2) */}
                    <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary mb-4 block">
                      Connected Garden Nodes
                    </span>

                    <div className="space-y-3">
                      {activePeers.map((peer, idx) => (
                        <div 
                          key={idx}
                          className="p-3.5 bg-fouzar-bg/40 border border-fouzar-border/20 rounded-xl flex items-center justify-between hover:border-fouzar-border transition-colors duration-200"
                        >
                          <div className="flex items-center gap-3">
                            {/* Circle avatar from Ref 2 */}
                            <div className="relative">
                              <div className="w-9 h-9 rounded-full bg-fouzar-surface border border-fouzar-border flex items-center justify-center font-mono text-xs font-bold text-fouzar-text-primary shadow-md">
                                {peer.initials}
                              </div>
                              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-fouzar-bg ${
                                peer.isFocusing ? 'bg-amber-500 animate-pulse' : 'bg-fouzar-accent'
                              }`} />
                            </div>
                            <div>
                              <h4 className="text-xs font-normal text-fouzar-text-primary leading-tight">{peer.name}</h4>
                              <p className="text-[9px] text-fouzar-text-secondary font-mono mt-0.5 uppercase tracking-wide">
                                {peer.isFocusing ? 'Deep Focusing' : 'Connected to Desk'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            {peer.isFocusing && (
                              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono text-[7px] uppercase tracking-wider rounded-md">
                                In Flow
                              </span>
                            )}
                            <button className="p-1 hover:bg-white/5 rounded-md text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer transition-colors">
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline-tab"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full flex flex-col px-2"
                  >
                    {/* Visual project timeline inspired by Nixtio (Ref 3) */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary">
                        Today's Blocks
                      </span>
                      <button className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-wider text-fouzar-accent hover:underline cursor-pointer">
                        <Plus className="w-2.5 h-2.5" /> Add Block
                      </button>
                    </div>

                    <div className="space-y-4">
                      {mockTimelineTasks.map((task, idx) => (
                        <div key={idx} className="flex flex-col gap-2">
                          <div className="flex justify-between items-baseline text-[9px] font-mono">
                            <span className="text-fouzar-text-primary font-normal">{task.title}</span>
                            <span className="text-fouzar-text-secondary">{task.time}</span>
                          </div>
                          {/* Sleek capsule progress bars from Nixtio (Ref 3) */}
                          <div className="h-2 w-full bg-fouzar-bg/60 rounded-full overflow-hidden relative border border-fouzar-border/10">
                            <div 
                              className={`h-full rounded-full transition-all duration-500`}
                              style={{ 
                                width: `${task.progress}%`,
                                backgroundColor: task.color,
                                boxShadow: `0 0 8px ${task.color}50`
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CARD FOOTER CTA */}
            <div className="relative z-10 mt-2">
              <button
                onClick={handleStartFlow}
                className="w-full py-3 bg-fouzar-accent hover:opacity-95 text-fouzar-bg text-[10px] font-mono uppercase tracking-[0.25em] rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_20px_var(--fouzar-accent-glow)] font-bold"
              >
                <Flame className="w-4 h-4 fill-fouzar-bg text-fouzar-bg" />
                Trigger Deep Flow
              </button>
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* FLOW / LOCKED STATE: High-contrast focus timer taking over visual canvas  */
          /* ========================================================================= */
          <motion.div
            key="flow-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-full bg-[#030305] border border-fouzar-accent/20 rounded-2xl p-8 md:p-10 flex flex-col items-center shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
          >
            {/* Pulsing Core Focus Glowing Aura */}
            <motion.div
              animate={{ opacity: [0.15, 0.35, 0.15] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--fouzar-accent-glow)_0%,transparent_60%)] pointer-events-none"
            />

            {/* Locked Visual Chip */}
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="px-3.5 py-1.5 bg-fouzar-accent/10 border border-fouzar-accent/30 rounded-full text-[8px] font-mono text-fouzar-accent uppercase tracking-[0.25em] flex items-center gap-1.5 text-glow-accent mb-6"
            >
              <Lock className="w-3 h-3 text-fouzar-accent animate-pulse" />
              Cognitive Isolation Active
            </motion.div>

            <h2 className="font-sans text-lg md:text-xl text-fouzar-text-primary text-center font-light tracking-wide max-w-xs mb-8">
              Focus on your current step. All notifications have been muted.
            </h2>

            {/* Giant High-Contrast Glowing Circular Countdown */}
            <div className="relative w-48 h-48 flex items-center justify-center mb-10">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="var(--fouzar-border)"
                  strokeWidth="1"
                  fill="transparent"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="var(--fouzar-accent)"
                  strokeWidth="2.2"
                  fill="transparent"
                  strokeDasharray="283"
                  animate={{ strokeDashoffset: 283 - (283 * progressPercent) / 100 }}
                  transition={{ duration: 0.5, ease: 'linear' }}
                  className="filter drop-shadow-[0_0_8px_var(--fouzar-accent)]"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-mono text-fouzar-text-primary tracking-widest font-extralight text-glow-accent">
                  {formatTime(secondsLeft)}
                </span>
                <span className="text-[7px] font-sans text-fouzar-text-secondary uppercase tracking-widest mt-1.5">
                  Time Remaining
                </span>
              </div>
            </div>

            {/* Visual indicator of active peers focusing with you */}
            <div className="flex flex-col items-center gap-2 mb-10">
              <span className="text-[7.5px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary">
                Focusing With You
              </span>
              <div className="flex -space-x-2">
                {activePeers.filter(p => p.isFocusing).map((peer, idx) => (
                  <div
                    key={idx}
                    className="w-7 h-7 rounded-full bg-fouzar-surface border border-fouzar-accent/30 flex items-center justify-center text-[8px] font-mono text-fouzar-text-primary shadow-lg ring-1 ring-fouzar-bg"
                    title={peer.name}
                  >
                    {peer.initials}
                  </div>
                ))}
              </div>
            </div>

            {/* CANCEL BUTTON */}
            <button
              onClick={handleStopFlow}
              className="px-8 py-2.5 bg-transparent border border-fouzar-border hover:border-fouzar-accent/40 rounded-xl text-fouzar-text-secondary hover:text-fouzar-text-primary text-[9px] font-sans font-medium uppercase tracking-[0.2em] transition-all cursor-pointer hover:scale-105"
            >
              Exit Isolation
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
