import React from 'react';
import { useWorkspace } from '../../lib/workspace/WorkspaceContext';
import { workspaceRegistry } from '../../lib/workspace/registry';
import { Users, Mic, MessageSquare, ListTodo, Activity, Clock } from 'lucide-react';
import { WorkspaceWidgetType } from '../../lib/workspace/types';

export const LiveContext: React.FC = () => {
  const { state, toggleWidget } = useWorkspace();
  
  const allWidgets: { id: WorkspaceWidgetType; icon: React.FC<any>; label: string }[] = [
    { id: 'members', icon: Users, label: 'Members' },
    { id: 'voice', icon: Mic, label: 'Voice' },
    { id: 'chat', icon: MessageSquare, label: 'Chat' },
    { id: 'timeline', icon: Clock, label: 'Timeline' },
    { id: 'tasks', icon: ListTodo, label: 'Tasks' },
    { id: 'activity', icon: Activity, label: 'Activity' },
  ];

  return (
    <div className="w-80 border-l border-fouzar-border bg-fouzar-surface flex flex-col shrink-0 z-10 shadow-[-10px_0_30px_rgba(0,0,0,0.2)]">
      {/* Widget Tabs - Sleek segmented control style */}
      <div className="flex flex-wrap border-b border-white/5 shrink-0 p-3 gap-1 bg-black/20">
        {allWidgets.map((w) => {
          const isActive = state.personal.activeWidgets.includes(w.id);
          return (
            <button
              key={w.id}
              onClick={() => toggleWidget(w.id)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-mono tracking-wide transition-all duration-300 flex items-center gap-1.5 ${
                isActive 
                  ? 'bg-fouzar-accent/10 text-fouzar-accent shadow-[inset_0_0_0_1px_var(--tw-shadow-color)] shadow-fouzar-accent/20' 
                  : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-white/5'
              }`}
            >
              <w.icon className={`w-3 h-3 ${isActive ? 'text-fouzar-accent' : 'opacity-70'}`} />
              <span>{w.label}</span>
            </button>
          );
        })}
      </div>
      
      {/* Widget Stack Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.personal.activeWidgets.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-fouzar-text-tertiary">
            <span className="text-[10px] font-mono uppercase tracking-widest text-center px-4">
              Select a widget to monitor context
            </span>
          </div>
        ) : (
          state.personal.activeWidgets.map((wId) => {
            const WidgetComponent = workspaceRegistry.widgets[wId];
            if (WidgetComponent) {
              return <WidgetComponent key={wId} isActive={true} />;
            }
            return (
              <div key={wId} className="bg-fouzar-bg border border-fouzar-border rounded-xl p-4">
                <h3 className="text-[10px] font-mono text-fouzar-accent uppercase tracking-widest mb-2 border-b border-fouzar-border pb-2">{wId} widget</h3>
                <p className="text-xs text-fouzar-text-secondary">Widget not registered.</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
