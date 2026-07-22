import React from 'react';
import { useWorkspace } from '../../lib/workspace/WorkspaceContext';

export const StageHeader: React.FC = () => {
  const { state } = useWorkspace();
  
  return (
    <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-black/20 backdrop-blur-xl z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-[13px] font-extrabold tracking-[0.2em] uppercase text-white/90 drop-shadow-sm">Mission Control</h1>
        <div className="px-2.5 py-1 rounded-md bg-fouzar-accent/15 border border-fouzar-accent/20 text-fouzar-accent text-[9px] font-mono uppercase tracking-wider flex items-center gap-1.5 shadow-[inset_0_0_10px_rgba(var(--fouzar-accent-rgb),0.1)]">
          <span className="w-1.5 h-1.5 rounded-full bg-fouzar-accent animate-pulse"></span>
          {state.shared.mode} Mode
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Timer, Presenter, Leave Button will go here */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-fouzar-text-tertiary uppercase tracking-widest">Status</span>
          <div className="text-[10px] text-fouzar-text-secondary font-mono bg-white/5 px-2 py-1 rounded border border-white/5">
            Ready
          </div>
        </div>
      </div>
    </div>
  );
};
