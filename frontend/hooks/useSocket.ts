'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '../lib/socket';
import { getAuthToken } from '../lib/api';

/**
 * useSocket Hook
 * Manages socket connection lifecycle, handles connection status,
 * and automatically reconnects if the auth token changes.
 */
export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState('');

  // 1. Watch token changes in cookie/localstorage
  useEffect(() => {
    setToken(getAuthToken());

    const interval = setInterval(() => {
      const currentToken = getAuthToken();
      if (currentToken !== token) {
        setToken(currentToken);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [token]);

  // 2. Manage Socket connection status
  useEffect(() => {
    const s = getSocket();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    s.on('connect', handleConnect);
    s.on('disconnect', handleDisconnect);

    // Initial state check
    setIsConnected(s.connected);

    // Reconnect on token change
    if (token) {
      s.auth = { token };
      s.disconnect();
      s.connect();
    } else {
      s.disconnect();
    }

    return () => {
      s.off('connect', handleConnect);
      s.off('disconnect', handleDisconnect);
    };
  }, [token]);

  return { isConnected };
};
