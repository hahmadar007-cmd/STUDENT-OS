import React from 'react';
import { useWorkspace } from '../../lib/workspace/WorkspaceContext';
import { workspaceRegistry } from '../../lib/workspace/registry';
import { X, Maximize2, Minimize2 } from 'lucide-react';

export const WorkspacePanel: React.FC = () => {
  const { state, closeTool } = useWorkspace();
  const activeTool = state.personal.activeTool;

  if (!activeTool) return null;

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 bg-fouzar-bg border-t border-fouzar-border shadow-[0_-10px_40px_rgba(0,0,0,0.3)] z-20 flex flex-col"
      style={{ height: state.personal.dockHeight }}
    >
      {/* Panel Header */}
      <div className="h-10 border-b border-fouzar-border flex items-center justify-between px-4 bg-fouzar-surface shrink-0">
        <h3 className="text-[11px] font-bold tracking-widest uppercase text-fouzar-text-primary">
          {activeTool}
        </h3>
        
        <div className="flex items-center gap-2 text-fouzar-text-tertiary">
          <button className="p-1 hover:text-fouzar-text-primary transition-colors">
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 hover:text-fouzar-text-primary transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={closeTool} className="p-1 hover:text-fouzar-text-primary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Panel Content (Tool Registry Rendering) */}
      <div className="flex-1 overflow-auto relative">
        {(() => {
          const ToolComponent = workspaceRegistry.tools[activeTool];
          if (ToolComponent) {
            return <ToolComponent isActive={true} />;
          }
          return (
            <div className="absolute inset-0 bg-fouzar-surface/30 flex items-center justify-center text-fouzar-text-secondary text-sm">
              Rendering Tool: {activeTool} (Not registered)
            </div>
          );
        })()}
      </div>
    </div>
  );
};
