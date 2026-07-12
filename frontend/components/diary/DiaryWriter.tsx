import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Calendar, FileText, ChevronLeft, Loader2, Save, Book, Maximize2, Minimize2, Settings, KeyRound, X } from 'lucide-react';
import { getDiaryEntries, createDiaryEntry, deleteDiaryEntry, changeDiaryPin } from '../../lib/api';
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
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

export const DiaryWriter: React.FC<DiaryWriterProps> = ({ diaryToken, onLock, isMaximized, onToggleMaximize }) => {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEntry, setActiveEntry] = useState<DiaryEntry | null>(null);
  
  // New entry state
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Settings / Formatting state
  const [fontFamily, setFontFamily] = useState('font-serif');
  const [bgColor, setBgColor] = useState('#fdfbf7');
  const [fontSize, setFontSize] = useState('text-lg');
  const [lineHeight, setLineHeight] = useState('leading-relaxed');
  const [showSettings, setShowSettings] = useState(false);

  // Passcode changing state
  const [showChangePin, setShowChangePin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [changingPin, setChangingPin] = useState(false);

  useEffect(() => {
    fetchEntries();

    // Load preferences
    const savedFont = localStorage.getItem('diary-font-family');
    const savedBg = localStorage.getItem('diary-bg-color');
    const savedSize = localStorage.getItem('diary-font-size');
    const savedSpacing = localStorage.getItem('diary-line-height');

    if (savedFont) setFontFamily(savedFont);
    if (savedBg) setBgColor(savedBg);
    if (savedSize) setFontSize(savedSize);
    if (savedSpacing) setLineHeight(savedSpacing);
  }, []);

  const updateSetting = (key: string, value: string, setter: (val: string) => void) => {
    setter(value);
    localStorage.setItem(key, value);
  };

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

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      toast('New passcode must be at least 4 digits', 'crimson');
      return;
    }
    if (newPin !== confirmNewPin) {
      toast('New passcodes do not match', 'crimson');
      return;
    }
    setChangingPin(true);
    try {
      await changeDiaryPin(diaryToken, oldPin, newPin);
      toast('Passcode changed successfully', 'cyan');
      setShowChangePin(false);
      setOldPin('');
      setNewPin('');
      setConfirmNewPin('');
    } catch (err: any) {
      toast(err.message || 'Failed to change passcode', 'crimson');
    } finally {
      setChangingPin(false);
    }
  };

  const isDark = bgColor === '#181822' || bgColor === '#0f0f0f';

  return (
    <div className="w-full h-full flex rounded-xl overflow-hidden border shadow-inner transition-all duration-300"
      style={{
        backgroundColor: isDark ? '#0d0d12' : '#fdfbf7',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'
      }}
    >
      {/* Sidebar - History */}
      <div 
        className="w-1/3 max-w-[280px] border-r flex flex-col transition-all duration-300"
        style={{
          backgroundColor: isDark ? '#111118' : '#f5f2eb',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e1d8',
          color: isDark ? '#f2f2fa' : '#2c2b29'
        }}
      >
        <div 
          className="p-4 border-b flex justify-between items-center transition-all duration-300"
          style={{
            backgroundColor: isDark ? '#14141c' : '#eae6dc',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e1d8'
          }}
        >
          <h2 className="font-gothic text-xl tracking-wide lowercase flex items-center gap-2">
            <FileText className="w-5 h-5" /> journal
          </h2>
          <button 
            onClick={onLock}
            className="text-xs font-mono lowercase px-2.5 py-1 rounded transition-colors border"
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            }}
          >
            lock
          </button>
        </div>
        
        <div className="p-4">
          <button
            onClick={handleCreateNew}
            className="w-full py-2 px-4 rounded text-sm flex items-center justify-center gap-2 transition-all shadow-sm font-sans"
            style={{
              backgroundColor: isDark ? '#d4af37' : '#2c2b29',
              color: isDark ? '#000' : '#fdfbf7'
            }}
          >
            <Plus className="w-4 h-4" /> new entry
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin opacity-40" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-sm opacity-40 p-4 font-mono italic">no entries yet.</p>
          ) : (
            entries.map(entry => (
              <button
                key={entry.id}
                onClick={() => { setActiveEntry(entry); setIsDrafting(false); }}
                className={`w-full text-left p-3 rounded transition-all duration-200 ${
                  activeEntry?.id === entry.id && !isDrafting 
                    ? (isDark ? 'bg-white/5 border border-white/10 shadow-sm' : 'bg-[#e5e1d8] shadow-sm') 
                    : (isDark ? 'hover:bg-white/5/60 text-gray-400 hover:text-white' : 'hover:bg-[#eae6dc]')
                }`}
              >
                <h3 className="font-gothic text-base tracking-wide lowercase truncate mb-1">{entry.title}</h3>
                <p className="text-xs font-mono opacity-50 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(entry.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Editor/Viewer Area */}
      <div 
        className={`flex-1 flex flex-col relative transition-all duration-300 ${fontFamily}`}
        style={{ 
          backgroundColor: bgColor, 
          color: isDark ? '#f2f2fa' : '#2c2b29' 
        }}
      >
        {/* Paper texture overlay */}
        {!isDark && (
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>
        )}

        {/* Global Toolbar */}
        {(isDrafting || activeEntry) && (
          <div className="w-full px-8 py-3 border-b flex justify-between items-center z-20 transition-all duration-300"
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
              backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)',
            }}
          >
            {/* Left side: Date */}
            <p className="font-mono text-[10px] opacity-50 tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              {isDrafting 
                ? new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                : new Date(activeEntry!.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              }
            </p>

            {/* Right side: Preferences & Actions */}
            <div className="flex items-center gap-3">
              {/* Settings button */}
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 rounded hover:bg-current/10 transition-colors"
                title="Formatting Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Change Passcode button */}
              <button 
                onClick={() => setShowChangePin(!showChangePin)}
                className="p-1.5 rounded hover:bg-current/10 transition-colors"
                title="Change Passcode"
              >
                <KeyRound className="w-4 h-4" />
              </button>

              {/* Maximize toggle */}
              <button 
                onClick={onToggleMaximize}
                className="p-1.5 rounded hover:bg-current/10 transition-colors"
                title={isMaximized ? "Minimize View" : "Maximize View"}
              >
                {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Primary action */}
              {isDrafting ? (
                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono lowercase rounded transition-all disabled:opacity-50 shadow-sm"
                  style={{
                    backgroundColor: isDark ? '#d4af37' : '#2c2b29',
                    color: isDark ? '#000' : '#fdfbf7'
                  }}
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  save entry
                </button>
              ) : (
                <button
                  onClick={() => handleDelete(activeEntry!.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-red-500/70 hover:text-red-500 transition-colors"
                  title="Delete Entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Editor and Viewer Content */}
        {isDrafting ? (
          <div className="flex-1 flex flex-col p-8 z-10 max-w-3xl mx-auto w-full">
            <input
              type="text"
              placeholder="entry title..."
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full text-4xl font-gothic tracking-wide lowercase bg-transparent border-none outline-none mb-6 placeholder:opacity-30"
              autoFocus
            />
            
            <textarea
              placeholder="write your thoughts..."
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className={`w-full flex-1 bg-transparent border-none outline-none resize-none leading-relaxed placeholder:opacity-30 ${fontSize} ${lineHeight}`}
            />
          </div>
        ) : activeEntry ? (
          <div className="flex-1 overflow-y-auto p-8 z-10 max-w-3xl mx-auto w-full">
            <div className="mb-8">
              <h1 className="text-4xl font-gothic tracking-wide lowercase mb-1">{activeEntry.title}</h1>
            </div>
            <div className={`leading-relaxed whitespace-pre-wrap ${fontSize} ${lineHeight}`}>
              {activeEntry.content}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 z-10 font-sans">
            <Book className="w-16 h-16 mb-4" strokeWidth={1} />
            <p className="font-mono text-sm">Select an entry or start a new one.</p>
          </div>
        )}

        {/* Preferences Popup Overlay */}
        {showSettings && (
          <div className="absolute right-20 top-14 z-40 w-64 p-4 rounded-lg shadow-2xl border backdrop-blur-md flex flex-col gap-4 animate-none"
            style={{
              backgroundColor: isDark ? 'rgba(20, 20, 28, 0.95)' : 'rgba(253, 251, 247, 0.95)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
              color: isDark ? '#f2f2fa' : '#2c2b29'
            }}
          >
            <div className="flex justify-between items-center border-b pb-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
              <span className="font-gothic text-sm lowercase tracking-wider">formatting</span>
              <button onClick={() => setShowSettings(false)} className="hover:opacity-70"><X className="w-4 h-4" /></button>
            </div>
            
            {/* Font Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase font-mono tracking-wider opacity-60">Font Style</label>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-sans">
                {[
                  { id: 'font-serif', label: 'Classic' },
                  { id: 'font-gothic', label: 'Gothic' },
                  { id: 'font-sans', label: 'Modern' },
                  { id: 'font-mono', label: 'Console' }
                ].map(f => (
                  <button 
                    key={f.id}
                    onClick={() => updateSetting('diary-font-family', f.id, setFontFamily)}
                    className={`p-1.5 rounded border text-center transition-all ${fontFamily === f.id ? 'bg-[#7c5cfc] text-white border-[#7c5cfc]' : 'border-current/15 hover:bg-current/5'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase font-mono tracking-wider opacity-60">Background Theme</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: '#fdfbf7', name: 'Cream' },
                  { id: '#f4ecd8', name: 'Sepia' },
                  { id: '#181822', name: 'Slate' },
                  { id: '#0f0f0f', name: 'Goth' }
                ].map(theme => (
                  <button
                    key={theme.id}
                    onClick={() => updateSetting('diary-bg-color', theme.id, setBgColor)}
                    className="w-full h-8 rounded border relative flex items-center justify-center text-[10px] font-sans transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: theme.id, 
                      color: theme.id === '#181822' || theme.id === '#0f0f0f' ? '#fff' : '#000',
                      borderColor: bgColor === theme.id ? '#7c5cfc' : 'rgba(0,0,0,0.1)'
                    }}
                  >
                    {bgColor === theme.id && <span className="absolute w-1.5 h-1.5 rounded-full bg-[#7c5cfc]"></span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Size Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase font-mono tracking-wider opacity-60">Text Size</label>
              <div className="grid grid-cols-3 gap-1 text-[11px] font-sans">
                {[
                  { id: 'text-base', label: 'Small' },
                  { id: 'text-lg', label: 'Medium' },
                  { id: 'text-xl', label: 'Large' }
                ].map(sz => (
                  <button 
                    key={sz.id}
                    onClick={() => updateSetting('diary-font-size', sz.id, setFontSize)}
                    className={`p-1.5 rounded border text-center transition-all ${fontSize === sz.id ? 'bg-[#7c5cfc] text-white border-[#7c5cfc]' : 'border-current/15 hover:bg-current/5'}`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] uppercase font-mono tracking-wider opacity-60">Line Spacing</label>
              <div className="grid grid-cols-3 gap-1 text-[11px] font-sans">
                {[
                  { id: 'leading-normal', label: 'Compact' },
                  { id: 'leading-relaxed', label: 'Cozy' },
                  { id: 'leading-loose', label: 'Spacious' }
                ].map(sp => (
                  <button 
                    key={sp.id}
                    onClick={() => updateSetting('diary-line-height', sp.id, setLineHeight)}
                    className={`p-1.5 rounded border text-center transition-all ${lineHeight === sp.id ? 'bg-[#7c5cfc] text-white border-[#7c5cfc]' : 'border-current/15 hover:bg-current/5'}`}
                  >
                    {sp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Change Passcode Modal Overlay */}
        {showChangePin && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-none">
            <div className="w-full max-w-sm rounded-xl p-8 border flex flex-col gap-6 shadow-2xl relative animate-none"
              style={{
                backgroundColor: isDark ? '#111118' : '#fdfbf7',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
                color: isDark ? '#f2f2fa' : '#2c2b29'
              }}
            >
              <button onClick={() => setShowChangePin(false)} className="absolute right-4 top-4 hover:opacity-70"><X className="w-5 h-5" /></button>
              
              <div className="text-center">
                <KeyRound className="w-10 h-10 mx-auto mb-3 text-[#d4af37]" />
                <h3 className="font-gothic text-xl lowercase tracking-wide">change passcode</h3>
                <p className="text-[10px] font-mono opacity-50 uppercase tracking-wider mt-1">Update your journal access key</p>
              </div>

              <form onSubmit={handleChangePin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase opacity-60">Current Passcode</label>
                  <input 
                    type="password" 
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full bg-black/10 border-b border-[#d4af37]/30 text-center text-xl font-mono focus:outline-none focus:border-[#d4af37] py-1 transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase opacity-60">New Passcode (4 Digits)</label>
                  <input 
                    type="password" 
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full bg-black/10 border-b border-[#d4af37]/30 text-center text-xl font-mono focus:outline-none focus:border-[#d4af37] py-1 transition-all"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-mono uppercase opacity-60">Confirm New Passcode</label>
                  <input 
                    type="password" 
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    className="w-full bg-black/10 border-b border-[#d4af37]/30 text-center text-xl font-mono focus:outline-none focus:border-[#d4af37] py-1 transition-all"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={changingPin || newPin.length < 4}
                  className="w-full py-2 bg-[#d4af37] text-black font-mono text-xs uppercase tracking-wider rounded shadow-md hover:bg-[#f1e5ac] transition-all disabled:opacity-50 mt-2"
                >
                  {changingPin ? 'Updating...' : 'Update Passcode'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
