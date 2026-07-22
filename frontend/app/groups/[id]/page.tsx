'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

/**
 * Unified Group Router
 * Automatically redirects legacy /groups/[id] URLs to the main /room/[id]
 * Mission Control GroupWorkspace.
 */
export default function LegacyGroupRedirect() {
  const router = useRouter();
  const params = useParams();
  const groupId = (params.id as string) || 'group-1';

  useEffect(() => {
    if (groupId) {
      router.replace(`/room/${groupId}`);
    }
  }, [groupId, router]);

  return (
    <div className="h-screen w-screen bg-fouzar-bg flex items-center justify-center font-mono text-[9px] text-fouzar-accent uppercase tracking-widest animate-pulse">
      Connecting to Group Workspace...
    </div>
  );
}
