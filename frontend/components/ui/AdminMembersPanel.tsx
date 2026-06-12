'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Users, Flame } from 'lucide-react';
import { getMyGroups, getGroupMembers } from '../../lib/api';

interface MemberUser {
  id: string;
  name: string | null;
  email: string;
  fouzarId: string | null;
  avatarUrl: string | null;
  isFocusing: boolean;
  focusStartedAt: string | null;
}

interface GroupMember {
  userId: string;
  groupId: string;
  role: string;
  status: string;
  joinedAt: string;
  user: MemberUser;
  group: {
    creatorId: string;
    name: string;
  };
}

interface GroupWithMembers {
  id: string;
  name: string;
  members: GroupMember[];
}

export const AdminMembersPanel: React.FC = () => {
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const groupsData: { id: string; name: string }[] = await getMyGroups();
      const withMembers = await Promise.all(
        groupsData.map(async (g) => {
          const members: GroupMember[] = await getGroupMembers(g.id).catch(() => []);
          return { id: g.id, name: g.name, members };
        }),
      );
      setGroups(withMembers);
      if (withMembers.length > 0 && !expandedGroup) {
        setExpandedGroup(withMembers[0].id);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalMembers = groups.reduce((acc, g) => acc + g.members.filter(m => m.status === 'ACCEPTED').length, 0);

  return (
    <div className="bg-white/[0.02] border border-fouzar-border/50 rounded-[8px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-fouzar-border/40">
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-fouzar-accent" />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-fouzar-text-secondary">
            Circle Members
          </span>
          <span className="font-mono text-[7px] px-1.5 py-0.5 rounded bg-fouzar-accent/10 text-fouzar-accent border border-fouzar-accent/20">
            {totalMembers}
          </span>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="p-1 text-fouzar-text-tertiary hover:text-fouzar-accent transition-colors cursor-pointer disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="py-8 flex items-center justify-center">
          <span className="font-mono text-[8px] text-fouzar-text-tertiary uppercase animate-pulse">Loading...</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="py-8 flex items-center justify-center">
          <span className="font-mono text-[8px] text-fouzar-text-tertiary uppercase">No circles found</span>
        </div>
      ) : (
        <div className="divide-y divide-fouzar-border/30">
          {groups.map((group) => {
            const accepted = group.members.filter(m => m.status === 'ACCEPTED');
            const pending = group.members.filter(m => m.status === 'PENDING');
            const isOpen = expandedGroup === group.id;

            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => setExpandedGroup(isOpen ? null : group.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors cursor-pointer text-left"
                >
                  <span className="font-mono text-[9px] uppercase tracking-wider text-fouzar-text-primary truncate max-w-[200px]">
                    {group.name}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {pending.length > 0 && (
                      <span className="font-mono text-[7px] px-1.5 py-0.5 rounded bg-[#ff2d55]/10 text-[#ff2d55] border border-[#ff2d55]/20">
                        {pending.length} pending
                      </span>
                    )}
                    <span className="font-mono text-[7px] text-fouzar-text-tertiary">{accepted.length} members</span>
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 space-y-1.5">
                        {group.members.length === 0 ? (
                          <p className="font-mono text-[7.5px] text-fouzar-text-tertiary uppercase py-2">No members</p>
                        ) : (
                          group.members.map((mem) => {
                            const initials = (mem.user.name ?? mem.user.email)
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2);
                            const isPending = mem.status === 'PENDING';
                            const isCreator = mem.userId === mem.group.creatorId;

                            return (
                              <div
                                key={`${mem.groupId}-${mem.userId}`}
                                className="flex items-center justify-between py-1.5 px-2.5 rounded-[6px] bg-white/[0.015] border border-fouzar-border/30"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-fouzar-elevated border border-fouzar-border flex items-center justify-center font-mono text-[8px] font-bold text-fouzar-text-secondary shrink-0 overflow-hidden">
                                    {mem.user.avatarUrl ? (
                                      <img src={mem.user.avatarUrl} alt={mem.user.name ?? ''} className="w-full h-full object-cover" />
                                    ) : (
                                      initials
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-medium text-fouzar-text-primary truncate">
                                      {mem.user.name ?? mem.user.email}
                                    </p>
                                    <p className="font-mono text-[7px] text-fouzar-text-tertiary truncate">
                                      {mem.user.fouzarId ?? mem.user.email}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {mem.user.isFocusing && (
                                    <Flame className="w-2.5 h-2.5 text-[#ff2d55] fill-[#ff2d55]" />
                                  )}
                                  {isPending ? (
                                    <span className="font-mono text-[6.5px] uppercase px-1.5 py-0.5 rounded bg-[#ff2d55]/10 text-[#ff2d55] border border-[#ff2d55]/20">
                                      Pending
                                    </span>
                                  ) : isCreator ? (
                                    <span className="font-mono text-[6.5px] uppercase px-1.5 py-0.5 rounded bg-fouzar-accent/10 text-fouzar-accent border border-fouzar-accent/20">
                                      Admin
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[6.5px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-fouzar-text-tertiary border border-fouzar-border/30">
                                      Member
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
