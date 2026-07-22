'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Upload, UserPlus, MonitorPlay, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export interface ActivityEvent {
  id: string;
  type: 'upload' | 'join' | 'leave' | 'presentation' | 'delete' | 'info';
  userInitials: string;
  userName: string;
  description: string;
  timestamp: string;
}

interface GroupActivityFeedProps {
  events?: ActivityEvent[];
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const GroupActivityFeed: React.FC<GroupActivityFeedProps> = ({
  events = [],
  isCollapsed: externalCollapsed,
  onToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(true);
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const toggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'upload':
        return <Upload className="w-3 h-3 text-fouzar-accent" />;
      case 'join':
      case 'leave':
        return <UserPlus className="w-3 h-3 text-emerald-400" />;
      case 'presentation':
        return <MonitorPlay className="w-3 h-3 text-amber-400" />;
      case 'delete':
        return <Trash2 className="w-3 h-3 text-rose-400" />;
      default:
        return <Activity className="w-3 h-3 text-fouzar-text-secondary" />;
    }
  };

  return (
    <div className="border-t border-fouzar-border/60 bg-fouzar-surface/60 backdrop-blur-md rounded-b-[var(--fouzar-radius-lg)] overflow-hidden transition-all">
      {/* Header bar */}
      <button
        type="button"
        onClick={toggle}
        className="w-full px-4 py-2.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-fouzar-accent" />
          <span className="font-bold">Recent Activity</span>
          {events.length > 0 && (
            <span className="px-1.5 py-0.2 bg-fouzar-accent/20 text-fouzar-accent rounded-full text-[8px] font-bold">
              {events.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] opacity-70">{isCollapsed ? 'Expand' : 'Collapse'}</span>
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded feed list */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 max-h-48 overflow-y-auto scrollbar-none space-y-2 border-t border-fouzar-border/30 bg-fouzar-elevated/20">
              {events.length === 0 ? (
                <p className="font-mono text-[8px] text-fouzar-text-tertiary uppercase text-center py-4">
                  No activity yet — room active in current session
                </p>
              ) : (
                events.map((evt) => (
                  <motion.div
                    key={evt.id}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-start justify-between gap-2 p-2 rounded bg-fouzar-elevated/40 border border-fouzar-border/30 text-[9.5px]"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-fouzar-elevated border border-fouzar-border flex items-center justify-center font-mono text-[7.5px] font-bold shrink-0 mt-0.5">
                        {evt.userInitials}
                      </div>
                      <div className="min-w-0 leading-tight">
                        <span className="font-semibold text-fouzar-text-primary mr-1">
                          {evt.userName}
                        </span>
                        <span className="text-fouzar-text-secondary">{evt.description}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      {getEventIcon(evt.type)}
                      <span className="font-mono text-[7.5px] text-fouzar-text-tertiary uppercase">
                        {evt.timestamp}
                      </span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
