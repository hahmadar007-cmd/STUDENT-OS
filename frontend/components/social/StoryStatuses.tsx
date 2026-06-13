'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Radio, Sparkles, MessageSquare, ArrowRight, X } from 'lucide-react';
import { FascaCard } from '../ui/FascaCard';
import { FascaButton } from '../ui/FascaButton';

interface FriendStory {
  id: string;
  name: string;
  initials: string;
  isOnline: boolean;
  isFocusing: boolean;
  focusStartedAt: string | null;
  statusMessage: string;
  course: string;
}

export const StoryStatuses: React.FC = () => {
  const [activeStory, setActiveStory] = useState<FriendStory | null>(null);
  
  const stories: FriendStory[] = [
    {
      id: 'self',
      name: 'You',
      initials: 'AM',
      isOnline: true,
      isFocusing: false,
      focusStartedAt: null,
      statusMessage: 'Ready to study Machine Learning.',
      course: 'CS-229',
    },
  ];

  const handleCircleClick = (story: FriendStory) => {
    if (story.id === 'self') return; // Do nothing for self click
    setActiveStory(story);
  };

  return (
    <>
      {/* Horizontal scrolling story track */}
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none select-none w-full items-center">
        {stories.map((story) => {
          const isSelf = story.id === 'self';
          return (
            <div
              key={story.id}
              onClick={() => handleCircleClick(story)}
              className={`flex flex-col items-center gap-1.5 shrink-0 transition-transform active:scale-95 cursor-pointer ${
                isSelf ? 'cursor-default' : 'hover:scale-105'
              }`}
            >
              {/* Story Bubble Circle */}
              <div className="relative p-[2px] rounded-full">
                {/* Border ring state (gradient for focusing, cyan for online, dark border for offline) */}
                {story.isFocusing ? (
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet to-crimson rounded-full animate-[spin_4s_linear_infinite]" />
                ) : story.isOnline ? (
                  <div className="absolute inset-0 bg-cyan rounded-full" />
                ) : (
                  <div className="absolute inset-0 bg-border-color rounded-full" />
                )}

                {/* Inner Content avatar */}
                <div className="w-12 h-12 rounded-full bg-[#111118] border-2 border-fasca-bg flex items-center justify-center relative z-10 font-mono text-xs font-bold text-text-primary">
                  {story.initials}
                </div>

                {/* Small Status badge */}
                {story.isFocusing && (
                  <span className="absolute -bottom-1 -right-1 z-25 w-4 h-4 bg-crimson rounded-full flex items-center justify-center border-2 border-fasca-bg shadow-lg">
                    <Flame className="w-2.5 h-2.5 text-fasca-bg fill-fasca-bg" />
                  </span>
                )}
                {story.isOnline && !story.isFocusing && !isSelf && (
                  <span className="absolute -bottom-0.5 -right-0.5 z-25 w-3 h-3 bg-cyan rounded-full border-2 border-fasca-bg" />
                )}
              </div>

              {/* Name label */}
              <span className={`text-[9px] font-mono uppercase tracking-wider ${
                story.isFocusing ? 'text-crimson font-bold' : 'text-text-secondary'
              }`}>
                {isSelf ? 'You' : story.name.split(' ')[0]}
              </span>
            </div>
          );
        })}
        {stories.length === 1 && (
          <div className="text-text-muted text-xs font-mono tracking-wider ml-2">
            NO FRIENDS YET
          </div>
        )}
      </div>

      {/* Story View Overlay Modal */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0a0a0f]/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-[#12121c] border border-border-color rounded-[6px] shadow-2xl p-6 relative overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setActiveStory(null)}
                className="absolute top-4 right-4 p-1 hover:bg-white/5 rounded-[4px] text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                {/* Large Avatar */}
                <div className="relative p-[3px] rounded-full mb-4">
                  {activeStory.isFocusing ? (
                    <div className="absolute inset-0 bg-gradient-to-tr from-violet to-crimson rounded-full animate-[spin_5s_linear_infinite]" />
                  ) : (
                    <div className="absolute inset-0 bg-cyan rounded-full" />
                  )}
                  <div className="w-16 h-16 rounded-full bg-fasca-bg border-4 border-[#12121c] flex items-center justify-center font-mono text-lg font-bold text-text-primary relative z-10">
                    {activeStory.initials}
                  </div>
                </div>

                <h3 className="font-serif text-lg font-bold text-text-primary tracking-wide uppercase">{activeStory.name}</h3>
                <span className="text-[9px] font-mono text-violet uppercase tracking-widest mt-1 bg-violet/10 border border-violet/20 px-2 py-0.5 rounded-[4px]">
                  {activeStory.course} student
                </span>

                <div className="my-6 p-4 bg-[#0a0a0f] border border-border-color/60 rounded-[4px] w-full text-left">
                  <span className="text-[8px] font-mono uppercase text-text-secondary block tracking-widest mb-1.5">Current Status</span>
                  <p className="text-xs text-text-primary italic">"{activeStory.statusMessage}"</p>
                </div>

                {/* Details / Join buttons */}
                <div className="flex gap-3 w-full">
                  <FascaButton variant="ghost" className="flex-1 font-mono text-[9px]">
                    <MessageSquare className="w-3.5 h-3.5" /> Message
                  </FascaButton>
                  
                  {activeStory.isFocusing ? (
                    <FascaButton variant="solid" className="flex-1 font-mono text-[9px] bg-crimson border-crimson shadow-[0_0_10px_rgba(255,45,85,0.3)]">
                      <Flame className="w-3.5 h-3.5 fill-fasca-bg" /> Join Flow
                    </FascaButton>
                  ) : (
                    <FascaButton variant="solid" className="flex-1 font-mono text-[9px]">
                      Join Desk <ArrowRight className="w-3.5 h-3.5" />
                    </FascaButton>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
