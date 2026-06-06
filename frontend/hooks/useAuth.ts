'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, clearAuthToken, getAuthToken } from '../lib/api';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  universityId: string | null;
  isFocusing: boolean;
  focusStartedAt: string | null;
  lmsToken: string | null;
  createdAt: string;
  fouzarId: string | null;
  preferredAiModel: string | null;
  avatarUrl: string | null;
}

/**
 * useAuth Hook
 * Resolves current user state, loading indicator, and exports logout handler.
 */
export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const userData = await getMe();
      setUser(userData);
    } catch (err) {
      console.error('Failed to resolve authenticated session:', err);
      setUser(null);
      // Clear corrupt token
      clearAuthToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = () => {
    clearAuthToken();
    setUser(null);
    router.push('/auth');
  };

  return {
    user,
    loading,
    logout,
    mutate: fetchUser,
    isAuthenticated: !!user,
  };
};
