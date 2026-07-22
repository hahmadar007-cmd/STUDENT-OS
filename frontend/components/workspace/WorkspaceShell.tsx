import React from 'react';
import { useWorkspace } from '../../lib/workspace/WorkspaceContext';
import { StageHeader } from './StageHeader';
import { NavRail } from './NavRail';
import { StageCanvas } from './StageCanvas';
import { LiveContext } from './LiveContext';
import { WorkspacePanel } from './WorkspacePanel';

export const WorkspaceShell: React.FC = () => {
  const { state } = useWorkspace();

  return (
    <div className="h-screen w-screen bg-fouzar-bg text-fouzar-text-primary flex overflow-hidden font-sans">
      {/* LEFT: Navigation Rail */}
      <NavRail />

      {/* CENTER: Shared Stage + Personal Panel */}
      <div className="flex-1 flex flex-col relative min-w-0">
        <StageHeader />
        
        <div className="flex-1 relative flex flex-col min-h-0">
          <StageCanvas />
          
          {/* BOTTOM: Personal Dock Panel */}
          {state.layout.isDockExpanded && (
            <WorkspacePanel />
          )}
        </div>
      </div>

      {/* RIGHT: Live Context Panel */}
      {state.layout.isContextPanelExpanded && (
        <LiveContext />
      )}
    </div>
  );
};
