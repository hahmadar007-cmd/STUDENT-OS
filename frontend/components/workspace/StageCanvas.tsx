import React from 'react';
import { useWorkspace } from '../../lib/workspace/WorkspaceContext';
import { WorkspaceStageType } from '../../lib/workspace/types';
import { workspaceRegistry } from '../../lib/workspace/registry';

export const StageCanvas: React.FC = () => {
  const { state } = useWorkspace();

  return (
    <div className="flex-1 overflow-auto bg-fouzar-bg relative flex flex-col items-center justify-center p-8">
      {state.shared.activeStage.type === 'empty' ? (
        <div className="max-w-3xl w-full flex flex-col items-center justify-center animate-fade-in py-12">
          {/* Hero Icon */}
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-fouzar-accent/20 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="relative w-20 h-20 bg-fouzar-surface border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl backdrop-blur-md">
              <span className="text-3xl filter drop-shadow-md">🚀</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Today's Mission</h2>
          <p className="text-fouzar-text-secondary mb-12 max-w-md text-center">
            Select a document from your resources to present, or start a new whiteboard session.
          </p>
          
          {/* Dashboard Cards */}
          <div className="grid grid-cols-2 gap-6 w-full text-left">
            <div className="p-6 bg-gradient-to-b from-fouzar-surface/80 to-fouzar-surface/30 border border-white/5 rounded-2xl shadow-xl hover:border-white/10 transition-colors group">
              <h3 className="text-[10px] font-mono text-fouzar-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-fouzar-accent"></span>
                Recent Documents
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center"><span className="text-xs font-bold">PDF</span></div>
                  <div>
                    <div className="text-sm font-medium text-white">Lab Manual 3.pdf</div>
                    <div className="text-xs text-fouzar-text-tertiary">Shared 2 hours ago</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center"><span className="text-xs font-bold">PPT</span></div>
                  <div>
                    <div className="text-sm font-medium text-white">Routing Lecture.pptx</div>
                    <div className="text-xs text-fouzar-text-tertiary">Shared yesterday</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-to-b from-fouzar-surface/80 to-fouzar-surface/30 border border-white/5 rounded-2xl shadow-xl hover:border-white/10 transition-colors">
              <h3 className="text-[10px] font-mono text-fouzar-signal uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-fouzar-signal animate-pulse"></span>
                Upcoming Deadlines
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 -mx-2 rounded-lg bg-fouzar-signal/5 border border-fouzar-signal/20">
                  <div>
                    <div className="text-sm font-medium text-fouzar-signal-text">Lab 3 Submission</div>
                    <div className="text-xs text-fouzar-signal-text/70 mt-0.5">Theory of Automata</div>
                  </div>
                  <div className="text-xs font-mono bg-fouzar-signal/20 text-fouzar-signal px-2 py-1 rounded">Tomorrow</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        (() => {
          const { type, assetId, meta } = state.shared.activeStage;
          const StageComponent = workspaceRegistry.stages[type as WorkspaceStageType];
          if (StageComponent) {
            return <StageComponent assetId={assetId} meta={meta} />;
          }
          return (
            <div className="w-full h-full border border-dashed border-fouzar-border flex items-center justify-center text-fouzar-text-secondary">
              Stage Active: {type} (Not registered)
            </div>
          );
        })()
      )}
    </div>
  );
};
