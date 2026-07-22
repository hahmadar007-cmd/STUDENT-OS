import React, { useState, useEffect } from 'react';
import { ToolComponentProps } from '../../../lib/workspace/registry';
import { useFouzar } from '../../../lib/FouzarContext';

export const NotesTool: React.FC<ToolComponentProps> = ({ isActive }) => {
  const { user: fouzarUser, activeFolderId, folders } = useFouzar();
  const [notes, setNotes] = useState('');
  
  const activeFolder = folders.find(f => f.id === activeFolderId);
  const notesKey = fouzarUser?.id 
    ? `fouzar-sanctuary-notes-${fouzarUser.id}-${activeFolderId}` 
    : `fouzar-sanctuary-notes-guest-${activeFolderId}`;

  // Load notes on mount or when key changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(notesKey);
    if (saved !== null) {
      setNotes(saved);
    } else {
      setNotes(''); // Clear if no saved notes for this context
    }
  }, [notesKey]);

  // Auto-save notes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => { 
      localStorage.setItem(notesKey, notes); 
    }, 500);
    return () => clearTimeout(timer);
  }, [notes, notesKey]);

  return (
    <div className={`w-full h-full p-5 flex flex-col ${isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'} transition-opacity duration-300`}>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder={`✏️  Start typing your ${activeFolder?.name || 'general'} notes here...\n\nThis is your private workspace — not shared with anyone.`}
        className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-sm text-white/80 leading-relaxed resize-none focus:outline-none focus:border-[#7c5cfc]/40 font-mono placeholder:text-white/20 transition-colors"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] font-mono text-white/20 uppercase">🔒 Private · Auto-saved locally</span>
        <span className="text-[9px] font-mono text-white/20">{notes.trim() ? notes.trim().split(/\s+/).length : 0} words</span>
      </div>
    </div>
  );
};
