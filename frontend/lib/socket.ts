'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { getBackendUrl } from './api';

const SOCKET_URL = getBackendUrl();

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const activeToken = typeof window !== 'undefined' ? localStorage.getItem('token') || undefined : undefined;
    socket = io(SOCKET_URL, {
      auth: {
        token: activeToken,
      },
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket.io client connected successfully');
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket.io disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }
  return socket;
};

// Typed Event Emitter Functions
export const joinGroup = (groupId: string) => {
  const s = getSocket();
  s.emit('joinGroup', { groupId });
};

export const leaveGroup = (groupId: string) => {
  const s = getSocket();
  s.emit('leaveGroup', { groupId });
};

export const sendMessage = (groupId: string, content: string, slideId: string | null) => {
  const s = getSocket();
  s.emit('sendMessage', { groupId, content, slideId });
};

export const syncSlide = (groupId: string, slideId: string) => {
  const s = getSocket();
  s.emit('syncSlide', { groupId, slideId });
};

export const updateFocusState = (isFocusing: boolean) => {
  const s = getSocket();
  s.emit('updateFocusState', { isFocusing });
};

export const sendSignal = (targetUserId: string) => {
  const s = getSocket();
  s.emit('sendSignal', { targetUserId });
};

// Typed Event Listener React Hooks
export const useOnMessage = (callback: (message: any) => void) => {
  useEffect(() => {
    const s = getSocket();
    s.on('onMessage', callback);
    s.on('group:message', callback);
    return () => {
      s.off('onMessage', callback);
      s.off('group:message', callback);
    };
  }, [callback]);
};

export const useOnSlideChanged = (callback: (data: { slideId: string }) => void) => {
  useEffect(() => {
    const s = getSocket();
    s.on('slideUpdated', callback);
    s.on('slide:changed', callback);
    return () => {
      s.off('slideUpdated', callback);
      s.off('slide:changed', callback);
    };
  }, [callback]);
};

export const useOnFocusStateChanged = (callback: (data: any) => void) => {
  useEffect(() => {
    const s = getSocket();
    s.on('friendFocusStateChanged', callback);
    s.on('focus:broadcast', callback);
    return () => {
      s.off('friendFocusStateChanged', callback);
      s.off('focus:broadcast', callback);
    };
  }, [callback]);
};

export const useOnSignalReceived = (callback: (data: any) => void) => {
  useEffect(() => {
    const s = getSocket();
    s.on('signalReceived', callback);
    return () => {
      s.off('signalReceived', callback);
    };
  }, [callback]);
};

// ─── Feature B: Live Presentation Engine ──────────────────────────────────────

/**
 * Emits `presenter-session-start` to tell all room peers that this user
 * is beginning a live slide presentation for a specific file.
 */
export const startPresenterSession = (groupId: string, fileId: string, fileName: string) => {
  const s = getSocket();
  s.emit('presenter-session-start', { groupId, fileId, fileName });
};

/**
 * Relays the active page number to all room members. The gateway re-emits
 * `onSyncSlidePage`; only peers with `isFollowingPresenter = true` snap to it.
 */
export const broadcastSlidePage = (groupId: string, fileId: string, pageNumber: number) => {
  const s = getSocket();
  s.emit('sync-slide-page', { groupId, fileId, pageNumber });
};

/** Cleanly terminates the live session so followers can detach automatically. */
export const endPresenterSession = (groupId: string) => {
  const s = getSocket();
  s.emit('presenter-session-end', { groupId });
};

// ─── Live Presentation React Hooks ────────────────────────────────────────────

export interface PresenterSessionPayload {
  presenterId: string;
  presenterName: string;
  groupId: string;
  fileId: string;
  fileName: string;
  startedAt: string;
}

export interface SyncSlidePagePayload {
  presenterId: string;
  fileId: string;
  pageNumber: number;
}

export interface PresenterSessionEndPayload {
  presenterId: string;
  presenterName: string;
  groupId: string;
}

export const useOnPresenterSessionStart = (callback: (data: PresenterSessionPayload) => void) => {
  useEffect(() => {
    const s = getSocket();
    s.on('onPresenterSessionStart', callback);
    return () => {
      s.off('onPresenterSessionStart', callback);
    };
  }, [callback]);
};

export const useOnSyncSlidePage = (callback: (data: SyncSlidePagePayload) => void) => {
  useEffect(() => {
    const s = getSocket();
    s.on('onSyncSlidePage', callback);
    return () => {
      s.off('onSyncSlidePage', callback);
    };
  }, [callback]);
};

export const useOnPresenterSessionEnd = (callback: (data: PresenterSessionEndPayload) => void) => {
  useEffect(() => {
    const s = getSocket();
    s.on('onPresenterSessionEnd', callback);
    return () => {
      s.off('onPresenterSessionEnd', callback);
    };
  }, [callback]);
};

// ─── Feature A: Shared Drive Real-Time Sync Hook ─────────────────────────────

export interface FileSyncPayload {
  action: 'uploaded' | 'deleted';
  groupId: string;
  file?: any;
  fileId?: string;
}

export const useOnFileSync = (callback: (data: FileSyncPayload) => void) => {
  useEffect(() => {
    const s = getSocket();
    s.on('fileSync', callback);
    return () => {
      s.off('fileSync', callback);
    };
  }, [callback]);
};
