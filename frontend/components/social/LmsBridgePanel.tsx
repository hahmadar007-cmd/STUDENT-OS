'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, RefreshCw, Link2, AlertCircle,
  ChevronDown, ChevronRight, FileText, Zap, BookOpen,
  CheckCircle2, Clock, AlertTriangle, MessageSquare,
  ClipboardList, HelpCircle, Calendar, Timer, BookMarked, User2, LogOut
} from 'lucide-react';
import { FascaButton } from '../ui/FascaButton';
import { FascaCard } from '../ui/FascaCard';
import { FascaInput } from '../ui/FascaInput';
import {
  getDeadlines, patchLmsToken, getCourseContents, getGrades,
  getAssignments, getQuizzes, getForumActivity, getCourses, loginLmsWithCredentials, disconnectLms
} from '../../lib/api';
import type {
  CourseContents, GradeItem, AssignmentStatusItem, QuizItem, ForumItem, CourseInfo,
} from '../../lib/api';
import { toast } from '../ui/Toast';

interface LmsBridgePanelProps { isOpen: boolean; onClose: () => void; inline?: boolean; }
interface DeadlineItem { id: string; course: string; title: string; timeLeftHours: number; timeLeftLabel: string; }
type PanelTab = 'tasks' | 'assignments' | 'quizzes' | 'forums';

