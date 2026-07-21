'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Users, Palette, Link2, BookOpen, Shield, Trash2,
  Check, X, UserPlus, UserMinus, Loader2, Copy, CheckCheck, Flame,
  LogOut, Camera, AtSign, Hash, GraduationCap, Plug, Globe, GitBranch,
  Calendar, MessageSquare, Lock, AlertTriangle, Eye, EyeOff, Search,
  ChevronRight, Clock, Bell, Zap, Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFouzar } from '../../lib/FouzarContext';
import { FascaLogo } from '../../components/logo/FascaLogo';
import ImageCropModal from '../../components/profile/ImageCropModal';
import {
  updateProfile, checkUsername, getFriends, getFriendRequests, getBlockedUsers,
  sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend,
  patchLmsToken, getLmsStatus, getPortalStatus, connectPortal,
  getPortalProfile, savePortalAttendance, savePortalTranscript, savePortalGpa,
  resetPassword,
} from '../../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Friend {
  friendshipId: string;
  id: string;
  name: string;
  email: string;
  username?: string | null;
  fouzarId?: string;
  avatarUrl?: string;
  isFocusing: boolean;
}

interface FriendRequest {
  id: string;
  sender?: { id: string; name: string; email: string; username?: string | null; fouzarId?: string; avatarUrl?: string };
  receiver?: { id: string; name: string; email: string; username?: string | null; fouzarId?: string; avatarUrl?: string };
  createdAt: string;
}

interface BlockedUser {
  id: string; name: string; email: string; username?: string | null; fouzarId?: string; avatarUrl?: string;
}

type TabId = 'profile' | 'network' | 'workspace' | 'integrations' | 'security' | 'account';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-3.5 h-3.5" /> },
  { id: 'network', label: 'Network', icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'workspace', label: 'Workspace', icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'integrations', label: 'Integrations', icon: <Link2 className="w-3.5 h-3.5" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'account', label: 'Account', icon: <Trash2 className="w-3.5 h-3.5" /> },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACCENT = '#7c5cfc';
const ACCENT_DIM = 'rgba(124,92,252,0.12)';

const Orbs = () => (
  <div className="pointer-events-none fixed inset-0 overflow-hidden z-0" aria-hidden>
    <div className="absolute rounded-full blur-[130px] opacity-[0.065]" style={{ width: 700, height: 700, left: '-12%', top: '-20%', background: ACCENT }} />
    <div className="absolute rounded-full blur-[100px] opacity-[0.045]" style={{ width: 450, height: 450, right: '-8%', bottom: '8%', background: '#5ce1ff' }} />
    <div className="absolute rounded-full blur-[80px] opacity-[0.035]" style={{ width: 300, height: 300, left: '50%', top: '55%', background: '#f5a623' }} />
  </div>
);

const Card = ({ children, className = '', glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) => (
  <div className={`relative bg-[#14141c]/90 border border-white/[0.07] rounded-2xl backdrop-blur-sm overflow-hidden ${glow ? 'shadow-[0_0_40px_rgba(124,92,252,0.08)]' : ''} ${className}`}>
    {glow && <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(124,92,252,0.04) 0%, transparent 60%)' }} />}
    {children}
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[9.5px] font-semibold uppercase tracking-[0.15em] text-white/30 mb-4">{children}</p>
);

const Field = ({ label, type = 'text', value, onChange, placeholder, readOnly, mono, maxLength, suffix }: {
  label: string; type?: string; value: string; onChange?: (v: string) => void;
  placeholder?: string; readOnly?: boolean; mono?: boolean; maxLength?: number; suffix?: string;
}) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35 block">{label}</label>
    <div className="relative">
      <input
        type={type} value={value} readOnly={readOnly} maxLength={maxLength}
        onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder}
        className={`w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5 text-[13px] text-white/90 placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 focus:bg-white/[0.06] transition-all duration-200 ${mono ? 'font-mono tracking-widest' : ''} ${readOnly ? 'opacity-50 cursor-default' : ''} ${suffix ? 'pr-16' : ''}`}
      />
      {suffix && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-white/25 font-mono">{suffix}</span>}
    </div>
  </div>
);

