'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AI_PROVIDERS_STORAGE_KEY,
  loadProvidersFromStorage,
  mergeProvidersFromBackend,
  saveProvidersToStorage,
  type AiProviderConfig,
} from '../lib/aiConfig';
import { getAiProviders } from '../lib/api';

export function useAiProviders() {
  const [providers, setProviders] = useState<AiProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const local = loadProvidersFromStorage();
    try {
      const backend = await getAiProviders();
      if (Array.isArray(backend) && backend.length > 0) {
        const merged = mergeProvidersFromBackend(local, backend);
        setProviders(merged);
        saveProvidersToStorage(merged);
      } else {
        setProviders(local);
      }
    } catch {
      setProviders(local);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = () => setProviders(loadProvidersFromStorage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onStorage);
    };
  }, [refresh]);

  const save = useCallback((data: AiProviderConfig[]) => {
    setProviders(data);
    saveProvidersToStorage(data);
  }, []);

  const activeProvider = providers.find((p) => p.isActive) ?? null;

  return { providers, setProviders: save, activeProvider, isLoading, refresh };
}

export { AI_PROVIDERS_STORAGE_KEY };
