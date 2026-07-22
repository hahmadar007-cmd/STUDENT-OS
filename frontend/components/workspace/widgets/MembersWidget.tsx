import React, { useState, useEffect } from 'react';
import { WidgetComponentProps } from '../../../lib/workspace/registry';
import { useWorkspace } from '../../../lib/workspace/WorkspaceContext';
import { useAuth } from '../../../hooks/useAuth';

interface ConnectedMember {
  id: string;
  name: string;
  initials: string;
  isFocusing: boolean;
}

export const MembersWidget: React.FC<WidgetComponentProps> = ({ isActive }) => {
  const { socket } = useWorkspace();
  const { user } = useAuth();
  const [members, setMembers] = useState<ConnectedMember[]>([]);

  useEffect(() => {
    // We add ourselves locally since backend doesn't necessarily send full roster on join
    if (user) {
      setMembers([
        {
          id: user.id,
          name: user.name || 'You',
          initials: (user.name || 'Y').substring(0, 2).toUpperCase(),
          isFocusing: user.isFocusing,
        },
      ]);
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleFocusState = (data: any) => {
      setMembers((prev) => {
        const exists = prev.find((m) => m.id === data.userId);
        if (exists) {
          return prev.map((m) => (m.id === data.userId ? { ...m, isFocusing: data.isFocusing } : m));
        } else {
          return [
            ...prev,
            {
              id: data.userId,
              name: data.name,
              initials: data.name.substring(0, 2).toUpperCase(),
              isFocusing: data.isFocusing,
            },
          ];
        }
      });
    };

    socket.on('friendFocusStateChanged', handleFocusState);
    return () => {
      socket.off('friendFocusStateChanged', handleFocusState);
    };
  }, [socket]);

  return (
    <div className={`p-4 bg-fouzar-bg border border-fouzar-border rounded-xl ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      <h3 className="text-[10px] font-mono text-fouzar-accent uppercase tracking-widest mb-2 border-b border-fouzar-border pb-2">Members</h3>
      <div className="space-y-3 mt-4">
        {members.length === 0 ? (
          <div className="text-[9px] text-fouzar-text-tertiary">Connecting...</div>
        ) : (
          members.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-mono shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] ${member.isFocusing ? 'bg-fouzar-accent/20 text-fouzar-accent ring-1 ring-fouzar-accent/50' : 'bg-black/40 text-white/70'}`}>
                {member.initials}
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-fouzar-text-primary">{member.name}</span>
                <span className="text-[9px] font-mono text-fouzar-text-tertiary uppercase tracking-widest">
                  {member.isFocusing ? 'In Flow State' : 'Online'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
