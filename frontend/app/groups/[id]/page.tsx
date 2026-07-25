'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function GroupWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = (params.id as string) || 'group-1';

  useEffect(() => {
    if (groupId) {
      router.replace(`/room/${groupId}`);
    }
  }, [groupId, router]);

  return (
    <div className="h-screen w-screen bg-[#060609] flex items-center justify-center font-mono text-xs text-[#7c5cfc]">
      Connecting to Group Workspace...
    </div>
  );
}
