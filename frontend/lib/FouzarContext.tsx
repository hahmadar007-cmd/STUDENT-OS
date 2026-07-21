'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/* =============================================================================
   FOUZAR GLOBAL STATE ENGINE — Phase 2
   Central nervous system for theme chassis, spatial modes, identity graph,
   and Deep Flow shield orchestration. All workspace surfaces consume this
   context rather than managing local UI state in isolation.
   ============================================================================= */

/** Visual chassis: Onyx (tactical matte) or Greenhouse (airy glass). */
export type FouzarMode = 'onyx' | 'greenhouse';
export type FouzarAccent = 'violet' | 'emerald' | 'ice' | 'amber' | 'signal';

/** Spatial operating mode governing progressive disclosure intensity. */
export type FouzarSpace = 'planning' | 'study' | 'focus';

/** Real-time presence signal broadcast to the social graph. */
export type FouzarPresence = 'offline' | 'online' | 'flow';

/**
 * Authenticated user profile with Fouzar identity primitives.
 * `fouzarId` is the shareable connection string (e.g. FOUZAR-78X2).
 * `handle` is the human-chosen username slug.
 */
export interface FouzarUserProfile {
  id: string;
  email: string;
  name: string;
  handle: string;
  fouzarId: string;
  universityId?: string | null;
  avatarInitials: string;
  isFocusing: boolean;
  presence: FouzarPresence;
}

/**
 * Lightweight friend node for the Instagram/WhatsApp-style connection rail.
 * Resolved by handle or fouzarId search.
 */
export interface FouzarFriendProfile {
  id: string;
  name: string;
  handle: string;
  fouzarId: string;
  avatarInitials: string;
  presence: FouzarPresence;
  activeGroup?: string;
  focusDurationLabel?: string;
}

/**
 * Personal LMS Hub document entry (Pillar 4).
 * Metadata catalog — files stay in-browser via IndexedDB reference or local path label.
 */
export interface LmsRepositoryItem {
  id: string;
  fileName: string;
  courseCode: string;
  category: 'syllabus' | 'lab' | 'lecture' | 'exam' | 'other';
  uploadedAt: string;
  sizeLabel: string;
  /** IndexedDB blob reference — required to open files in the viewer */
  storageId?: string;
  mimeType?: string;
  folderId?: string | null; // Associated folder/subfolder ID
}

/** Emergency bypass window for the OS-level distraction shield (minutes). */
export type BypassDurationMinutes = 5 | 10;

export interface FouzarFolder {
  id: string;
  name: string;
  code: string;
  parentFolderId: string | null;
  isPinned?: boolean;
  isFavorite?: boolean;
}

export interface FouzarBypassState {
  isActive: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  durationMinutes: BypassDurationMinutes | null;
}

export interface FouzarContextValue {
  /* --- Visual chassis --- */
  mode: FouzarMode;
  setMode: (mode: FouzarMode) => void;
  toggleMode: () => void;
  accentColor: FouzarAccent;
  setAccentColor: (accent: FouzarAccent) => void;

  /* --- Spatial engine --- */
  space: FouzarSpace;
  setSpace: (space: FouzarSpace) => void;

  /* --- Deep Flow shield --- */
  isFlowActive: boolean;
  setIsFlowActive: (active: boolean) => void;
  armDeepFlow: () => void;
  disarmDeepFlow: () => void;
  bypass: FouzarBypassState;
  activateBypass: (durationMinutes?: BypassDurationMinutes) => void;
  clearBypass: () => void;

  /* --- Identity & session --- */
  user: FouzarUserProfile | null;
  isAuthenticated: boolean;
  setUser: (profile: FouzarUserProfile | null) => void;
  logout: () => void;

  /* --- Social graph --- */
  friends: FouzarFriendProfile[];
  addFriend: (friend: FouzarFriendProfile) => void;
  removeFriend: (friendId: string) => void;
  updateFriendPresence: (
    friendId: string,
    patch: Partial<Pick<FouzarFriendProfile, 'presence' | 'activeGroup' | 'focusDurationLabel'>>,
  ) => void;
  findFriendByIdentifier: (identifier: string) => FouzarFriendProfile | undefined;
  createGroupNode: (friendIds: string[], roomName?: string) => string;

