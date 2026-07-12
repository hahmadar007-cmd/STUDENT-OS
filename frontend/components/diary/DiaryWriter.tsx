import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Calendar, FileText, ChevronLeft, Loader2, Save, Book } from 'lucide-react';
import { getDiaryEntries, createDiaryEntry, deleteDiaryEntry } from '../../lib/api';
import { toast } from '../ui/Toast';

interface DiaryEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface DiaryWriterProps {
  diaryToken: string;
  onLock: () => void;
}

export const DiaryWriter: React.FC<DiaryWriterProps> = ({ diaryToken, onLock }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEntry, setActiveEntry] = useState<DiaryEntry | null>(null);
  
  // New entry state
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const data = await getDiaryEntries(diaryToken);
      setEntries(data);
    } catch (err) {
      toast('Failed to load diary entries', 'crimson');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setActiveEntry(null);
    setDraftTitle('');
    setDraftContent('');
    setIsDrafting(true);
  };

  const handleSaveDraft = async () => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      toast('Title and content cannot be empty', 'crimson');
      return;
    }
    setSaving(true);
    try {
      const newEntry = await createDiaryEntry(diaryToken, draftTitle, draftContent);
      setEntries([newEntry, ...entries]);
      setIsDrafting(false);
      setActiveEntry(newEntry);
      toast('Journal entry saved', 'cyan');
    } catch (err) {
      toast('Failed to save entry', 'crimson');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await deleteDiaryEntry(diaryToken, id);
      setEntries(entries.filter(e => e.id !== id));
      if (activeEntry?.id === id) setActiveEntry(null);
      toast('Entry deleted', 'cyan');
    } catch (err) {
      toast('Failed to delete entry', 'crimson');
    }
  };

  return (
    <div className="w-full h-full flex bg-[#fdfbf7] text-[#2c2b29] rounded-xl overflow-hidden font-serif border border-black/10 shadow-inner">
      {/* Sidebar - History */}
      <div className="w-1/3 max-w-[300px] border-r border-[#e5e1d8] flex flex-col bg-[#f5f2eb]">
        <div className="p-4 border-b border-[#e5e1d8] flex justify-between items-center bg-[#eae6dc]">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" /> Journal
          </h2>
          <button 
            onClick={onLock}
            className="text-xs font-sans px-2 py-1 bg-black/5 rounded hover:bg-black/10 transition-colors"
          >
            Lock
          </button>
        </div>
        
        <div className="p-4">
          <button
            onClick={handleCreateNew}
            className="w-full py-2 px-4 bg-[#2c2b29] text-[#fdfbf7] rounded font-sans text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Entry
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-black/40" /></div>
          ) : entries.length === 0 ? (
            <p className="text-center text-sm text-black/40 p-4 font-sans italic">No entries yet.</p>
          ) : (
            entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => { setActiveEntry(entry); setIsDrafting(false); }}
                className={`w-full text-left p-3 rounded transition-colors ${activeEntry?.id === entry.id && !isDrafting ? 'bg-[#e5e1d8] shadow-sm' : 'hover:bg-[#eae6dc]'}`}
              >
                <h3 className="font-semibold text-sm truncate mb-1">{entry.title}</h3>
                <p className="text-xs font-sans text-black/50 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Editor/Viewer Area */}
      <div className="flex-1 flex flex-col relative bg-[#fdfbf7]">
        {/* Paper texture overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>

        {isDrafting ? (
          <div className="flex-1 flex flex-col p-8 z-10 max-w-3xl mx-auto w-full">
            <div className="mb-6 flex justify-between items-center">
              <p className="font-sans text-sm text-black/40 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-fouzar-accent text-white font-sans text-sm rounded hover:bg-fouzar-accent/90 transition-colors disabled:opacity-50 shadow-md"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Entry
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Entry Title..."
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full text-4xl font-bold bg-transparent border-none outline-none mb-6 placeholder:text-black/20"
              autoFocus
            />
            
            <textarea
              placeholder="Write your thoughts..."
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="w-full flex-1 bg-transparent border-none outline-none resize-none text-lg leading-relaxed placeholder:text-black/20 font-serif"
            />
          </div>
        ) : activeEntry ? (
          <div className="flex-1 overflow-y-auto p-8 z-10 max-w-3xl mx-auto w-full">
            <div className="mb-8 flex justify-between items-start">
              <div>
                <p className="font-sans text-sm text-black/40 flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(activeEntry.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  <span className="mx-2">•</span>
                  {new Date(activeEntry.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </p>
                <h1 className="text-4xl font-bold">{activeEntry.title}</h1>
              </div>
              <button
                onClick={() => handleDelete(activeEntry.id)}
                className="p-2 text-red-500/50 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Delete Entry"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            <div className="text-lg leading-relaxed whitespace-pre-wrap">
              {activeEntry.content}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-black/30 z-10 font-sans">
            <Book className="w-16 h-16 mb-4 opacity-50" strokeWidth={1} />
            <p>Select an entry or start a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};
