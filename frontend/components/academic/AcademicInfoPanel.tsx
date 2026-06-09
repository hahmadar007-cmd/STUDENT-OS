'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, X, ChevronRight, BarChart2, FileText,
  Trash2, Edit2, Check, AlertTriangle, TrendingUp,
  Sparkles, GraduationCap, Award, Clock, ChevronDown, ChevronUp
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Subject {
  id: string;
  name: string;
  code: string;
  creditHours: number;
  totalClasses: number;
  attendedClasses: number;
  marks: {
    midterm: number | null;    // out of 30
    assignments: number | null; // out of 20
    quizzes: number | null;    // out of 10
    final: number | null;      // out of 50 (calculated or manual)
    total: number | null;      // out of 100 (manual override)
  };
  grade: string; // A+, A, B+, B, C+, C, D, F
}

type ActiveTab = 'attendance' | 'marks' | 'transcript';

const STORAGE_KEY = 'fasca_academic_data_v2';

const GRADE_POINTS: Record<string, number> = {
  'A+': 4.0, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0,
};

const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'];

function gradeFromTotal(total: number): string {
  if (total >= 90) return 'A+';
  if (total >= 85) return 'A';
  if (total >= 80) return 'A-';
  if (total >= 75) return 'B+';
  if (total >= 70) return 'B';
  if (total >= 65) return 'B-';
  if (total >= 60) return 'C+';
  if (total >= 55) return 'C';
  if (total >= 50) return 'C-';
  if (total >= 45) return 'D+';
  if (total >= 40) return 'D';
  return 'F';
}

function calcGPA(subjects: Subject[]): string {
  const graded = subjects.filter(s => s.grade && s.creditHours > 0);
  if (graded.length === 0) return 'N/A';
  const totalPoints = graded.reduce((sum, s) => sum + (GRADE_POINTS[s.grade] ?? 0) * s.creditHours, 0);
  const totalCredits = graded.reduce((sum, s) => sum + s.creditHours, 0);
  return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 'N/A';
}