  /* --- Personal LMS Hub (Pillar 4) --- */
  repository: LmsRepositoryItem[];
  addRepositoryItem: (item: any) => void;
  removeRepositoryItem: (id: string) => void;
  updateRepositoryItem: (id: string, patch: Partial<LmsRepositoryItem>) => void;
  activeDoc: LmsRepositoryItem | null;
  setActiveDoc: (doc: LmsRepositoryItem | null) => void;
  openDocs: LmsRepositoryItem[];
  activeDocId: string | null;
  closeDoc: (id: string) => void;
  activeDocText: string | null;
  setActiveDocText: (text: string | null) => void;
  /** Current page/slide text only — sent to AI as primary context */
  activeSlideContext: string | null;
  setActiveSlideContext: (text: string | null) => void;
  activeSlidePage: number;
  setActiveSlidePage: (page: number) => void;
  activeVideoUrl: string | null;
  setActiveVideoUrl: (url: string | null) => void;
  activeVideoTimestamp: number;
  setActiveVideoTimestamp: (time: number) => void;

  /* --- AI workspace --- */
  isOrbOpen: boolean;
  setIsOrbOpen: (open: boolean) => void;
  aiModel: string;
  setAiModel: (model: string) => void;
  aiTriggerQuery: { text: string; id: string } | null;
  setAiTriggerQuery: (query: { text: string; id: string } | null) => void;

  /* --- Folders/Subjects --- */
  folders: FouzarFolder[];
  activeFolderId: string;
  setActiveFolderId: (id: string) => void;
  addFolder: (name: string, code: string, parentFolderId?: string | null) => void;
  deleteFolder: (id: string) => void;
  updateFolder: (id: string, patch: Partial<FouzarFolder>) => void;
  currentFolderId: string | null;
  setCurrentFolderId: (id: string | null) => void;
}

const FouzarContext = createContext<FouzarContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  theme: 'fouzar-theme',
  space: 'fouzar-space',
  user: 'user',
  friends: 'fouzar-friends',
  repository: 'fouzar-repository',
  aiModel: 'fouzar-ai-model',
  folders: 'fouzar-folders',
  activeFolderId: 'fouzar-active-folder-id',
  accentColor: 'fouzar-accent-color',
} as const;

const BYPASS_DURATIONS: BypassDurationMinutes[] = [5, 10];

const FOUZAR_ID_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a collision-resistant Fouzar connection identifier.
 * Format: FOUZAR-XXXX (4 alphanumeric chars, no ambiguous 0/O/1/I).
 */
export function generateFouzarId(): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += FOUZAR_ID_CHARSET[Math.floor(Math.random() * FOUZAR_ID_CHARSET.length)];
  }
  return `FOUZAR-${suffix}`;
}

/** Derives a URL-safe handle from a display name. */
export function deriveHandle(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24) || 'fouzar_user';
}

/** Builds avatar initials from a full name (max 2 chars). */
export function deriveInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Normalizes persisted API user payloads into Fouzar profile shape.
 * Backfills handle/fouzarId for legacy sessions stored before Phase 2.
 */
export function normalizeUserProfile(raw: Record<string, unknown>): FouzarUserProfile {
  const name = String(raw.name ?? 'Fouzar User');
  const id = String(raw.id ?? '');
  const email = String(raw.email ?? '');

  return {
    id,
    email,
    name,
    handle: String(raw.handle ?? deriveHandle(name)),
    fouzarId: String(raw.fouzarId ?? generateFouzarId()),
    universityId: (raw.universityId as string | null | undefined) ?? null,
    avatarInitials: String(raw.avatarInitials ?? deriveInitials(name)),
    isFocusing: Boolean(raw.isFocusing),
    presence: (raw.presence as FouzarPresence) ?? 'online',
  };
}

const INITIAL_BYPASS: FouzarBypassState = {
  isActive: false,
  activatedAt: null,
  expiresAt: null,
  durationMinutes: null,
};

