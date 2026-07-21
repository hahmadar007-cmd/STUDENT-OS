'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, RefreshCw, Link2, CheckCircle2, User2, LogOut
} from 'lucide-react';
import { FascaButton } from '../ui/FascaButton';
import { FascaInput } from '../ui/FascaInput';
import {
  loginLmsWithCredentials, patchLmsToken, disconnectLms, getLmsProfile
} from '../../lib/api';
import { toast } from '../ui/Toast';

interface LmsBridgePanelProps { isOpen: boolean; onClose: () => void; }

interface PortalProfile {
  connected: boolean;
  universityName?: string;
  platform?: string;
  fullName?: string;
  studentId?: string;
  status?: string;
  lastSync?: string;
}

export function LmsBridgePanel({ isOpen, onClose }: LmsBridgePanelProps) {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Connect form state
  const [activeLmsTab, setActiveLmsTab] = useState<'moodle' | 'canvas'>('moodle');
  const [authMethod, setAuthMethod] = useState<'credentials' | 'token'>('credentials');
  const [baseUrl, setBaseUrl] = useState('https://lms.umt.edu.pk');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tokenValue, setTokenValue] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLmsProfile();
      setProfile(res);
    } catch (e) {
      console.error('Failed to fetch profile', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, fetchProfile]);

  const handleLinkGateway = async () => {
    setLoading(true); setErrorMsg('');
    try {
      const provider = activeLmsTab === 'canvas' ? 'canvas' : 'moodle';
      let result;

      if (activeLmsTab === 'moodle' && authMethod === 'credentials') {
        if (!username || !password) {
          setErrorMsg('Please enter your username and password.');
          setLoading(false); return;
        }
        result = await loginLmsWithCredentials('moodle', baseUrl, username, password);
      } else {
        if (!tokenValue) {
          setErrorMsg('Please enter your access token.');
          setLoading(false); return;
        }
        result = await patchLmsToken(tokenValue, baseUrl, provider);
      }

      if (!result.success) { setErrorMsg(result.message || 'Connection failed.'); return; }
      toast(result.message || 'University portal connected', 'cyan');
      await fetchProfile();
      window.dispatchEvent(new Event('refresh-courses'));
    } catch (err: any) { 
      setErrorMsg(err.message || 'Connection failed.'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnectLms();
      toast('University portal disconnected', 'violet');
      setProfile(null);
      window.dispatchEvent(new Event('refresh-courses'));
    } catch (e) {
      toast('Failed to disconnect', 'crimson');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetchProfile();
      window.dispatchEvent(new Event('refresh-courses'));
      toast('Sync complete', 'cyan');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-[#13131a] border border-white/10 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#0b0b12]">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-[#7c5cfc]" />
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                My Campus Gateway
              </h2>
            </div>
            <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            {loading && !profile ? (
              <div className="flex justify-center items-center py-10">
                <RefreshCw className="w-6 h-6 text-[#7c5cfc] animate-spin" />
              </div>
            ) : profile?.connected ? (
              // CONNECTED STATE
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/30 flex items-center justify-center text-[#00d4ff]">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-white leading-tight">University Portal Connected</h3>
                    <p className="text-[10px] font-mono text-[#00d4ff] uppercase mt-0.5">🟢 Online and syncing</p>
                  </div>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-lg p-4 space-y-4">
                  <div>
                    <p className="text-[9px] font-mono text-white/40 uppercase mb-1">University</p>
                    <p className="text-[12px] text-white/90 font-medium">{profile.universityName}</p>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[9px] font-mono text-white/40 uppercase mb-1">Platform</p>
                      <p className="text-[12px] text-white/90 font-medium">{profile.platform}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-mono text-white/40 uppercase mb-1">Student ID</p>
                      <p className="text-[12px] text-white/90 font-mono">{profile.studentId}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-white/40 uppercase mb-1">Logged in as</p>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center">
                        <User2 className="w-3 h-3 text-white/60" />
                      </div>
                      <p className="text-[12px] text-white/90 font-medium">{profile.fullName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-white/40 uppercase">Last Sync</span>
                    <span className="text-[10px] text-white/60 font-mono mt-0.5">
                      {new Date(profile.lastSync || Date.now()).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSync}
                      disabled={syncing}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[10px] font-mono uppercase rounded-md transition-colors flex items-center gap-2 border border-white/10 disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                      Sync Now
                    </button>
                    <button
                      onClick={handleDisconnect}
                      disabled={loading}
                      className="px-4 py-2 bg-[#ff2d55]/10 hover:bg-[#ff2d55]/20 text-[#ff2d55] text-[10px] font-mono uppercase rounded-md transition-colors flex items-center gap-2 border border-[#ff2d55]/20 cursor-pointer"
                    >
                      <LogOut className="w-3 h-3" />
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // DISCONNECTED / LOGIN STATE
              <div className="flex flex-col gap-4">
                <p className="text-sm text-white/70 mb-2">Connect your university LMS to automatically sync courses, slides, and assignments.</p>

                {errorMsg && (
                  <div className="p-3 bg-[#ff2d55]/10 border border-[#ff2d55]/20 rounded-lg text-[#ff2d55] text-[11px]">
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg mb-2">
                  <button onClick={() => setActiveLmsTab('moodle')} className={`flex-1 py-1.5 text-[10px] font-mono uppercase rounded-md transition-all cursor-pointer ${activeLmsTab === 'moodle' ? 'bg-[#f98012] text-white font-bold shadow-lg' : 'text-white/40 hover:text-white/80'}`}>Moodle</button>
                  <button onClick={() => setActiveLmsTab('canvas')} className={`flex-1 py-1.5 text-[10px] font-mono uppercase rounded-md transition-all cursor-pointer ${activeLmsTab === 'canvas' ? 'bg-[#e72429] text-white font-bold shadow-lg' : 'text-white/40 hover:text-white/80'}`}>Canvas</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-mono text-white/40 uppercase ml-1 mb-1 block">University LMS URL</label>
                    <FascaInput value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://lms.university.edu" />
                  </div>

                  {activeLmsTab === 'moodle' && (
                    <div className="flex items-center gap-4 mt-2 mb-1">
                      <label className="flex items-center gap-2 text-[10px] font-mono text-white/60 cursor-pointer">
                        <input type="radio" name="moodleAuth" checked={authMethod === 'credentials'} onChange={() => setAuthMethod('credentials')} className="accent-[#7c5cfc]" /> Username & Password
                      </label>
                      <label className="flex items-center gap-2 text-[10px] font-mono text-white/60 cursor-pointer">
                        <input type="radio" name="moodleAuth" checked={authMethod === 'token'} onChange={() => setAuthMethod('token')} className="accent-[#7c5cfc]" /> Token
                      </label>
                    </div>
                  )}

                  {authMethod === 'credentials' && activeLmsTab === 'moodle' ? (
                    <>
                      <div>
                        <label className="text-[9px] font-mono text-white/40 uppercase ml-1 mb-1 block">Student ID / Username</label>
                        <FascaInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="F20220000" />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-white/40 uppercase ml-1 mb-1 block">Password</label>
                        <FascaInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="text-[9px] font-mono text-white/40 uppercase ml-1 mb-1 block">Access Token</label>
                      <FascaInput value={tokenValue} onChange={(e) => setTokenValue(e.target.value)} placeholder="Paste your generated token here..." />
                    </div>
                  )}

                  <FascaButton
                    onClick={handleLinkGateway}
                    disabled={loading || (!baseUrl)}
                    variant="primary"
                    className="w-full mt-4 py-3"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Establish Connection'}
                  </FascaButton>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
