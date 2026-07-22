import React from 'react';
import { useWorkspace } from '../../lib/workspace/WorkspaceContext';
import { Folder, PenTool, Globe, Bot, MonitorPlay, Presentation, Settings } from 'lucide-react';
import { WorkspaceToolType } from '../../lib/workspace/types';

export const NavRail: React.FC = () => {
  const { state, openTool, toggleWidget } = useWorkspace();

  const tools: { id: WorkspaceToolType; icon: React.FC<any>; label: string }[] = [
    { id: 'resources', icon: Folder, label: 'Resources' },
    { id: 'notes', icon: PenTool, label: 'Notes' },
    { id: 'browser', icon: Globe, label: 'Browser' },
    { id: 'ai', icon: Bot, label: 'AI' },
  ];

  return (
    <div className="w-16 border-r border-white/5 bg-black/40 backdrop-blur-xl flex flex-col items-center py-6 gap-6 shrink-0 z-10 shadow-2xl">
      {/* Top: Tools (opens Bottom Dock) */}
      <div className="flex flex-col gap-3">
        {tools.map((t) => {
          const isActive = state.personal.activeTool === t.id;
          return (
            <div key={t.id} className="relative group flex items-center justify-center">
              <button
                onClick={() => openTool(t.id)}
                className={`p-3 rounded-xl transition-all duration-300 ${
                  isActive 
                    ? 'bg-fouzar-accent text-white shadow-[0_0_15px_var(--tw-shadow-color)] shadow-fouzar-accent/40 scale-110' 
                    : 'text-fouzar-text-tertiary hover:text-white hover:bg-white/10'
                }`}
              >
                <t.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </button>
              
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-fouzar-surface border border-fouzar-border rounded-md text-xs font-medium text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl">
                {t.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Bottom: Settings / Context triggers */}
      <div className="flex flex-col gap-4">
        <button className="p-2 text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
