'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExternalLink, Calendar, Plus, X, Trash2 } from 'lucide-react';
import { FascaCard } from '../ui/FascaCard';
import { getDeadlines } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

interface TimelineEvent {
  id: string;
  date: string;
  timestamp: number;
  title: string;
  course: string;
  type: 'DEADLINE' | 'LECTURE' | 'EXAM' | 'MILESTONE';
  description: string;
  link: string;
  isCustom?: boolean;
}

export const FascaTimeline: React.FC = () => {
  const { user } = useAuth();
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);

  // Form states for new event
  const [newTitle, setNewTitle] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newType, setNewType] = useState<'DEADLINE' | 'LECTURE' | 'EXAM' | 'MILESTONE'>('MILESTONE');
  const [newDescription, setNewDescription] = useState('');
  const [newDaysOffset, setNewDaysOffset] = useState(1);

  const loadTimelineEvents = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Fetch LMS Deadlines
      let lmsEvents: TimelineEvent[] = [];
      try {
        const lmsData = await getDeadlines();
        lmsEvents = (lmsData.deadlines || []).map((item) => {
          const timestamp = Date.now() + (Number(item.timeLeftHours) || 0) * 60 * 60 * 1000;
          const dateStr = new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric'
          }).toUpperCase();

          return {
            id: item.id,
            date: dateStr,
            timestamp,
            title: item.title,
            course: item.course,
            type: 'DEADLINE',
            description: `LMS Auto-sync: ${item.timeLeftLabel}. Please submit via LMS portal.`,
            link: '#',
          };
        });
      } catch (e) {
        console.warn('LMS deadlines fetch error, falling back:', e);
      }

      // 2. Load custom events from localStorage
      let customEvents: TimelineEvent[] = [];
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(`circle-custom-events-${user?.id}`);
        if (saved) {
          try {
            customEvents = JSON.parse(saved);
          } catch (e) {
            console.error('Failed to parse custom events', e);
          }
        }
      }

      // If no custom events and no LMS deadlines, add some mock default items to keep it clean
      if (lmsEvents.length === 0 && customEvents.length === 0) {
        customEvents = [
          {
            id: 'ev-1',
            date: 'JUL 06, 2026',
            timestamp: Date.parse('JUL 06, 2026'),
            title: 'Computer Networks Final (High Priority)',
            course: 'CS-NET',
            type: 'EXAM',
            description: 'Final Exam',
            link: '#',
          },
          {
            id: 'ev-2',
            date: 'JUL 07, 2026',
            timestamp: Date.parse('JUL 07, 2026'),
            title: 'Theory of Automata',
            course: 'CS-TOA',
            type: 'EXAM',
            description: 'Final Exam',
            link: '#',
          },
          {
            id: 'ev-3',
            date: 'JUL 08, 2026',
            timestamp: Date.parse('JUL 08, 2026'),
            title: 'Database Systems',
            course: 'CS-DB',
            type: 'EXAM',
            description: 'Final Exam',
            link: '#',
          },
          {
            id: 'ev-4',
            date: 'JUL 09, 2026',
            timestamp: Date.parse('JUL 09, 2026'),
            title: 'Professional Practices',
            course: 'CS-PP',
            type: 'EXAM',
            description: 'Final Exam',
            link: '#',
          },
          {
            id: 'ev-5',
            date: 'JUL 10, 2026',
            timestamp: Date.parse('JUL 10, 2026'),
            title: 'Computer Architecture',
            course: 'CS-ARCH',
            type: 'EXAM',
            description: 'Final Exam',
            link: '#',
          },
        ];
      }

      // 3. Combine, sanitize timestamps, and sort
      const combined = [...lmsEvents, ...customEvents].map(ev => {
        if (!ev.timestamp || isNaN(ev.timestamp)) {
          ev.timestamp = Date.parse(ev.date) || Date.now();
        }
        return ev;
      }).sort((a, b) => a.timestamp - b.timestamp);
      
      setEvents(combined);
    } catch (e) {
      console.error('Failed to load timeline events', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadTimelineEvents();
    }
  }, [user?.id]);

  const handleAddCustomEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const timestamp = Date.now() + newDaysOffset * 24 * 60 * 60 * 1000;
    const dateStr = new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    }).toUpperCase();

    const newEvent: TimelineEvent = {
      id: `custom-ev-${Date.now()}`,
      date: dateStr,
      timestamp,
      title: newTitle.trim(),
      course: newCourse.trim().toUpperCase() || 'GENERAL',
      type: newType,
      description: newDescription.trim() || 'Custom scheduled milestone.',
      link: '#',
      isCustom: true,
    };

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`circle-custom-events-${user?.id}`);
      let customEventsList: TimelineEvent[] = [];
      if (saved) {
        try {
          customEventsList = JSON.parse(saved);
        } catch {
          customEventsList = [];
        }
      }
      customEventsList.push(newEvent);
      localStorage.setItem(`circle-custom-events-${user?.id}`, JSON.stringify(customEventsList));
    }

    // Reset and reload
    setNewTitle('');
    setNewCourse('');
    setNewDescription('');
    setNewDaysOffset(1);
    setShowAddEventModal(false);
    loadTimelineEvents();
  };

  const handleDeleteCustomEvent = (eventId: string) => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`circle-custom-events-${user?.id}`);
      if (saved) {
        try {
          let customEventsList: TimelineEvent[] = JSON.parse(saved);
          customEventsList = customEventsList.filter((ev) => ev.id !== eventId);
          localStorage.setItem(`circle-custom-events-${user?.id}`, JSON.stringify(customEventsList));
        } catch (e) {
          console.error(e);
        }
      }
    }
    loadTimelineEvents();
  };

  // Helper for type badge colors
  const getBadgeStyle = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'DEADLINE':
        return 'bg-[#ff2d55]/10 border border-[#ff2d55]/30 text-[#ff2d55]';
      case 'LECTURE':
        return 'bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 text-[#7c5cfc]';
      case 'EXAM':
        return 'bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#06b6d4]';
      case 'MILESTONE':
        return 'bg-white/5 border border-fouzar-border-strong text-fouzar-text-primary';
      default:
        return 'bg-white/5 text-fouzar-text-primary';
    }
  };

  return (
    <div className="w-full bg-fouzar-surface/40 border border-fouzar-border-strong rounded-[6px] p-6 relative overflow-hidden min-h-[380px] flex flex-col justify-center">
      
      {/* Header with actions */}
      <div className="flex justify-between items-center mb-2 z-10">
        <span className="text-[8.5px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary">
          Dynamic Timeline Hub
        </span>
        <button
          onClick={() => setShowAddEventModal(true)}
          className="px-2.5 py-1 bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 text-[#7c5cfc] hover:bg-[#7c5cfc]/20 font-mono text-[8px] uppercase tracking-wider rounded flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" /> Add Event
        </button>
      </div>

      {/* Scrollable Timeline Area */}
      <div className="w-full overflow-x-auto py-1 relative [&::-webkit-scrollbar]:hidden scrollbar-none min-w-[500px] h-[280px]">
        
        {/* Connecting Horizontal Line */}
        <div className="absolute left-0 right-0 top-[205px] h-[1.5px] bg-fouzar-border-strong/60 z-0" />
        
        {/* TODAY Vertical Line Marker */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-[#7c5cfc] z-10 shadow-[0_0_10px_#7c5cfc]"
          style={{ left: '35%' }}
        >
          <div className="absolute top-[5px] left-[-24px] bg-[#7c5cfc] text-[#0a0a0f] font-mono text-[8px] font-bold px-1.5 py-0.5 rounded-sm tracking-wider uppercase">
            TODAY
          </div>
        </div>

        {/* Timeline Events List */}
        <div className="absolute top-0 bottom-0 flex items-start justify-start px-10 gap-8 z-10 pt-4">
          {events.map((event) => {
            const isHovered = hoveredEventId === event.id;
            return (
              <div
                key={event.id}
                onMouseEnter={() => setHoveredEventId(event.id)}
                onMouseLeave={() => setHoveredEventId(null)}
                className="relative shrink-0 w-[190px] h-[240px] flex flex-col justify-between"
              >
                {/* Event Card positioned at the top */}
                <div className="w-full relative z-20">
                  <FascaCard 
                    className={`p-4 flex flex-col justify-between rounded-[6px] bg-fouzar-card/95 hover:border-[#7c5cfc]/60 shadow-xl transition-all duration-200 min-h-[140px] ${
                      isHovered ? 'shadow-[0_0_16px_rgba(124,92,252,0.15)] border-[#7c5cfc]/50' : 'border-fouzar-border-strong'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Date and Delete button */}
                      <div className="flex justify-between items-center">
                        <span className="text-[7.5px] font-mono text-fouzar-text-secondary uppercase tracking-wider">
                          {event.date}
                        </span>
                        {event.isCustom && isHovered && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCustomEvent(event.id);
                            }}
                            className="text-fouzar-text-secondary hover:text-[#ff2d55] transition-colors"
                            title="Delete event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Event Title */}
                      <h5 className="text-[11px] font-bold text-fouzar-text-primary tracking-wide line-clamp-1">
                        {event.title}
                      </h5>

                      {/* Course Code */}
                      <span className="text-[8px] font-mono text-[#7c5cfc] uppercase tracking-widest block font-bold">
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
                            className="pt-2 border-t border-fouzar-border-strong/40"
                          >
                            <p className="text-[8px] text-fouzar-text-secondary leading-relaxed font-sans mb-2">
                              {event.description}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </FascaCard>
                </div>

                {/* Dot connector positioned exactly at the bottom intersection */}
                <div 
                  className={`absolute left-[50%] translate-x-[-50%] top-[200px] w-2.5 h-2.5 rounded-full border-2 bg-fouzar-surface transition-colors duration-150 z-30 ${
                    isHovered ? 'border-[#7c5cfc] bg-[#7c5cfc] shadow-[0_0_8px_#7c5cfc]' : 'border-fouzar-border-strong'
                  }`} 
                />
              </div>
            );
          })}
        </div>

      </div>

      <span className="text-[7.5px] font-mono text-fouzar-text-secondary uppercase tracking-[0.2em] block text-center mt-2 z-10">
        ← Drag timeline to scroll | Hover events to view details & delete custom milestones →
      </span>

      {/* Add Custom Event Modal Overlay */}
      <AnimatePresence>
        {showAddEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-fouzar-bg/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-fouzar-surface border border-fouzar-border-strong p-6 rounded-[var(--fouzar-radius-lg)] shadow-2xl w-full max-w-sm space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-fouzar-border-strong/40 pb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#7c5cfc]" /> Add Custom Event
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="text-fouzar-text-secondary hover:text-fouzar-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddCustomEvent} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    Event Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lab 4 Submission..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-fouzar-card border border-fouzar-border-strong px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-[#7c5cfc] text-fouzar-text-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                      Course/Tag
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CS-229..."
                      value={newCourse}
                      onChange={(e) => setNewCourse(e.target.value)}
                      className="w-full bg-fouzar-card border border-fouzar-border-strong px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-[#7c5cfc] text-fouzar-text-primary uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                      Event Type
                    </label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as any)}
                      className="w-full bg-fouzar-card border border-fouzar-border-strong px-3 py-2 text-[9px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-[#7c5cfc] text-fouzar-text-primary"
                    >
                      <option value="MILESTONE">Milestone</option>
                      <option value="DEADLINE">Deadline</option>
                      <option value="LECTURE">Lecture</option>
                      <option value="EXAM">Exam</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    Days from now
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newDaysOffset}
                    onChange={(e) => setNewDaysOffset(parseInt(e.target.value) || 0)}
                    className="w-full bg-fouzar-card border border-fouzar-border-strong px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-[#7c5cfc] text-fouzar-text-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[7px] uppercase tracking-wider text-fouzar-text-secondary block">
                    Description
                  </label>
                  <textarea
                    placeholder="Enter details..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full bg-fouzar-card border border-fouzar-border-strong px-3 py-2 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none focus:border-[#7c5cfc] text-fouzar-text-primary resize-none h-14"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddEventModal(false)}
                    className="px-3 py-1.5 border border-fouzar-border-strong rounded-[var(--fouzar-radius-md)] font-mono text-[8px] uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-[#7c5cfc] text-[#0a0a0f] rounded-[var(--fouzar-radius-md)] font-mono text-[8px] uppercase font-bold hover:opacity-90 cursor-pointer"
                  >
                    Add Event
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
