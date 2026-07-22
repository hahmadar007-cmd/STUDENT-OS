'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { WorkspaceProvider } from '../../../lib/workspace/WorkspaceContext';
// We need to import the SanctuaryContent. 
// Since it's inside app/sanctuary/page.tsx, let's export it from there so we can reuse it!
import { SanctuaryContent } from '../../sanctuary/page';

export default function GroupWorkspacePage() {
  const params = useParams();
  const groupId = (params.id as string) || 'group-1';

  return (
    <WorkspaceProvider initialRoomId={groupId}>
      <SanctuaryContent />
    </WorkspaceProvider>
  );
}
