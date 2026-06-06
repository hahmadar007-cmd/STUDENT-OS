'use client';

import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
