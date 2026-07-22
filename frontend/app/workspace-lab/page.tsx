'use client';

import React from 'react';
import { WorkspaceProvider } from '../../lib/workspace/WorkspaceContext';
import { WorkspaceShell } from '../../components/workspace/WorkspaceShell';
import { FouzarProvider } from '../../lib/FouzarContext';

export default function WorkspaceLabPage() {
  return (
    <FouzarProvider>
      <WorkspaceProvider initialRoomId="lab-sandbox">
        <WorkspaceShell />
      </WorkspaceProvider>
    </FouzarProvider>
  );
}
