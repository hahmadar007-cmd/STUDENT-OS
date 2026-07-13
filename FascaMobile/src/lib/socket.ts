/**
 * Fasca Mobile – Focus WebSocket Client
 *
 * Connects to the /focus namespace on the Fasca backend and listens for
 * real-time events:  focusStarted | breakStarted | focusResumed | focusEnded
 */

import { io, Socket } from 'socket.io-client';
import { getToken } from './storage';

const BACKEND = 'https://ammeeee-student-os.hf.space';

interface FocusSocketCallbacks {
  onFocusStarted?: (data: any) => void;
  onBreakStarted?: (data: any) => void;
  onFocusResumed?: (data?: any) => void;
  onFocusEnded?: () => void;
}

let socket: Socket | null = null;

export function connectFocusSocket(callbacks: FocusSocketCallbacks): () => void {
  (async () => {
    const token = await getToken();
    if (!token) return;

    socket = io(`${BACKEND}/focus`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => console.log('[Fasca] Connected to focus gateway'));

    socket.on('focusStarted', (data) => callbacks.onFocusStarted?.(data));
    socket.on('breakStarted', (data) => callbacks.onBreakStarted?.(data));
    socket.on('focusResumed', (data) => callbacks.onFocusResumed?.(data));
    socket.on('focusEnded',   ()     => callbacks.onFocusEnded?.());

    socket.on('disconnect', () => console.log('[Fasca] Disconnected from focus gateway'));
  })();

  return () => {
    socket?.disconnect();
    socket = null;
  };
}
