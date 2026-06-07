'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Compass, 
  Layers, 
  Cpu, 
  Plug, 
  Shield, 
  Settings, 
  Flame, 
  ArrowRight,
  Sparkles,
  Calendar,
  Users,
  Grid,
  Clock,
  X,
  Loader2,
  User,
  LogOut,
  MoreVertical,
  Edit2,
  Trash2,
  Palette
} from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';
import { FascaLogo } from '../../components/logo/FascaLogo';
import { FascaButton } from '../../components/ui/FascaButton';
import { FascaCard } from '../../components/ui/FascaCard';
import { StudyNodesGraph } from '../../components/social/StudyNodesGraph';
import { FascaTimeline } from '../../components/social/FascaTimeline';
import { FascaAiCore } from '../../components/ai/FascaAiCore';
import { LmsBridgePanel } from '../../components/social/LmsBridgePanel';
import { FocusShieldPanel } from '../../components/focus/FocusShieldPanel';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useOnFocusStateChanged, updateFocusState as socketUpdateFocusState } from '../../lib/socket';
import { getMyGroups, updateFocusState as apiUpdateFocusState, getFriends, inviteMemberToGroup, acceptGroupMember, rejectGroupMember } from '../../lib/api';
import { toast } from '../../components/ui/Toast';

const Tooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-white/5 rounded text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer"
        title="More information"
      >
        <span className="font-mono text-[10px]">ⓘ</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 mt-2 z-50 w-64 bg-[#14141c]/95 border border-[#7c5cfc]/60 p-3 rounded-[6px] shadow-2xl text-left normal-case"
          >
            <p className="text-[9px] font-mono text-[#f0f0ff] leading-relaxed normal-case">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface StudyCirclePeer {
  id: string;
  name: string;
  initials: string;
  status: 'online' | 'flow' | 'offline';
  group?: string;
  duration?: string;
  fouzarId?: string;
}

interface GardenNode {
  id: string;
  course: string;
  roomName: string;
  creatorId: string;
  currentSlide: string;
}

export default function DashboardPage() {
  const {
    isFlowActive,
    setIsFlowActive,
    disarmDeepFlow,
    bypass,
    activateBypass,
    clearBypass,
    mode,
    setMode,
    accentColor,
    setAccentColor,
  } = useFouzar();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [activeNav, setActiveNav] = useState<'circles' | 'nodes' | 'ai' | 'bridge' | 'shield'>('circles');
  const [activePanelTab, setActivePanelTab] = useState<'timer' | 'nodes' | 'timeline' | 'ai'>('timer');
  const [sessionMinutes, setSessionMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isLmsOpen, setIsLmsOpen] = useState(false);
  const [isShieldOpen, setIsShieldOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [pendingGroupRequests, setPendingGroupRequests] = useState<Record<string, any[]>>({});
  const [contextMenuFriend, setContextMenuFriend] = useState<StudyCirclePeer | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);

  const router = useRouter();

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCourse, setNewGroupCourse] = useState('');
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);

  const handleCreateGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateGroupError(null);
    const name = newGroupName.trim();
    const course = newGroupCourse.trim().toUpperCase();

    if (!name) {
      setCreateGroupError('Group name is required.');
      return;
    }

    setCreateGroupLoading(true);
    try {
      const { createGroup } = await import('../../lib/api');
      await createGroup(name, course || undefined);
      setShowCreateGroupModal(false);
      setNewGroupName('');
      setNewGroupCourse('');
      loadGroups();
    } catch (err: any) {
      setCreateGroupError(err.message || 'Failed to create group.');
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const [bypassSecondsLeft, setBypassSecondsLeft] = useState(0);

  useEffect(() => {
    if (!bypass.isActive || !bypass.expiresAt) return;
    
    const update = () => {
      const left = Math.max(0, Math.floor((new Date(bypass.expiresAt!).getTime() - Date.now()) / 1000));
      setBypassSecondsLeft(left);
    };
    
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [bypass.isActive, bypass.expiresAt]);

  const formatBypassTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleEmergencyBypass = (minutes: 5 | 10 = 5) => {
    activateBypass(minutes);
  };

  const handleReLock = () => {
    clearBypass();
  };

  const handleDisarmFlow = async () => {
    disarmDeepFlow();
    try {
      await apiUpdateFocusState(false);
      socketUpdateFocusState(false);
    } catch {
      /* optional */
    }
  };

  // Wire auth and sockets
  const { user, loading, logout } = useAuth();
  const { isConnected } = useSocket();

  const [gardenNodes, setGardenNodes] = useState<GardenNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [hoveredPeerId, setHoveredPeerId] = useState<string | null>(null);

  // Group rename, delete, and card color customization state
  const [cardColors, setCardColors] = useState<Record<string, string>>({});
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeMenuNodeId, setActiveMenuNodeId] = useState<string | null>(null);

  useEffect(() => {
    const handleCloseMenus = () => {
      setActiveMenuNodeId(null);
      setContextMenuFriend(null);
      setIsThemeCustomizerOpen(false);
    };
    window.addEventListener('click', handleCloseMenus);
    return () => window.removeEventListener('click', handleCloseMenus);
  }, []);

  const COLOR_PRESETS = [
    { name: 'violet', value: '#7c5cfc' },
    { name: 'crimson', value: '#ff2d55' },
    { name: 'ice', value: '#06b6d4' },
    { name: 'amber', value: '#f5a623' },
    { name: 'emerald', value: '#10b981' }
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const colors: Record<string, string> = {};
      const savedSanctuaryColor = localStorage.getItem('circle-color-sanctuary');
      if (savedSanctuaryColor) colors['sanctuary'] = savedSanctuaryColor;
      
      gardenNodes.forEach((node) => {
        const saved = localStorage.getItem(`circle-color-${node.id}`);
        if (saved) colors[node.id] = saved;
      });
      setCardColors(colors);
    }
  }, [gardenNodes]);

  const updateCardColor = (nodeId: string, color: string) => {
    localStorage.setItem(`circle-color-${nodeId}`, color);
    setCardColors((prev) => ({ ...prev, [nodeId]: color }));
  };

  const handleRename = async (nodeId: string, name: string) => {
    if (!name.trim()) return;
    try {
      const { renameGroup } = await import('../../lib/api');
      await renameGroup(nodeId, name.trim());
      setEditingNodeId(null);
      loadGroups();
    } catch (err) {
      console.error('Failed to rename group:', err);
    }
  };

  const handleDelete = async (nodeId: string) => {
    if (!confirm('Are you sure you want to delete this study circle?')) return;
    try {
      const { deleteGroup } = await import('../../lib/api');
      await deleteGroup(nodeId);
      if (selectedCardId === nodeId) setSelectedCardId(null);
      loadGroups();
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  };

  const getCardColorClass = (nodeId: string, isSelected: boolean) => {
    const color = cardColors[nodeId] || 'violet';
    if (isSelected) {
      if (color === 'crimson') return 'border-[#ff2d55] bg-[#ff2d55]/5 shadow-[0_0_12px_rgba(255,45,85,0.25)]';
      if (color === 'ice') return 'border-[#06b6d4] bg-[#06b6d4]/5 shadow-[0_0_12px_rgba(6,182,212,0.25)]';
      if (color === 'amber') return 'border-[#f5a623] bg-[#f5a623]/5 shadow-[0_0_12px_rgba(245,166,35,0.25)]';
      if (color === 'emerald') return 'border-[#10b981] bg-[#10b981]/5 shadow-[0_0_12px_rgba(16,185,129,0.25)]';
      return 'border-[#7c5cfc] bg-[#7c5cfc]/5 shadow-[0_0_12px_rgba(124,92,252,0.25)]';
    } else {
      if (color === 'crimson') return 'border-[#ff2d55]/20 bg-[#ff2d55]/5 hover:border-[#ff2d55]/60';
      if (color === 'ice') return 'border-[#06b6d4]/20 bg-[#06b6d4]/5 hover:border-[#06b6d4]/60';
      if (color === 'amber') return 'border-[#f5a623]/20 bg-[#f5a623]/5 hover:border-[#f5a623]/60';
      if (color === 'emerald') return 'border-[#10b981]/20 bg-[#10b981]/5 hover:border-[#10b981]/60';
      return 'border-[#2a2a3a] bg-[#16161f]/40 hover:border-[#7c5cfc]/60';
    }
  };

  const getTextColor = (nodeId: string) => {
    const color = cardColors[nodeId] || 'violet';
    if (color === 'crimson') return 'text-[#ff2d55]';
    if (color === 'ice') return 'text-[#06b6d4]';
    if (color === 'amber') return 'text-[#f5a623]';
    if (color === 'emerald') return 'text-[#10b981]';
    return 'text-[#7c5cfc]';
  };


  const [peers, setPeers] = useState<StudyCirclePeer[]>([
    { id: 'usr-2', name: 'Elena', initials: 'ER', status: 'flow', group: 'CS-229', duration: '14 mins' },
    { id: 'usr-3', name: 'Kai', initials: 'KT', status: 'online', group: 'CS-109', duration: 'N/A' },
    { id: 'usr-4', name: 'Devon', initials: 'DV', status: 'offline', group: 'None', duration: 'N/A' },
  ]);

  const loadPendingGroupRequests = async (nodes: any[]) => {
    if (!user) return;
    const pendingData: Record<string, any[]> = {};
    try {
      const { getGroupMembers } = await import('../../lib/api');
      await Promise.all(
        nodes.map(async (node) => {
          if (node.creatorId === user.id) {
            try {
              const members = await getGroupMembers(node.id);
              const pending = members.filter((m: any) => m.status === 'PENDING');
              if (pending.length > 0) {
                pendingData[node.id] = pending;
              }
            } catch (e) {
              console.warn('Failed to load members for node', node.id, e);
            }
          }
        })
      );
      setPendingGroupRequests(pendingData);
    } catch (err) {
      console.warn('Failed to load pending requests helper:', err);
    }
  };

  const handleAcceptGroupRequest = async (groupId: string, targetUserId: string) => {
    try {
      await acceptGroupMember(groupId, targetUserId);
      toast('Group request approved!', 'violet');
      loadGroups();
    } catch (err: any) {
      toast(err.message || 'Failed to approve request', 'crimson');
    }
  };

  const handleRejectGroupRequest = async (groupId: string, targetUserId: string) => {
    try {
      await rejectGroupMember(groupId, targetUserId);
      toast('Group request rejected', 'violet');
      loadGroups();
    } catch (err: any) {
      toast(err.message || 'Failed to reject request', 'crimson');
    }
  };

  // Load Groups from DB
  const loadGroups = async () => {
    setLoadingNodes(true);
    try {
      const groupsData = await getMyGroups();
      const formattedNodes = (groupsData || []).map((g: any) => ({
        id: g.id,
        course: g.name.split(' ')[0] || 'CS-229',
        roomName: g.name,
        creatorId: g.creatorId,
        currentSlide: g.currentSlide ? `Slide ${g.currentSlide}` : 'Slide 1'
      }));
      setGardenNodes(formattedNodes);
      loadPendingGroupRequests(formattedNodes);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoadingNodes(false);
    }
  };

  const handleFriendMenu = (e: React.MouseEvent, peer: StudyCirclePeer) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuFriend(peer);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const loadRealFriends = async () => {
      try {
        const list = await getFriends();
        if (list && list.length > 0) {
          const mappedPeers = list.map((f: any) => ({
            id: f.id,
            name: f.name || f.email.split('@')[0],
            initials: f.name ? f.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'FR',
            status: f.isFocusing ? 'flow' : 'online',
            group: 'None',
            duration: 'N/A',
            fouzarId: f.fouzarId
          }));
          setPeers(mappedPeers);
        }
      } catch (e) {
        console.warn('Failed to load real friends for dashboard:', e);
      }
    };

    if (user) {
      loadGroups();
      loadRealFriends();
    }
  }, [user]);

  useOnFocusStateChanged((data) => {
    setPeers((prev) =>
      prev.map((peer) => {
        if (peer.id === data.userId || peer.name.toLowerCase() === data.name.split(' ')[0].toLowerCase()) {
          return {
            ...peer,
            status: data.isFocusing ? 'flow' : 'online',
            duration: data.isFocusing ? '1 min' : 'N/A'
          };
        }
        return peer;
      })
    );
  });

  // Listen to Command Palette global events
  useEffect(() => {
    const handleLmsEvent = () => {
      setIsLmsOpen(true);
      setActiveNav('bridge');
    };
    const handleShieldEvent = () => {
      setIsShieldOpen(true);
      setActiveNav('shield');
    };
    const handleTabEvent = (e: Event) => {
      const tabId = (e as CustomEvent).detail;
      setActivePanelTab(tabId);
      if (tabId === 'timer') {
        document.getElementById('timer-section')?.scrollIntoView({ behavior: 'smooth' });
        setActiveNav('circles');
      } else if (tabId === 'nodes') {
        document.getElementById('mindmap-section')?.scrollIntoView({ behavior: 'smooth' });
        setActiveNav('nodes');
      } else if (tabId === 'timeline') {
        document.getElementById('timeline-section')?.scrollIntoView({ behavior: 'smooth' });
        setActiveNav('nodes');
      }
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === 'INPUT' ||
        activeEl?.tagName === 'TEXTAREA' ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        document.getElementById('timer-section')?.scrollIntoView({ behavior: 'smooth' });
        handleNavClick('circles');
      } else if (key === 'g') {
        e.preventDefault();
        document.getElementById('mindmap-section')?.scrollIntoView({ behavior: 'smooth' });
        handleNavClick('nodes');
      } else if (key === 'a') {
        e.preventDefault();
        document.getElementById('timer-section')?.scrollIntoView({ behavior: 'smooth' });
        handleNavClick('circles');
      } else if (key === 'l') {
        e.preventDefault();
        handleNavClick('bridge');
      } else if (key === 'f') {
        e.preventDefault();
        handleNavClick('shield');
      }
    };

    window.addEventListener('toggle-lms', handleLmsEvent);
    window.addEventListener('toggle-shield', handleShieldEvent);
    window.addEventListener('switch-tab', handleTabEvent);
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('toggle-lms', handleLmsEvent);
      window.removeEventListener('toggle-shield', handleShieldEvent);
      window.removeEventListener('switch-tab', handleTabEvent);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleNavClick = (id: string) => {
    if (id === 'bridge') {
      setIsLmsOpen(true);
      setActiveNav('bridge');
    } else if (id === 'shield') {
      setIsShieldOpen(true);
      setActiveNav('shield');
    } else {
      setActiveNav(id as any);
      if (id === 'circles') {
        document.getElementById('timer-section')?.scrollIntoView({ behavior: 'smooth' });
        setActivePanelTab('timer');
      } else if (id === 'nodes') {
        document.getElementById('mindmap-section')?.scrollIntoView({ behavior: 'smooth' });
        setActivePanelTab('nodes');
      } else if (id === 'ai') {
        document.getElementById('timer-section')?.scrollIntoView({ behavior: 'smooth' });
        setActivePanelTab('timer');
      }
    }
  };

  const handleCloseLms = () => {
    setIsLmsOpen(false);
  };

  const handleCloseShield = () => {
    setIsShieldOpen(false);
  };

  // Sync session minutes to countdown seconds
  useEffect(() => {
    setSecondsLeft(sessionMinutes * 60);
  }, [sessionMinutes]);

  // Main countdown mechanism
  useEffect(() => {
    if (isFlowActive && secondsLeft > 0) {
      countdownTimerRef.current = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isFlowActive) {
      setIsFlowActive(false);
      setSecondsLeft(sessionMinutes * 60);
    }

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isFlowActive, secondsLeft]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTriggerFlow = async () => {
    try {
      if (isFlowActive) {
        handleDisarmFlow();
      } else {
        setIsFlowActive(true);
        socketUpdateFocusState(true);
        await apiUpdateFocusState(true);
      }
    } catch (err) {
      console.error('Failed to trigger deep flow:', err);
    }
  };

  const sidebarItems = [
    { id: 'circles', label: 'Study Circles', icon: Compass, keyHint: 'S' },
    { id: 'nodes', label: 'Garden Nodes', icon: Layers, keyHint: 'G' },
    { id: 'ai', label: 'AI Core', icon: Cpu, keyHint: 'A' },
    { id: 'bridge', label: 'LMS Bridge', icon: Plug, keyHint: 'L' },
    { id: 'shield', label: 'Focus Shield', icon: Shield, keyHint: 'F' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-[#0a0a0f] text-[#f0f0ff] flex overflow-hidden">
        {/* Sidebar skeleton */}
        <div className="w-14 bg-[#0a0a0f] border-r border-[#2a2a3a] p-4 flex flex-col items-center gap-6">
          <div className="w-6 h-6 bg-[#16161f] animate-pulse rounded-[2px]" />
          <div className="w-1 h-32 bg-[#16161f] animate-pulse" />
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col md:flex-row">
          <div className="w-full md:max-w-md bg-[#0a0a0f] border-r border-[#2a2a3a] p-6 space-y-8">
            <div className="h-4 bg-[#16161f] w-1/4 animate-pulse rounded-[2px]" />
            <div className="flex gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full bg-[#16161f] animate-pulse" />
              ))}
            </div>
            <div className="h-4 bg-[#16161f] w-1/3 animate-pulse rounded-[2px]" />
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-32 bg-[#16161f] animate-pulse border border-[#2a2a3a] rounded-[6px]" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-6 md:p-8 space-y-8 flex flex-col">
            <div className="h-8 bg-[#16161f] w-1/3 animate-pulse rounded-[2px]" />
            <div className="h-4 bg-[#16161f] w-1/4 animate-pulse rounded-[2px]" />
            <div className="flex-1 bg-[#16161f] animate-pulse border border-[#2a2a3a] rounded-[6px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setSelectedCardId(null)}
      className="min-h-screen w-screen bg-[#0a0a0f] text-[#f0f0ff] flex flex-col md:flex-row overflow-hidden relative select-none font-sans"
    >
      
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR: Icon-only, expands on hover (MD and up)                  */}
      {/* ========================================================================= */}
      <motion.aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        animate={{ width: isSidebarHovered ? 220 : 56 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="hidden md:flex h-full flex-col justify-between bg-[#0a0a0f] border-r border-[#2a2a3a] py-6 z-30 shrink-0 transition-all duration-300"
      >
        <div className="flex flex-col gap-6">
          {/* Logo Brand top */}
          <div className="px-3.5 flex items-center justify-start overflow-hidden">
            <FascaLogo showWordmark={isSidebarHovered} size={24} linkTo="/dashboard" />
          </div>

          <div className="w-full h-[1px] bg-[#2a2a3a]/40" />

          {/* Navigation Items */}
          <div className="flex flex-col gap-1 w-full">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full relative flex items-center justify-start py-3 px-4 transition-colors cursor-pointer group hover:bg-[#16161f]/40 ${
                    isActive ? 'text-[#7c5cfc]' : 'text-[#6b6b8a] hover:text-[#f0f0ff]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#7c5cfc]" />
                  )}
                  <Icon className="w-4 h-4 shrink-0" />
                  
                  {isSidebarHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-3 flex items-center justify-between flex-1 font-mono text-[9px] uppercase tracking-wider"
                    >
                      <span>{item.label}</span>
                      <span className="text-[7.5px] opacity-40 font-mono">[{item.keyHint}]</span>
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer controls & Profile avatar */}
        <div className="flex flex-col gap-4 items-center w-full">
          {/* User profile small square avatar */}
          <div className="px-4 w-full flex items-center justify-start gap-3">
            <div className="w-8 h-8 rounded-none border border-[#2a2a3a] bg-[#16161f] flex items-center justify-center font-mono text-[10px] font-bold text-[#f0f0ff] shrink-0 overflow-hidden">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'Avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                user ? user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'AM'
              )}
            </div>
            {isSidebarHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col text-left min-w-0"
              >
                <span className="text-[10px] font-semibold truncate">{user ? user.name : 'Alex Mercer'}</span>
                <span className="text-[7.5px] text-[#6b6b8a] font-mono truncate">{user ? user.email : 'MIT Workspace'}</span>
              </motion.div>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="w-full py-3 px-4 relative flex items-center justify-start text-[#6b6b8a] hover:text-[#7c5cfc] transition-colors cursor-pointer group hover:bg-[#16161f]/40"
          >
            <User className="w-4 h-4 shrink-0" />
            {isSidebarHovered && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-3 font-mono text-[9px] uppercase tracking-wider"
              >
                Profile & Settings
              </motion.span>
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full py-3 px-4 relative flex items-center justify-start text-[#6b6b8a] hover:text-[#ff2d55] transition-colors cursor-pointer group hover:bg-[#16161f]/40"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {isSidebarHovered && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="ml-3 font-mono text-[9px] uppercase tracking-wider"
              >
                Log Out
              </motion.span>
            )}
          </button>
        </div>
      </motion.aside>

      {/* ========================================================================= */}
      {/* 2. LEFT MAIN PANEL: Content columns                                       */}
      {/* ========================================================================= */}
      <div 
        className="flex-1 md:max-w-md bg-[#0a0a0f] border-r border-[#2a2a3a] p-6 flex flex-col justify-between overflow-y-auto scrollbar-none transition-all duration-300"
      >
        <div className="space-y-8">
          
          {/* Study circles list relocated to top stories bar in right panel */}

          {/* Personal Sanctuary */}
          <div className="space-y-3">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a] block">
              Personal Space
            </span>
            <FascaCard
              className={`p-4 flex flex-col justify-between min-h-[120px] cursor-pointer transition-all duration-150 relative ${
                getCardColorClass('sanctuary', selectedCardId === 'sanctuary')
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCardId('sanctuary');
              }}
              onDoubleClick={() => router.push('/sanctuary')}
            >
              <div>
                <span className={`text-[8.5px] font-mono uppercase tracking-wider block ${getTextColor('sanctuary')}`}>
                  Private · Solo
                </span>
                <h3 className="text-sm font-bold text-[#f0f0ff] mt-1">My Sanctuary</h3>
                <p className="text-[9px] text-[#6b6b8a] font-mono mt-1 pr-6">
                  Semester notes, AI tutor, your materials
                </p>
              </div>

              {/* 3-dots Dropdown Menu (Sanctuary) */}
              <div className="absolute top-3.5 right-3.5" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setActiveMenuNodeId(activeMenuNodeId === 'sanctuary' ? null : 'sanctuary')}
                  className="p-1 hover:bg-white/5 rounded text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer"
                  title="Sanctuary options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
                <AnimatePresence>
                  {activeMenuNodeId === 'sanctuary' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute right-0 mt-1 w-36 bg-[#14141c]/95 border border-[#2a2a3a] rounded-[4px] shadow-2xl p-2 z-50 text-left"
                    >
                      <div className="px-2 py-0.5 text-[7px] font-mono uppercase text-[#6b6b8a] tracking-wider mb-1.5 flex items-center gap-1">
                        <Palette className="w-2.5 h-2.5 text-[#06b6d4]" /> Set Color
                      </div>
                      <div className="flex gap-1.5 px-2 py-0.5 justify-between">
                        {COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              updateCardColor('sanctuary', preset.name);
                              setActiveMenuNodeId(null);
                            }}
                            style={{ backgroundColor: preset.value }}
                            className={`w-2.5 h-2.5 rounded-full border cursor-pointer ${
                              (cardColors['sanctuary'] || 'violet') === preset.name ? 'border-[#f0f0ff]' : 'border-transparent'
                            }`}
                            title={`Set ${preset.name} color`}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between mt-3 select-none">
                <div />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push('/sanctuary');
                  }}
                  className={`text-[8.5px] font-mono uppercase tracking-widest ${getTextColor('sanctuary')} hover:text-[#f0f0ff] flex items-center gap-1 transition-colors cursor-pointer`}
                >
                  Enter Sanctuary <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </FascaCard>
          </div>

          {/* Active Garden Nodes list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a] block">
                Shared Study Groups
              </span>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(true)}
                className="text-[8px] font-mono uppercase tracking-wider text-[#7c5cfc] hover:underline cursor-pointer bg-none border-none p-0"
              >
                + Create Circle
              </button>
            </div>

            {loadingNodes ? (
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1 scrollbar-none">
                {[1, 2].map((i) => (
                  <div key={i} className="h-32 bg-[#16161f] border border-[#2a2a3a] animate-pulse rounded-[6px] p-4 flex flex-col justify-between">
                    <div className="h-3 bg-[#1e1e2a] w-1/4 rounded-[2px]" />
                    <div className="h-4 bg-[#1e1e2a] w-3/4 rounded-[2px]" />
                    <div className="h-4 bg-[#1e1e2a] w-16 self-end rounded-[2px]" />
                  </div>
                ))}
              </div>
            ) : gardenNodes.length === 0 ? (
              <div className="w-full h-32 border border-dashed border-[#2a2a3a] rounded-[6px] flex flex-col items-center justify-center p-4 text-center">
                <Grid className="w-8 h-8 text-[#6b6b8a]/40 mb-2" />
                <span className="text-[10px] font-mono text-[#f0f0ff] uppercase tracking-wider">Your circles are forming</span>
                <span className="text-[7.5px] font-mono text-[#6b6b8a] mt-1.5 uppercase">NO ACTIVE STUDY NODES DETECTED</span>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-3 pr-1 scrollbar-none animate-none">
                {gardenNodes.map((node) => (
                  <FascaCard 
                    key={node.id} 
                    className={`p-4 flex flex-col justify-between min-h-[128px] h-auto py-4 cursor-pointer transition-all duration-150 ease-out select-none relative ${
                      getCardColorClass(node.id, selectedCardId === node.id)
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCardId(node.id);
                    }}
                    onDoubleClick={() => {
                      if (editingNodeId !== node.id) {
                        router.push(`/room/${node.id}`);
                      }
                    }}
                  >
                    <div className="w-full">
                      <span className={`text-[8.5px] font-mono uppercase tracking-wider block ${getTextColor(node.id)}`}>
                        {node.course}
                      </span>
                      {editingNodeId === node.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="bg-[#16161f] border border-[#7c5cfc] px-2 py-1 text-xs rounded font-mono text-[#f0f0ff] focus:outline-none w-[80%] mt-1"
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              await handleRename(node.id, editingName);
                            } else if (e.key === 'Escape') {
                              setEditingNodeId(null);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <h3 className="text-xs font-bold text-[#f0f0ff] mt-1 pr-6 truncate" title={node.roomName}>
                          {node.roomName}
                        </h3>
                      )}
                      <p className="text-[9px] text-[#6b6b8a] font-mono mt-1" title={node.currentSlide}>
                        {node.currentSlide}
                      </p>
                      {/* Pending Join Requests (Creator Only) */}
                      {node.creatorId === user?.id && pendingGroupRequests[node.id] && pendingGroupRequests[node.id].length > 0 && (
                        <div className="mt-3 border-t border-[#2a2a3a]/40 pt-2.5 space-y-1.5 animate-none" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[7.5px] font-mono uppercase text-[#ff2d55] tracking-[0.15em] block font-bold">
                            Join Requests ({pendingGroupRequests[node.id].length})
                          </span>
                          <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-none">
                            {pendingGroupRequests[node.id].map((req) => (
                              <div key={req.userId} className="flex items-center justify-between p-1 bg-[#101015] border border-[#2a2a3a]/40 rounded-[4px] gap-2">
                                <span className="text-[8px] text-[#f0f0ff] font-mono truncate max-w-[120px]">
                                  {req.user.name || req.user.email}
                                </span>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => handleAcceptGroupRequest(node.id, req.userId)}
                                    className="px-1 py-0.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-[7px] font-mono uppercase rounded transition-colors cursor-pointer"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRejectGroupRequest(node.id, req.userId)}
                                    className="px-1 py-0.5 bg-[#ff2d55]/20 text-[#ff2d55] hover:bg-[#ff2d55]/30 text-[7px] font-mono uppercase rounded transition-colors cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 3-dots Dropdown Menu (Shared Groups) */}
                    {editingNodeId !== node.id && (
                      <div className="absolute top-3.5 right-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setActiveMenuNodeId(activeMenuNodeId === node.id ? null : node.id)}
                          className="p-1 hover:bg-white/5 rounded text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer"
                          title="Group options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        <AnimatePresence>
                          {activeMenuNodeId === node.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -4 }}
                              transition={{ duration: 0.1 }}
                              className="absolute right-0 mt-1 w-36 bg-[#14141c]/95 border border-[#2a2a3a] rounded-[4px] shadow-2xl p-2 z-50 text-left"
                            >
                              {user && user.id === node.creatorId && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingNodeId(node.id);
                                      setEditingName(node.roomName);
                                      setActiveMenuNodeId(null);
                                    }}
                                    className="w-full px-2 py-1.5 text-[8.5px] font-mono uppercase tracking-wider text-[#6b6b8a] hover:text-[#f0f0ff] hover:bg-white/5 rounded flex items-center gap-1.5 cursor-pointer text-left"
                                  >
                                    <Edit2 className="w-3 h-3 text-[#7c5cfc]" /> Rename
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDelete(node.id);
                                      setActiveMenuNodeId(null);
                                    }}
                                    className="w-full px-2 py-1.5 text-[8.5px] font-mono uppercase tracking-wider text-[#ff2d55]/85 hover:text-[#ff2d55] hover:bg-white/5 rounded flex items-center gap-1.5 cursor-pointer text-left"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                  <div className="border-t border-[#2a2a3a]/40 my-1.5" />
                                </>
                              )}
                              <div className="px-2 py-0.5 text-[7px] font-mono uppercase text-[#6b6b8a] tracking-wider mb-1.5 flex items-center gap-1">
                                <Palette className="w-2.5 h-2.5 text-[#06b6d4]" /> Set Color
                              </div>
                              <div className="flex gap-1.5 px-2 py-0.5 justify-between">
                                {COLOR_PRESETS.map((preset) => (
                                  <button
                                    key={preset.name}
                                    type="button"
                                    onClick={() => {
                                      updateCardColor(node.id, preset.name);
                                      setActiveMenuNodeId(null);
                                    }}
                                    style={{ backgroundColor: preset.value }}
                                    className={`w-2.5 h-2.5 rounded-full border cursor-pointer ${
                                      (cardColors[node.id] || 'violet') === preset.name ? 'border-[#f0f0ff]' : 'border-transparent'
                                    }`}
                                    title={`Set ${preset.name} color`}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2 select-none">
                      <div />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editingNodeId === node.id) {
                            handleRename(node.id, editingName);
                          } else {
                            router.push(`/room/${node.id}`);
                          }
                        }}
                        className={`text-[8.5px] font-mono uppercase tracking-widest ${getTextColor(node.id)} hover:text-[#f0f0ff] flex items-center gap-1 transition-colors cursor-pointer`}
                      >
                        {editingNodeId === node.id ? 'Save' : 'Join Circle'} <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </FascaCard>
                ))}
              </div>
            )}
          </div>


        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. RIGHT PANEL: Workspace central Central Core controls                   */}
      {/* ========================================================================= */}
      <main className="flex-1 p-6 md:p-8 flex flex-col overflow-y-auto scrollbar-none h-full space-y-12">
        
        {/* Workspace Core Header bar */}
        <div className="flex items-center justify-between border-b border-[#2a2a3a]/40 pb-4 shrink-0">
          <div>
            <h2 className="font-serif text-lg font-bold tracking-[0.05em] text-[#f0f0ff] uppercase">
              My Study Dashboard
            </h2>
            <p className="text-[9px] font-mono text-[#6b6b8a] uppercase tracking-wider mt-0.5">
              Your private, distraction-free space
            </p>
          </div>
          <div className="flex items-center gap-2 relative">
            {/* UI Customizer Palette Trigger */}
            <div onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsThemeCustomizerOpen(!isThemeCustomizerOpen)}
                className="p-1.5 hover:bg-white/5 rounded text-[#6b6b8a] hover:text-[#f0f0ff] transition-all cursor-pointer flex items-center gap-1 border border-[#2a2a3a]/60 hover:border-[#7c5cfc]/60"
                title="Customize UI Theme & Accent"
              >
                <Palette className="w-3.5 h-3.5 text-glow-accent" />
                <span className="text-[7.5px] font-mono uppercase tracking-wider hidden sm:inline">Customize</span>
              </button>
              
              <AnimatePresence>
                {isThemeCustomizerOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 5 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 z-50 w-52 bg-[#14141c]/95 border border-[#7c5cfc]/60 p-4 rounded-[6px] shadow-2xl text-left backdrop-blur-md space-y-4"
                  >
                    {/* Theme chassis */}
                    <div className="space-y-1.5">
                      <span className="text-[7.5px] font-mono uppercase text-[#6b6b8a] tracking-wider block font-bold">
                        Visual Chassis Theme
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setMode('onyx')}
                          className={`py-1 px-1.5 text-[7px] font-mono uppercase rounded-[4px] border text-center transition-colors cursor-pointer ${
                            mode === 'onyx'
                              ? 'border-[#7c5cfc] bg-[#7c5cfc]/10 text-[#7c5cfc] font-bold'
                              : 'border-[#2a2a3a] text-[#6b6b8a] hover:text-[#f0f0ff]'
                          }`}
                        >
                          Onyx
                        </button>
                        <button
                          type="button"
                          onClick={() => setMode('greenhouse')}
                          className={`py-1 px-1.5 text-[7px] font-mono uppercase rounded-[4px] border text-center transition-colors cursor-pointer ${
                            mode === 'greenhouse'
                              ? 'border-[#6ee7b7] bg-[#6ee7b7]/10 text-[#6ee7b7] font-bold'
                              : 'border-[#2a2a3a] text-[#6b6b8a] hover:text-[#f0f0ff]'
                          }`}
                        >
                          Greenhouse
                        </button>
                      </div>
                    </div>

                    {/* Accent Color picker */}
                    <div className="space-y-1.5">
                      <span className="text-[7.5px] font-mono uppercase text-[#6b6b8a] tracking-wider block font-bold">
                        Workspace Accent Color
                      </span>
                      <div className="flex gap-2 justify-between">
                        {[
                          { id: 'violet' as const, name: 'Violet', color: '#7c5cfc' },
                          { id: 'emerald' as const, name: 'Emerald', color: '#3dd68c' },
                          { id: 'ice' as const, name: 'Ice', color: '#5ce1ff' },
                          { id: 'amber' as const, name: 'Amber', color: '#f5a623' },
                          { id: 'signal' as const, name: 'Crimson', color: '#ff2d55' },
                        ].map((accent) => {
                          const isSelected = accentColor === accent.id;
                          return (
                            <button
                              key={accent.id}
                              type="button"
                              onClick={() => setAccentColor(accent.id)}
                              style={{ backgroundColor: accent.color }}
                              className={`w-3.5 h-3.5 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                                isSelected ? 'border-[#f0f0ff] scale-110' : 'border-transparent'
                              }`}
                              title={`Set ${accent.name} accent`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <span className="px-2.5 py-0.5 bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 text-[#7c5cfc] font-mono text-[8px] uppercase tracking-wider rounded">
              V1.0
            </span>
          </div>
        </div>

        {/* 1. Horizontal Friends Social Bar (Top) */}
        <div className="space-y-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a] block">
              Active Friends
            </span>
          </div>
          
          {peers.length === 0 ? (
            <div className="w-full h-16 border border-dashed border-[#2a2a3a] rounded-[6px] flex flex-col items-center justify-center p-3 text-center">
              <span className="text-[9px] font-mono text-[#f0f0ff] uppercase tracking-wider">No friends active</span>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {peers.map((peer) => {
                let ringColor = 'border-[#2a2a3a]';
                if (peer.status === 'online') ringColor = 'border-[#7c5cfc]';
                if (peer.status === 'flow') ringColor = 'border-[#ff2d55] animate-pulse shadow-[0_0_8px_#ff2d55]';

                return (
                  <div 
                    key={peer.id} 
                    className="flex flex-col items-center gap-1.5 shrink-0 select-none relative cursor-pointer"
                    onMouseEnter={() => setHoveredPeerId(peer.id)}
                    onMouseLeave={() => setHoveredPeerId(null)}
                    onClick={(e) => handleFriendMenu(e, peer)}
                    onContextMenu={(e) => handleFriendMenu(e, peer)}
                  >
                    <div className={`p-[1.5px] rounded-full border-2 ${ringColor} transition-all duration-300 cursor-pointer`}>
                      <div className="w-10 h-10 rounded-full bg-[#16161f] border border-[#2a2a3a] flex items-center justify-center font-mono text-xs font-bold text-[#f0f0ff]">
                        {peer.initials}
                      </div>
                    </div>
                    <span className="text-[8px] font-mono uppercase tracking-wider text-[#6b6b8a]">
                      {peer.name}
                    </span>
                    
                    <AnimatePresence>
                      {hoveredPeerId === peer.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full mb-2 z-50 bg-[#16161f] border border-[#7c5cfc]/60 p-3 rounded-[6px] shadow-2xl w-40 text-left"
                        >
                          <div className="text-[9px] font-bold text-[#f0f0ff] uppercase">{peer.name}</div>
                          <div className="text-[7.5px] font-mono text-[#6b6b8a] uppercase mt-1">
                            Status: <span className={peer.status === 'flow' ? 'text-[#ff2d55]' : peer.status === 'online' ? 'text-[#7c5cfc]' : 'text-[#6b6b8a]'}>{peer.status}</span>
                          </div>
                          <div className="text-[7.5px] font-mono text-[#6b6b8a] uppercase mt-0.5">
                            Active: {peer.group || 'None'}
                          </div>
                          <div className="text-[7.5px] font-mono text-[#6b6b8a] uppercase mt-0.5">
                            Duration: {peer.duration || 'N/A'}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Focus Timer Section */}
        <div id="timer-section" className="space-y-4 flex flex-col items-center border-t border-[#2a2a3a]/20 pt-6">
          <div className="w-full flex items-center justify-start gap-2 mb-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a]">
              Focus Timer
            </span>
            <Tooltip text="Choose a time block, hit 'Start', and our app will lock your open browser tabs and silence notifications so you can fully focus without cheating." />
          </div>
          <div className="w-full max-w-sm flex flex-col items-center">
            {/* Time span selector */}
            <div className="w-full text-center">
              <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a] block mb-3">
                SELECT FOCUS SESSION SPAN
              </span>
              <div className="flex gap-2 justify-center">
                {[15, 25, 45, 60].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSessionMinutes(preset)}
                    className={`w-14 h-12 rounded-[6px] border text-[11px] font-mono flex flex-col items-center justify-center transition-colors cursor-pointer ${
                      sessionMinutes === preset
                        ? 'border-[#7c5cfc] text-[#7c5cfc] bg-[#7c5cfc]/5 font-semibold'
                        : 'border-[#2a2a3a] text-[#6b6b8a] hover:border-[#6b6b8a] hover:text-[#f0f0ff]'
                    }`}
                  >
                    <span>{preset}</span>
                    <span className="text-[7px] font-sans opacity-70">MIN</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Circular countdown visualization */}
            <div className="relative w-44 h-44 flex flex-col items-center justify-center rounded-full bg-[#111118]/60 border border-[#2a2a3a] shadow-lg my-6">
              <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a] mb-1">
                Focus Timer
              </span>
              <span className="text-4xl font-mono font-light text-[#f0f0ff] tracking-wider text-glow-accent">
                {formatTime(secondsLeft)}
              </span>
              <span className={`text-[7px] font-mono uppercase tracking-widest mt-2 flex items-center gap-1 ${isFlowActive ? 'text-[#ff2d55]' : 'text-[#7c5cfc]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isFlowActive ? 'bg-[#ff2d55]' : 'bg-[#7c5cfc]'}`} />
                {isFlowActive ? 'FLOW SESSION ACTIVE' : 'IDLE STATE ACTIVE'}
              </span>
            </div>

            {/* Hero CTA button */}
            <FascaButton
              onClick={handleTriggerFlow}
              variant={isFlowActive ? 'ghost-crimson' : 'solid-violet'}
              className="w-full rounded-[6px] py-3 text-[10px] font-bold flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4 fill-[#0a0a0f]" /> {isFlowActive ? 'EXIT DEEP FLOW' : 'Start Studying'}
            </FascaButton>
          </div>
        </div>

        {/* 3. Subject Mind Map Section */}
        <div id="mindmap-section" className="space-y-4 w-full border-t border-[#2a2a3a]/20 pt-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a]">
              Subject Mind Map
            </span>
            <Tooltip text="A visual map of your subjects. Click on a topic to see your uploaded lecture slides, notes, and connected AI flashcards all in one web." />
          </div>
          <div className="w-full text-center">
            <StudyNodesGraph nodesData={gardenNodes} />
          </div>
        </div>

        {/* 4. My Study Schedule Section */}
        <div id="timeline-section" className="space-y-4 w-full border-t border-[#2a2a3a]/20 pt-6 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a]">
              My Study Schedule
            </span>
            <Tooltip text="Your academic timeline. Drag it left or right to see upcoming assignment deadlines, exam dates, or custom goals you've set for the semester." />
          </div>
          <div className="w-full text-center">
            <FascaTimeline />
          </div>
        </div>

        {/* Footer with open-source link */}
        <div className="pt-4 border-t border-[#2a2a3a]/40 flex items-center justify-between text-[8px] font-mono text-[#6b6b8a] uppercase tracking-wider shrink-0 animate-none">
          <span>Fasca Academic OS</span>
          <a href="https://github.com/fasca-study/app" target="_blank" rel="noopener noreferrer" className="hover:text-[#7c5cfc] transition-colors">
            OPEN SOURCE REPOSITORY
          </a>
        </div>

      </main>

      {/* ========================================================================= */}
      {/* 4. BOTTOM NAVIGATION BAR: Under 768px view                                */}
      {/* ========================================================================= */}
      <nav className="md:hidden w-full h-14 bg-[#0a0a0f] border-t border-[#2a2a3a] px-6 py-2 flex items-center justify-between z-30 shrink-0 select-none">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`p-2 transition-colors relative flex items-center justify-center shrink-0 cursor-pointer ${
                isActive ? 'text-[#7c5cfc]' : 'text-[#6b6b8a]'
              }`}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <div className="absolute top-[-8px] left-2 right-2 h-[2px] bg-[#7c5cfc]" />
              )}
            </button>
          );
        })}
        
        {/* Mobile profile link */}
        <div className="w-6 h-6 rounded-none border border-[#2a2a3a] bg-[#16161f] flex items-center justify-center font-mono text-[8px] font-bold text-[#f0f0ff] shrink-0">
          {user ? user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'AM'}
        </div>
      </nav>

      {/* Side Panels */}
      <LmsBridgePanel isOpen={isLmsOpen} onClose={handleCloseLms} />
      <FocusShieldPanel isOpen={isShieldOpen} onClose={handleCloseShield} />

      {/* Pillar 2 — Deep Flow shield overlay */}
      <AnimatePresence>
        {isFlowActive && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 md:right-6 z-50 flex items-center gap-3 px-4 py-2.5 rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-shadow-lg)] ${
              mode === 'greenhouse' ? 'fouzar-glass' : 'bg-fouzar-overlay backdrop-blur-xl border border-fouzar-border'
            }`}
          >
            <Shield className="w-4 h-4 text-fouzar-signal" />
            <span className="font-mono text-[8px] uppercase tracking-widest text-fouzar-text-secondary">
              Shield Active
            </span>

            {bypass.isActive ? (
              <div className="flex items-center gap-2 border-l border-fouzar-border pl-3">
                <Clock className="w-3 h-3 text-[#f5a623]" />
                <span className="font-mono text-[8px] text-[#f5a623] font-bold">
                  {formatBypassTime(bypassSecondsLeft)}
                </span>
                <button
                  type="button"
                  onClick={handleReLock}
                  className="font-mono text-[7px] text-fouzar-text-secondary hover:text-fouzar-text-primary uppercase underline"
                >
                  Re-lock
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 border-l border-fouzar-border pl-3">
                <button
                  type="button"
                  onClick={() => handleEmergencyBypass(5)}
                  className="font-mono text-[7px] text-fouzar-signal border border-fouzar-signal/30 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] hover:bg-fouzar-signal/10 uppercase"
                >
                  5m Valve
                </button>
                <button
                  type="button"
                  onClick={() => handleEmergencyBypass(10)}
                  className="font-mono text-[7px] text-[#f5a623] border border-[#f5a623]/30 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] hover:bg-[#f5a623]/10 uppercase"
                >
                  10m
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDisarmFlow}
              className="font-mono text-[7px] text-fouzar-text-secondary hover:text-fouzar-text-primary border border-fouzar-border px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] uppercase ml-1"
            >
              Exit Flow
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-[#14141c] border border-[#2a2a3a] p-6 rounded-[var(--fouzar-radius-lg)] shadow-2xl w-full max-w-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#2a2a3a]/40 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#6b6b8a] flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#7c5cfc]" /> Create Study Circle
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setCreateGroupError(null);
                  }}
                  className="text-[#6b6b8a] hover:text-[#f0f0ff]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateGroupSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-[#6b6b8a] block">
                    Circle Name (e.g. CS-229 Neural Network Room)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter circle name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full bg-[#16161f] border border-[#2a2a3a] px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-[#7c5cfc] text-[#f0f0ff]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-[#6b6b8a] block">
                    Course Code (e.g. CS-229) (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Enter course code..."
                    value={newGroupCourse}
                    onChange={(e) => setNewGroupCourse(e.target.value)}
                    className="w-full bg-[#16161f] border border-[#2a2a3a] px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-[#7c5cfc] text-[#f0f0ff] uppercase"
                  />
                </div>

                {createGroupError && (
                  <p className="text-[8px] font-mono text-[#ff2d55] uppercase tracking-wider">
                    {createGroupError}
                  </p>
                )}

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateGroupModal(false);
                      setCreateGroupError(null);
                    }}
                    className="px-3 py-1.5 border border-[#2a2a3a] rounded-[var(--fouzar-radius-md)] font-mono text-[8px] uppercase text-[#6b6b8a] hover:text-[#f0f0ff] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createGroupLoading}
                    className="px-3 py-1.5 bg-[#7c5cfc] text-[#0a0a0f] rounded-[var(--fouzar-radius-md)] font-mono text-[8px] uppercase font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center"
                  >
                    {createGroupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend Context Menu Dropdown */}
      <AnimatePresence>
        {contextMenuFriend && (
          <div
            className="fixed inset-0 z-50 cursor-default"
            onClick={() => setContextMenuFriend(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenuFriend(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
              className="fixed z-50 bg-[#14141c]/95 border border-[#7c5cfc]/60 shadow-2xl p-2 rounded-[6px] w-48 text-left backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[7.5px] font-mono uppercase text-[#6b6b8a] tracking-wider mb-1.5 border-b border-[#2a2a3a]/40 pb-1">
                Add {contextMenuFriend.name} to Group
              </div>
              <div className="max-h-48 overflow-y-auto scrollbar-none space-y-0.5">
                {gardenNodes.length === 0 ? (
                  <div className="px-2 py-1.5 text-[8px] font-mono text-[#6b6b8a] uppercase">
                    No active study groups
                  </div>
                ) : (
                  gardenNodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={async () => {
                        const peer = contextMenuFriend;
                        setContextMenuFriend(null);
                        try {
                          await inviteMemberToGroup(node.id, peer.fouzarId || peer.id);
                          const isAdmin = user && user.id === node.creatorId;
                          if (isAdmin) {
                            toast(`Successfully added ${peer.name} to ${node.roomName}!`, 'violet');
                          } else {
                            toast(`Invite sent to ${peer.name}! Pending admin approval.`, 'violet');
                          }
                          loadGroups();
                        } catch (err: any) {
                          toast(err.message || 'Failed to add friend to group', 'crimson');
                        }
                      }}
                      className="w-full px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-[#f0f0ff] hover:bg-[#7c5cfc]/15 rounded text-left transition-colors truncate block cursor-pointer"
                      title={node.roomName}
                    >
                      {node.roomName}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
