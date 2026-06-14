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
      
      try {
        const { getAiProviders } = await import('../lib/api');
        const providers = await getAiProviders();
        if (Array.isArray(providers)) {
          // Map backend provider schema to frontend storage schema
          const mappedProviders = providers.map((p: any, index: number) => ({
            id: p.id,
            name: p.name,
            apiKeyRaw: p.apiKey, // Note: For real prod this shouldn't be sent back raw unless encrypted, assuming backend sends it
            baseUrl: p.baseUrl || null,
            providerType: p.providerType || 'CUSTOM',
            isActive: p.isActive === true,
            createdAt: p.createdAt || new Date().toISOString(),
            colorIndex: index
          }));
          localStorage.setItem('fasca_ai_providers_v1', JSON.stringify(mappedProviders));
        }
      } catch (aiErr) {
        console.error('Failed to sync AI providers:', aiErr);
      }
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