const StatusBadge = ({ connected }: { connected: boolean }) => (
  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${connected ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-white/[0.04] border-white/10 text-white/30'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-white/25'}`} />
    {connected ? 'Connected' : 'Not set up'}
  </span>
);

const Avatar = ({ src, name, size = 'md' }: { src?: string | null; name?: string | null; size?: 'sm' | 'md' | 'lg' }) => {
  const dims = size === 'lg' ? 'w-24 h-24 text-2xl' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  const letter = (name || '?')[0].toUpperCase();
  return (
    <div className={`${dims} rounded-full bg-[#7c5cfc]/15 border border-[#7c5cfc]/25 flex items-center justify-center font-bold text-[#7c5cfc] overflow-hidden shrink-0`}>
      {src ? <img src={src} alt={name || ''} className="w-full h-full object-cover" /> : letter}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user, mutate, logout } = useAuth();
  const { mode, setMode, accentColor, setAccentColor } = useFouzar();

  const [tab, setTab] = useState<TabId>('profile');

  // ── Profile state ──────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copy ID
  const [copied, setCopied] = useState(false);

  // Stats (TODO: wire to real endpoints)
  const [stats] = useState({ friends: 0, groups: 0, studyHours: 0, tasks: 0 });

  // ── Network state ──────────────────────────────────────────────────────────
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingReqs, setIncomingReqs] = useState<FriendRequest[]>([]);
  const [outgoingReqs, setOutgoingReqs] = useState<FriendRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [friendActionLoading, setFriendActionLoading] = useState<string | null>(null);
  const [networkMsg, setNetworkMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [networkSection, setNetworkSection] = useState<'friends' | 'requests' | 'blocked'>('friends');

  // ── Integrations state ─────────────────────────────────────────────────────
  const [lmsProvider, setLmsProvider] = useState<'moodle' | 'canvas'>('moodle');
  const [lmsUrl, setLmsUrl] = useState('');
  const [lmsToken, setLmsToken] = useState('');
  const [lmsConnected, setLmsConnected] = useState(false);
  const [lmsSaving, setLmsSaving] = useState(false);
  const [lmsMsg, setLmsMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [portalType, setPortalType] = useState('moodle');
  const [portalUrl, setPortalUrl] = useState('');
  const [studentId, setStudentId] = useState('');
  const [portalConnected, setPortalConnected] = useState(false);
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalMsg, setPortalMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Security state ─────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // ── Account state ──────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setUsername(user.username || '');
    setEmail(user.email || '');
    setBio(user.bio || '');
    setDepartment(user.department || '');
  }, [user]);

  useEffect(() => {
    if (user) {
      loadNetwork();
      loadLms();
      loadPortal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadNetwork = async () => {
    setNetworkLoading(true);
    try {
      const [f, r, b] = await Promise.all([getFriends(), getFriendRequests(), getBlockedUsers()]);
      setFriends(f || []);
      setIncomingReqs(r?.incoming || []);
      setOutgoingReqs(r?.outgoing || []);
      setBlockedUsers(b || []);
    } catch { /* silent */ }
    setNetworkLoading(false);
  };

  const loadLms = async () => {
    try {
      const s = await getLmsStatus();
      if (s?.connected || s?.baseUrl || s?.url) {
        setLmsUrl(s.baseUrl || s.url || 'https://lms.umt.edu.pk');
        setLmsProvider(s.provider || 'moodle');
        setLmsToken('••••••••••••••••');
        setLmsConnected(true);
      } else {
        setLmsConnected(false);
      }
    } catch { setLmsConnected(false); }
  };

  const loadPortal = async () => {
    try {
      const s = await getPortalStatus();
      if (s?.connected && s?.portalUrl && !s.portalUrl.includes('lms.umt.edu.pk')) {
        setPortalConnected(true);
        setPortalUrl(s.portalUrl || '');
        setPortalType(s.portalType || 'moodle');
        setStudentId(s.studentId || '');
      } else {
        setPortalConnected(false);
        setPortalUrl('');
        setStudentId('');
      }
    } catch { setPortalConnected(false); }
  };

  // ── Username debounce ──────────────────────────────────────────────────────
  const validateUsernameLocally = (u: string): boolean => {
    if (u.length < 3 || u.length > 20) return false;
    if (!/^[a-z0-9_]+$/.test(u)) return false;
    if (u.startsWith('_') || u.endsWith('_')) return false;
    if (u.includes('__')) return false;
    if (/^\d+$/.test(u)) return false;
    return true;
  };

  const handleUsernameChange = (val: string) => {
    const lower = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(lower);
    markDirty('username');
    setUsernameStatus('idle');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (!lower || lower === (user?.username || '')) { setUsernameStatus('idle'); return; }
    if (!validateUsernameLocally(lower)) { setUsernameStatus('invalid'); return; }
    setUsernameStatus('checking');
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await checkUsername(lower);
        setUsernameStatus(res.available ? 'available' : 'taken');
      } catch { setUsernameStatus('idle'); }
    }, 500);
  };

  const markDirty = (field: string) => setDirtyFields((prev) => new Set(prev).add(field));
  const isDirty = dirtyFields.size > 0;

  // ── Profile save ───────────────────────────────────────────────────────────
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'checking') {
      setProfileMsg({ text: 'Please fix your username before saving.', ok: false }); return;
    }
    setProfileSaving(true); setProfileMsg(null);
    try {
      const payload: any = {};
      if (dirtyFields.has('name')) payload.name = name.trim();
      if (dirtyFields.has('email')) payload.email = email.trim();
      if (dirtyFields.has('bio')) payload.bio = bio.trim();
      if (dirtyFields.has('department')) payload.department = department.trim();
      if (dirtyFields.has('username') && username) payload.username = username;
      const res = await updateProfile(payload);
      if (res.success) {
        setProfileMsg({ text: 'Profile saved!', ok: true });
        setDirtyFields(new Set());
        if (mutate) mutate();
      }
    } catch (err: any) {
      setProfileMsg({ text: err.message || 'Save failed.', ok: false });
    } finally { setProfileSaving(false); }
  };

  // ── Avatar ─────────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setProfileMsg({ text: 'Image must be under 5MB.', ok: false }); return; }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileMsg({ text: 'Only JPG, PNG, WEBP allowed.', ok: false }); return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropSave = async (dataUrl: string) => {
    setCropSrc(null);
    setAvatarSaving(true);
    try {
      const res = await updateProfile({ avatarUrl: dataUrl });
      if (res.success) { setAvatarPreview(dataUrl); if (mutate) mutate(); }
    } catch (err: any) {
      setProfileMsg({ text: err.message || 'Avatar upload failed.', ok: false });
    } finally { setAvatarSaving(false); }
  };

  const handleCopyId = () => {
    if (user?.fouzarId) { navigator.clipboard.writeText(user.fouzarId); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  // ── Friend actions ─────────────────────────────────────────────────────────
  const handleSendFriendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendInput.trim()) return;
    setNetworkMsg(null); setFriendActionLoading('send');
    try {
      const res = await sendFriendRequest(friendInput.trim());
      if (res.success) { setNetworkMsg({ text: res.message || 'Request sent!', ok: true }); setFriendInput(''); loadNetwork(); }
    } catch (err: any) { setNetworkMsg({ text: err.message || 'Failed.', ok: false }); }
    finally { setFriendActionLoading(null); }
  };

  const handleAccept = async (id: string) => {
    setFriendActionLoading(id);
    try { await acceptFriendRequest(id); loadNetwork(); } catch { /* silent */ } finally { setFriendActionLoading(null); }
  };

  const handleReject = async (id: string) => {
    setFriendActionLoading(id);
    try { await rejectFriendRequest(id); loadNetwork(); } catch { /* silent */ } finally { setFriendActionLoading(null); }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Remove this friend?')) return;
    setFriendActionLoading(friendId);
    try { await removeFriend(friendId); loadNetwork(); } catch { /* silent */ } finally { setFriendActionLoading(null); }
  };

  // ── Password change ────────────────────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwMsg({ text: 'Passwords do not match.', ok: false }); return; }
    if (newPassword.length < 8) { setPwMsg({ text: 'Password must be at least 8 characters.', ok: false }); return; }
    setPwSaving(true); setPwMsg(null);
    try {
      // We'll re-use resetPassword logic by doing a PATCH — in a real app you'd have a dedicated change-password endpoint
      // For now, update via updateProfile won't work for password. We just show a placeholder.
      setPwMsg({ text: 'Password change requires the reset email flow for now. Use Forgot Password on login.', ok: false });
    } catch (err: any) {
      setPwMsg({ text: err.message || 'Failed.', ok: false });
    } finally { setPwSaving(false); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const displayName = user?.name || user?.email?.split('@')[0] || 'You';
  const displayUsername = user?.username;
  const avatarSrc = avatarPreview || user?.avatarUrl;

  const filteredFriends = friends.filter((f) => {
    const q = searchQuery.toLowerCase();
    return !q || f.name?.toLowerCase().includes(q) || f.username?.toLowerCase().includes(q) || f.fouzarId?.includes(q);
  });
  const onlineFriends = filteredFriends.filter((f) => f.isFocusing || true); // treat all as online for now
  const totalRequests = incomingReqs.length + outgoingReqs.length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0d0d12] text-white font-sans selection:bg-[#7c5cfc]/30 selection:text-[#c4b5fd] flex flex-col">
      <Orbs />

      {/* ── HEADER ── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3.5 border-b border-white/[0.05] bg-[#0d0d12]/90 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[11px] font-medium text-white/35 hover:text-white/75 transition-colors cursor-pointer">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="w-px h-4 bg-white/10" />
          <FascaLogo showWordmark size={20} linkTo="/dashboard" />
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
            <Avatar src={avatarSrc} name={user?.name} size="sm" />
            <span className="text-[11px] font-medium text-white/65 max-w-[120px] truncate">{displayName}</span>
          </div>
          <button type="button" onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ff2d55]/20 text-[#ff2d55] text-[11px] font-medium hover:bg-[#ff2d55]/10 transition-all cursor-pointer">
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 pt-8 pb-20">

        {/* Page title */}
        <div className="mb-7">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-1 h-5 rounded-full" style={{ background: ACCENT }} />
            <h1 className="text-lg font-bold text-white tracking-tight">Settings</h1>
          </div>
          <p className="text-[11px] text-white/30 ml-3.5">Manage your identity, privacy, and workspace</p>
        </div>

        {/* ── TABS ── */}
        <div className="flex items-center gap-0.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.05] mb-8 w-fit overflow-x-auto">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${active ? 'text-white' : 'text-white/35 hover:text-white/65'}`}>
                {active && (
                  <motion.div layoutId="tab-active" className="absolute inset-0 rounded-xl border border-[#7c5cfc]/35"
                    style={{ background: ACCENT_DIM }} transition={{ type: 'spring', duration: 0.4 }} />
                )}
                <span className="relative z-10">{t.icon}</span>
                <span className="relative z-10">{t.label}</span>
                {t.id === 'network' && totalRequests > 0 && (
                  <span className="relative z-10 ml-0.5 w-4 h-4 rounded-full bg-[#f5a623] text-black text-[9px] font-bold flex items-center justify-center">{totalRequests}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB CONTENT ── */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>

            {/* ═══════════════════════════════════════════════════════════════
                PROFILE TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'profile' && (
              <div className="grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">

                {/* LEFT: Profile Card */}
                <div className="space-y-4">
                  <Card className="p-6 flex flex-col items-center gap-5" glow>
                    {/* Avatar */}
                    <div className="relative group">
                      <div className="w-28 h-28 rounded-full border-2 border-[#7c5cfc]/40 overflow-hidden flex items-center justify-center bg-[#7c5cfc]/10 text-[#7c5cfc] text-3xl font-bold shadow-[0_0_50px_rgba(124,92,252,0.2)]">
                        {avatarSrc
                          ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                          : (user?.name || '?')[0].toUpperCase()}
                      </div>

                      {/* Online dot */}
                      <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#14141c] shadow-[0_0_10px_rgba(52,211,153,0.7)]" />

                      {/* Upload overlay */}
                      <label className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        {avatarSaving
                          ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                          : <><Camera className="w-5 h-5 text-white mb-1" /><span className="text-[9px] text-white font-semibold uppercase tracking-wider">Change</span></>
                        }
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
                      </label>
                    </div>

                    {/* Name + username */}
                    <div className="text-center">
                      <p className="text-base font-bold text-white leading-tight">{displayName}</p>
                      {displayUsername
                        ? <p className="text-[12px] text-[#7c5cfc] mt-0.5 font-mono">@{displayUsername}</p>
                        : <p className="text-[11px] text-white/25 mt-0.5 italic">No username set</p>
                      }
                      <div className="flex items-center justify-center gap-1.5 mt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] text-emerald-400 font-medium">Online</span>
                      </div>
                    </div>

                    {/* Meta info */}
                    {(user?.department || user?.universityId) && (
                      <div className="w-full space-y-2 border-t border-white/[0.06] pt-4">
                        {user?.department && (
                          <div className="flex items-center gap-2 text-[11px] text-white/50">
                            <GraduationCap className="w-3.5 h-3.5 text-white/25 shrink-0" />
                            <span className="truncate">{user.department}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[11px] text-white/50">
                          <Clock className="w-3.5 h-3.5 text-white/25 shrink-0" />
                          <span>Member since {new Date(user?.createdAt || '').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    )}

                    {/* Connection ID */}
                    <div className="w-full p-3.5 rounded-xl border border-[#7c5cfc]/20 bg-[#7c5cfc]/[0.06]">
                      <p className="text-[9px] uppercase tracking-[0.15em] font-semibold text-[#7c5cfc] mb-2">Connection ID</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xl font-bold text-white tracking-[0.25em]">{user?.fouzarId || '------'}</span>
                        <button type="button" onClick={handleCopyId}
                          className="p-1.5 rounded-lg bg-[#7c5cfc]/10 hover:bg-[#7c5cfc]/20 text-[#7c5cfc] transition-colors cursor-pointer">
                          {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <p className="text-[9px] text-white/25 mt-1.5">Friends can find you with this or your @username</p>
                    </div>
                  </Card>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Friends', value: friends.length, icon: <Users className="w-4 h-4" /> },
                      { label: 'Groups', value: stats.groups, icon: <Sparkles className="w-4 h-4" /> },
                      { label: 'Study Hours', value: `${stats.studyHours}h`, icon: <Clock className="w-4 h-4" /> },
                      { label: 'Tasks Done', value: stats.tasks, icon: <Check className="w-4 h-4" /> },
                    ].map((s) => (
                      <Card key={s.label} className="p-4">
                        <div className="flex items-center gap-2 text-white/25 mb-2">{s.icon}</div>
                        <p className="text-lg font-bold text-white">{s.value}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Edit form */}
                <Card className="p-6">
                  <SectionLabel>Personal Information</SectionLabel>
                  <form onSubmit={handleProfileSave} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Display Name" value={name}
                        onChange={(v) => { setName(v); markDirty('name'); }} placeholder="Ahmad Arshad" />
                      {/* Username field */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35 block">Username</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-[13px] font-mono">@</span>
                          <input
                            type="text" value={username} maxLength={20}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            placeholder="your_username"
                            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-7 pr-10 py-2.5 text-[13px] text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-[#7c5cfc]/50 focus:bg-white/[0.06] transition-all"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
                            {usernameStatus === 'checking' && <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />}
                            {usernameStatus === 'available' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            {usernameStatus === 'taken' && <X className="w-3.5 h-3.5 text-[#ff2d55]" />}
                            {usernameStatus === 'invalid' && <AlertTriangle className="w-3.5 h-3.5 text-[#f5a623]" />}
                          </span>
                        </div>
                        {usernameStatus === 'available' && <p className="text-[10px] text-emerald-400">@{username} is available</p>}
                        {usernameStatus === 'taken' && <p className="text-[10px] text-[#ff2d55]">@{username} is taken</p>}
                        {usernameStatus === 'invalid' && <p className="text-[10px] text-[#f5a623]">3–20 chars, letters/numbers/underscores only</p>}
                      </div>
                    </div>

                    <Field label="Email Address" type="email" value={email}
                      onChange={(v) => { setEmail(v); markDirty('email'); }} />

                    <Field label="Department / Major" value={department}
                      onChange={(v) => { setDepartment(v); markDirty('department'); }} placeholder="e.g. Computer Science" />

                    {/* Bio */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35 block">Bio <span className="normal-case">(optional)</span></label>
                      <textarea
                        value={bio} maxLength={500} rows={3}
                        onChange={(e) => { setBio(e.target.value); markDirty('bio'); }}
                        placeholder="Tell your study network something about you..."
                        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5 text-[13px] text-white/90 placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 focus:bg-white/[0.06] transition-all resize-none"
                      />
                      <p className="text-[9.5px] text-white/20 text-right">{bio.length}/500</p>
                    </div>

                    <AnimatePresence>
                      {profileMsg && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className={`p-3 rounded-xl text-[11px] font-medium ${profileMsg.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-[#ff2d55]/10 border border-[#ff2d55]/20 text-[#ff2d55]'}`}>
                          {profileMsg.text}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center justify-end gap-3 pt-1">
                      {isDirty && (
                        <button type="button" onClick={() => {
                          setDirtyFields(new Set());
                          if (user) { setName(user.name || ''); setUsername(user.username || ''); setEmail(user.email || ''); setBio(user.bio || ''); setDepartment(user.department || ''); }
                          setUsernameStatus('idle');
                        }}
                          className="px-4 py-2.5 rounded-xl text-[12px] font-medium text-white/40 hover:text-white/70 transition-colors cursor-pointer border border-white/[0.07] hover:border-white/15">
                          Cancel
                        </button>
                      )}
                      <AnimatePresence>
                        {isDirty && (
                          <motion.button type="submit" disabled={profileSaving}
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-[12px] font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(124,92,252,0.3)]">
                            {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save Changes
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                NETWORK TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'network' && (
              <div className="space-y-5">
                {/* Search + Add */}
                <Card className="p-5">
                  <div className="flex gap-3 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, @username, or connection ID…"
                        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-white/90 placeholder-white/25 focus:outline-none focus:border-[#7c5cfc]/50 transition-all" />
                    </div>
                  </div>

                  {/* Add Friend */}
                  <form onSubmit={handleSendFriendRequest} className="flex gap-2">
                    <div className="relative flex-1">
                      <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                      <input type="text" value={friendInput} onChange={(e) => setFriendInput(e.target.value)}
                        placeholder="Enter @username or 6-digit Connection ID…"
                        className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-10 pr-4 py-2.5 text-[13px] font-mono text-white/90 placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 transition-all" />
                    </div>
                    <button type="submit" disabled={friendActionLoading === 'send' || !friendInput.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-[#7c5cfc]/15 border border-[#7c5cfc]/30 text-[#7c5cfc] text-[12px] font-semibold rounded-xl hover:bg-[#7c5cfc]/25 transition-all disabled:opacity-50 cursor-pointer">
                      {friendActionLoading === 'send' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                      Add
                    </button>
                  </form>

                  <AnimatePresence>
                    {networkMsg && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className={`text-[11px] font-medium mt-2 ${networkMsg.ok ? 'text-emerald-400' : 'text-[#ff2d55]'}`}>
                        {networkMsg.text}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </Card>

                {/* Sub-nav */}
                <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05] w-fit">
                  {([['friends', `Friends (${friends.length})`], ['requests', `Requests (${totalRequests})`], ['blocked', `Blocked (${blockedUsers.length})`]] as const).map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setNetworkSection(id)}
                      className={`relative px-4 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${networkSection === id ? 'text-white' : 'text-white/35 hover:text-white/65'}`}>
                      {networkSection === id && <motion.div layoutId="net-tab" className="absolute inset-0 rounded-lg border border-white/10 bg-white/[0.06]" transition={{ type: 'spring', duration: 0.3 }} />}
                      <span className="relative z-10">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Friends */}
                {networkSection === 'friends' && (
                  <Card className="p-5">
                    {networkLoading ? (
                      <div className="py-16 flex items-center justify-center"><Loader2 className="w-6 h-6 text-[#7c5cfc] animate-spin" /></div>
                    ) : filteredFriends.length === 0 ? (
                      <div className="py-16 text-center">
                        <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="text-[13px] text-white/30 font-medium">{searchQuery ? 'No matches' : 'No friends yet'}</p>
                        <p className="text-[11px] text-white/20 mt-1">Add someone with their @username or Connection ID above</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredFriends.map((f) => (
                          <div key={f.id} className="group flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#7c5cfc]/25 hover:bg-[#7c5cfc]/[0.03] transition-all">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar src={f.avatarUrl} name={f.name} size="sm" />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#14141c] ${f.isFocusing ? 'bg-[#f5a623] shadow-[0_0_8px_rgba(245,166,35,0.7)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'}`} />
                              </div>
                              <div>
                                <p className="text-[13px] font-semibold text-white leading-tight">{f.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {f.username && <span className="text-[10px] text-[#7c5cfc] font-mono">@{f.username}</span>}
                                  {f.username && f.fouzarId && <span className="text-white/20 text-[10px]">·</span>}
                                  {f.fouzarId && <span className="text-[10px] text-white/25 font-mono">{f.fouzarId}</span>}
                                  {f.isFocusing && <span className="text-[10px] text-[#f5a623] flex items-center gap-0.5"><Flame className="w-3 h-3" /> Focus</span>}
                                </div>
                              </div>
                            </div>
                            <button type="button" disabled={!!friendActionLoading} onClick={() => handleRemoveFriend(f.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/25 hover:text-[#ff2d55] hover:bg-[#ff2d55]/10 transition-all cursor-pointer">
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}

                {/* Requests */}
                {networkSection === 'requests' && (
                  <div className="space-y-4">
                    {incomingReqs.length > 0 && (
                      <Card className="p-5">
                        <SectionLabel>Incoming ({incomingReqs.length})</SectionLabel>
                        <div className="space-y-2.5">
                          {incomingReqs.map((req) => (
                            <div key={req.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#f5a623]/[0.05] border border-[#f5a623]/15">
                              <div className="flex items-center gap-3">
                                <Avatar src={req.sender?.avatarUrl} name={req.sender?.name} size="sm" />
                                <div>
                                  <p className="text-[13px] font-semibold text-white">{req.sender?.name}</p>
                                  <p className="text-[10px] text-white/35 font-mono mt-0.5">
                                    {req.sender?.username ? `@${req.sender.username}` : req.sender?.fouzarId}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button type="button" disabled={!!friendActionLoading} onClick={() => handleAccept(req.id)}
                                  className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 transition-colors cursor-pointer">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" disabled={!!friendActionLoading} onClick={() => handleReject(req.id)}
                                  className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-white/40 hover:text-[#ff2d55] hover:border-[#ff2d55]/30 transition-all cursor-pointer">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {outgoingReqs.length > 0 && (
                      <Card className="p-5">
                        <SectionLabel>Sent ({outgoingReqs.length})</SectionLabel>
                        <div className="space-y-2">
                          {outgoingReqs.map((req) => (
                            <div key={req.id} className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                              <div className="flex items-center gap-3">
                                <Avatar src={req.receiver?.avatarUrl} name={req.receiver?.name} size="sm" />
                                <div>
                                  <p className="text-[13px] font-medium text-white/80">{req.receiver?.name}</p>
                                  <p className="text-[10px] text-white/30 font-mono">{req.receiver?.username ? `@${req.receiver.username}` : req.receiver?.fouzarId}</p>
                                </div>
                              </div>
                              <button type="button" disabled={!!friendActionLoading} onClick={() => handleReject(req.id)}
                                className="p-1.5 text-white/25 hover:text-[#ff2d55] transition-colors cursor-pointer" title="Cancel">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}

                    {incomingReqs.length === 0 && outgoingReqs.length === 0 && (
                      <Card className="p-12 text-center">
                        <Bell className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="text-[13px] text-white/30">No pending requests</p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Blocked */}
                {networkSection === 'blocked' && (
                  <Card className="p-5">
                    {blockedUsers.length === 0 ? (
                      <div className="py-16 text-center">
                        <Shield className="w-10 h-10 text-white/10 mx-auto mb-3" />
                        <p className="text-[13px] text-white/30">No blocked users</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {blockedUsers.map((u) => (
                          <div key={u.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[#ff2d55]/[0.04] border border-[#ff2d55]/10">
                            <div className="flex items-center gap-3">
                              <Avatar src={u.avatarUrl} name={u.name} size="sm" />
                              <div>
                                <p className="text-[13px] font-medium text-white/75">{u.name}</p>
                                <p className="text-[10px] text-white/25 font-mono">{u.username ? `@${u.username}` : u.fouzarId}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-[#ff2d55]/70 border border-[#ff2d55]/20 px-2.5 py-1 rounded-full">Blocked</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                WORKSPACE TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'workspace' && (
              <div className="space-y-5">
                {/* Theme */}
                <Card className="p-6">
                  <SectionLabel>Visual Theme</SectionLabel>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {([['onyx', 'Onyx', 'Tactical matte charcoal', '#0d0d12', '#1e1e2a'], ['greenhouse', 'Greenhouse', 'Glassmorphism blue', '#0a1018', '#0d1f35']] as const).map(([id, label, desc, c1, c2]) => {
                      const sel = mode === id;
                      return (
                        <button key={id} type="button" onClick={() => setMode(id)}
                          className={`flex flex-col items-start p-4 rounded-xl border transition-all cursor-pointer text-left ${sel ? 'border-[#7c5cfc]/40 bg-[#7c5cfc]/[0.08] shadow-[0_0_24px_rgba(124,92,252,0.1)]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15'}`}>
                          <div className="w-full h-10 rounded-lg mb-3 overflow-hidden" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})`, border: '1px solid rgba(255,255,255,0.07)' }} />
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <p className={`text-[13px] font-bold ${sel ? 'text-white' : 'text-white/65'}`}>{label}</p>
                              <p className="text-[10px] text-white/30 mt-0.5">{desc}</p>
                            </div>
                            {sel && <div className="w-5 h-5 rounded-full bg-[#7c5cfc] flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-white" /></div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Accent Color */}
                <Card className="p-6">
                  <SectionLabel>Accent Color</SectionLabel>
                  <div className="flex flex-wrap gap-3">
                    {([['violet', 'Violet', '#7c5cfc'], ['emerald', 'Emerald', '#3dd68c'], ['ice', 'Ice Blue', '#5ce1ff'], ['amber', 'Amber', '#f5a623'], ['signal', 'Crimson', '#ff2d55']] as const).map(([id, label, color]) => {
                      const sel = accentColor === id;
                      return (
                        <button key={id} type="button" onClick={() => setAccentColor(id)}
                          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border transition-all cursor-pointer ${sel ? 'border-white/20 bg-white/[0.06]' : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15'}`}
                          style={sel ? { boxShadow: `0 0 18px ${color}35` } : {}}>
                          <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: sel ? `0 0 10px ${color}90` : undefined }} />
                          <span className={`text-[12px] font-medium ${sel ? 'text-white' : 'text-white/45'}`}>{label}</span>
                          {sel && <Check className="w-3 h-3 text-white/60" />}
                        </button>
                      );
                    })}
                  </div>
                </Card>

                {/* Notifications (coming soon) */}
                <Card className="p-6">
                  <SectionLabel>Notifications</SectionLabel>
                  <div className="py-6 text-center">
                    <Bell className="w-8 h-8 text-white/10 mx-auto mb-2" />
                    <p className="text-[12px] text-white/25">Notification preferences coming soon</p>
                  </div>
                </Card>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                INTEGRATIONS TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'integrations' && (
              <div className="space-y-5">
                {/* LMS Bridge */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 flex items-center justify-center text-[#7c5cfc]"><Plug className="w-4 h-4" /></div>
                      <div><p className="text-[13px] font-semibold text-white">LMS Bridge</p><p className="text-[10px] text-white/30">Moodle or Canvas integration</p></div>
                    </div>
                    <StatusBadge connected={lmsConnected} />
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault(); setLmsSaving(true); setLmsMsg(null);
                    try {
                      const res = await patchLmsToken(lmsToken.trim(), lmsUrl.trim(), lmsProvider);
                      if (res.success) { setLmsMsg({ text: 'LMS connected!', ok: true }); setLmsConnected(true); } else setLmsMsg({ text: res.message || 'Failed.', ok: false });
                    } catch (err: any) { setLmsMsg({ text: err.message, ok: false }); } finally { setLmsSaving(false); }
                  }} className="space-y-4">
                    <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
                      {(['moodle', 'canvas'] as const).map((p) => (
                        <button key={p} type="button" onClick={() => setLmsProvider(p)}
                          className={`px-4 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer ${lmsProvider === p ? 'bg-[#7c5cfc]/20 text-white border border-[#7c5cfc]/30' : 'text-white/35 hover:text-white/65'}`}>
                          {p === 'moodle' ? 'Moodle' : 'Canvas'}
                        </button>
                      ))}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Base URL" type="url" value={lmsUrl} onChange={setLmsUrl} placeholder="https://moodle.university.edu" />
                      <Field label="Access Token" type="password" value={lmsToken} onChange={setLmsToken} placeholder="Web service token…" />
                    </div>
                    <AnimatePresence>
                      {lmsMsg && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`p-3 rounded-xl text-[11px] font-medium ${lmsMsg.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-[#ff2d55]/10 border border-[#ff2d55]/20 text-[#ff2d55]'}`}>{lmsMsg.text}</motion.div>}
                    </AnimatePresence>
                    <div className="flex justify-end gap-2">
                      {lmsConnected && (
                        <button type="button" onClick={async () => {
                          try { await disconnectLms(); } catch {}
                          setLmsConnected(false); setLmsToken(''); setLmsMsg({ text: 'LMS Disconnected', ok: true });
                        }} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-[12px] font-semibold rounded-xl transition-all border border-white/10 cursor-pointer">
                          Disconnect
                        </button>
                      )}
                      <button type="submit" disabled={lmsSaving} className="flex items-center gap-2 px-5 py-2.5 bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-[12px] font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(124,92,252,0.3)]">
                        {lmsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plug className="w-3.5 h-3.5" />} {lmsConnected ? 'Update' : 'Connect'}
                      </button>
                    </div>
                  </form>
                </Card>

                {/* Student Portal */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400"><GraduationCap className="w-4 h-4" /></div>
                      <div><p className="text-[13px] font-semibold text-white">Student Portal</p><p className="text-[10px] text-white/30">Attendance, transcript, GPA sync</p></div>
                    </div>
                    <StatusBadge connected={portalConnected} />
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault(); setPortalSaving(true); setPortalMsg(null);
                    try {
                      const res = await connectPortal(portalUrl.trim(), portalType, studentId.trim());
                      if (res.success) { setPortalMsg({ text: 'Portal connected!', ok: true }); setPortalConnected(true); } else setPortalMsg({ text: res.message || 'Failed.', ok: false });
                    } catch (err: any) { setPortalMsg({ text: err.message, ok: false }); } finally { setPortalSaving(false); }
                  }} className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35 block">Portal Type</label>
                        <select value={portalType} onChange={(e) => setPortalType(e.target.value)} className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 py-2.5 text-[13px] text-white/90 focus:outline-none focus:border-[#7c5cfc]/50 transition-all appearance-none cursor-pointer">
                          <option value="moodle">Moodle</option><option value="canvas">Canvas</option><option value="blackboard">Blackboard</option><option value="custom">Custom</option>
                        </select>
                      </div>
                      <Field label="Portal URL" type="url" value={portalUrl} onChange={setPortalUrl} placeholder="https://portal.university.edu" />
                      <Field label="Student ID" value={studentId} onChange={setStudentId} placeholder="e.g. F20241234" />
                    </div>
                    <AnimatePresence>
                      {portalMsg && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`p-3 rounded-xl text-[11px] font-medium ${portalMsg.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-[#ff2d55]/10 border border-[#ff2d55]/20 text-[#ff2d55]'}`}>{portalMsg.text}</motion.div>}
                    </AnimatePresence>
                    <div className="flex justify-end gap-2">
                      {portalConnected && (
                        <button type="button" onClick={async () => {
                          try { await disconnectPortal(); } catch {}
                          setPortalConnected(false); setPortalUrl(''); setStudentId(''); setPortalMsg({ text: 'Portal Disconnected', ok: true });
                        }} className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-[12px] font-semibold rounded-xl transition-all border border-white/10 cursor-pointer">
                          Disconnect
                        </button>
                      )}
                      <button type="submit" disabled={portalSaving} className="flex items-center gap-2 px-5 py-2.5 bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-[12px] font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(124,92,252,0.3)]">
                        {portalSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />} {portalConnected ? 'Update' : 'Connect'}
                      </button>
                    </div>
                  </form>
                </Card>

                {/* Coming soon integrations */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {[['Google Calendar', 'Sync deadlines & events', <Calendar className="w-4 h-4" />], ['GitHub', 'Link your repositories', <GitBranch className="w-4 h-4" />], ['Discord', 'Connect study servers', <MessageSquare className="w-4 h-4" />], ['Microsoft', 'Office & Teams integration', <Zap className="w-4 h-4" />]].map(([label, desc, icon]) => (
                    <Card key={label as string} className="p-4 opacity-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-white/40">{icon as React.ReactNode}</div>
                        <div>
                          <p className="text-[13px] font-semibold text-white/60">{label as string}</p>
                          <p className="text-[10px] text-white/25">{desc as string}</p>
                        </div>
                        <span className="ml-auto text-[9px] border border-white/10 text-white/25 px-2 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SECURITY TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'security' && (
              <div className="space-y-5">
                {/* Change Password */}
                <Card className="p-6">
                  <SectionLabel>Change Password</SectionLabel>
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35 block">Current Password</label>
                      <div className="relative">
                        <input type={showCurrentPw ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Your current password"
                          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 pr-10 py-2.5 text-[13px] text-white/90 placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 transition-all" />
                        <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer">
                          {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/35 block">New Password</label>
                      <div className="relative">
                        <input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 8 characters"
                          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl px-4 pr-10 py-2.5 text-[13px] text-white/90 placeholder-white/20 focus:outline-none focus:border-[#7c5cfc]/50 transition-all" />
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer">
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Field label="Confirm New Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Repeat new password" />

                    <AnimatePresence>
                      {pwMsg && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`p-3 rounded-xl text-[11px] font-medium ${pwMsg.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-[#f5a623]/10 border border-[#f5a623]/20 text-[#f5a623]'}`}>{pwMsg.text}</motion.div>}
                    </AnimatePresence>

                    <button type="submit" disabled={pwSaving} className="flex items-center gap-2 px-5 py-2.5 bg-[#7c5cfc] hover:bg-[#6d4ef0] text-white text-[12px] font-semibold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_20px_rgba(124,92,252,0.3)]">
                      {pwSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />} Update Password
                    </button>
                  </form>
                </Card>

                {/* Active sessions + 2FA (coming soon) */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {[['Two-Factor Authentication', 'Add an extra layer of security'], ['Active Sessions', 'Manage where you are logged in']].map(([title, desc]) => (
                    <Card key={title} className="p-5 opacity-50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center text-white/30"><Shield className="w-4 h-4" /></div>
                        <div>
                          <p className="text-[13px] font-semibold text-white/60">{title}</p>
                          <p className="text-[10px] text-white/25">{desc}</p>
                        </div>
                        <span className="ml-auto text-[9px] border border-white/10 text-white/25 px-2 py-0.5 rounded-full uppercase tracking-wider">Soon</span>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Logout everywhere */}
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-white">Logout Everywhere</p>
                      <p className="text-[11px] text-white/30 mt-0.5">Signs you out from all devices and sessions</p>
                    </div>
                    <button type="button" onClick={logout}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#ff2d55]/25 text-[#ff2d55] text-[12px] font-semibold hover:bg-[#ff2d55]/10 transition-all cursor-pointer">
                      <LogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                  </div>
                </Card>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                ACCOUNT TAB
            ═══════════════════════════════════════════════════════════════ */}
            {tab === 'account' && (
              <div className="space-y-5">
                <Card className="p-6">
                  <SectionLabel>Export & Privacy</SectionLabel>
                  <div className="space-y-3">
                    {[['Export Data', 'Download a copy of all your data', 'Coming soon'], ['Privacy Settings', 'Control who can see your profile', 'Coming soon']].map(([title, desc, tag]) => (
                      <div key={title as string} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] opacity-50">
                        <div>
                          <p className="text-[13px] font-medium text-white/70">{title as string}</p>
                          <p className="text-[11px] text-white/30 mt-0.5">{desc as string}</p>
                        </div>
                        <span className="text-[9px] border border-white/10 text-white/25 px-2 py-0.5 rounded-full uppercase tracking-wider">{tag as string}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Danger Zone */}
                <Card className="p-6 border-[#ff2d55]/15">
                  <SectionLabel>Danger Zone</SectionLabel>
                  <div className="p-4 rounded-xl bg-[#ff2d55]/[0.05] border border-[#ff2d55]/15 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-[#ff2d55] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[13px] font-semibold text-white">Delete Account</p>
                        <p className="text-[11px] text-white/40 mt-0.5">This permanently deletes your account, all data, friends, and history. This action is irreversible.</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-white/35 uppercase tracking-[0.12em]">Type <span className="text-[#ff2d55] font-semibold font-mono">DELETE</span> to confirm</label>
                      <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)}
                        placeholder="DELETE"
                        className="w-full bg-white/[0.04] border border-[#ff2d55]/20 rounded-xl px-4 py-2.5 text-[13px] font-mono text-white/90 placeholder-white/15 focus:outline-none focus:border-[#ff2d55]/40 transition-all" />
                    </div>
                    <button type="button" disabled={deleteConfirm !== 'DELETE'}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#ff2d55] text-white text-[12px] font-bold rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-red-500">
                      <Trash2 className="w-3.5 h-3.5" /> Delete My Account
                    </button>
                  </div>
                </Card>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── CROP MODAL ── */}
      <AnimatePresence>
        {cropSrc && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ImageCropModal imageSrc={cropSrc} onClose={() => setCropSrc(null)} onSave={handleCropSave} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
