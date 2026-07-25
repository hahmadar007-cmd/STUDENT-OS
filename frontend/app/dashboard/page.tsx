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
  Palette,
  ChevronRight,
  MessageSquare,
  Plus
} from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';
import { FascaLogo } from '../../components/logo/FascaLogo';
import { FascaButton } from '../../components/ui/FascaButton';
import { FascaCard } from '../../components/ui/FascaCard';
import { StudyNodesGraph } from '../../components/social/StudyNodesGraph';
import { FascaTimeline } from '../../components/social/FascaTimeline';
import { FascaAiCore } from '../../components/ai/FascaAiCore';
import { AiOnboardingModal } from '../../components/ai/AiOnboardingModal';
import { AdminMembersPanel } from '../../components/ui/AdminMembersPanel';
import { CourseFeedPanel } from '../../components/social/CourseFeedPanel';
import { LmsBridgePanel } from '../../components/social/LmsBridgePanel';
import { LmsConnectionIndicator } from '../../components/social/LmsConnectionIndicator';
import { FocusShieldPanel } from '../../components/focus/FocusShieldPanel';
import { AiControlCenter } from '../../components/ai/AiControlCenter';
import { AcademicInfoPanel } from '../../components/academic/AcademicInfoPanel';
import { UsernameOnboardingModal } from '@/components/onboarding/UsernameOnboardingModal';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useOnFocusStateChanged, updateFocusState as socketUpdateFocusState } from '../../lib/socket';
import { getMyGroups, updateFocusState as apiUpdateFocusState, getFriends, inviteMemberToGroup, acceptGroupMember, rejectGroupMember } from '../../lib/api';
import { ResizablePanel } from '../../components/ui/ResizablePanel';
import { toast } from '../../components/ui/Toast';
import { ThemeSwitcher } from '../../components/theme/ThemeSwitcher';
import { FriendsChatDeck } from '../../components/friends/FriendsChatDeck';
import { NotificationBell } from '../../components/ui/NotificationBell';
import { ConnectionsCenter } from '../../components/social/ConnectionsCenter';
import { DmNotificationBell } from '../../components/ui/DmNotificationBell';