function attendanceColor(pct: number) {
  if (pct >= 75) return { stroke: '#10b981', text: '#10b981', bg: 'rgba(16,185,129,0.12)' };
  if (pct >= 60) return { stroke: '#f5a623', text: '#f5a623', bg: 'rgba(245,166,35,0.12)' };
  return { stroke: '#ff4d6d', text: '#ff4d6d', bg: 'rgba(255,77,109,0.12)' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Donut Chart SVG
// ─────────────────────────────────────────────────────────────────────────────
function DonutChart({ pct, size = 110 }: { pct: number; size?: number }) {
  const r = (size / 2) - 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const col = attendanceColor(pct);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
      {/* Progress */}
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none"
        stroke={col.stroke}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={animated ? offset : circ}
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)', filter: `drop-shadow(0 0 6px ${col.stroke}80)` }}
      />
      {/* Center text */}
      <text x={size/2} y={size/2 - 4} textAnchor="middle" fill={col.text} fontSize="16" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
        {Math.round(pct)}%
      </text>
      <text x={size/2} y={size/2 + 13} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="JetBrains Mono, monospace">
        ATTENDED
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance Subject Pill
// ─────────────────────────────────────────────────────────────────────────────
function AttendancePill({ subject, onEdit }: { subject: Subject; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const pct = subject.totalClasses > 0 ? (subject.attendedClasses / subject.totalClasses) * 100 : 0;
  const col = attendanceColor(pct);
  const missed = subject.totalClasses - subject.attendedClasses;
  const canMiss = Math.max(0, Math.floor(subject.totalClasses * 0.25) - missed);

  return (
    <motion.div layout className="rounded-xl overflow-hidden" style={{ border: `1px solid ${pct < 75 ? col.stroke + '40' : 'rgba(255,255,255,0.07)'}`, background: 'rgba(255,255,255,0.02)' }}>
      {/* Pill header — click to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: col.stroke, boxShadow: `0 0 6px ${col.stroke}` }} />
          <div className="text-left">
            <p className="text-[11px] font-semibold text-white/90">{subject.name}</p>
            <p className="text-[9px] font-mono text-white/35 uppercase tracking-wider">{subject.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pct < 75 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-mono font-bold" style={{ background: 'rgba(255,77,109,0.12)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.2)' }}>
              <AlertTriangle className="w-2.5 h-2.5" /> LOW
            </div>
          )}
          <div className="text-right">
            <p className="text-[13px] font-bold font-mono" style={{ color: col.text }}>{Math.round(pct)}%</p>
            <p className="text-[8px] text-white/30 font-mono">{subject.attendedClasses}/{subject.totalClasses}</p>
          </div>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 flex items-center gap-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Donut */}
              <div className="pt-4 shrink-0">
                <DonutChart pct={pct} size={100} />
              </div>
              {/* Stats */}
              <div className="flex-1 space-y-2 pt-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Total Classes', val: subject.totalClasses },
                    { label: 'Attended', val: subject.attendedClasses, color: '#10b981' },
                    { label: 'Missed', val: missed, color: missed > 0 ? '#ff4d6d' : undefined },
                    { label: 'Can Miss', val: canMiss, color: canMiss <= 2 ? '#f5a623' : undefined },
                  ].map(item => (
                    <div key={item.label} className="bg-white/[0.03] rounded-lg px-3 py-2">
                      <p className="text-[8px] font-mono text-white/30 uppercase tracking-wider">{item.label}</p>
                      <p className="text-[14px] font-bold font-mono mt-0.5" style={{ color: item.color || 'rgba(255,255,255,0.85)' }}>{item.val}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  className="w-full py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-2.5 h-2.5" /> Edit Classes
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add/Edit Subject Modal
// ─────────────────────────────────────────────────────────────────────────────
function SubjectModal({ subject, onSave, onClose }: { subject?: Subject; onSave: (s: Subject) => void; onClose: () => void }) {
  const empty: Subject = {
    id: Date.now().toString(),
    name: '', code: '', creditHours: 3,
    totalClasses: 0, attendedClasses: 0,
    marks: { midterm: null, assignments: null, quizzes: null, final: null, total: null },
    grade: '',
  };
  const [form, setForm] = useState<Subject>(subject ?? empty);
  const [error, setError] = useState('');

  const update = (key: keyof Subject, val: any) => setForm(f => ({ ...f, [key]: val }));
  const updateMark = (key: keyof Subject['marks'], val: string) =>
    setForm(f => ({ ...f, marks: { ...f.marks, [key]: val === '' ? null : Number(val) } }));

  // Auto-calculate total & grade
  useEffect(() => {
    const { midterm, assignments, quizzes } = form.marks;
    if (midterm !== null && assignments !== null && quizzes !== null) {
      const subtotal = (midterm || 0) + (assignments || 0) + (quizzes || 0);
      // If total is not manually set, auto-derive grade from subtotal (out of 60, scale to 100)
      if (form.marks.total === null) {
        const scaled = Math.round((subtotal / 60) * 100);
        setForm(f => ({ ...f, grade: gradeFromTotal(scaled) }));
      }
    }
    if (form.marks.total !== null) {
      setForm(f => ({ ...f, grade: gradeFromTotal(f.marks.total!) }));
    }
  }, [form.marks.midterm, form.marks.assignments, form.marks.quizzes, form.marks.total]);

  const handleSave = () => {
    if (!form.name.trim()) { setError('Subject name is required'); return; }
    if (form.attendedClasses > form.totalClasses) { setError('Attended cannot exceed total classes'); return; }
    onSave(form);
  };

  const inputCls = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/20 transition-colors";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div initial={{ scale: 0.93, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 16 }}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background: 'linear-gradient(135deg,#0f0f1a,#12121f)', border: '1px solid rgba(124,92,252,0.25)', borderRadius: 14, boxShadow: '0 0 40px rgba(124,92,252,0.12), 0 24px 48px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">{subject ? 'Edit Subject' : 'Add Subject'}</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 cursor-pointer transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name & Code */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">Subject Name</label>
              <input value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Data Structures" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">Course Code</label>
              <input value={form.code} onChange={e => update('code', e.target.value)} placeholder="e.g. CS-201" className={inputCls} />
            </div>
          </div>

          {/* Credit Hours */}
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">Credit Hours</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map(c => (
                <button key={c} type="button" onClick={() => update('creditHours', c)}
                  className="flex-1 py-2 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer"
                  style={{
                    background: form.creditHours === c ? 'rgba(124,92,252,0.2)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${form.creditHours === c ? 'rgba(124,92,252,0.5)' : 'rgba(255,255,255,0.06)'}`,
                    color: form.creditHours === c ? '#7c5cfc' : 'rgba(255,255,255,0.4)',
                  }}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* Attendance */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/35 mb-3">Attendance</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-mono text-[8px] text-white/25">Total Classes</label>
                <input type="number" min={0} value={form.totalClasses || ''} onChange={e => update('totalClasses', Number(e.target.value))} placeholder="0" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[8px] text-white/25">Classes Attended</label>
                <input type="number" min={0} value={form.attendedClasses || ''} onChange={e => update('attendedClasses', Number(e.target.value))} placeholder="0" className={inputCls} />
              </div>
            </div>
          </div>

          {/* Marks */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
            <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/35 mb-3">Marks</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'midterm' as const, label: 'Midterm', max: 30 },
                { key: 'assignments' as const, label: 'Assignments', max: 20 },
                { key: 'quizzes' as const, label: 'Quizzes', max: 10 },
                { key: 'total' as const, label: 'Total / Final', max: 100 },
              ].map(({ key, label, max }) => (
                <div key={key} className="space-y-1.5">
                  <label className="font-mono text-[8px] text-white/25">{label} <span className="text-white/15">/ {max}</span></label>
                  <input
                    type="number" min={0} max={max}
                    value={form.marks[key] ?? ''}
                    onChange={e => updateMark(key, e.target.value)}
                    placeholder={`out of ${max}`}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Grade override */}
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/35">Grade <span className="text-white/20 normal-case">(auto or override)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {GRADES.map(g => (
                <button key={g} type="button" onClick={() => update('grade', g)}
                  className="px-2.5 py-1 rounded-md text-[9px] font-mono font-bold transition-all cursor-pointer"
                  style={{
                    background: form.grade === g ? 'rgba(124,92,252,0.2)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${form.grade === g ? 'rgba(124,92,252,0.5)' : 'rgba(255,255,255,0.05)'}`,
                    color: form.grade === g ? '#7c5cfc' : 'rgba(255,255,255,0.35)',
                  }}
                >{g}</button>
              ))}
            </div>
          </div>

          {error && <p className="text-[10px] font-mono text-[#ff4d6d] bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 rounded-lg px-3 py-2">{error}</p>}

          <button onClick={handleSave}
            className="w-full py-3 rounded-xl font-mono text-[11px] uppercase tracking-[0.2em] font-bold cursor-pointer transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,rgba(124,92,252,0.25),rgba(124,92,252,0.12))', border: '1px solid rgba(124,92,252,0.4)', color: '#7c5cfc' }}
          >
            <Check className="w-4 h-4" /> Save Subject
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA GENERATOR
// ─────────────────────────────────────────────────────────────────────────────
function generateMockSubjects(): Subject[] {
  const data = [
    { name: 'Data Structures', code: 'CS-201', credits: 3, total: 40, attended: 34, mid: 24, asgn: 17, quiz: 8, totalMarks: 85 },
    { name: 'Calculus II', code: 'MATH-202', credits: 3, total: 36, attended: 27, mid: 19, asgn: 14, quiz: 6, totalMarks: 72 },
    { name: 'Operating Systems', code: 'CS-301', credits: 3, total: 44, attended: 38, mid: 26, asgn: 18, quiz: 9, totalMarks: 90 },
    { name: 'Digital Logic', code: 'EE-201', credits: 2, total: 30, attended: 22, mid: 15, asgn: 10, quiz: 5, totalMarks: 64 },
    { name: 'Technical Writing', code: 'ENG-201', credits: 2, total: 28, attended: 26, mid: 22, asgn: 17, quiz: 8, totalMarks: 78 },
  ];
  return data.map((d, i) => ({
    id: `mock-${i}`,
    name: d.name, code: d.code, creditHours: d.credits,
    totalClasses: d.total, attendedClasses: d.attended,
    marks: { midterm: d.mid, assignments: d.asgn, quizzes: d.quiz, final: null, total: d.totalMarks },
    grade: gradeFromTotal(d.totalMarks),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function AcademicInfoPanel() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('attendance');
  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | undefined>(undefined);
  const [expanded, setExpanded] = useState(true);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSubjects(JSON.parse(raw));
    } catch {}
  }, []);

  const save = useCallback((data: Subject[]) => {
    setSubjects(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const handleSave = (s: Subject) => {
    const existing = subjects.findIndex(x => x.id === s.id);
    const updated = existing >= 0
      ? subjects.map(x => x.id === s.id ? s : x)
      : [...subjects, s];
    save(updated);
    setShowModal(false);
    setEditSubject(undefined);
  };

  const handleDelete = (id: string) => {
    save(subjects.filter(s => s.id !== id));
  };

  const gpa = calcGPA(subjects);
  const avgAttendance = subjects.length > 0
    ? subjects.reduce((sum, s) => sum + (s.totalClasses > 0 ? (s.attendedClasses / s.totalClasses) * 100 : 0), 0) / subjects.length
    : 0;
  const lowAttendance = subjects.filter(s => s.totalClasses > 0 && (s.attendedClasses / s.totalClasses) * 100 < 75);

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'attendance', label: 'Attendance', icon: <Clock className="w-3 h-3" /> },
    { id: 'marks', label: 'Marks', icon: <BarChart2 className="w-3 h-3" /> },
    { id: 'transcript', label: 'Transcript', icon: <FileText className="w-3 h-3" /> },
  ];

  return (
    <>
      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <SubjectModal
            subject={editSubject}
            onSave={handleSave}
            onClose={() => { setShowModal(false); setEditSubject(undefined); }}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <div className="rounded-xl overflow-hidden" style={{
        background: 'linear-gradient(135deg,rgba(15,15,26,0.92) 0%,rgba(10,10,20,0.96) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 0 30px rgba(124,92,252,0.06), 0 8px 32px rgba(0,0,0,0.4)',
      }}>

        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
          style={{ borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg,rgba(124,92,252,0.2),rgba(139,92,246,0.1))', border: '1px solid rgba(124,92,252,0.3)' }}>
              <GraduationCap className="w-4 h-4 text-[#7c5cfc]" />
            </div>
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/90 font-bold">Academic Info</h3>
              <p className="font-mono text-[8px] text-white/30 mt-0.5">
                {subjects.length === 0 ? 'No subjects added' : `${subjects.length} subjects · GPA ${gpa}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* GPA badge */}
            {gpa !== 'N/A' && (
              <div className="px-2.5 py-1 rounded-full font-mono text-[10px] font-bold"
                style={{ background: 'rgba(124,92,252,0.15)', color: '#7c5cfc', border: '1px solid rgba(124,92,252,0.25)' }}>
                GPA {gpa}
              </div>
            )}
            {/* Warning badge */}
            {lowAttendance.length > 0 && (
              <div className="px-2 py-0.5 rounded-full font-mono text-[8px] font-bold flex items-center gap-1"
                style={{ background: 'rgba(255,77,109,0.12)', color: '#ff4d6d', border: '1px solid rgba(255,77,109,0.2)' }}>
                <AlertTriangle className="w-2.5 h-2.5" /> {lowAttendance.length} Low
              </div>
            )}
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
          </div>
        </div>

        {/* ── Body ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* Summary strip */}
              {subjects.length > 0 && (
                <div className="grid grid-cols-3 divide-x divide-white/[0.04]" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {[
                    { label: 'GPA', value: gpa, color: '#7c5cfc' },
                    { label: 'Avg Attend.', value: `${Math.round(avgAttendance)}%`, color: attendanceColor(avgAttendance).text },
                    { label: 'Subjects', value: subjects.length.toString(), color: 'rgba(255,255,255,0.7)' },
                  ].map(item => (
                    <div key={item.label} className="px-4 py-2.5 text-center">
                      <p className="font-mono text-[8px] text-white/30 uppercase tracking-wider">{item.label}</p>
                      <p className="font-mono text-[15px] font-bold mt-0.5" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tabs */}
              <div className="flex px-5 pt-4 gap-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-t-lg font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer relative"
                    style={{
                      color: activeTab === tab.id ? '#7c5cfc' : 'rgba(255,255,255,0.3)',
                      background: activeTab === tab.id ? 'rgba(124,92,252,0.08)' : 'transparent',
                      borderBottom: activeTab === tab.id ? '2px solid #7c5cfc' : '2px solid transparent',
                    }}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-5">
                <AnimatePresence mode="wait">

                  {/* ── ATTENDANCE TAB ── */}
                  {activeTab === 'attendance' && (
                    <motion.div key="attendance" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-3">
                      {subjects.length === 0 ? (
                        <EmptyState onAdd={() => setShowModal(true)} onMock={() => save(generateMockSubjects())} label="attendance" />
                      ) : (
                        <>
                          {subjects.map(s => (
                            <AttendancePill key={s.id} subject={s} onEdit={() => { setEditSubject(s); setShowModal(true); }} />
                          ))}
                        </>
                      )}
                    </motion.div>
                  )}

                  {/* ── MARKS TAB ── */}
                  {activeTab === 'marks' && (
                    <motion.div key="marks" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-2">
                      {subjects.length === 0 ? (
                        <EmptyState onAdd={() => setShowModal(true)} onMock={() => save(generateMockSubjects())} label="marks" />
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {['Subject', 'Mid/30', 'Asgn/20', 'Quiz/10', 'Total', 'Grade'].map(h => (
                                  <th key={h} className="text-left pb-2 font-mono text-[8px] uppercase tracking-wider text-white/25 pr-3 whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="space-y-1">
                              {subjects.map(s => {
                                const gradeColor = s.grade === 'F' ? '#ff4d6d' : s.grade?.startsWith('A') ? '#10b981' : s.grade?.startsWith('B') ? '#7c5cfc' : '#f5a623';
                                return (
                                  <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <td className="py-2.5 pr-3">
                                      <p className="text-[11px] text-white/80 font-medium">{s.name}</p>
                                      <p className="text-[8px] font-mono text-white/25">{s.code}</p>
                                    </td>
                                    {[s.marks.midterm, s.marks.assignments, s.marks.quizzes, s.marks.total].map((v, i) => (
                                      <td key={i} className="py-2.5 pr-3 font-mono text-[11px] text-white/60">{v ?? '—'}</td>
                                    ))}
                                    <td className="py-2.5 pr-1">
                                      <span className="font-mono text-[11px] font-bold" style={{ color: gradeColor }}>{s.grade || '—'}</span>
                                    </td>
                                    <td>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditSubject(s); setShowModal(true); }} className="p-1 rounded text-white/30 hover:text-white/60 cursor-pointer"><Edit2 className="w-3 h-3" /></button>
                                        <button onClick={() => handleDelete(s.id)} className="p-1 rounded text-white/20 hover:text-[#ff4d6d] cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ── TRANSCRIPT TAB ── */}
                  {activeTab === 'transcript' && (
                    <motion.div key="transcript" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-3">
                      {subjects.length === 0 ? (
                        <EmptyState onAdd={() => setShowModal(true)} onMock={() => save(generateMockSubjects())} label="transcript" />
                      ) : (
                        <>
                          {/* Transcript card */}
                          <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Academic Transcript</p>
                                <p className="text-[11px] text-white/70 mt-0.5">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} Semester</p>
                              </div>
                              <div className="text-right">
                                <p className="font-mono text-[8px] text-white/30 uppercase">Cumulative GPA</p>
                                <p className="font-mono text-[22px] font-bold text-[#7c5cfc]">{gpa}</p>
                              </div>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }} className="space-y-2">
                              {subjects.map(s => {
                                const pct = s.totalClasses > 0 ? (s.attendedClasses / s.totalClasses) * 100 : 0;
                                const gradeColor = s.grade === 'F' ? '#ff4d6d' : s.grade?.startsWith('A') ? '#10b981' : s.grade?.startsWith('B') ? '#7c5cfc' : '#f5a623';
                                const gp = GRADE_POINTS[s.grade] ?? null;
                                return (
                                  <div key={s.id} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold shrink-0"
                                        style={{ background: `${gradeColor}15`, color: gradeColor, border: `1px solid ${gradeColor}30` }}>
                                        {s.grade || '?'}
                                      </div>
                                      <div>
                                        <p className="text-[11px] text-white/80 font-medium leading-tight">{s.name}</p>
                                        <p className="text-[8px] font-mono text-white/30">{s.code} · {s.creditHours} CR</p>
                                      </div>
                                    </div>
                                    <div className="text-right space-y-0.5">
                                      <p className="font-mono text-[11px] font-bold" style={{ color: gradeColor }}>
                                        {gp !== null ? gp.toFixed(1) : '—'} <span className="text-white/20 text-[8px]">pts</span>
                                      </p>
                                      <p className="font-mono text-[8px]" style={{ color: attendanceColor(pct).text }}>{Math.round(pct)}% attend.</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* GPA breakdown */}
                            <div className="grid grid-cols-3 gap-2 pt-1">
                              {[
                                { label: 'GPA', value: gpa, color: '#7c5cfc' },
                                { label: 'Total Credits', value: subjects.reduce((s, x) => s + x.creditHours, 0).toString(), color: 'rgba(255,255,255,0.6)' },
                                { label: 'Avg Attend.', value: `${Math.round(avgAttendance)}%`, color: attendanceColor(avgAttendance).text },
                              ].map(item => (
                                <div key={item.label} className="rounded-lg px-3 py-2 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <p className="font-mono text-[7.5px] text-white/25 uppercase tracking-wider">{item.label}</p>
                                  <p className="font-mono text-[14px] font-bold mt-0.5" style={{ color: item.color }}>{item.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* Bottom action bar */}
                <div className="flex gap-2 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <button
                    onClick={() => { setEditSubject(undefined); setShowModal(true); }}
                    className="flex-1 py-2.5 rounded-lg font-mono text-[9px] uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2"
                    style={{ background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.25)', color: '#7c5cfc' }}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Subject
                  </button>
                  {subjects.length === 0 && (
                    <button
                      onClick={() => save(generateMockSubjects())}
                      className="flex-1 py-2.5 rounded-lg font-mono text-[9px] uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-2 text-white/40 hover:text-white/60 border border-white/[0.06] hover:border-white/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Mock Generate
                    </button>
                  )}
                  {subjects.length > 0 && (
                    <button
                      onClick={() => { if (confirm('Clear all subjects?')) save([]); }}
                      className="px-4 py-2.5 rounded-lg font-mono text-[9px] uppercase tracking-wider cursor-pointer transition-all text-white/20 hover:text-[#ff4d6d] border border-white/[0.05] hover:border-[#ff4d6d]/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ onAdd, onMock, label }: { onAdd: () => void; onMock: () => void; label: string }) {
  return (
    <div className="text-center py-8 space-y-3">
      <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto">
        <BookOpen className="w-5 h-5 text-white/20" />
      </div>
      <div>
        <p className="font-mono text-[10px] text-white/40">No {label} data yet</p>
        <p className="font-mono text-[8px] text-white/20 mt-1">Add subjects to track your {label}</p>
      </div>
      <div className="flex gap-2 justify-center">
        <button onClick={onAdd}
          className="px-4 py-2 rounded-lg font-mono text-[9px] uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
          style={{ background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.3)', color: '#7c5cfc' }}>
          <Plus className="w-3 h-3" /> Add Subject
        </button>
        <button onClick={onMock}
          className="px-4 py-2 rounded-lg font-mono text-[9px] uppercase tracking-wider cursor-pointer text-white/35 hover:text-white/60 border border-white/[0.06] hover:border-white/[0.1] transition-all flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Mock Data
        </button>
      </div>
    </div>
  );
}
