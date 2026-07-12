'use client';

import React from 'react';
import { Palette, Check } from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';

export default function ThemeSwitcher() {
  const { accentColor, setAccentColor } = useFouzar();
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const colors = [
    { id: 'violet', label: 'Violet', bg: 'bg-[#7c5cfc]' },
    { id: 'emerald', label: 'Emerald', bg: 'bg-[#3dd68c]' },
    { id: 'ice', label: 'Ice', bg: 'bg-[#5ce1ff]' },
    { id: 'amber', label: 'Amber', bg: 'bg-[#f5a623]' },
    { id: 'signal', label: 'Signal', bg: 'bg-[#ff2d55]' },
  ] as const;

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-white/5 border border-transparent hover:border-fouzar-border transition-all"
        title="Change Theme Color"
      >
        <Palette className="w-3.5 h-3.5 text-fouzar-accent" />
        <span className="hidden sm:inline font-mono text-[9px] uppercase tracking-wider text-fouzar-text-secondary">Theme</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-fouzar-surface border border-fouzar-border rounded-xl shadow-[var(--fouzar-shadow-lg)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2.5 bg-black/20 border-b border-fouzar-border/50">
            <span className="text-[10px] font-mono text-fouzar-text-tertiary uppercase tracking-widest font-bold">Select Accent</span>
          </div>
          <div className="p-1.5 flex flex-col gap-1">
            {colors.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setAccentColor(c.id as any);
                  setIsOpen(false);
                }}
                className={`flex items-center gap-3 w-full px-2.5 py-2 rounded-lg transition-all ${
                  accentColor === c.id 
                    ? 'bg-fouzar-accent/10 border border-fouzar-accent/20' 
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${c.bg} shadow-sm`} />
                <span className={`text-xs font-sans ${accentColor === c.id ? 'text-fouzar-accent font-semibold' : 'text-fouzar-text-secondary'}`}>
                  {c.label}
                </span>
                {accentColor === c.id && <Check className="w-3 h-3 ml-auto text-fouzar-accent" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
