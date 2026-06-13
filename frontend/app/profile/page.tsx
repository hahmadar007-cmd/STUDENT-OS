'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Settings,
  User,
  Sparkles,
  Users,
  UserPlus,
  Check,
  X,
  UserMinus,
  Briefcase,
  Flame,
  Radio,
  Loader2,
  Plug,
  LogOut,
  Palette,
  GraduationCap
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useFouzar } from '../../lib/FouzarContext';
import { FascaLogo } from '../../components/logo/FascaLogo';
import { AiControlCenter } from '../../components/ai/AiControlCenter';
import {
  updateProfile,
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  patchLmsToken,
  getLmsStatus,
  getPortalStatus,
  connectPortal,
  getPortalProfile,
  savePortalAttendance,
  savePortalTranscript,
  savePortalGpa
} from '../../lib/api';

interface Friend {
  friendshipId: string;
  id: string;
  name: string;
  email: string;
  fouzarId?: string;
  avatarUrl?: string;
  isFocusing: boolean;
  focusStartedAt: string | null;
}

interface FriendRequest {
  id: string;
  sender?: { id: string; name: string; email: string; fouzarId?: string; avatarUrl?: string };
  receiver?: { id: string; name: string; email: string; fouzarId?: string; avatarUrl?: string };
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, mutate, logout } = useAuth();
  const { mode, setMode, aiModel, setAiModel, accentColor, setAccentColor } = useFouzar();

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [preferredModel, setPreferredModel] = useState('deepseek');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // LMS State
  const [lmsProvider, setLmsProvider] = useState<'moodle' | 'canvas'>('moodle');
  const [lmsUrl, setLmsUrl] = useState('');
  const [lmsToken, setLmsToken] = useState('');
  const [lmsSaving, setLmsSaving] = useState(false);
  const [lmsMessage, setLmsMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Portal State
  const [portalType, setPortalType] = useState('moodle');
  const [portalUrl, setPortalUrl] = useState('');
  const [studentId, setStudentId] = useState('');
  const [portalConnected, setPortalConnected] = useState(false);
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalMessage, setPortalMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [gpa, setGpa] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [semester, setSemester] = useState('');
  const [attendanceRows, setAttendanceRows] = useState<any[]>([]);
  const [transcriptRows, setTranscriptRows] = useState<any[]>([]);
  const [academicSaving, setAcademicSaving] = useState(false);
  const [academicMessage, setAcademicMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Friends State
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [friendConnectionId, setFriendConnectionId] = useState('');
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendActionLoading, setFriendActionLoading] = useState<string | null>(null);
  const [friendMessage, setFriendMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      if (user.preferredAiModel) {
        setPreferredModel(user.preferredAiModel);
        setAiModel(user.preferredAiModel);
      }
    }
  }, [user, setAiModel]);

  const loadLmsStatus = async () => {
    try {
      const status = await getLmsStatus();
      if (status.connected) {
        setLmsUrl(status.baseUrl || '');
        setLmsProvider(status.provider || 'moodle');
        setLmsToken('••••••••••••••••••••'); // Masked token
      }
    } catch (err) {
      console.error('Failed to load LMS status:', err);
    }
  };

  const loadPortalStatus = async () => {
    try {
      const status = await getPortalStatus();
      if (status.connected) {
        setPortalConnected(true);
        setPortalUrl(status.portalUrl || '');
        setPortalType(status.portalType || 'moodle');
        setStudentId(status.studentId || '');
        setGpa(status.gpa?.toString() || '');
        setCgpa(status.cgpa?.toString() || '');
        setSemester(status.semester || '');
        
        const profile = await getPortalProfile();
        if (profile?.attendance) setAttendanceRows(profile.attendance);
        if (profile?.transcript) setTranscriptRows(profile.transcript);
      }
    } catch (err) {
      console.error('Failed to load Portal status:', err);
    }
  };

  const loadSocialData = async () => {
    setFriendsLoading(true);
    try {
      const activeFriends = await getFriends();
      setFriends(activeFriends || []);

      const requests = await getFriendRequests();
      setIncomingRequests(requests.incoming || []);
      setOutgoingRequests(requests.outgoing || []);
    } catch (err) {
      console.error('Failed to load friends data:', err);
    } finally {
      setFriendsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadLmsStatus();
      loadPortalStatus();
      loadSocialData();
    }
  }, [user]);

  // Handle Profile Update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);

    try {
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        preferredAiModel: preferredModel,
      });
      if (res.success) {
        setProfileMessage({ text: 'Profile updated successfully!', type: 'success' });
        setAiModel(preferredModel);
        if (mutate) {
          mutate(); // Re-validate auth context
        }
      }
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Copy Connection ID Handler
  const handleCopyId = () => {
    if (user?.fouzarId) {
      navigator.clipboard.writeText(user.fouzarId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle LMS Connection
  const handleLmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLmsSaving(true);
    setLmsMessage(null);

    try {
      const res = await patchLmsToken(lmsToken.trim(), lmsUrl.trim(), lmsProvider);
      if (res.success) {
        setLmsMessage({ text: res.message || 'LMS Bridge connected successfully!', type: 'success' });
        loadLmsStatus();
      } else {
        setLmsMessage({ text: res.message || 'Failed to connect.', type: 'error' });
      }
    } catch (err: any) {
      setLmsMessage({ text: err.message || 'Failed to configure LMS Bridge.', type: 'error' });
    } finally {
      setLmsSaving(false);
    }
  };

  const handlePortalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPortalSaving(true);
    setPortalMessage(null);

    try {
      const res = await connectPortal(portalUrl.trim(), portalType, studentId.trim());
      if (res.success) {
        setPortalMessage({ text: 'Portal connected successfully!', type: 'success' });
        loadPortalStatus();
      } else {
        setPortalMessage({ text: res.message || 'Failed to connect.', type: 'error' });
      }
    } catch (err: any) {
      setPortalMessage({ text: err.message || 'Failed to configure Portal.', type: 'error' });
    } finally {
      setPortalSaving(false);
    }
  };

  const handleAcademicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAcademicSaving(true);
    setAcademicMessage(null);

    try {
      await savePortalGpa(gpa ? Number(gpa) : null, cgpa ? Number(cgpa) : null, semester);
      await savePortalAttendance(attendanceRows);
      await savePortalTranscript(transcriptRows);
      setAcademicMessage({ text: 'Academic data saved successfully!', type: 'success' });
    } catch (err: any) {
      setAcademicMessage({ text: err.message || 'Failed to save academic data.', type: 'error' });
    } finally {
      setAcademicSaving(false);
    }
  };

  // Send Friend Request
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = friendConnectionId.trim();
    if (!targetId) return;

    setFriendMessage(null);
    setFriendActionLoading('send');

    try {
      const res = await sendFriendRequest(targetId);
      if (res.success) {
        setFriendMessage({ text: res.message || 'Friend request sent!', type: 'success' });
        setFriendConnectionId('');
        loadSocialData();
      }
    } catch (err: any) {
      setFriendMessage({ text: err.message || 'Failed to send request.', type: 'error' });
    } finally {
      setFriendActionLoading(null);
    }
  };

  // Accept request
  const handleAcceptRequest = async (reqId: string) => {
    setFriendActionLoading(reqId);
    setFriendMessage(null);
    try {
      const res = await acceptFriendRequest(reqId);
      if (res.success) {
        setFriendMessage({ text: 'Friend request accepted!', type: 'success' });
        loadSocialData();
      }
    } catch (err: any) {
      setFriendMessage({ text: err.message || 'Failed to accept request.', type: 'error' });
    } finally {
      setFriendActionLoading(null);
    }
  };

  // Decline/Cancel request
  const handleRejectRequest = async (reqId: string) => {
    setFriendActionLoading(reqId);
    setFriendMessage(null);
    try {
      const res = await rejectFriendRequest(reqId);
      if (res.success) {
        setFriendMessage({ text: 'Request declined or cancelled.', type: 'success' });
        loadSocialData();
      }
    } catch (err: any) {
      setFriendMessage({ text: err.message || 'Failed to decline request.', type: 'error' });
    } finally {
      setFriendActionLoading(null);
    }
  };

  // Remove Friend
  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    setFriendActionLoading(friendId);
    setFriendMessage(null);
    try {
      const res = await removeFriend(friendId);
      if (res.success) {
        setFriendMessage({ text: 'Friend removed.', type: 'success' });
        loadSocialData();
      }
    } catch (err: any) {
      setFriendMessage({ text: err.message || 'Failed to remove friend.', type: 'error' });
    } finally {
      setFriendActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-fouzar-bg text-fouzar-text-primary flex flex-col font-sans selection:bg-fouzar-accent/30 selection:text-fouzar-accent">
      {/* Header */}
      <header className="border-b border-fouzar-border px-4 md:px-8 py-4 flex items-center justify-between shrink-0 bg-fouzar-surface/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 font-mono text-[8px] uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <FascaLogo showWordmark size={22} linkTo="/dashboard" />
          <span className="w-[1px] h-4 bg-fouzar-border" />
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-fouzar-accent" />
            <span className="font-serif text-[11px] font-bold text-fouzar-text-primary uppercase tracking-wider">
              Profile & Connections
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-fouzar-signal/40 hover:border-fouzar-signal bg-fouzar-signal/5 hover:bg-fouzar-signal/15 text-[#ff2d55] text-[8px] font-mono uppercase font-bold rounded-[var(--fouzar-radius-md)] transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Log Out
        </button>
      </header>

      {/* Main Grid content */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto">
        
        {/* Left Column - Forms (LMS + Details) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Section 1: Profile Details */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-fouzar-border pb-3">
              <User className="w-4 h-4 text-fouzar-accent" />
              <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                User Details
              </h2>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {/* Profile Picture Upload chassis */}
              <div className="flex flex-col items-center gap-3 pb-4 border-b border-fouzar-border/40 w-full">
                <div className="relative group w-20 h-20 rounded-full border border-fouzar-border bg-fouzar-elevated/40 overflow-hidden flex items-center justify-center font-mono text-[22px] font-bold text-fouzar-accent select-none shrink-0">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || 'Avatar'}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'AM'
                  )}
                  
                  {/* Upload Overlay */}
                  <label className="absolute inset-0 bg-[#0a0a0f]/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer select-none text-[8px] font-mono uppercase tracking-widest text-fouzar-text-primary text-center">
                    <UserPlus className="w-4 h-4 mb-1 text-fouzar-accent mx-auto" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Convert file to base64
                        const reader = new FileReader();
                        reader.onload = async () => {
                          const base64 = reader.result as string;
                          try {
                            setProfileSaving(true);
                            setProfileMessage(null);
                            const res = await updateProfile({ avatarUrl: base64 });
                            if (res.success) {
                              setProfileMessage({ text: 'Profile picture updated successfully!', type: 'success' });
                              if (mutate) mutate();
                            }
                          } catch (err: any) {
                            setProfileMessage({ text: err.message || 'Failed to upload picture.', type: 'error' });
                          } finally {
                            setProfileSaving(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary">
                  Click avatar to upload profile picture
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    My connection ID (Share with friends to connect)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[11px] font-mono rounded-[var(--fouzar-radius-md)] text-fouzar-accent font-bold tracking-widest select-all">
                      {user?.fouzarId || 'Generating...'}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="px-3 py-2 border border-fouzar-border hover:border-fouzar-accent text-[8px] font-mono uppercase tracking-wider rounded-[var(--fouzar-radius-md)] hover:bg-fouzar-accent/5 transition-all cursor-pointer font-bold shrink-0 min-w-[80px]"
                    >
                      {copied ? 'Copied!' : 'Copy ID'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                  Preferred AI Model
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'deepseek', name: 'DeepSeek Chat' },
                    { id: 'claude-3-5-sonnet', name: 'Claude 3.5' },
                    { id: 'gpt-4o', name: 'GPT-4o' },
                  ].map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setPreferredModel(model.id)}
                      className={`flex flex-col items-center justify-center p-3 border rounded-[var(--fouzar-radius-md)] transition-all cursor-pointer ${
                        preferredModel === model.id
                          ? 'bg-fouzar-accent/10 border-fouzar-accent text-fouzar-accent'
                          : 'bg-fouzar-elevated/30 border-fouzar-border hover:border-fouzar-text-tertiary'
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 mb-1.5 ${preferredModel === model.id ? 'text-fouzar-accent' : 'text-fouzar-text-tertiary'}`} />
                      <span className="font-mono text-[7.5px] uppercase tracking-wider font-semibold">{model.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {profileMessage && (
                <p
                  className={`text-[8.5px] font-mono uppercase tracking-wider ${
                    profileMessage.type === 'success' ? 'text-fouzar-accent' : 'text-fouzar-signal'
                  }`}
                >
                  {profileMessage.text}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8.5px] uppercase font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Section: Workspace Customization */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="p-6 bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] space-y-5"
          >
            <div className="flex items-center gap-2 border-b border-fouzar-border pb-3">
              <Palette className="w-4 h-4 text-fouzar-accent" />
              <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                Workspace Customization
              </h2>
            </div>

            {/* Chassis Switcher */}
            <div className="space-y-2">
              <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                Visual Chassis Theme
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'onyx' as const, name: 'Onyx Theme', desc: 'Tactical matte charcoal dark mode' },
                  { id: 'greenhouse' as const, name: 'Greenhouse Theme', desc: 'Airy glassmorphism light/blue mode' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    className={`flex flex-col items-start p-3 border text-left rounded-[var(--fouzar-radius-md)] transition-all cursor-pointer ${
                      mode === item.id
                        ? 'bg-fouzar-accent/10 border-fouzar-accent text-fouzar-accent'
                        : 'bg-fouzar-elevated/30 border-fouzar-border hover:border-fouzar-text-tertiary text-fouzar-text-primary'
                    }`}
                  >
                    <span className="font-mono text-[8.5px] uppercase tracking-wider font-bold">{item.name}</span>
                    <span className="text-[7.5px] text-fouzar-text-secondary mt-1 font-sans font-light leading-snug">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color Picker */}
            <div className="space-y-2.5">
              <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                Workspace Accent Color
              </label>
              <div className="grid grid-cols-5 gap-2.5">
                {[
                  { id: 'violet' as const, name: 'Violet', color: '#7c5cfc' },
                  { id: 'emerald' as const, name: 'Emerald Green', color: '#3dd68c' },
                  { id: 'ice' as const, name: 'Ice Blue', color: '#5ce1ff' },
                  { id: 'amber' as const, name: 'Amber Gold', color: '#f5a623' },
                  { id: 'signal' as const, name: 'Signal Crimson', color: '#ff2d55' },
                ].map((accent) => {
                  const isSelected = accentColor === accent.id;
                  return (
                    <button
                      key={accent.id}
                      type="button"
                      onClick={() => setAccentColor(accent.id)}
                      className={`flex flex-col items-center justify-center p-2.5 border rounded-[var(--fouzar-radius-md)] transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-fouzar-accent/15 border-fouzar-accent'
                          : 'bg-fouzar-elevated/30 border-fouzar-border hover:border-fouzar-text-tertiary'
                      }`}
                    >
                      {/* Colored circle */}
                      <span 
                        className="w-5 h-5 rounded-full mb-1.5 shadow-[0_0_8px_rgba(255,255,255,0.05)] border border-white/10 shrink-0" 
                        style={{ 
                          backgroundColor: accent.color,
                          boxShadow: isSelected ? `0 0 12px ${accent.color}80` : undefined
                        }}
                      />
                      <span className={`font-mono text-[6.5px] uppercase tracking-wider font-semibold text-center truncate w-full ${
                        isSelected ? 'text-fouzar-accent' : 'text-fouzar-text-secondary'
                      }`}>
                        {accent.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Section: AI Engines */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <AiControlCenter />
          </motion.div>

          {/* Section 2: LMS Connection settings */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="p-6 bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-fouzar-border pb-3">
              <Plug className="w-4 h-4 text-fouzar-accent" />
              <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                LMS Bridge Configuration
              </h2>
            </div>

            <form onSubmit={handleLmsSubmit} className="space-y-4">
              <div className="flex gap-4">
                {['moodle', 'canvas'].map((prov) => (
                  <label key={prov} className="flex items-center gap-2 cursor-pointer font-mono text-[8px] uppercase tracking-wider">
                    <input
                      type="radio"
                      name="lmsProvider"
                      checked={lmsProvider === prov}
                      onChange={() => setLmsProvider(prov as any)}
                      className="accent-fouzar-accent"
                    />
                    {prov === 'moodle' ? 'Moodle LMS' : 'Instructure Canvas'}
                  </label>
                ))}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    Site Base URL (Moodle/Canvas Domain)
                  </label>
                  <input
                    type="url"
                    required
                    placeholder={lmsProvider === 'moodle' ? 'https://moodle.youruniversity.edu' : 'https://canvas.youruniversity.edu'}
                    value={lmsUrl}
                    onChange={(e) => setLmsUrl(e.target.value)}
                    className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    Access Token / Web Service Token
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter your security token..."
                    value={lmsToken}
                    onChange={(e) => setLmsToken(e.target.value)}
                    className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                  />
                </div>
              </div>

              {lmsMessage && (
                <p
                  className={`text-[8.5px] font-mono uppercase tracking-wider ${
                    lmsMessage.type === 'success' ? 'text-fouzar-accent' : 'text-fouzar-signal'
                  }`}
                >
                  {lmsMessage.text}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={lmsSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8.5px] uppercase font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {lmsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect Bridge'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Section 3: Student Portal Connection */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10 }}
            className="p-6 bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-fouzar-border pb-3">
              <GraduationCap className="w-4 h-4 text-fouzar-accent" />
              <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                Student Portal Configuration
              </h2>
              {portalConnected && (
                <span className="ml-auto px-2 py-0.5 bg-fouzar-accent/20 text-fouzar-accent border border-fouzar-accent/40 rounded-full font-mono text-[7px] uppercase tracking-widest">
                  Connected
                </span>
              )}
            </div>

            <form onSubmit={handlePortalSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                  Portal Type
                </label>
                <select
                  value={portalType}
                  onChange={(e) => setPortalType(e.target.value)}
                  className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                >
                  <option value="moodle">Moodle</option>
                  <option value="canvas">Canvas</option>
                  <option value="blackboard">Blackboard</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    Portal Base URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://portal.youruniversity.edu"
                    value={portalUrl}
                    onChange={(e) => setPortalUrl(e.target.value)}
                    className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    Student ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your student ID..."
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                  />
                </div>
              </div>

              {portalMessage && (
                <p
                  className={`text-[8.5px] font-mono uppercase tracking-wider ${
                    portalMessage.type === 'success' ? 'text-fouzar-accent' : 'text-fouzar-signal'
                  }`}
                >
                  {portalMessage.text}
                </p>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={portalSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8.5px] uppercase font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {portalSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect Portal'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Section 4: Academic Data (Only visible if connected) */}
          {portalConnected && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="p-6 bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-fouzar-border pb-3">
                <Briefcase className="w-4 h-4 text-fouzar-accent" />
                <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                  Academic Data (Manual Entry)
                </h2>
              </div>

              <form onSubmit={handleAcademicSubmit} className="space-y-6">
                {/* GPA & Semester */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                      Current GPA
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 3.5"
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                      CGPA
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 3.8"
                      value={cgpa}
                      onChange={(e) => setCgpa(e.target.value)}
                      className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                      Semester
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Fall 2024"
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10.5px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                    />
                  </div>
                </div>

                {/* Attendance */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                      Attendance Records
                    </label>
                    <button
                      type="button"
                      onClick={() => setAttendanceRows([...attendanceRows, { subjectCode: '', subjectName: '', total: 0, attended: 0, percentage: 0 }])}
                      className="text-[8px] font-mono uppercase text-fouzar-accent hover:underline cursor-pointer"
                    >
                      + Add Row
                    </button>
                  </div>
                  <div className="space-y-2">
                    {attendanceRows.map((row, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="Code"
                          value={row.subjectCode}
                          onChange={(e) => {
                            const newRows = [...attendanceRows];
                            newRows[i].subjectCode = e.target.value;
                            setAttendanceRows(newRows);
                          }}
                          className="w-20 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <input
                          type="text"
                          placeholder="Subject Name"
                          value={row.subjectName}
                          onChange={(e) => {
                            const newRows = [...attendanceRows];
                            newRows[i].subjectName = e.target.value;
                            setAttendanceRows(newRows);
                          }}
                          className="flex-1 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <input
                          type="number"
                          placeholder="Total"
                          value={row.total}
                          onChange={(e) => {
                            const newRows = [...attendanceRows];
                            newRows[i].total = Number(e.target.value);
                            newRows[i].percentage = newRows[i].total ? (newRows[i].attended / newRows[i].total) * 100 : 0;
                            setAttendanceRows(newRows);
                          }}
                          className="w-16 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <input
                          type="number"
                          placeholder="Attended"
                          value={row.attended}
                          onChange={(e) => {
                            const newRows = [...attendanceRows];
                            newRows[i].attended = Number(e.target.value);
                            newRows[i].percentage = newRows[i].total ? (newRows[i].attended / newRows[i].total) * 100 : 0;
                            setAttendanceRows(newRows);
                          }}
                          className="w-16 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <span className="w-12 text-[9px] font-mono text-fouzar-text-secondary text-right">
                          {row.percentage ? row.percentage.toFixed(0) : 0}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setAttendanceRows(attendanceRows.filter((_, idx) => idx !== i))}
                          className="p-1 text-fouzar-signal hover:bg-fouzar-signal/10 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transcript */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                      Transcript Records
                    </label>
                    <button
                      type="button"
                      onClick={() => setTranscriptRows([...transcriptRows, { subjectCode: '', subjectName: '', creditHours: 3, grade: '', gradePoints: '', semester: '' }])}
                      className="text-[8px] font-mono uppercase text-fouzar-accent hover:underline cursor-pointer"
                    >
                      + Add Row
                    </button>
                  </div>
                  <div className="space-y-2">
                    {transcriptRows.map((row, i) => (
                      <div key={i} className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                        <input
                          type="text"
                          placeholder="Code"
                          value={row.subjectCode}
                          onChange={(e) => {
                            const newRows = [...transcriptRows];
                            newRows[i].subjectCode = e.target.value;
                            setTranscriptRows(newRows);
                          }}
                          className="w-16 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <input
                          type="text"
                          placeholder="Subject Name"
                          value={row.subjectName}
                          onChange={(e) => {
                            const newRows = [...transcriptRows];
                            newRows[i].subjectName = e.target.value;
                            setTranscriptRows(newRows);
                          }}
                          className="flex-1 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <input
                          type="number"
                          placeholder="Cr.Hr"
                          value={row.creditHours}
                          onChange={(e) => {
                            const newRows = [...transcriptRows];
                            newRows[i].creditHours = Number(e.target.value);
                            setTranscriptRows(newRows);
                          }}
                          className="w-12 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <input
                          type="text"
                          placeholder="Grade"
                          value={row.grade}
                          onChange={(e) => {
                            const newRows = [...transcriptRows];
                            newRows[i].grade = e.target.value;
                            setTranscriptRows(newRows);
                          }}
                          className="w-12 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Points"
                          value={row.gradePoints}
                          onChange={(e) => {
                            const newRows = [...transcriptRows];
                            newRows[i].gradePoints = e.target.value;
                            setTranscriptRows(newRows);
                          }}
                          className="w-16 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <input
                          type="text"
                          placeholder="Sem"
                          value={row.semester}
                          onChange={(e) => {
                            const newRows = [...transcriptRows];
                            newRows[i].semester = e.target.value;
                            setTranscriptRows(newRows);
                          }}
                          className="w-16 bg-fouzar-elevated/40 border border-fouzar-border px-2 py-1.5 text-[9px] font-mono rounded focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setTranscriptRows(transcriptRows.filter((_, idx) => idx !== i))}
                          className="p-1 text-fouzar-signal hover:bg-fouzar-signal/10 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {academicMessage && (
                  <p
                    className={`text-[8.5px] font-mono uppercase tracking-wider ${
                      academicMessage.type === 'success' ? 'text-fouzar-accent' : 'text-fouzar-signal'
                    }`}
                  >
                    {academicMessage.text}
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={academicSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8.5px] uppercase font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {academicSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Academic Data'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </div>

        {/* Right Column - Friends Panel */}
        <div className="lg:col-span-5 space-y-8">
          
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="p-6 bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] flex flex-col h-[650px] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-fouzar-border pb-3 shrink-0">
              <Users className="w-4 h-4 text-fouzar-accent" />
              <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                Social Study Network
              </h2>
            </div>

            {/* Friend request input */}
            <form onSubmit={handleSendRequest} className="mt-4 pb-4 border-b border-fouzar-border shrink-0 space-y-2">
              <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                Send Friend Request by Connection ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  pattern="[0-9]{6}"
                  title="6-digit connection ID"
                  placeholder="Enter friend's 6-digit Connection ID..."
                  value={friendConnectionId}
                  onChange={(e) => setFriendConnectionId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 bg-fouzar-elevated/40 border border-fouzar-border px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                />
                <button
                  type="submit"
                  disabled={friendActionLoading === 'send'}
                  className="p-2 bg-fouzar-accent/10 border border-fouzar-accent/25 hover:bg-fouzar-accent/20 text-fouzar-accent rounded-[var(--fouzar-radius-md)] flex items-center justify-center cursor-pointer transition-colors"
                  title="Send Request"
                >
                  {friendActionLoading === 'send' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </button>
              </div>

              {friendMessage && (
                <p
                  className={`text-[8px] font-mono uppercase tracking-wider mt-1 ${
                    friendMessage.type === 'success' ? 'text-fouzar-accent' : 'text-fouzar-signal'
                  }`}
                >
                  {friendMessage.text}
                </p>
              )}
            </form>

            {/* Friends list / requests list */}
            <div className="flex-1 overflow-y-auto scrollbar-none py-4 space-y-5">
              
              {/* Section: Incoming Pending Requests */}
              {incomingRequests.length > 0 && (
                <div className="space-y-2">
                  <span className="font-mono text-[7.5px] uppercase tracking-widest text-fouzar-amber flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 animate-pulse" /> Pending Invites ({incomingRequests.length})
                  </span>
                  <div className="space-y-1.5">
                    {incomingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2.5 bg-fouzar-amber/5 border border-fouzar-amber/20 rounded-[var(--fouzar-radius-md)]"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold truncate text-fouzar-text-primary">
                            {req.sender?.name}
                          </p>
                          <p className="font-mono text-[7px] text-fouzar-text-secondary truncate mt-0.5">
                            ID: {req.sender?.fouzarId} · {req.sender?.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={friendActionLoading !== null}
                            onClick={() => handleAcceptRequest(req.id)}
                            className="p-1 border border-fouzar-accent bg-fouzar-accent/10 text-fouzar-accent rounded hover:bg-fouzar-accent/25 transition-colors cursor-pointer"
                            title="Accept"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={friendActionLoading !== null}
                            onClick={() => handleRejectRequest(req.id)}
                            className="p-1 border border-fouzar-border hover:border-fouzar-signal text-fouzar-text-secondary hover:text-fouzar-signal rounded hover:bg-fouzar-signal/5 transition-colors cursor-pointer"
                            title="Decline"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Outgoing Pending Requests */}
              {outgoingRequests.length > 0 && (
                <div className="space-y-2">
                  <span className="font-mono text-[7.5px] uppercase tracking-widest text-fouzar-text-secondary">
                    Sent Friend Invites ({outgoingRequests.length})
                  </span>
                  <div className="space-y-1.5">
                    {outgoingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-2.5 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)]"
                      >
                        <div className="min-w-0">
                          <p className="text-[10px] font-medium truncate text-fouzar-text-primary">
                            {req.receiver?.name}
                          </p>
                          <p className="font-mono text-[7px] text-fouzar-text-secondary truncate mt-0.5">
                            ID: {req.receiver?.fouzarId} · {req.receiver?.email}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={friendActionLoading !== null}
                          onClick={() => handleRejectRequest(req.id)}
                          className="p-1 text-fouzar-text-tertiary hover:text-fouzar-signal transition-colors cursor-pointer"
                          title="Cancel Invitation"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Friends List */}
              <div className="space-y-2.5">
                <span className="font-mono text-[7.5px] uppercase tracking-widest text-fouzar-text-secondary block">
                  All Friends ({friends.length})
                </span>
                
                {friendsLoading ? (
                  <div className="py-12 flex items-center justify-center">
                    <span className="font-mono text-[8.5px] text-fouzar-text-tertiary animate-pulse uppercase">
                      Loading network...
                    </span>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-fouzar-border rounded-[var(--fouzar-radius-lg)] bg-fouzar-elevated/10">
                    <Users className="w-8 h-8 text-fouzar-text-tertiary mx-auto mb-2 opacity-65" />
                    <p className="font-mono text-[8.5px] text-fouzar-text-secondary uppercase">
                      Study Network is Empty
                    </p>
                    <p className="text-[7.5px] font-mono text-fouzar-text-tertiary uppercase mt-1">
                      Enter a 6-digit Connection ID above to invite friends to join circles
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="group flex items-center justify-between p-3 bg-fouzar-elevated/20 border border-fouzar-border/60 rounded-[var(--fouzar-radius-md)] hover:border-fouzar-accent/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Live Status indicator */}
                          <div className="relative">
                            <div className="w-7 h-7 bg-fouzar-accent/10 border border-fouzar-accent/20 rounded-full flex items-center justify-center overflow-hidden">
                              {friend.avatarUrl ? (
                                <img
                                  src={friend.avatarUrl}
                                  alt={friend.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-3.5 h-3.5 text-fouzar-accent" />
                              )}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-fouzar-surface ${
                                friend.isFocusing
                                  ? 'bg-fouzar-amber'
                                  : 'bg-fouzar-accent'
                              }`}
                              title={friend.isFocusing ? 'In Focus Mode' : 'Online'}
                            />
                          </div>
                          
                          <div className="min-w-0">
                            <p className="text-[10.5px] font-semibold truncate text-fouzar-text-primary">
                              {friend.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {friend.isFocusing ? (
                                <span className="font-mono text-[6.5px] text-fouzar-amber uppercase flex items-center gap-0.5 select-none font-bold">
                                  <Flame className="w-3 h-3 text-fouzar-amber animate-pulse" /> Focus Flow
                                </span>
                              ) : (
                                <span className="font-mono text-[6.5px] text-fouzar-accent uppercase select-none font-bold">
                                  Online
                                </span>
                              )}
                              <span className="text-fouzar-text-tertiary text-[6.5px] font-semibold select-none font-mono">·</span>
                              <span className="font-mono text-[6.5px] text-fouzar-text-secondary truncate max-w-[200px]">
                                ID: {friend.fouzarId} · {friend.email}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={friendActionLoading !== null}
                          onClick={() => handleRemoveFriend(friend.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-fouzar-text-tertiary hover:text-fouzar-signal transition-all cursor-pointer"
                          title="Remove Friend"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
