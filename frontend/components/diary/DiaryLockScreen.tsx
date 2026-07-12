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
    <div className="w-full h-full flex items-center justify-center p-6 perspective-1000">
      <motion.div
        initial={{ rotateY: -10, opacity: 0 }}
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : { rotateY: 0, opacity: 1 }}
        transition={{ duration: shake ? 0.4 : 0.8, ease: 'easeOut' }}
        className="w-full max-w-md aspect-[3/4] rounded-r-3xl rounded-l-md shadow-2xl relative overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(135deg, #111 0%, #0a0a0a 100%)',
          boxShadow: '-15px 0 30px rgba(0,0,0,0.8), inset 5px 0 15px rgba(255,255,255,0.05)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Book Binding/Spine effect */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-black/80 border-r border-white/5 z-0 flex flex-col justify-evenly py-10">
          <div className="w-full h-[2px] bg-white/5"></div>
          <div className="w-full h-[2px] bg-white/5"></div>
          <div className="w-full h-[2px] bg-white/5"></div>
          <div className="w-full h-[2px] bg-white/5"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-12 z-10 text-center relative">
          <Book className="w-16 h-16 text-fouzar-accent mb-6" strokeWidth={1} />
          
          <h2 className="text-2xl font-serif text-white mb-2 tracking-widest uppercase">
            Personal Diary
          </h2>
          
          <p className="text-sm text-fouzar-text-secondary mb-12 font-mono">
            {hasSetPin ? 'Enter passcode to unlock' : 'Create a new passcode'}
          </p>

          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center space-y-6">
            <div className="relative w-3/4">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="****"
                className="w-full bg-black/50 border-b-2 border-fouzar-accent/30 text-center text-3xl font-mono text-white tracking-[1em] focus:outline-none focus:border-fouzar-accent transition-colors pb-2"
                autoFocus
              />
              <Lock className="absolute right-2 top-2 w-5 h-5 text-fouzar-accent/50" />
            </div>

            <FascaButton 
              type="submit" 
              variant="solid" 
              className="w-3/4 rounded-full mt-4"
              loading={loading}
            >
              {hasSetPin ? 'Unlock Journal' : 'Lock Journal'}
            </FascaButton>
          </form>
        </div>
      </motion.div>
    </div>
  );
};
