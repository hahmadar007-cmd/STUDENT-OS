'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Flame, Users, Cpu, Plug, Shield, Compass, CornerDownLeft } from 'lucide-react';
import { FascaCard } from './FascaCard';

interface CommandItem {
  id: string;
  title: string;
  shortcut: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commands: CommandItem[] = [
    {
      id: 'focus',
      title: 'START FOCUS SESSION',
      shortcut: 'F',
      icon: <Flame className="w-4 h-4 text-[#ff2d55]" />,
      action: () => {
        setIsOpen(false);
        router.push('/focus');
      },
    },
    {
      id: 'room',
      title: 'JOIN STUDY CIRCLE',
      shortcut: 'C',
      icon: <Users className="w-4 h-4 text-[#00d4ff]" />,
      action: () => {
        setIsOpen(false);
        router.push('/room/group-1');
      },
    },
    {
      id: 'ai',
      title: 'SWITCH AI MODEL',
      shortcut: 'A',
      icon: <Cpu className="w-4 h-4 text-[#7c5cfc]" />,
      action: () => {
        setIsOpen(false);
        router.push('/dashboard');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'ai' }));
        }, 150);
      },
    },
    {
      id: 'lms',
      title: 'CONNECT LMS GATEWAY',
      shortcut: 'L',
      icon: <Plug className="w-4 h-4 text-[#7c5cfc]" />,
      action: () => {
        setIsOpen(false);
        router.push('/dashboard');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('toggle-lms'));
        }, 150);
      },
    },
    {
      id: 'shield',
      title: 'OPEN FOCUS SHIELD',
      shortcut: 'S',
      icon: <Shield className="w-4 h-4 text-[#ff2d55]" />,
      action: () => {
        setIsOpen(false);
        router.push('/dashboard');
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('toggle-shield'));
        }, 150);
      },
    },
    {
      id: 'dashboard',
      title: 'NAVIGATE TO DASHBOARD',
      shortcut: 'D',
      icon: <Compass className="w-4 h-4 text-fouzar-text-secondary" />,
      action: () => {
        setIsOpen(false);
        router.push('/dashboard');
      },
    },
  ];

  // 1. Filter commands
  const filteredCommands = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(search.toLowerCase())
  );

  // Reset selected index on filter
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // 2. Global Hotkey listener (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setSearch('');
      }

      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex]);

  // 3. Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-fouzar-bg/90 backdrop-blur-md z-50 flex items-start justify-center pt-24 px-4"
          >
            <motion.div
              initial={{ y: -20, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: -20, scale: 0.97 }}
              className="w-full max-w-lg"
            >
              <FascaCard className="rounded-none border-[#7c5cfc] shadow-[0_0_30px_rgba(124,92,252,0.2)] overflow-hidden flex flex-col">
                
                {/* Search Header input */}
                <div className="p-4 border-b border-fouzar-border-strong flex items-center gap-3">
                  <Search className="w-4 h-4 text-fouzar-text-secondary" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search Fasca commands..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent border-none text-xs text-fouzar-text-primary focus:outline-none placeholder:text-fouzar-text-secondary/40 font-sans"
                  />
                  <span className="px-1.5 py-0.5 bg-fouzar-card border border-fouzar-border-strong text-[8px] font-mono text-fouzar-text-secondary uppercase rounded">
                    ESC
                  </span>
                </div>

                {/* Commands List */}
                <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 scrollbar-thin">
                  {filteredCommands.map((cmd, idx) => {
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full p-3 flex items-center justify-between text-left transition-colors rounded-[4px] cursor-pointer ${
                          isSelected 
                            ? 'bg-[#7c5cfc]/10 border border-[#7c5cfc]/20 text-[#7c5cfc]' 
                            : 'border border-transparent text-[#dbdee1] hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {cmd.icon}
                          <span className="font-mono text-[9px] uppercase tracking-wider font-bold">
                            {cmd.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[8px]">
                          {isSelected && (
                            <span className="text-fouzar-text-secondary flex items-center gap-0.5">
                              SELECT <CornerDownLeft className="w-2.5 h-2.5" />
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 bg-fouzar-bg border border-fouzar-border-strong text-fouzar-text-secondary rounded">
                            {cmd.shortcut}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                  {filteredCommands.length === 0 && (
                    <div className="py-8 text-center text-fouzar-text-secondary font-mono text-[9px] uppercase tracking-wider">
                      No commands found matching "{search}"
                    </div>
                  )}
                </div>

                {/* Footer instructions */}
                <div className="p-3 bg-fouzar-bg border-t border-fouzar-border-strong flex justify-between items-center text-[7.5px] font-mono text-fouzar-text-secondary uppercase tracking-wider">
                  <span>Use ↑↓ arrows to navigate, ↵ to execute</span>
                  <span>Ctrl+K to dismiss</span>
                </div>

              </FascaCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
