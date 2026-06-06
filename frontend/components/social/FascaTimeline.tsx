'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Calendar, MapPin, Tag } from 'lucide-react';
import { FascaCard } from '../ui/FascaCard';

interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  course: string;
  type: 'DEADLINE' | 'LECTURE' | 'EXAM' | 'MILESTONE';
  description: string;
  link: string;
  relativePosition: number; // 0 to 100 for visual ordering
}

export const FascaTimeline: React.FC = () => {
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  const events: TimelineEvent[] = [
    {
      id: 'ev-1',
      date: 'JUN 04, 2026',
      title: 'ML Project Draft',
      course: 'CS-229',
      type: 'MILESTONE',
      description: 'Submit preliminary architecture ideas and git repository link for review.',
      link: '#',
      relativePosition: 15,
    },
    {
      id: 'ev-2',
      date: 'JUN 05, 2026',
      title: 'Neural Nets Deep Dive',
      course: 'CS-229',
      type: 'LECTURE',
      description: 'Guest lecture on advanced transformers and auto-regressive decoding strategies.',
      link: '#',
      relativePosition: 35,
    },
    {
      id: 'ev-3',
      date: 'JUN 07, 2026',
      title: 'Probability Midterm',
      course: 'CS-109',
      type: 'EXAM',
      description: 'Covers discrete random variables, combinations, expectation, and Bayes theorem.',
      link: '#',
      relativePosition: 65,
    },
    {
      id: 'ev-4',
      date: 'JUN 08, 2026',
      title: 'Lab 3: Backpropagation',
      course: 'CS-229',
      type: 'DEADLINE',
      description: 'Implement backprop in pure NumPy. Test on XOR and MNIST digits.',
      link: '#',
      relativePosition: 85,
    },
  ];

  // Helper for type badge colors
  const getBadgeStyle = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'DEADLINE':
        return 'bg-[#ff2d55]/10 border border-[#ff2d55]/30 text-[#ff2d55]';
      case 'LECTURE':
        return 'bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 text-[#7c5cfc]';
      case 'EXAM':
        return 'bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff]';
      case 'MILESTONE':
        return 'bg-white/5 border border-white/20 text-[#f0f0ff]';
      default:
        return 'bg-white/5 text-[#f0f0ff]';
    }
  };

  return (
    <div className="w-full bg-[#111118]/40 border border-[#2a2a3a] rounded-[6px] p-6 relative overflow-hidden min-h-[300px] flex flex-col justify-center">
      
      {/* Scrollable Timeline Area */}
      <div className="w-full overflow-x-auto py-8 relative scrollbar-thin flex items-center justify-start min-w-[500px]">
        
        {/* Connecting Horizontal Line */}
        <div className="absolute left-0 right-0 top-[50%] h-[1.5px] bg-[#2a2a3a]/60 z-0" />
        
        {/* TODAY Vertical Line Marker (June 6, 2026) */}
        {/* Set exactly at 50% since June 6 sits between June 5 and June 7 */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-[#7c5cfc] z-10 shadow-[0_0_10px_#7c5cfc]"
          style={{ left: '50%' }}
        >
          <div className="absolute top-[-10px] left-[-24px] bg-[#7c5cfc] text-[#0a0a0f] font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-sm tracking-wider uppercase">
            TODAY
          </div>
        </div>

        {/* Timeline Events List */}
        <div className="relative w-full flex items-center justify-between px-10 gap-8 z-10">
          {events.map((event) => {
            const isHovered = hoveredEventId === event.id;
            return (
              <motion.div
                key={event.id}
                onMouseEnter={() => setHoveredEventId(event.id)}
                onMouseLeave={() => setHoveredEventId(null)}
                className="relative shrink-0 w-[180px] z-20 cursor-pointer"
                animate={{ y: isHovered ? -5 : 0 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {/* Node connector dot on the line */}
                <div 
                  className={`absolute left-[50%] translate-x-[-50%] top-[98px] w-3 h-3 rounded-full border-2 bg-[#111118] transition-colors duration-150 z-30 ${
                    isHovered ? 'border-[#7c5cfc] bg-[#7c5cfc]' : 'border-[#2a2a3a]'
                  }`} 
                />

                <FascaCard 
                  className={`p-4 flex flex-col justify-between rounded-[6px] bg-[#16161f]/95 hover:border-[#7c5cfc]/60 shadow-xl transition-all duration-200 ${
                    isHovered ? 'shadow-[0_0_16px_rgba(124,92,252,0.1)] border-[#7c5cfc]/50' : 'border-[#2a2a3a]'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Date at Top */}
                    <span className="text-[7.5px] font-mono text-[#6b6b8a] uppercase tracking-wider block">
                      {event.date}
                    </span>

                    {/* Event Title */}
                    <h5 className="text-[11px] font-bold text-[#f0f0ff] tracking-wide line-clamp-1">
                      {event.title}
                    </h5>

                    {/* Course Code in Violet Mono */}
                    <span className="text-[8px] font-mono text-[#7c5cfc] uppercase tracking-widest block">
                      {event.course}
                    </span>

                    {/* Type Badge */}
                    <span className={`px-2 py-0.5 rounded-[4px] font-mono text-[7px] font-bold uppercase tracking-wider inline-block ${getBadgeStyle(event.type)}`}>
                      {event.type}
                    </span>

                    {/* Expandable description on hover */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.15 }}
                          className="pt-2 border-t border-[#2a2a3a]/40 text-left"
                        >
                          <p className="text-[8px] text-[#6b6b8a] leading-relaxed font-sans mb-2">
                            {event.description}
                          </p>
                          <a
                            href={event.link}
                            className="text-[8px] font-mono text-[#7c5cfc] hover:underline flex items-center gap-1.5"
                          >
                            <span>OPEN</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </FascaCard>
              </motion.div>
            );
          })}
        </div>

      </div>

      {/* Muted Navigation Helper Note */}
      <span className="text-[7.5px] font-mono text-[#6b6b8a] uppercase tracking-[0.2em] block text-center mt-2">
        ← Drag timeline to scroll horizontally | Hover events to expand detail cards →
      </span>
    </div>
  );
};