// ── Colour palette per course (deterministic) ────────────────────────────────
const COURSE_COLORS = ['#7c5cfc', '#00d4ff', '#ff6b6b', '#f5a623', '#10b981', '#ec4899', '#06b6d4', '#a78bfa'];
const courseColor = (shortname: string) =>
  COURSE_COLORS[shortname.charCodeAt(0) % COURSE_COLORS.length];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function fmtCountdown(secs: number): string {
  if (secs <= 0) return 'now';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtTimeLimit(secs: number | null): string {
  if (!secs) return '∞';
  const m = Math.floor(secs / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function gradeColour(letter: string | null) {
  if (letter === 'A') return '#00d4ff';
  if (letter === 'B') return '#7c5cfc';
  if (letter === 'C') return '#f5a623';
  return '#ff2d55';
}

const STATUS_CFG = {
  submitted: { label: 'Submitted', color: '#00cd46', Icon: CheckCircle2 },
  draft:     { label: 'Draft saved', color: '#f5a623', Icon: BookMarked },
  new:       { label: 'Not started', color: '#6b6b8a', Icon: Clock },
  overdue:   { label: 'Overdue',    color: '#ff2d55', Icon: AlertTriangle },
};

// ── Course block header ───────────────────────────────────────────────────────
const CourseBlock: React.FC<{
  course: { shortname: string; fullname: string; teacherName: string | null };
  grade?: GradeItem | null;
  children: React.ReactNode;
}> = ({ course, grade, children }) => {
  const color = courseColor(course.shortname);
  return (
    <div className="mt-4 first:mt-0">
      {/* Header */}
      <div
        className="flex items-start gap-3 px-3.5 py-2.5 mb-2 border-l-[3px]"
        style={{ borderColor: color, backgroundColor: `${color}08` }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[7.5px] font-mono font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-[3px]"
              style={{ color, backgroundColor: `${color}20` }}
            >
              {course.shortname}
            </span>
            {grade?.gradePercent != null && (
              <span
                className="text-[7px] font-mono font-bold px-1.5 py-0.5 rounded-[3px] border"
                style={{
                  color: gradeColour(grade.letterGrade),
                  borderColor: `${gradeColour(grade.letterGrade)}40`,
                  backgroundColor: `${gradeColour(grade.letterGrade)}10`,
                }}
              >
                {grade.gradePercent.toFixed(0)}% · {grade.letterGrade}
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold text-fouzar-text-primary mt-0.5 leading-tight truncate">
            {course.fullname}
          </p>
          {course.teacherName && (
            <p className="text-[7.5px] font-mono text-fouzar-text-secondary mt-0.5 flex items-center gap-1">
              <User2 className="w-2.5 h-2.5 shrink-0" style={{ color }} />
              {course.teacherName}
            </p>
          )}
        </div>
      </div>
      {/* Items */}
      <div className="space-y-2 pl-3 border-l border-fouzar-border-strong/30 ml-3">
        {children}
      </div>
    </div>
  );
};

// ── Mini skeleton ─────────────────────────────────────────────────────────────
const Skeletons = () => (
  <div className="space-y-3">
    {[1, 2, 3].map(i => (
      <div key={i} className="h-20 bg-fouzar-card border border-fouzar-border-strong animate-pulse p-4 flex flex-col gap-2">
        <div className="h-2 bg-fouzar-elevated w-1/4 rounded" />
        <div className="h-3 bg-fouzar-elevated w-3/4 rounded" />
        <div className="h-4 bg-fouzar-elevated w-16 rounded" />
      </div>
    ))}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = ({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) => (
  <div className="h-44 border border-dashed border-fouzar-border-strong flex flex-col items-center justify-center p-6 text-center">
    <Icon className="w-7 h-7 text-fouzar-text-secondary/40 mb-3" />
    <span className="text-xs font-bold text-fouzar-text-primary">{title}</span>
    <span className="text-[9px] font-mono text-fouzar-text-secondary mt-1.5 leading-relaxed">{sub}</span>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const LmsBridgePanel: React.FC<LmsBridgePanelProps> = ({ isOpen, onClose, inline }) => {
  const [activeTab, setActiveTab] = useState<PanelTab>('tasks');

  // Connect modal state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [activeLmsTab, setActiveLmsTab] = useState<'moodle' | 'canvas' | 'blackboard' | 'token'>('moodle');
  const [authMethod, setAuthMethod] = useState<'credentials' | 'token'>('credentials');
  const [baseUrl, setBaseUrl] = useState('https://lms.umt.edu.pk');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tokenValue, setTokenValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);

  // Data state
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [syncTimestamp, setSyncTimestamp] = useState('Not connected yet');
  const [lmsSource, setLmsSource] = useState<'live' | 'demo' | 'error'>('demo');
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);

  const [courseContents, setCourseContents] = useState<CourseContents[]>([]);
  const [openFileDrawer, setOpenFileDrawer] = useState<string | null>(null);
  const [grades, setGrades] = useState<Record<string, GradeItem>>({});
  const [assignments, setAssignments] = useState<AssignmentStatusItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [forums, setForums] = useState<ForumItem[]>([]);
  const [courseList, setCourseList] = useState<CourseInfo[]>([]);

  // ── Fetchers ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setDataLoading(true);
    try {
      const [dlRes, contRes, gradeRes, assignRes, quizRes, forumRes, courseRes] = await Promise.allSettled([
        getDeadlines(), getCourseContents(), getGrades(),
        getAssignments(), getQuizzes(), getForumActivity(), getCourses(),
      ]);

      if (dlRes.status === 'fulfilled') {
        const d = dlRes.value;
        setDeadlines(d.deadlines || []);
        setLmsSource(d.source as any);
        setConnectedProvider(d.provider);
        if (d.source === 'live')
          setSyncTimestamp(`Live · ${d.provider} · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        else if (d.source === 'error') setSyncTimestamp('Connection error');
        else setSyncTimestamp('Demo data — connect your university');
      }
      if (contRes.status === 'fulfilled' && contRes.value.source === 'live')
        setCourseContents(contRes.value.courses);
      if (gradeRes.status === 'fulfilled' && gradeRes.value.source === 'live') {
        const map: Record<string, GradeItem> = {};
        for (const g of gradeRes.value.grades) map[g.courseShortName.toUpperCase()] = g;
        setGrades(map);
      }
      if (assignRes.status === 'fulfilled' && assignRes.value.source === 'live')
        setAssignments(assignRes.value.assignments);
      if (quizRes.status === 'fulfilled' && quizRes.value.source === 'live')
        setQuizzes(quizRes.value.quizzes);
      if (forumRes.status === 'fulfilled' && forumRes.value.source === 'live')
        setForums(forumRes.value.forums);
      if (courseRes.status === 'fulfilled' && courseRes.value.source === 'live')
        setCourseList(courseRes.value.courses);
    } catch { /* silent */ }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { if (isOpen) fetchAll(); }, [isOpen, fetchAll]);

  const handleSync = async () => { setIsSyncing(true); await fetchAll(); setIsSyncing(false); };

  // ── Connect handler ──────────────────────────────────────────────
  const handleLinkGateway = async () => {
    setIsLoading(true); setErrorMsg('');
    try {
      const provider = activeLmsTab === 'canvas' ? 'canvas' : 'moodle';
      let result;

      if (activeLmsTab === 'moodle' && authMethod === 'credentials') {
        if (!username || !password) {
          setErrorMsg('Please enter your username and password.');
          setIsLoading(false);
          return;
        }
        result = await loginLmsWithCredentials('moodle', baseUrl, username, password);
      } else {
        if (!tokenValue) {
          setErrorMsg('Please enter your access token.');
          setIsLoading(false);
          return;
        }
        result = await patchLmsToken(tokenValue, baseUrl, provider);
      }

      if (!result.success) { setErrorMsg(result.message || 'Connection failed.'); return; }
      setShowSuccessCheck(true);
      toast(result.message || 'University portal connected', 'cyan');
      setTimeout(() => {
        setShowSuccessCheck(false); setShowConnectModal(false); setTokenValue(''); setUsername(''); setPassword('');
        fetchAll();
      }, 1800);
    } catch (err: any) { setErrorMsg(err.message || 'Connection failed.'); }
    finally { setIsLoading(false); }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const result = await disconnectLms();
      if (result.success) {
        toast('University portal disconnected', 'cyan');
        setConnectedProvider(null);
        setDeadlines([]);
        setCourseContents([]);
        setAssignments([]);
        setQuizzes([]);
        setCourseList([]);
        setSyncTimestamp('Not connected yet');
        setLmsSource('demo');
        setShowConnectModal(true); // Open the modal again so they can log in if they want
        toast('Failed to disconnect', 'crimson');
      }
    } catch (err) {
      toast('Failed to disconnect', 'crimson');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived: get course metadata ─────────────────────────────────
  const getCourseInfo = (shortname: string): CourseInfo => {
    const found = courseList.find(c => c.shortname.toUpperCase() === shortname.toUpperCase());
    return found ?? { id: 0, shortname, fullname: shortname, teacherName: null };
  };

  const getCourseFiles = (shortname: string) =>
    courseContents.find(c => c.courseShortName.toUpperCase() === shortname.toUpperCase())?.files ?? [];

  const getGradeBadge = (shortname: string) =>
    grades[shortname.toUpperCase()] ?? null;

  const handleOpenFile = (fileUrl: string) => {
    window.dispatchEvent(new CustomEvent('open-pdf-viewer', { detail: { url: fileUrl } }));
    onClose();
  };

  const handleFocusTask = () => {
    window.dispatchEvent(new CustomEvent('start-focus-timer', { detail: { minutes: 45 } }));
    onClose();
  };

  const openInPortal = () => window.open(baseUrl, '_blank');

  const nowMs = Date.now();

  // ── Group helpers ────────────────────────────────────────────────
  function groupBy<T extends { course: string }>(items: T[]): Map<string, T[]> {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const key = item.course.toUpperCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }

  function groupDeadlines(items: DeadlineItem[]): Map<string, DeadlineItem[]> {
    const map = new Map<string, DeadlineItem[]>();
    for (const item of items) {
      const key = item.course.toUpperCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }

  const dlGroups   = groupDeadlines(deadlines);
  const assignGroups = groupBy(assignments);
  const quizGroups   = groupBy(quizzes);
  const forumGroups  = groupBy(forums);

  // ── Tab config ───────────────────────────────────────────────────
  const pendingAssign = assignments.filter(a => a.status !== 'submitted').length;
  const tabs: { id: PanelTab; label: string; icon: any; badge?: number }[] = [
    { id: 'tasks',       label: 'Tasks',       icon: Calendar,      badge: deadlines.length || undefined },
    { id: 'assignments', label: 'Assignments',  icon: ClipboardList, badge: pendingAssign || undefined },
    { id: 'quizzes',     label: 'Quizzes',      icon: HelpCircle,    badge: quizzes.length || undefined },
    { id: 'forums',      label: 'Forums',       icon: MessageSquare, badge: forums.filter(f => f.unreadCount > 0).length || undefined },
  ];

  // ── Render ───────────────────────────────────────────────────────
  const content = (
    <div className={inline ? "w-full h-full bg-fouzar-surface border border-fouzar-border-strong rounded-[6px] flex flex-col overflow-hidden" : "fixed top-0 right-0 bottom-0 w-[440px] max-w-full bg-fouzar-surface border-l border-fouzar-border-strong z-40 shadow-2xl flex flex-col"}>
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-fouzar-border-strong/50 px-5 py-4 shrink-0">
              <div>
                <h3 className="font-serif text-sm font-bold text-fouzar-text-primary">My Campus Gateway</h3>
                <p className="text-[7.5px] font-mono text-fouzar-text-secondary mt-0.5">
                  {lmsSource === 'live' ? `Connected live · ${connectedProvider}` : lmsSource === 'error' ? 'Connection issue' : 'Not connected'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleSync} title="Refresh"
                  className={`p-1.5 hover:bg-white/5 rounded-[6px] text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer ${isSyncing ? 'animate-spin' : ''}`}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={onClose}
                  className="p-1.5 hover:bg-white/5 rounded-[6px] text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Connect CTA ── */}
            <div className="px-5 pt-3 pb-1 shrink-0 flex gap-2">
              <FascaButton onClick={() => setShowConnectModal(true)} variant="ghost-violet"
                className="flex-1 rounded-none font-bold py-2.5 text-[8.5px] flex items-center justify-center gap-1.5 border border-[#7c5cfc]/30 hover:border-[#7c5cfc]">
                <Link2 className="w-3 h-3" />
                {lmsSource === 'live' ? 'Switch University Portal' : 'Connect My University'}
              </FascaButton>
              {lmsSource === 'live' && (
                <FascaButton onClick={handleDisconnect} variant="ghost-violet"
                  className="rounded-none font-bold py-2.5 px-3 text-[8.5px] flex items-center justify-center gap-1.5 border border-[#ff2d55]/30 text-[#ff2d55] hover:border-[#ff2d55] hover:bg-[#ff2d55]/10">
                  <LogOut className="w-3 h-3" />
                  Logout
                </FascaButton>
              )}
            </div>

            {/* ── Tab bar ── */}
            <div className="flex border-b border-fouzar-border-strong/50 px-2 pt-2 shrink-0">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex flex-col items-center gap-1 py-2 px-1 relative cursor-pointer transition-colors group">
                    <div className="flex items-center gap-1">
                      <Icon className={`w-3 h-3 transition-colors ${isActive ? 'text-[#7c5cfc]' : 'text-fouzar-text-secondary group-hover:text-fouzar-text-primary'}`} />
                      {tab.badge !== undefined && tab.badge > 0 && (
                        <span className={`text-[6.5px] font-mono font-bold px-1 py-0.5 rounded-full ${isActive ? 'bg-[#7c5cfc] text-fouzar-text-primary' : 'bg-[#2a2a3a] text-fouzar-text-secondary'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </div>
                    <span className={`text-[7.5px] font-mono uppercase tracking-wider transition-colors ${isActive ? 'text-fouzar-text-primary' : 'text-fouzar-text-secondary group-hover:text-fouzar-text-primary'}`}>
                      {tab.label}
                    </span>
                    {isActive && <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-[#7c5cfc] rounded-t-full" />}
                  </button>
                );
              })}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-4">

              {/* ─── TASKS ───────────────────────────────────────── */}
              {activeTab === 'tasks' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[7.5px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary">Upcoming Tasks & Classes</span>
                    <span className={`text-[7px] font-mono uppercase ${lmsSource === 'live' ? 'text-[#00d4ff]' : lmsSource === 'error' ? 'text-[#ff2d55]' : 'text-[#f5a623]'}`}>
                      {lmsSource === 'live' ? '● Live' : lmsSource === 'error' ? '⚠ Error' : '○ Demo'}
                    </span>
                  </div>

                  {dataLoading && deadlines.length === 0 ? <Skeletons /> :
                   deadlines.length === 0 ? (
                    <EmptyState icon={Calendar} title="You're all caught up!" sub="No upcoming deadlines right now." />
                  ) : (
                    Array.from(dlGroups.entries()).map(([courseKey, dls]) => {
                      const info = getCourseInfo(courseKey);
                      const grade = getGradeBadge(courseKey);
                      return (
                        <CourseBlock key={courseKey} course={info} grade={grade}>
                          {dls.map(dl => {
                            const isCritical = dl.timeLeftHours <= 24;
                            const isUrgent = dl.timeLeftHours <= 48;
                            const courseFiles = getCourseFiles(courseKey);
                            const drawerKey = `${dl.id}-files`;
                            const isDrawerOpen = openFileDrawer === drawerKey;
                            return (
                              <FascaCard key={dl.id} className="p-3.5 flex flex-col gap-2.5">
                                <div className="flex justify-between items-start gap-2">
                                  <p className="text-[10.5px] font-bold text-fouzar-text-primary leading-snug flex-1">{dl.title}</p>
                                  <span className={`text-[7px] font-mono uppercase tracking-wider shrink-0 ${isCritical ? 'text-[#ff2d55] font-bold' : isUrgent ? 'text-[#f5a623]' : 'text-fouzar-text-secondary'}`}>
                                    {dl.timeLeftLabel}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <FascaButton variant="ghost-violet" className="px-2.5 py-1 text-[7px] font-mono rounded-[5px]" onClick={openInPortal}>
                                    Open in Portal
                                  </FascaButton>
                                  {isCritical && (
                                    <button onClick={handleFocusTask}
                                      className="flex items-center gap-1 px-2.5 py-1 text-[7px] font-mono rounded-[5px] text-[#ff2d55] border border-[#ff2d55]/30 bg-[#ff2d55]/5 hover:bg-[#ff2d55]/15 transition-all cursor-pointer">
                                      <Zap className="w-2.5 h-2.5" /> Focus 45m
                                    </button>
                                  )}
                                </div>
                                {courseFiles.length > 0 && (
                                  <div className="border-t border-fouzar-border-strong/40 pt-2">
                                    <button onClick={() => setOpenFileDrawer(isDrawerOpen ? null : drawerKey)}
                                      className="flex items-center gap-1.5 text-[7px] font-mono text-fouzar-text-secondary hover:text-fouzar-text-primary uppercase tracking-wider transition-colors cursor-pointer w-full">
                                      {isDrawerOpen ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                                      <BookOpen className="w-2.5 h-2.5" /> Course Materials
                                      <span className="ml-auto opacity-50">{courseFiles.length} file{courseFiles.length !== 1 ? 's' : ''}</span>
                                    </button>
                                    <AnimatePresence>
                                      {isDrawerOpen && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden mt-2 space-y-0.5">
                                          {courseFiles.map(file => (
                                            <button key={file.id} onClick={() => handleOpenFile(file.fileUrl)}
                                              className="flex items-center gap-2 w-full p-1.5 rounded-[4px] hover:bg-white/5 text-left group transition-colors cursor-pointer">
                                              <FileText className="w-2.5 h-2.5 text-[#7c5cfc] shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <span className="text-[7.5px] font-mono text-fouzar-text-primary/80 group-hover:text-fouzar-text-primary truncate block">{file.name}</span>
                                                {file.fileSize > 0 && <span className="text-[6px] font-mono text-fouzar-text-secondary">{fmt(file.fileSize)}</span>}
                                              </div>
                                              <span className="text-[6px] font-mono text-[#7c5cfc]/40 group-hover:text-[#7c5cfc] shrink-0">VIEW →</span>
                                            </button>
                                          ))}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )}
                              </FascaCard>
                            );
                          })}
                        </CourseBlock>
                      );
                    })
                  )}

                  {/* Grade summary */}
                  {Object.keys(grades).length > 0 && (
                    <div className="mt-6">
                      <span className="text-[7.5px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary block mb-2">Semester Grades</span>
                      <div className="space-y-1.5">
                        {Object.values(grades).map(g => (
                          <div key={g.courseId} className="flex items-center justify-between bg-fouzar-card border border-fouzar-border-strong px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <span className="text-[8px] font-mono uppercase" style={{ color: courseColor(g.courseShortName) }}>{g.courseShortName}</span>
                              <p className="text-[7px] font-mono text-fouzar-text-secondary truncate">{g.courseName}</p>
                            </div>
                            {g.gradePercent != null ? (
                              <div className="text-right shrink-0 ml-3">
                                <span className="text-sm font-bold font-serif" style={{ color: gradeColour(g.letterGrade) }}>{g.letterGrade}</span>
                                <p className="text-[7px] font-mono text-fouzar-text-secondary">{g.gradePercent.toFixed(1)}%</p>
                              </div>
                            ) : <span className="text-[8px] font-mono text-fouzar-text-secondary">—</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ─── ASSIGNMENTS ─────────────────────────────────── */}
              {activeTab === 'assignments' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[7.5px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary">Assignments by Subject</span>
                    <div className="flex gap-2 items-center">
                      {(['overdue','new','submitted'] as const).map(s => (
                        <span key={s} className="flex items-center gap-0.5 text-[6px] font-mono" style={{ color: STATUS_CFG[s].color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_CFG[s].color }} />
                          {STATUS_CFG[s].label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {dataLoading ? <Skeletons /> :
                   assignments.length === 0 ? (
                    <EmptyState icon={ClipboardList} title="No assignments found" sub={lmsSource === 'live' ? 'No assignments in your courses yet.' : 'Connect your university to see assignments.'} />
                  ) : (
                    Array.from(assignGroups.entries()).map(([courseKey, items]) => {
                      const info = getCourseInfo(courseKey);
                      const grade = getGradeBadge(courseKey);
                      return (
                        <CourseBlock key={courseKey} course={info} grade={grade}>
                          {items.map(a => {
                            const cfg = STATUS_CFG[a.status];
                            const StatusIcon = cfg.Icon;
                            const secsLeft = a.dueDateMs ? Math.max(0, (a.dueDateMs - nowMs) / 1000) : null;
                            return (
                              <FascaCard key={a.id} className="p-3.5 flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[10.5px] font-bold text-fouzar-text-primary leading-snug flex-1">{a.title}</p>
                                  <span className="flex items-center gap-1 text-[6.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-[4px] shrink-0"
                                    style={{ color: cfg.color, backgroundColor: `${cfg.color}15`, border: `1px solid ${cfg.color}30` }}>
                                    <StatusIcon className="w-2 h-2" /> {cfg.label}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  {secsLeft !== null ? (
                                    <span className={`text-[7.5px] font-mono ${a.status === 'overdue' ? 'text-[#ff2d55]' : secsLeft < 86400 ? 'text-[#f5a623]' : 'text-fouzar-text-secondary'}`}>
                                      {a.status === 'overdue' ? '⚠ Past due' : `Due in ${fmtCountdown(secsLeft)}`}
                                      {a.dueDate && ` · ${new Date(a.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                                    </span>
                                  ) : <span className="text-[7.5px] font-mono text-fouzar-text-secondary">No due date</span>}
                                  <button onClick={openInPortal}
                                    className="text-[7px] font-mono uppercase tracking-wider cursor-pointer transition-colors hover:text-fouzar-text-primary text-[#7c5cfc]">
                                    {a.status === 'submitted' ? 'View →' : 'Submit →'}
                                  </button>
                                </div>
                              </FascaCard>
                            );
                          })}
                        </CourseBlock>
                      );
                    })
                  )}
                </>
              )}

              {/* ─── QUIZZES ─────────────────────────────────────── */}
              {activeTab === 'quizzes' && (
                <>
                  <span className="text-[7.5px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary block mb-3">Quizzes by Subject</span>

                  {dataLoading ? <Skeletons /> :
                   quizzes.length === 0 ? (
                    <EmptyState icon={HelpCircle} title="No upcoming quizzes" sub={lmsSource === 'live' ? 'No open quizzes right now — enjoy the break.' : 'Connect your university to see quizzes.'} />
                  ) : (
                    Array.from(quizGroups.entries()).map(([courseKey, items]) => {
                      const info = getCourseInfo(courseKey);
                      const grade = getGradeBadge(courseKey);
                      return (
                        <CourseBlock key={courseKey} course={info} grade={grade}>
                          {items.map(q => {
                            const nowSecs = nowMs / 1000;
                            const isOpen = (!q.timeOpen || q.timeOpen <= nowSecs) && (!q.timeClose || q.timeClose > nowSecs);
                            const secsToClose = q.timeClose ? Math.max(0, q.timeClose - nowSecs) : null;
                            const secsToOpen  = q.timeOpen  ? Math.max(0, q.timeOpen  - nowSecs) : null;
                            return (
                              <FascaCard key={q.id} className="p-3.5 flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-[10.5px] font-bold text-fouzar-text-primary leading-snug flex-1">{q.title}</p>
                                  {isOpen ? (
                                    <span className="text-[6.5px] font-mono font-bold px-1.5 py-0.5 rounded-[4px] text-[#00d4ff] bg-[#00d4ff]/10 border border-[#00d4ff]/30 shrink-0 animate-pulse">
                                      OPEN NOW
                                    </span>
                                  ) : secsToOpen !== null && secsToOpen > 0 ? (
                                    <span className="text-[6.5px] font-mono text-[#f5a623] shrink-0">Opens in {fmtCountdown(secsToOpen)}</span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  {q.timeLimit && (
                                    <span className="flex items-center gap-1 text-[7px] font-mono text-fouzar-text-secondary">
                                      <Timer className="w-2.5 h-2.5" /> {fmtTimeLimit(q.timeLimit)}
                                    </span>
                                  )}
                                  {q.attemptsAllowed > 0 && (
                                    <span className="text-[7px] font-mono text-fouzar-text-secondary">
                                      {q.attemptsAllowed === -1 ? '∞ attempts' : `${q.attemptsAllowed} attempt${q.attemptsAllowed !== 1 ? 's' : ''}`}
                                    </span>
                                  )}
                                  {secsToClose !== null && (
                                    <span className={`text-[7px] font-mono ml-auto ${secsToClose < 3600 ? 'text-[#ff2d55] font-bold' : secsToClose < 86400 ? 'text-[#f5a623]' : 'text-fouzar-text-secondary'}`}>
                                      Closes in {fmtCountdown(secsToClose)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <FascaButton variant="ghost-violet" className="px-2.5 py-1 text-[7px] font-mono rounded-[5px] flex-1" onClick={openInPortal}>
                                    {isOpen ? '🎯 Start Quiz' : 'View Quiz'}
                                  </FascaButton>
                                  {isOpen && secsToClose !== null && secsToClose < 86400 && (
                                    <button onClick={handleFocusTask}
                                      className="flex items-center gap-1 px-2.5 py-1 text-[7px] font-mono rounded-[5px] text-[#00d4ff] border border-[#00d4ff]/30 bg-[#00d4ff]/5 hover:bg-[#00d4ff]/15 transition-all cursor-pointer">
                                      <Zap className="w-2.5 h-2.5" /> Focus
                                    </button>
                                  )}
                                </div>
                              </FascaCard>
                            );
                          })}
                        </CourseBlock>
                      );
                    })
                  )}
                </>
              )}

              {/* ─── FORUMS ──────────────────────────────────────── */}
              {activeTab === 'forums' && (
                <>
                  <span className="text-[7.5px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary block mb-3">Discussion Forums by Subject</span>

                  {dataLoading ? <Skeletons /> :
                   forums.length === 0 ? (
                    <EmptyState icon={MessageSquare} title="No forums found" sub={lmsSource === 'live' ? 'No active discussion forums in your courses.' : 'Connect your university to see course forums.'} />
                  ) : (
                    Array.from(forumGroups.entries()).map(([courseKey, items]) => {
                      const info = getCourseInfo(courseKey);
                      const grade = getGradeBadge(courseKey);
                      return (
                        <CourseBlock key={courseKey} course={info} grade={grade}>
                          {items.map(f => (
                            <FascaCard key={f.id} className="p-3.5 flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[10.5px] font-bold text-fouzar-text-primary leading-snug flex-1">{f.name}</p>
                                {f.unreadCount > 0 && (
                                  <span className="text-[6.5px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[#7c5cfc] text-fouzar-text-primary shrink-0">
                                    {f.unreadCount} new
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[7px] font-mono text-fouzar-text-secondary flex items-center gap-1">
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  {f.discussionCount} discussion{f.discussionCount !== 1 ? 's' : ''}
                                </span>
                                <button onClick={openInPortal}
                                  className={`text-[7px] font-mono uppercase tracking-wider cursor-pointer transition-colors hover:text-fouzar-text-primary ${f.unreadCount > 0 ? 'text-[#7c5cfc] font-bold' : 'text-fouzar-text-secondary'}`}>
                                  {f.unreadCount > 0 ? 'Read new →' : 'View →'}
                                </button>
                              </div>
                            </FascaCard>
                          ))}
                        </CourseBlock>
                      );
                    })
                  )}
                </>
              )}
            </div>

            {/* ── Footer status bar ── */}
            <div className="border-t border-fouzar-border-strong/40 px-5 py-2.5 shrink-0 flex items-center justify-between text-[7px] font-mono text-fouzar-text-secondary uppercase tracking-wider">
              <span>{lmsSource === 'live' ? 'Connected Live to UMT Portal' : syncTimestamp}</span>
              <span className={lmsSource === 'live' ? 'text-[#00d4ff]' : 'text-fouzar-text-secondary'}>{lmsSource === 'live' ? '● Live' : '○ Demo'}</span>
            </div>
          </div>
  );

  return (
    <>
      {inline ? (
        isOpen && content
      ) : (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 z-40"
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Connect modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showConnectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-fouzar-bg/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-md bg-fouzar-card border border-[#7c5cfc] rounded-[6px] shadow-2xl p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-serif text-sm font-bold text-fouzar-text-primary">Connect My University</h4>
                  <p className="text-[8px] font-mono text-fouzar-text-secondary mt-0.5">Sync deadlines, assignments, quizzes, grades &amp; forums</p>
                </div>
                <button onClick={() => setShowConnectModal(false)} className="p-1 hover:bg-white/5 rounded-[6px] text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex bg-fouzar-bg/40 border-b border-fouzar-border-strong mb-5">
                {(['moodle','canvas','blackboard','token'] as const).map(tab => (
                  <button key={tab} onClick={() => { setActiveLmsTab(tab); setErrorMsg(''); }}
                    className="flex-1 py-2 font-mono text-[8.5px] uppercase tracking-widest text-center cursor-pointer relative"
                    style={{ color: activeLmsTab === tab ? '#f0f0ff' : '#6b6b8a', backgroundColor: activeLmsTab === tab ? '#16161f' : 'transparent' }}>
                    {tab}
                    {activeLmsTab === tab && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7c5cfc]" />}
                  </button>
                ))}
              </div>

              {showSuccessCheck ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <motion.svg width="60" height="60" viewBox="0 0 50 50" className="text-[#7c5cfc]">
                    <motion.circle cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
                    <motion.path d="M17 25L23 31L33 19" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="transparent" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.4, duration: 0.4 }} />
                  </motion.svg>
                  <h5 className="text-xs font-bold text-fouzar-text-primary uppercase tracking-widest mt-4">Connected!</h5>
                  <p className="text-[8.5px] font-mono text-fouzar-text-secondary mt-1">Pulling your subjects, teachers, assignments &amp; forums...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 my-4">
                    {activeLmsTab === 'moodle' ? (
                      <div className="space-y-3">
                        <div className="flex bg-[#1e1e2d] rounded-md p-1 mb-2">
                          <button
                            onClick={() => setAuthMethod('credentials')}
                            className={`flex-1 py-1.5 text-[8.5px] font-mono uppercase tracking-widest rounded transition-colors ${authMethod === 'credentials' ? 'bg-[#7c5cfc] text-white' : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'}`}
                          >
                            Login with Credentials
                          </button>
                          <button
                            onClick={() => setAuthMethod('token')}
                            className={`flex-1 py-1.5 text-[8.5px] font-mono uppercase tracking-widest rounded transition-colors ${authMethod === 'token' ? 'bg-[#7c5cfc] text-white' : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'}`}
                          >
                            Paste Token (Advanced)
                          </button>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono uppercase text-fouzar-text-secondary">University Portal URL</span>
                          <FascaInput type="url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://lms.university.edu" className="rounded-none border border-fouzar-border-strong focus:border-[#7c5cfc]" />
                        </div>
                        {authMethod === 'credentials' ? (
                          <>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[8px] font-mono uppercase text-fouzar-text-secondary">Username (e.g. F202111...)</span>
                              <FascaInput type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your university ID" className="rounded-none border border-fouzar-border-strong focus:border-[#7c5cfc]" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[8px] font-mono uppercase text-fouzar-text-secondary">Password</span>
                              <FascaInput type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your portal password" className="rounded-none border border-fouzar-border-strong focus:border-[#7c5cfc]" />
                            </div>
                            <p className="text-[7px] font-mono text-fouzar-text-secondary/70 leading-relaxed">
                              We don't save your password. We securely fetch an access token from your university directly.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[8px] font-mono uppercase text-fouzar-text-secondary">Web Service Token</span>
                              <FascaInput type="password" value={tokenValue} onChange={e => setTokenValue(e.target.value)} placeholder="Paste your token here" className="rounded-none border border-fouzar-border-strong focus:border-[#7c5cfc]" />
                            </div>
                            <p className="text-[7px] font-mono text-fouzar-text-secondary/70 leading-relaxed">
                              Ask your IT department for a Moodle web service token with full course access.
                            </p>
                          </>
                        )}
                      </div>
                    ) : activeLmsTab === 'canvas' ? (
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono uppercase text-fouzar-text-secondary">Canvas URL</span>
                          <FascaInput type="url" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://canvas.university.edu" className="rounded-none border border-fouzar-border-strong focus:border-[#7c5cfc]" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[8px] font-mono uppercase text-fouzar-text-secondary">Access Token</span>
                          <FascaInput type="password" value={tokenValue} onChange={e => setTokenValue(e.target.value)} placeholder="Paste your token here" className="rounded-none border border-fouzar-border-strong focus:border-[#7c5cfc]" />
                        </div>
                        <p className="text-[7px] font-mono text-fouzar-text-secondary/70 leading-relaxed">
                          Go to Account → Settings → Approved Integrations to create a token.
                        </p>
                      </div>
                    ) : activeLmsTab === 'token' ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[8px] font-mono uppercase text-fouzar-text-secondary">Manual Token</span>
                        <FascaInput type="password" value={tokenValue} onChange={e => setTokenValue(e.target.value)} placeholder="Paste your token here" className="rounded-none border border-fouzar-border-strong focus:border-[#7c5cfc]" />
                      </div>
                    ) : (
                      <div className="py-8 border border-dashed border-fouzar-border-strong text-center flex flex-col items-center p-4">
                        <AlertCircle className="w-6 h-6 text-fouzar-text-secondary mb-2" />
                        <span className="text-[10px] font-mono text-fouzar-text-secondary uppercase">{activeLmsTab.toUpperCase()} support coming soon.</span>
                      </div>
                    )}
                  </div>
                  {errorMsg && (
                    <div className="flex items-center gap-2 bg-[#ff2d55]/10 border border-[#ff2d55]/30 p-3 my-3">
                      <AlertCircle className="w-4 h-4 text-[#ff2d55] shrink-0" />
                      <span className="text-[9px] font-mono text-[#ff2d55]">{errorMsg}</span>
                    </div>
                  )}
                  <div className="flex gap-3 mt-5">
                    <FascaButton onClick={() => setShowConnectModal(false)} variant="ghost-violet" className="flex-1 rounded-[6px] font-bold py-2 text-[9px] border border-fouzar-border-strong" disabled={isLoading}>Cancel</FascaButton>
                    <FascaButton onClick={handleLinkGateway} variant="solid-violet" className="flex-1 rounded-[6px] font-bold py-2 text-[9px]"
                      disabled={isLoading || (activeLmsTab !== 'moodle' && activeLmsTab !== 'canvas' && activeLmsTab !== 'token')}>
                      {isLoading ? 'Connecting...' : 'Connect'}
                    </FascaButton>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