/** Seeds the social rail with demo peers until the network API is wired. */
const SEED_FRIENDS: FouzarFriendProfile[] = [];

const SEED_FOLDERS: FouzarFolder[] = [
  { id: 'general', name: 'General / Playground', code: 'GEN', parentFolderId: null },
];

/**
 * Applies theme + spatial attributes to <html> for CSS variable switching
 * and Deep Flow progressive disclosure.
 */
function syncDocumentAttributes(
  mode: FouzarMode,
  space: FouzarSpace,
  isFlowActive: boolean,
  accentColor: FouzarAccent,
): void {
  const root = document.documentElement;
  root.setAttribute('data-theme', mode);
  root.setAttribute('data-space', space);
  root.setAttribute('data-flow', isFlowActive ? 'active' : 'idle');
  root.setAttribute('data-accent', accentColor);
}

/**
 * FouzarProvider — mount once at the app root (see app/layout.tsx).
 * Owns all cross-surface state: theme, spatial mode, auth, social graph,
 * and distraction shield bypass windows.
 */
export const FouzarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<FouzarMode>('onyx');
  const [space, setSpaceState] = useState<FouzarSpace>('planning');
  const [isFlowActive, setIsFlowActive] = useState(false);
  const [isOrbOpen, setIsOrbOpen] = useState(false);
  const [aiModel, setAiModelState] = useState('');
  const [aiTriggerQuery, setAiTriggerQuery] = useState<{ text: string; id: string } | null>(null);
  const [user, setUserState] = useState<FouzarUserProfile | null>(null);
  const [friends, setFriends] = useState<FouzarFriendProfile[]>(SEED_FRIENDS);
  const [repository, setRepository] = useState<LmsRepositoryItem[]>([]);
  const [bypass, setBypass] = useState<FouzarBypassState>(INITIAL_BYPASS);
  const [accentColor, setAccentColorState] = useState<FouzarAccent>('violet');
  const [openDocs, setOpenDocs] = useState<LmsRepositoryItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeDocText, setActiveDocText] = useState<string | null>(null);
  const [activeSlideContext, setActiveSlideContext] = useState<string | null>(null);
  const [activeSlidePage, setActiveSlidePage] = useState(1);

  const activeDoc = useMemo(() => openDocs.find((d) => d.id === activeDocId) || null, [openDocs, activeDocId]);

  const setActiveDoc = useCallback((doc: LmsRepositoryItem | null) => {
    if (!doc) {
      setActiveDocId(null);
      return;
    }
    setOpenDocs((prev) => {
      if (!prev.find((d) => d.id === doc.id)) {
        return [...prev, doc];
      }
      return prev;
    });
    setActiveDocId(doc.id);
  }, []);

  const closeDoc = useCallback((docId: string) => {
    setOpenDocs((prev) => {
      const next = prev.filter((d) => d.id !== docId);
      if (activeDocId === docId) {
        setActiveDocId(next.length > 0 ? next[next.length - 1].id : null);
      }
      return next;
    });
  }, [activeDocId]);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoTimestamp, setActiveVideoTimestamp] = useState<number>(0);

  const setAccentColor = useCallback((next: FouzarAccent) => {
    setAccentColorState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.accentColor, next);
    }
  }, []);

  /* --- Folders/Subjects --- */
  const [folders, setFolders] = useState<FouzarFolder[]>(SEED_FOLDERS);
  const [activeFolderId, setActiveFolderIdState] = useState<string>('general');
  const [currentFolderId, setCurrentFolderIdState] = useState<string | null>(null);

  const setActiveFolderId = useCallback((id: string) => {
    setActiveFolderIdState(id);
    setCurrentFolderIdState(id === 'general' ? null : id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.activeFolderId, id);
    }
  }, []);

  const setCurrentFolderId = useCallback((id: string | null) => {
    setCurrentFolderIdState(id);
  }, []);

  const addFolder = useCallback((name: string, code: string, parentFolderId: string | null = null) => {
    const newFolder: FouzarFolder = {
      id: `folder-${Date.now()}`,
      name,
      code: code.toUpperCase(),
      parentFolderId,
    };
    setFolders((prev) => {
      const next = [...prev, newFolder];
      return next;
    });
  }, []);

  const deleteFolder = useCallback((id: string) => {
    if (id === 'general') return;
    setFolders((prev) => {
      const getSubFolderIds = (folderId: string, folderList: FouzarFolder[]): string[] => {
        const directSubs = folderList.filter(f => f.parentFolderId === folderId).map(f => f.id);
        return [folderId, ...directSubs.flatMap(subId => getSubFolderIds(subId, folderList))];
      };
      
      const idsToRemove = getSubFolderIds(id, prev);
      const next = prev.filter((f) => !idsToRemove.includes(f.id));
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(next));
      }
      return next;
    });
    setActiveFolderIdState((prev) => (prev === id ? 'general' : prev));
    setCurrentFolderIdState((prev) => (prev === id ? null : prev));
  }, []);

  const updateFolder = useCallback((id: string, patch: Partial<FouzarFolder>) => {
    setFolders((prev) => {
      const next = prev.map((f) => {
        if (f.id === id) {
          return { ...f, ...patch };
        }
        return f;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.folders, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const bypassTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* --- Theme --- */
  const setMode = useCallback((next: FouzarMode) => {
    setModeState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.theme, next);
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'onyx' ? 'greenhouse' : 'onyx');
  }, [mode, setMode]);

  /* --- Spatial --- */
  const setSpace = useCallback((next: FouzarSpace) => {
    setSpaceState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.space, next);
    }
  }, []);

  /* --- Deep Flow --- */
  const armDeepFlow = useCallback(() => {
    setIsFlowActive(true);
    setSpace('focus');
  }, [setSpace]);

  const disarmDeepFlow = useCallback(() => {
    setIsFlowActive(false);
    setSpace('planning');
    setUserState((prev) =>
      prev ? { ...prev, isFocusing: false, presence: 'online' } : prev,
    );
  }, [setSpace]);

  const clearBypass = useCallback(() => {
    if (bypassTimerRef.current) {
      clearTimeout(bypassTimerRef.current);
      bypassTimerRef.current = null;
    }
    setBypass(INITIAL_BYPASS);
  }, []);

  /**
   * Opens the emergency relief valve. Shield drops for 5 or 10 minutes
   * while accountability tracking persists via activatedAt timestamp.
   */
  const activateBypass = useCallback(
    (durationMinutes: BypassDurationMinutes = 5) => {
      const safeDuration = BYPASS_DURATIONS.includes(durationMinutes) ? durationMinutes : 5;
      const now = new Date();
      const expires = new Date(now.getTime() + safeDuration * 60_000);

      if (bypassTimerRef.current) clearTimeout(bypassTimerRef.current);

      setBypass({
        isActive: true,
        activatedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        durationMinutes: safeDuration,
      });

      bypassTimerRef.current = setTimeout(() => {
        setBypass(INITIAL_BYPASS);
        bypassTimerRef.current = null;
      }, safeDuration * 60_000);
    },
    [],
  );

  /* --- Identity --- */
  const setUser = useCallback((profile: FouzarUserProfile | null) => {
    setUserState(profile);
    if (typeof window === 'undefined') return;
    if (profile) {
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    disarmDeepFlow();
    clearBypass();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }, [setUser, disarmDeepFlow, clearBypass]);

  /* --- Social graph --- */
  const addFriend = useCallback((friend: FouzarFriendProfile) => {
    setFriends((prev) => {
      if (prev.some((f) => f.id === friend.id || f.fouzarId === friend.fouzarId)) {
        return prev;
      }
      const next = [...prev, friend];
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.friends, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const removeFriend = useCallback((friendId: string) => {
    setFriends((prev) => {
      const next = prev.filter((f) => f.id !== friendId);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.friends, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const updateFriendPresence = useCallback(
    (
      friendId: string,
      patch: Partial<Pick<FouzarFriendProfile, 'presence' | 'activeGroup' | 'focusDurationLabel'>>,
    ) => {
      setFriends((prev) =>
        prev.map((friend) => (friend.id === friendId ? { ...friend, ...patch } : friend)),
      );
    },
    [],
  );

  const findFriendByIdentifier = useCallback(
    (identifier: string) => {
      const query = (identifier || '').trim().toLowerCase();
      return friends.find(
        (f) =>
          (f.fouzarId || '').toLowerCase() === query ||
          (f.handle || '').toLowerCase() === query ||
          f.id === identifier,
      );
    },
    [friends],
  );

  /**
   * Spins up an instant group node ID for synced study rooms.
   * Returns the generated room slug for navigation to /room/[id].
   */
  const createGroupNode = useCallback((friendIds: string[], roomName?: string) => {
    const suffix = Math.random().toString(36).slice(2, 6);
    const roomId = `node-${suffix}`;
    if (typeof window !== 'undefined' && roomName) {
      sessionStorage.setItem(`fouzar-room-name-${roomId}`, roomName);
      sessionStorage.setItem(`fouzar-room-members-${roomId}`, JSON.stringify(friendIds));
    }
    return roomId;
  }, []);

  const addRepositoryItem = useCallback(
    (item: any) => {
      const entry: LmsRepositoryItem = {
        id: `doc-${Date.now()}`,
        uploadedAt: new Date().toISOString(),
        ...item,
      };
      setRepository((prev) => {
        const next = [entry, ...prev];
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.repository, JSON.stringify(next));
        }
        return next;
      });
    },
    [],
  );

  const removeRepositoryItem = useCallback((id: string) => {
    setRepository((prev) => {
      const removed = prev.find((doc) => doc.id === id);
      if (removed?.storageId && typeof window !== 'undefined') {
        import('./documentStore').then(({ deleteDocument }) => deleteDocument(removed.storageId!));
      }
      const next = prev.filter((doc) => doc.id !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.repository, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const updateRepositoryItem = useCallback(
    (id: string, patch: Partial<LmsRepositoryItem>) => {
      setRepository((prev) => {
        const next = prev.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc));
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.repository, JSON.stringify(next));
        }
        return next;
      });
      setOpenDocs((prev) => {
        return prev.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc));
      });
    },
    [],
  );

  const setAiModel = useCallback((model: string) => {
    setAiModelState(model);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.aiModel, model);
    }
  }, []);

  /* --- Hydrate persisted state on mount --- */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme) as FouzarMode | null;
    const savedSpace = localStorage.getItem(STORAGE_KEYS.space) as FouzarSpace | null;
    const savedAiModel = localStorage.getItem(STORAGE_KEYS.aiModel);
    const savedUser = localStorage.getItem(STORAGE_KEYS.user);
    const savedFriends = localStorage.getItem(STORAGE_KEYS.friends);
    const savedRepository = localStorage.getItem(STORAGE_KEYS.repository);
    const savedFolders = localStorage.getItem(STORAGE_KEYS.folders);
    const savedActiveFolder = localStorage.getItem(STORAGE_KEYS.activeFolderId);
    const savedAccentColor = localStorage.getItem(STORAGE_KEYS.accentColor) as FouzarAccent | null;

    if (savedTheme === 'onyx' || savedTheme === 'greenhouse') {
      setModeState(savedTheme);
    }
    if (savedSpace === 'planning' || savedSpace === 'study' || savedSpace === 'focus') {
      setSpaceState(savedSpace);
    }
    if (savedAiModel) setAiModelState(savedAiModel);
    if (savedAccentColor === 'violet' || savedAccentColor === 'emerald' || savedAccentColor === 'ice' || savedAccentColor === 'amber' || savedAccentColor === 'signal') {
      setAccentColorState(savedAccentColor);
    }

    if (savedUser) {
      try {
        setUserState(normalizeUserProfile(JSON.parse(savedUser)));
      } catch {
        localStorage.removeItem(STORAGE_KEYS.user);
      }
    }

    if (savedFriends) {
      try {
        const parsed = JSON.parse(savedFriends) as FouzarFriendProfile[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFriends(parsed);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEYS.friends);
      }
    }

    if (savedRepository) {
      try {
        const parsed = JSON.parse(savedRepository) as LmsRepositoryItem[];
        if (Array.isArray(parsed)) setRepository(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEYS.repository);
      }
    }

    if (savedFolders) {
      try {
        const parsed = JSON.parse(savedFolders);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFolders(parsed);
        }
      } catch (e) {}
    }
    if (savedActiveFolder) {
      setActiveFolderIdState(savedActiveFolder);
    }
  }, []);

  /* --- Sync flow state → spatial mode + user presence --- */
  useEffect(() => {
    if (isFlowActive) {
      setSpaceState('focus');
      setUserState((prev) =>
        prev ? { ...prev, isFocusing: true, presence: 'flow' } : prev,
      );
    }
  }, [isFlowActive]);

  /* --- Mirror state to <html> data attributes for CSS chassis --- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    syncDocumentAttributes(mode, space, isFlowActive, accentColor);
  }, [mode, space, isFlowActive, accentColor]);

  /* --- Cleanup bypass timer on unmount --- */
  useEffect(() => {
    return () => {
      if (bypassTimerRef.current) clearTimeout(bypassTimerRef.current);
    };
  }, []);

  const value = useMemo<FouzarContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode,
      space,
      setSpace,
      isFlowActive,
      setIsFlowActive,
      armDeepFlow,
      disarmDeepFlow,
      bypass,
      activateBypass,
      clearBypass,
      user,
      isAuthenticated: user !== null,
      setUser,
      logout,
      friends,
      addFriend,
      removeFriend,
      updateFriendPresence,
      findFriendByIdentifier,
      createGroupNode,
      repository,
      addRepositoryItem,
      removeRepositoryItem,
      updateRepositoryItem,
      isOrbOpen,
      setIsOrbOpen,
      aiModel,
      setAiModel,
      aiTriggerQuery,
      setAiTriggerQuery,
      folders,
      activeFolderId,
      setActiveFolderId,
      addFolder,
      deleteFolder,
      updateFolder,
      currentFolderId,
      setCurrentFolderId,
      accentColor,
      setAccentColor,
      activeDoc,
      setActiveDoc,
      openDocs,
      activeDocId,
      closeDoc,
      activeDocText,
      setActiveDocText,
      activeSlideContext,
      setActiveSlideContext,
      activeSlidePage,
      setActiveSlidePage,
      activeVideoUrl,
      setActiveVideoUrl,
      activeVideoTimestamp,
      setActiveVideoTimestamp,
    }),
    [
      mode,
      setMode,
      toggleMode,
      space,
      setSpace,
      isFlowActive,
      armDeepFlow,
      disarmDeepFlow,
      bypass,
      activateBypass,
      clearBypass,
      user,
      setUser,
      logout,
      friends,
      addFriend,
      removeFriend,
      updateFriendPresence,
      findFriendByIdentifier,
      createGroupNode,
      repository,
      addRepositoryItem,
      removeRepositoryItem,
      updateRepositoryItem,
      isOrbOpen,
      aiModel,
      setAiModel,
      aiTriggerQuery,
      setAiTriggerQuery,
      folders,
      activeFolderId,
      setActiveFolderId,
      addFolder,
      deleteFolder,
      updateFolder,
      currentFolderId,
      setCurrentFolderId,
      accentColor,
      setAccentColor,
      activeDoc,
      activeDocText,
      activeSlideContext,
      activeSlidePage,
      activeVideoUrl,
      activeVideoTimestamp,
    ],
  );

  return <FouzarContext.Provider value={value}>{children}</FouzarContext.Provider>;
};

/**
 * Primary hook for consuming Fouzar global state.
 * Must be called within a <FouzarProvider> tree.
 */
export const useFouzar = (): FouzarContextValue => {
  const context = useContext(FouzarContext);
  if (!context) {
    throw new Error('useFouzar must be used within a FouzarProvider');
  }
  return context;
};
