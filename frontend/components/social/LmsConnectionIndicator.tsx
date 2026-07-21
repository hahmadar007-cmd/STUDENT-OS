'use client';

import React, { useState, useEffect } from 'react';
import { getLmsProfile } from '../../lib/api';

export function LmsConnectionIndicator() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkStatus = async () => {
    try {
      const res = await getLmsProfile();
      if (res && res.connected) {
        setProfile(res);
      } else {
        setProfile(null);
      }
    } catch (e) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    window.addEventListener('refresh-courses', checkStatus);
    return () => window.removeEventListener('refresh-courses', checkStatus);
  }, []);

  if (loading) return null;
  if (!profile) return null;

  const shortName = profile.universityName?.split('.')[0] || 'LMS';

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/20 rounded-full select-none cursor-default shadow-sm transition-all hover:bg-[#00d4ff]/20">
      <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse shadow-[0_0_8px_#00d4ff]" />
      <span className="text-[10px] font-mono text-[#00d4ff] uppercase tracking-wider font-bold">
        {shortName} Synced
      </span>
      <div className="w-px h-3 bg-[#00d4ff]/30 mx-1" />
      <span className="text-[9px] font-mono text-[#00d4ff]/70 uppercase">
        {new Date(profile.lastSync || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