const Tooltip = ({ text }: { text: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 hover:bg-white/5 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
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
            className="absolute left-0 mt-2 z-50 w-64 bg-fouzar-surface/95 border border-fouzar-accent/60 p-3 rounded-[6px] shadow-2xl text-left normal-case"
          >
            <p className="text-[9px] font-mono text-fouzar-text-primary leading-relaxed normal-case">
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
  avatarUrl?: string;
}

interface GardenNode {
  id: string;
  course: string;
  roomName: string;
  creatorId: string;
  currentSlide: string;
  isEmptyCourse?: boolean;
  courseId?: string;
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
  const [showAiOnboarding, setShowAiOnboarding] = useState(false);
  const [showUsernameOnboarding, setShowUsernameOnboarding] = useState(false);
  const [activeNav, setActiveNav] = useState<'circles' | 'nodes' | 'ai' | 'bridge' | 'shield' | 'friends'>('circles');
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false);

  const router = useRouter();

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCourse, setNewGroupCourse] = useState('');
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);

  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [createCourseError, setCreateCourseError] = useState<string | null>(null);
  const [createCourseLoading, setCreateCourseLoading] = useState(false);

  const handleCreateCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateCourseError(null);
    const name = newCourseName.trim().toUpperCase();

    if (!name) {
      setCreateCourseError('Main Circle name is required.');
      return;
    }

    setCreateCourseLoading(true);
    try {
      const { createCourse } = await import('../../lib/api');
      await createCourse(name);
      setShowCreateCourseModal(false);
      setNewCourseName('');
      loadGroups();
    } catch (err: any) {
      setCreateCourseError(err.message || 'Failed to create Main Circle.');
    } finally {
      setCreateCourseLoading(false);
    }
  };

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
    } catch (err: any) {
      alert(err.message || 'Failed to delete group');
    }
  };

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    if (!confirm(`Are you sure you want to delete the Main Circle "${courseName}" and all its study groups?`)) return;
    try {
      const { deleteCourse } = await import('../../lib/api');
      await deleteCourse(courseId);
      loadGroups();
    } catch (err: any) {
      alert(err.message || 'Failed to delete Main Circle');
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
      return 'border-fouzar-border bg-fouzar-card/40 hover:border-fouzar-accent/60';
    }
  };

  const getTextColor = (nodeId: string) => {
    const color = cardColors[nodeId] || 'violet';
    if (color === 'crimson') return 'text-[#ff2d55]';
    if (color === 'ice') return 'text-[#06b6d4]';
    if (color === 'amber') return 'text-[#f5a623]';
    if (color === 'emerald') return 'text-[#10b981]';
    return 'text-fouzar-accent';
  };


  const [peers, setPeers] = useState<StudyCirclePeer[]>([]);

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

  // Load Groups and Courses from DB
  const loadGroups = async () => {
    setLoadingNodes(true);
    try {
      const { getMyGroups, getMyCourses } = await import('../../lib/api');
      const [groupsData, coursesData] = await Promise.all([
        getMyGroups().catch((err: any) => {
          console.error("Failed to fetch groups:", err);
          return [];
        }),
        getMyCourses().catch((err: any) => {
          console.error("Failed to fetch courses:", err);
          return [];
        })
      ]);
      
      const formattedNodes: any[] = (groupsData || []).map((g: any) => ({
        id: g.id,
        course: g.course?.code || 'Uncategorized',
        courseId: g.course?.id,
        roomName: g.name,
        creatorId: g.creatorId,
        currentSlide: g.currentSlide ? `Slide ${g.currentSlide}` : 'Slide 1'
      }));

      // Add empty courses
      const existingCourseCodes = new Set(formattedNodes.map(n => n.course));
      (coursesData || []).forEach((c: any) => {
        if (!existingCourseCodes.has(c.code)) {
          formattedNodes.push({
            id: c.id,
            course: c.code,
            courseId: c.id,
            roomName: '',
            creatorId: c.userId,
            currentSlide: '',
            isEmptyCourse: true
          });
        }
      });

      setGardenNodes(formattedNodes);
      loadPendingGroupRequests(formattedNodes.filter(n => !n.isEmptyCourse));
    } catch (err) {
      console.error('Failed to load groups/courses:', err);
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

  const checkAiOnboarding = async (userId: string) => {
    const alreadyOnboarded = localStorage.getItem('fasca_onboarded') === '1';
    const hasEngines = !!localStorage.getItem('fasca_ai_providers_v1');
    if (!alreadyOnboarded && !hasEngines) {
      setShowAiOnboarding(true);
    }
  };

  const handleAiOnboardingComplete = () => {
    localStorage.setItem('fasca_onboarded', '1');
    setShowAiOnboarding(false);
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

      // Show onboarding modal for new signups
      const justSignedUp = localStorage.getItem('fasca_just_signed_up') === '1';
      if (justSignedUp) {
        localStorage.removeItem('fasca_just_signed_up');
      }
      
      // Show username onboarding for new users who haven't picked a @username yet
      if (!user?.username) {
        setShowUsernameOnboarding(true);
      } else {
        checkAiOnboarding(user.id);
      }
    }
  }, [user]);

  useOnFocusStateChanged((data) => {
    setPeers((prev) =>
      prev.map((peer) => {
        if (peer.id === data.userId || (peer.name || '').toLowerCase() === (data.name || '').split(' ')[0].toLowerCase()) {
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

    // Fired by LMS panel file rows — opens PDF viewer with the streamed URL
    const handleOpenPdfViewer = (e: Event) => {
      const { url } = (e as CustomEvent).detail ?? {};
      if (!url) return;
      // Store URL for the viewer to pick up, then open documents panel
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fasca_pending_pdf_url', url);
      }
      setActivePanelTab('timer');
      setActiveNav('circles');
      document.getElementById('timer-section')?.scrollIntoView({ behavior: 'smooth' });
      // Open the URL in a new tab as the primary viewer pathway
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Fired by ⚡ Focus on this button — pre-sets timer to 45 min and activates shield
    const handleStartFocusTimer = (e: Event) => {
      const { minutes } = (e as CustomEvent).detail ?? {};
      const mins = typeof minutes === 'number' ? minutes : 45;
      setSessionMinutes(mins);
      setSecondsLeft(mins * 60);
      setIsShieldOpen(true);
      setActiveNav('shield');
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
    window.addEventListener('open-pdf-viewer', handleOpenPdfViewer);
    window.addEventListener('start-focus-timer', handleStartFocusTimer);
    window.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      window.removeEventListener('toggle-lms', handleLmsEvent);
      window.removeEventListener('toggle-shield', handleShieldEvent);
      window.removeEventListener('switch-tab', handleTabEvent);
      window.removeEventListener('open-pdf-viewer', handleOpenPdfViewer);
      window.removeEventListener('start-focus-timer', handleStartFocusTimer);
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('open-ai-onboarding', handleOpenAiOnboarding as any);
    };
  }, []);

  const handleOpenAiOnboarding = () => {
    setShowAiOnboarding(true);
  };

  useEffect(() => {
    window.addEventListener('open-ai-onboarding', handleOpenAiOnboarding as any);
    return () => {
      window.removeEventListener('open-ai-onboarding', handleOpenAiOnboarding as any);
    };
  }, []);

  const handleNavClick = (id: string) => {
    if (id === 'bridge') {
      document.getElementById('courses-section')?.scrollIntoView({ behavior: 'smooth' });
    } else if (id === 'shield') {
      setIsShieldOpen(true);
    } else if (id === 'friends') {
      setActiveNav('friends');
    } else {
      setActiveNav(id as any);
      if (id === 'circles') {
        document.getElementById('mindmap-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (id === 'nodes') {
        document.getElementById('mindmap-section')?.scrollIntoView({ behavior: 'smooth' });
      } else if (id === 'ai') {
        document.getElementById('ai-engines-section')?.scrollIntoView({ behavior: 'smooth' });
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
    { id: 'bridge', label: 'Campus Gateway', icon: Plug, keyHint: 'L' },
    { id: 'shield', label: 'Focus Shield', icon: Shield, keyHint: 'F' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-fouzar-bg flex text-fouzar-text-primary">
        {/* Sidebar skeleton */}
        <div className="w-16 border-r border-fouzar-border-subtle bg-fouzar-surface flex flex-col items-center py-6 space-y-8">
          <div className="w-6 h-6 bg-fouzar-border-strong animate-pulse rounded-md opacity-50" />
          <div className="w-0.5 h-32 bg-fouzar-border-subtle animate-pulse opacity-30" />
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col md:flex-row">
          <div className="w-full md:max-w-md bg-fouzar-surface border-r border-fouzar-border-subtle p-6 space-y-8">
            <div className="h-4 bg-fouzar-border-strong w-1/4 animate-pulse rounded-sm opacity-30" />
            <div className="flex gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full bg-fouzar-border-strong animate-pulse opacity-20" />
              ))}
            </div>
            <div className="h-4 bg-fouzar-border-strong w-1/3 animate-pulse rounded-sm opacity-30" />
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-[120px] bg-fouzar-card/50 border border-fouzar-border-subtle rounded-xl animate-pulse p-4 flex flex-col justify-between opacity-60">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="h-4 w-24 bg-fouzar-border-strong/40 rounded-sm" />
                      <div className="h-3 w-40 bg-fouzar-border-subtle/50 rounded-sm" />
                    </div>
                    <div className="h-6 w-6 rounded-full bg-fouzar-border-strong/30" />
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="h-8 w-24 bg-fouzar-border-strong/40 rounded-md" />
                    <div className="h-6 w-16 bg-fouzar-border-strong/30 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 p-6 md:p-8 space-y-8 flex flex-col">
            <div className="flex justify-between items-center opacity-30">
              <div className="h-6 bg-fouzar-border-strong w-48 animate-pulse rounded-sm" />
              <div className="h-8 bg-fouzar-border-strong w-24 animate-pulse rounded-full" />
            </div>
            <div className="flex-1 bg-fouzar-card/30 animate-pulse border border-fouzar-border-subtle rounded-xl w-full flex items-center justify-center">
              <div className="flex flex-col items-center opacity-20 space-y-4">
                <div className="w-20 h-20 rounded-full bg-fouzar-border-strong" />
                <div className="h-3 w-32 bg-fouzar-border-strong rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setSelectedCardId(null)}
      className="min-h-screen w-screen bg-fouzar-bg text-fouzar-text-primary flex flex-col md:flex-row overflow-hidden relative select-none font-sans"
    >
      {/* --- Ambient Premium Background --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Glow Meshes */}
        <div className={`absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-[0.07] transition-colors duration-1000 ${
          accentColor === 'signal' ? 'bg-[#ff2d55]' : 
          accentColor === 'amber' ? 'bg-[#f5a623]' : 
          accentColor === 'ice' ? 'bg-[#06b6d4]' : 'bg-[#7c5cfc]'
        }`} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#10b981] blur-[100px] opacity-[0.05]" />
        {/* Subtle Grain Overlay */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      </div>
      
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR: Icon-only, expands on hover (MD and up)                  */}
      {/* ========================================================================= */}
      <motion.aside
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        animate={{ width: isSidebarHovered ? 220 : 56 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="hidden md:flex h-full flex-col justify-between bg-fouzar-bg/60 backdrop-blur-3xl border-r border-fouzar-border py-6 z-30 shrink-0 transition-all duration-300 relative"
      >
        <div className="flex flex-col gap-6">
          {/* Logo Brand top */}
          <div className="px-3.5 flex items-center justify-start overflow-hidden">
            <FascaLogo showWordmark={isSidebarHovered} size={24} linkTo="/dashboard" />
          </div>

          <div className="w-full h-[1px] bg-[#2a2a3a]/40" />

          {/* Navigation Items */}
          <div className="flex flex-col gap-0.5 w-full px-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full relative flex items-center justify-start py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer group ${
                    isActive
                      ? 'text-white bg-[#7c5cfc]/15 shadow-[0_0_14px_rgba(124,92,252,0.12)]'
                      : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-white/[0.04]'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#7c5cfc] rounded-full shadow-[0_0_8px_rgba(124,92,252,0.8)]" />
                  )}
                  <Icon className={`w-4 h-4 shrink-0 ml-1 transition-transform duration-200 ${isActive ? 'text-[#7c5cfc]' : 'group-hover:scale-110'}`} />

                  {isSidebarHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="ml-3 flex items-center justify-between flex-1 font-mono text-[9px] uppercase tracking-wider"
                    >
                      <span>{item.label}</span>
                      <span className={`text-[7.5px] font-mono px-1.5 py-0.5 rounded border ${
                        isActive
                          ? 'text-[#7c5cfc] border-[#7c5cfc]/30 bg-[#7c5cfc]/10'
                          : 'opacity-30 border-white/10'
                      }`}>[{item.keyHint}]</span>
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer controls & Profile avatar */}
        <div className="flex flex-col gap-1 items-center w-full px-2">

          {/* User Card */}
          <div
            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group"
            onClick={() => router.push('/profile')}
          >
            {/* Circular avatar with online dot */}
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full border border-[#7c5cfc]/30 bg-[#7c5cfc]/10 flex items-center justify-center font-bold text-[#7c5cfc] text-[11px] overflow-hidden shadow-[0_0_12px_rgba(124,92,252,0.15)]">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name || 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                  (user?.name || '?')[0].toUpperCase()
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d0d12] shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            </div>

            {isSidebarHovered && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col text-left min-w-0 flex-1"
              >
                <span className="text-[11px] font-semibold text-white truncate leading-tight">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-[9px] text-[#7c5cfc] font-mono truncate">
                  {user?.username ? `@${user.username}` : user?.email || ''}
                </span>
              </motion.div>
            )}

            {isSidebarHovered && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="shrink-0">
                <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-[#7c5cfc] transition-colors" />
              </motion.div>
            )}
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/[0.05] my-1" />

          {/* Profile & Settings button */}
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="w-full py-2.5 px-3 rounded-xl relative flex items-center justify-start text-fouzar-text-secondary hover:text-[#7c5cfc] hover:bg-[#7c5cfc]/[0.07] transition-all cursor-pointer group"
          >
            <User className="w-4 h-4 shrink-0 ml-1" />
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

          {/* Logout button */}
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-3 rounded-xl relative flex items-center justify-start text-fouzar-text-secondary hover:text-[#ff2d55] hover:bg-[#ff2d55]/[0.07] transition-all cursor-pointer group"
          >
            <LogOut className="w-4 h-4 shrink-0 ml-1" />
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
      {/* TOP NAVIGATION BAR: Under 768px view (Mobile / Compact View)              */}
      {/* ========================================================================= */}
      <nav className="md:hidden w-full h-14 bg-fouzar-bg border-b border-fouzar-border px-6 py-2 flex items-center justify-between z-30 shrink-0 select-none">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`relative flex flex-col items-center justify-center p-2 transition-colors cursor-pointer ${
                isActive ? 'text-fouzar-accent' : 'text-fouzar-text-secondary'
              }`}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <div className="absolute bottom-[-8px] left-2 right-2 h-[2px] bg-fouzar-accent" />
              )}
            </button>
          );
        })}
        
        {/* Mobile profile link */}
        <button
          type="button"
          onClick={() => router.push('/profile')}
          title="My Profile & Settings"
          className="w-7 h-7 rounded-[var(--fouzar-radius-sm)] border border-fouzar-border-strong bg-fouzar-card flex items-center justify-center font-mono text-[9px] font-bold text-fouzar-text-primary shrink-0 cursor-pointer hover:border-[#7c5cfc] hover:text-[#7c5cfc] transition-all shadow-sm"
        >
          {user ? user.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 'AM'}
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* 2. LEFT MAIN PANEL: Content columns                                       */}
      {/* ========================================================================= */}
      <ResizablePanel 
        direction="horizontal" 
        initialSize={400} 
        minSize={300} 
        maxSize={600} 
        className="flex-1"
      >
        <div 
          className="w-full h-full bg-fouzar-bg border-r border-fouzar-border p-6 flex flex-col justify-between overflow-y-auto scrollbar-none transition-all duration-300"
        >
          <div className="space-y-8">
            
            {/* Study circles list relocated to top stories bar in right panel */}

            {/* Personal Sanctuary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary">
                  Personal Space
                </span>
                <span className="px-1.5 py-0.5 text-[8px] font-mono text-[#7c5cfc] border border-[#7c5cfc]/20 bg-[#7c5cfc]/[0.06] rounded-full uppercase tracking-wider">Solo</span>
              </div>
              <FascaCard
                className={`p-4 flex flex-col justify-between min-h-[120px] cursor-pointer transition-all duration-200 relative group ${
                  getCardColorClass('sanctuary', selectedCardId === 'sanctuary')
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push('/sanctuary');
                }}
              >
                <div>
                  <span className={`text-[8.5px] font-mono uppercase tracking-wider block ${getTextColor('sanctuary')}`}>
                    Private · Solo
                  </span>
                  <h3 className="text-sm font-bold text-fouzar-text-primary mt-1">My Sanctuary</h3>
                  <p className="text-[9px] text-fouzar-text-secondary font-mono mt-1 pr-6">
                    Semester notes, AI tutor, your materials
                  </p>
                </div>

                {/* 3-dots Dropdown Menu (Sanctuary) */}
                <div className="absolute top-3.5 right-3.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setActiveMenuNodeId(activeMenuNodeId === 'sanctuary' ? null : 'sanctuary')}
                    className="p-1 hover:bg-white/5 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
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
                        className="absolute right-0 mt-1 w-36 bg-fouzar-surface/95 border border-fouzar-border-strong rounded-[4px] shadow-2xl p-2 z-50 text-left"
                      >
                        <div className="px-2 py-0.5 text-[7px] font-mono uppercase text-fouzar-text-secondary tracking-wider mb-1.5 flex items-center gap-1">
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
                    className={`text-[8.5px] font-mono uppercase tracking-widest ${getTextColor('sanctuary')} hover:text-fouzar-text-primary flex items-center gap-1.5 transition-all cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] group-hover:opacity-100`}
                  >
                    Open Sanctuary <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </FascaCard>
            </div>

            {/* Active Garden Nodes list */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary">
                    Shared Study Groups
                  </span>
                  {gardenNodes.filter(n => !n.isEmptyCourse).length > 0 && (
                    <span className="px-1.5 py-0.5 text-[8px] font-mono text-white/40 border border-white/10 rounded-full">
                      {gardenNodes.filter(n => !n.isEmptyCourse).length}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateCourseModal(true)}
                  className="flex items-center gap-1 text-[9px] font-mono text-[#7c5cfc] border border-[#7c5cfc]/25 hover:border-[#7c5cfc]/60 bg-[#7c5cfc]/[0.06] hover:bg-[#7c5cfc]/[0.12] px-2.5 py-1 rounded-lg cursor-pointer transition-all uppercase tracking-wider"
                >
                  <Plus className="w-2.5 h-2.5" /> New Circle
                </button>
              </div>

              {loadingNodes ? (
                <div className="max-h-64 overflow-y-auto space-y-3 pr-1 scrollbar-none">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-32 bg-fouzar-card/50 border border-fouzar-border-strong animate-pulse rounded-[6px] p-4 flex flex-col justify-between">
                      <div className="h-3 bg-white/10 w-1/3 rounded-[2px]" />
                      <div className="h-4 bg-white/10 w-3/4 rounded-[2px]" />
                      <div className="h-4 bg-white/10 w-20 self-end rounded-[2px]" />
                    </div>
                  ))}
                </div>
              ) : gardenNodes.length === 0 ? (
                <div className="w-full h-32 border border-dashed border-fouzar-border-strong rounded-[6px] flex flex-col items-center justify-center p-4 text-center">
                  <Grid className="w-8 h-8 text-fouzar-text-secondary/40 mb-2" />
                  <span className="text-[10px] font-mono text-fouzar-text-primary uppercase tracking-wider">Your circles are forming</span>
                  <span className="text-[7.5px] font-mono text-fouzar-text-secondary mt-1.5 uppercase">NO ACTIVE STUDY NODES DETECTED</span>
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto space-y-6 pr-1 scrollbar-none animate-none">
                  {Object.entries(gardenNodes.reduce((acc, node) => {
                    const groupName = node.course || 'Uncategorized';
                    if (!acc[groupName]) acc[groupName] = [];
                    acc[groupName].push(node);
                    return acc;
                  }, {} as Record<string, typeof gardenNodes>)).map(([courseName, nodes]) => (
                    <div key={courseName} className="mb-4 last:mb-0">
                      <div className="flex items-center justify-between mb-3 px-1 border-b border-white/5 pb-2">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-fouzar-text-primary font-bold">
                          {courseName}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setNewGroupCourse(courseName === 'Uncategorized' ? '' : courseName);
                              setShowCreateGroupModal(true);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
                            title={`Add circle to ${courseName}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          {courseName !== 'Uncategorized' && nodes[0]?.courseId && (
                            <button
                              type="button"
                              onClick={() => handleDeleteCourse(nodes[0].courseId!, courseName)}
                              className="p-1 hover:bg-[#ff2d55]/10 rounded text-fouzar-text-secondary hover:text-[#ff2d55] transition-colors cursor-pointer"
                              title={`Delete ${courseName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {nodes.filter(node => !node.isEmptyCourse).map((node) => (
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
                                  className="bg-fouzar-surface border border-fouzar-accent px-2 py-1 text-xs rounded font-mono text-fouzar-text-primary focus:outline-none w-[80%] mt-1"
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
                                <h3 className="text-xs font-bold text-fouzar-text-primary mt-1 pr-6 truncate" title={node.roomName}>
                                  {node.roomName}
                                </h3>
                              )}
                              <p className="text-[9px] text-fouzar-text-secondary font-mono mt-1" title={node.currentSlide}>
                                {node.currentSlide}
                              </p>
                              {/* Pending Join Requests (Creator Only) */}
                              {node.creatorId === user?.id && pendingGroupRequests[node.id] && pendingGroupRequests[node.id].length > 0 && (
                                <div className="mt-3 border-t border-fouzar-border-strong/40 pt-2.5 space-y-1.5 animate-none" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[7.5px] font-mono uppercase text-[#ff2d55] tracking-[0.15em] block font-bold">
                                    Join Requests ({pendingGroupRequests[node.id].length})
                                  </span>
                                  <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-none">
                                    {pendingGroupRequests[node.id].map((req) => (
                                      <div key={req.userId} className="flex items-center justify-between p-1 bg-fouzar-bg-elevated border border-fouzar-border-strong/40 rounded-[4px] gap-2">
                                        <span className="text-[8px] text-fouzar-text-primary font-mono truncate max-w-[120px]">
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
                                  className="p-1 hover:bg-white/5 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
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
                                      className="absolute right-0 mt-1 w-36 bg-fouzar-surface/95 border border-fouzar-border-strong rounded-[4px] shadow-2xl p-2 z-50 text-left"
                                    >
                                      {user && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingNodeId(node.id);
                                              setEditingName(node.roomName);
                                              setActiveMenuNodeId(null);
                                            }}
                                            className="w-full px-2 py-1.5 text-[8.5px] font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-white/5 rounded flex items-center gap-1.5 cursor-pointer text-left"
                                          >
                                            <Edit2 className="w-3 h-3 text-fouzar-accent" /> Rename
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
                                          <div className="border-t border-fouzar-border-strong/40 my-1.5" />
                                        </>
                                      )}
                                      <div className="px-2 py-0.5 text-[7px] font-mono uppercase text-fouzar-text-secondary tracking-wider mb-1.5 flex items-center gap-1">
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
                                className={`text-[8.5px] font-mono uppercase tracking-widest ${getTextColor(node.id)} hover:text-fouzar-text-primary flex items-center gap-1 transition-colors cursor-pointer`}
                              >
                                {editingNodeId === node.id ? 'Save' : 'Join Circle'} <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </FascaCard>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {user?.email === 'h.ahmad.ar007@gmail.com' && (
              <div className="space-y-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary block">
                  All Members
                </span>
                <AdminMembersPanel />
              </div>
            )}

          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. RIGHT PANEL: Workspace central Core controls                            */}
        {/* ========================================================================= */}
        <main className={`w-full h-full flex flex-col ${
          activeNav === 'friends'
            ? 'overflow-hidden p-4'
            : 'overflow-y-auto scrollbar-none space-y-12 p-6 md:p-8'
        }`}>

        {activeNav === 'friends' ? (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary">Direct Messages</span>
              <div className="flex items-center gap-2">
                <DmNotificationBell onClick={() => setActiveNav('friends')} />
                <NotificationBell />
                <ConnectionsCenter />
                <ThemeSwitcher />
                <button
                  type="button"
                  onClick={() => setActiveNav('circles')}
                  className="flex items-center justify-center w-6 h-6 rounded-full bg-fouzar-surface/60 border border-fouzar-border/40 text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-fouzar-signal/20 hover:border-fouzar-signal/40 transition-all cursor-pointer"
                  title="Close Direct Messages"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <FriendsChatDeck peers={peers} />
            </div>
          </div>
        ) : (
          <>
            {/* Top Utility Header */}
            <div className="w-full flex items-center justify-between mb-2">
              <div />
              <div className="flex items-center gap-3">
                <LmsConnectionIndicator />
                <DmNotificationBell onClick={() => setActiveNav('friends')} />
                <NotificationBell />
                <ConnectionsCenter align="right" />
                <ThemeSwitcher />
                <button
                  type="button"
                  onClick={() => setIsTimerModalOpen(!isTimerModalOpen)}
                  className={`bg-zinc-900/50 backdrop-blur-md border px-3 py-1.5 rounded-full flex items-center gap-2 cursor-pointer transition-all duration-200 select-none text-xs shadow-sm ${
                    isFlowActive ? 'border-fouzar-signal text-fouzar-signal shadow-[0_0_8px_var(--fouzar-signal)]' : 'border-white/5 hover:border-fouzar-accent/30 text-zinc-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono tracking-wider">{formatTime(secondsLeft)}</span>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isTimerModalOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="fixed top-16 right-6 w-80 bg-zinc-950/90 backdrop-blur-xl border border-fouzar-border-subtle rounded-2xl p-6 shadow-2xl z-[100] transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary">
                      Focus Timer
                    </span>
                    <button
                      onClick={() => setIsTimerModalOpen(false)}
                      className="text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-full flex flex-col items-center">
                    <div className="flex gap-2 justify-center mb-6">
                      {[15, 25, 45, 60].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setSessionMinutes(preset)}
                          className={`w-12 h-10 rounded-[6px] border text-[11px] font-mono flex flex-col items-center justify-center transition-colors cursor-pointer ${
                            sessionMinutes === preset
                              ? 'border-fouzar-accent text-fouzar-accent bg-fouzar-accent/5 font-semibold'
                              : 'border-fouzar-border text-fouzar-text-secondary hover:border-fouzar-text-secondary hover:text-fouzar-text-primary'
                          }`}
                        >
                          <span>{preset}</span>
                        </button>
                      ))}
                    </div>

                    <div className="relative w-40 h-40 flex flex-col items-center justify-center rounded-full bg-fouzar-surface/60 border border-fouzar-border shadow-lg mb-6">
                      <span className="text-4xl font-mono font-light text-fouzar-text-primary tracking-wider text-glow-accent">
                        {formatTime(secondsLeft)}
                      </span>
                      <span className={`text-[7px] font-mono uppercase tracking-widest mt-2 flex items-center gap-1 ${isFlowActive ? 'text-fouzar-signal' : 'text-fouzar-accent'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isFlowActive ? 'bg-fouzar-signal' : 'bg-fouzar-accent'}`} />
                        {isFlowActive ? 'ACTIVE' : 'IDLE'}
                      </span>
                    </div>

                    <FascaButton
                      onClick={handleTriggerFlow}
                      variant={isFlowActive ? 'ghost-crimson' : 'solid-violet'}
                      className="w-full rounded-[6px] py-3 text-[10px] font-bold flex items-center justify-center gap-2"
                    >
                      <Flame className="w-4 h-4 fill-current" /> {isFlowActive ? 'EXIT DEEP FLOW' : 'Start Studying'}
                    </FascaButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex flex-col gap-12 pb-24 w-full relative">
              
              <div id="mindmap-section" className="w-full h-[600px] shrink-0 border border-fouzar-border-strong rounded-[6px] overflow-hidden relative shadow-lg bg-fouzar-surface/40">
                <StudyNodesGraph nodesData={gardenNodes} />
              </div>

              <div id="courses-section" className="w-full h-[600px] shrink-0 relative">
                <CourseFeedPanel onOpenConnect={() => setIsLmsOpen(true)} />
              </div>

              <div id="ai-engines-section" className="w-full h-[600px] shrink-0">
                <FascaAiCore />
              </div>

            </div>
          </>
        )}

      </main>
      </ResizablePanel>

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

      {/* Create Main Circle Modal */}
      <AnimatePresence>
        {showCreateCourseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-fouzar-bg/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-fouzar-surface border border-fouzar-border-strong rounded-[var(--fouzar-radius-lg)] shadow-2xl w-full max-w-sm"
            >
              <div className="flex bg-fouzar-bg/40 border-b border-fouzar-border py-3.5 px-4 items-center justify-between rounded-t-[var(--fouzar-radius-lg)]">
                <span className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-primary flex items-center gap-1.5">
                  <Grid className="w-4 h-4 text-fouzar-accent" /> Create Main Circle
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateCourseModal(false)}
                  className="text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer font-mono text-[8px]"
                >
                  [CLOSE]
                </button>
              </div>

              <form onSubmit={handleCreateCourseSubmit} className="p-6 space-y-6">
                {createCourseError && (
                  <div className="p-3 bg-fouzar-signal/5 border border-fouzar-signal/20 text-fouzar-signal font-mono text-[8.5px] uppercase tracking-wider">
                    {createCourseError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-mono uppercase text-fouzar-text-secondary tracking-wider mb-1">Main Circle Title</span>
                    <input
                      type="text"
                      required
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      placeholder="e.g. Semester 1 or CS-101"
                      className="w-full bg-fouzar-surface border border-fouzar-border px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary uppercase"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-fouzar-border/40">
                  <button
                    type="button"
                    onClick={() => setShowCreateCourseModal(false)}
                    className="px-4 py-2 text-[8px] font-mono uppercase tracking-widest text-fouzar-text-secondary hover:text-fouzar-text-primary border border-fouzar-border-strong rounded-[var(--fouzar-radius-md)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <FascaButton
                    type="submit"
                    variant="solid-violet"
                    disabled={createCourseLoading || !newCourseName.trim()}
                  >
                    {createCourseLoading ? 'Creating...' : 'Create'}
                  </FascaButton>
                </div>
              </form>
            </motion.div>
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
            className="fixed inset-0 z-50 bg-fouzar-bg/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-fouzar-surface border border-fouzar-border-strong rounded-[var(--fouzar-radius-lg)] shadow-2xl w-full max-w-sm"
            >
              <div className="flex bg-fouzar-bg/40 border-b border-fouzar-border py-3.5 px-4 items-center justify-between rounded-t-[var(--fouzar-radius-lg)]">
                <span className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-primary flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-fouzar-accent" /> Create Study Circle
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer font-mono text-[8px]"
                >
                  [CLOSE]
                </button>
              </div>

              <form onSubmit={handleCreateGroupSubmit} className="p-6 space-y-6">
                {createGroupError && (
                  <div className="p-3 bg-fouzar-signal/5 border border-fouzar-signal/20 text-fouzar-signal font-mono text-[8.5px] uppercase tracking-wider">
                    {createGroupError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-mono uppercase text-fouzar-text-secondary tracking-wider mb-1">Group Title</span>
                    <input
                      type="text"
                      required
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Algorithms Study Group"
                      className="w-full bg-fouzar-surface border border-fouzar-border px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary"
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-mono uppercase text-fouzar-text-secondary tracking-wider mb-1">Main Group (e.g. Semester 1 or CS-101)</span>
                    <input
                      type="text"
                      value={newGroupCourse}
                      readOnly
                      className="w-full bg-fouzar-surface border border-fouzar-border px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-fouzar-accent text-fouzar-text-primary uppercase opacity-70 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-8 border-t border-fouzar-border/40 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(false)}
                    className="px-3 py-1.5 border border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-text-primary rounded-[var(--fouzar-radius-md)] font-mono text-[8px] uppercase tracking-wider cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createGroupLoading}
                    className="px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse rounded-[var(--fouzar-radius-md)] font-mono text-[8px] uppercase font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer flex items-center justify-center"
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
              className="fixed z-50 bg-fouzar-surface/95 border border-fouzar-accent/60 shadow-2xl p-2 rounded-[6px] w-48 text-left backdrop-blur-md"
              style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-2 py-1 text-[7px] font-mono uppercase text-fouzar-text-secondary tracking-wider mb-1">
                Invite to Study Group
              </div>
              <div className="space-y-0.5 max-h-40 overflow-y-auto scrollbar-none">
                {gardenNodes.length === 0 ? (
                  <div className="px-2 py-1.5 text-[8px] font-mono text-fouzar-text-secondary uppercase">
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
                      className="w-full px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-fouzar-text-primary hover:bg-fouzar-accent/15 rounded text-left transition-colors truncate block cursor-pointer"
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
      <AnimatePresence>
        {showAiOnboarding && (
          <AiOnboardingModal onClose={handleAiOnboardingComplete} />
        )}
        {showUsernameOnboarding && (
          <UsernameOnboardingModal 
            user={user} 
            onComplete={() => {
              setShowUsernameOnboarding(false);
              if (user) checkAiOnboarding(user.id);
              window.location.reload();
            }} 
          />
        )}
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-2 pointer-events-none">
        <a 
          href="https://www.linkedin.com/in/muhammad-ahmad-3387a7382/?skipRedirect=true" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-mono text-[10px] text-fouzar-text-primary/20 hover:text-indigo-400 transition-colors duration-300 hover:[text-shadow:0_0_12px_rgba(129,140,248,0.7)] pointer-events-auto uppercase tracking-widest"
        >
          LinkedIn
        </a>

        <p className="font-mono text-[8px] text-fouzar-text-primary/15 tracking-[0.18em] uppercase select-none pointer-events-auto text-center absolute left-1/2 -translate-x-1/2">
          developed by Muhammad Ahmad and a lot of ai&apos;s
        </p>

        <a 
          href="https://github.com/hahmadar007-cmd/STUDENT-OS" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-mono text-[10px] text-fouzar-text-primary/20 hover:text-indigo-400 transition-colors duration-300 hover:[text-shadow:0_0_12px_rgba(129,140,248,0.7)] pointer-events-auto uppercase tracking-widest"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
