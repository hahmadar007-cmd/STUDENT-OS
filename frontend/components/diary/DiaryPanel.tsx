import React, { useState, useEffect } from 'react';
import { DiaryLockScreen } from './DiaryLockScreen';
import { DiaryWriter } from './DiaryWriter';
import { getDiaryStatus, setupDiaryPin, verifyDiaryPin } from '../../lib/api';
import { Loader2 } from 'lucide-react';
import { toast } from '../ui/Toast';

export const DiaryPanel: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [hasSetPin, setHasSetPin] = useState(false);
  const [diaryToken, setDiaryToken] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const res = await getDiaryStatus();
      setHasSetPin(res.hasSetPin);
    } catch (err) {
      console.error('Failed to get diary status', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (pin: string) => {
    try {
      const res = await verifyDiaryPin(pin);
      if (res.diaryToken) {
        setDiaryToken(res.diaryToken);
        return true;
      }
      return false;
    } catch (err: any) {
      toast(err.message || 'Invalid PIN', 'crimson');
      return false;
    }
  };

  const handleSetup = async (pin: string) => {
    try {
      await setupDiaryPin(pin);
      setHasSetPin(true);
      // Auto verify after setup
      return await handleVerify(pin);
    } catch (err: any) {
      toast(err.message || 'Failed to set up PIN', 'crimson');
      return false;
    }
  };

  const handleLock = () => {
    setDiaryToken(null);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-xl">
        <Loader2 className="w-8 h-8 animate-spin text-fouzar-accent" />
      </div>
    );
  }

  if (!diaryToken) {
    return (
      <DiaryLockScreen 
        hasSetPin={hasSetPin} 
        onVerify={handleVerify} 
        onSetup={handleSetup} 
      />
    );
  }

  return <DiaryWriter diaryToken={diaryToken} onLock={handleLock} />;
};
