import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock, Book, ChevronRight } from 'lucide-react';
import { FascaButton } from '../ui/FascaButton';
import { FascaInput } from '../ui/FascaInput';
import { toast } from '../ui/Toast';

interface DiaryLockScreenProps {
  hasSetPin: boolean;
  onVerify: (pin: string) => Promise<boolean>;
  onSetup: (pin: string) => Promise<boolean>;
}

export const DiaryLockScreen: React.FC<DiaryLockScreenProps> = ({ hasSetPin, onVerify, onSetup }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      toast('PIN must be at least 4 digits', 'crimson');
      return;
    }

    setLoading(true);
    try {
      let success = false;
      if (hasSetPin) {
        success = await onVerify(pin);
      } else {
        success = await onSetup(pin);
      }

      if (!success) {
        setPin('');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (err) {
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-6 perspective-[1200px] bg-[#050505]">
      <motion.div
        initial={{ rotateY: -15, rotateX: 5, opacity: 0 }}
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : { rotateY: 0, rotateX: 0, opacity: 1 }}
        transition={{ duration: shake ? 0.4 : 1, ease: 'easeOut' }}
        className="w-full max-w-[380px] aspect-[1/1.4] rounded-r-3xl rounded-l-md relative overflow-hidden flex flex-col items-center justify-center bg-[#0f0f0f] border border-[#2a2a2a] group"
        style={{
          boxShadow: '25px 25px 50px rgba(0,0,0,0.9), inset -3px 0 10px rgba(255,255,255,0.03), inset 3px 0 15px rgba(0,0,0,0.9)'
        }}
      >
        {/* CSS SVG Noise for Leather Texture */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.07] mix-blend-overlay pointer-events-none z-0">
          <filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch"/></filter>
          <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
        </svg>

        {/* Realistic Book Spine */}
        <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-[#030303] via-[#1a1a1a] to-[#050505] border-r border-[#000] z-0 flex flex-col justify-evenly py-12 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
          <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-[#333] to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.8)]"></div>
          <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-[#333] to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.8)]"></div>
          <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-[#333] to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.8)]"></div>
          <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-[#333] to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.8)]"></div>
          <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-[#333] to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.8)]"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-12 z-10 text-center relative w-full pl-20">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
          >
            {/* Gold foil emblem */}
            <div className="w-16 h-16 rounded-full border border-[#d4af37]/30 flex items-center justify-center mb-8 mx-auto shadow-[0_0_20px_rgba(212,175,55,0.05)] bg-gradient-to-br from-[#111] to-[#000]">
              <Book className="w-8 h-8 text-[#d4af37]/80" strokeWidth={1} />
            </div>
            
            <h2 className="text-4xl font-gothic tracking-[0.15em] lowercase mb-2 bg-gradient-to-br from-[#f1e5ac] via-[#d4af37] to-[#8a6d1c] text-transparent bg-clip-text drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              personal diary
            </h2>
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent mx-auto mb-8"></div>
          </motion.div>
          
          <p className="text-xs text-fouzar-text-secondary/60 mb-6 font-gothic tracking-[0.1em] lowercase">
            {hasSetPin ? 'enter passcode' : 'initialize passcode'}
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center space-y-8">
            <div className="relative w-[180px]">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                className="w-full bg-transparent border-b border-[#d4af37]/30 text-center text-3xl font-mono text-[#e5d395] tracking-[0.5em] focus:outline-none focus:border-[#d4af37] transition-all pb-2 px-4 shadow-[0_10px_10px_-10px_rgba(212,175,55,0.1)]"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || pin.length < 4}
              className="text-xs font-gothic tracking-[0.1em] lowercase text-[#d4af37]/70 hover:text-[#f1e5ac] transition-colors border border-[#d4af37]/20 hover:border-[#d4af37]/50 px-6 py-2 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed bg-black/40 backdrop-blur-sm"
            >
              {loading ? 'decrypting...' : (hasSetPin ? 'unlock' : 'seal')}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
