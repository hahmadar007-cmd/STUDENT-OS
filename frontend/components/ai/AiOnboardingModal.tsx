'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Eye, EyeOff, Zap, Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface AiOnboardingModalProps {
  onClose: () => void;
}

interface EngineEntry {
  name: string;
  apiKey: string;
  providerType: string;
  showKey: boolean;
  validStatus: 'idle' | 'testing' | 'ok' | 'fail';
  validMsg: string;
}

const STORAGE_KEY = 'fasca_ai_providers_v1';

function inferProviderType(name: string, key: string): string {
  const n = name.trim().toUpperCase();
  const k = key.trim();
  if (k.startsWith('sk-ant-') || n.includes('ANTHROPIC') || n.includes('CLAUDE')) return 'ANTHROPIC';
  if (n.includes('DEEPSEEK')) return 'DEEPSEEK';
  if (n.includes('OPENROUTER')) return 'OPENROUTER';
  if (k.startsWith('sk-') || n.includes('OPENAI') || n.includes('GPT')) return 'OPENAI';
  if (k.startsWith('AIza') || n.includes('GEMINI') || n.includes('GOOGLE')) return 'GEMINI';
  return 'CUSTOM';
}

const CARD_COLORS = [
  { color: '#7c5cfc', glow: 'rgba(124,92,252,0.35)' },
  { color: '#06b6d4', glow: 'rgba(6,182,212,0.35)' },
  { color: '#f472b6', glow: 'rgba(244,114,182,0.35)' },
];

export const AiOnboardingModal: React.FC<AiOnboardingModalProps> = ({ onClose }) => {
  const [entries, setEntries] = useState<EngineEntry[]>([
    { name: '', apiKey: '', providerType: 'GEMINI', showKey: false, validStatus: 'idle', validMsg: '' },
  ]);
  const [globalError, setGlobalError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const dismiss = () => {
    localStorage.setItem('fasca_onboarded', '1');
    onClose();
  };

  const updateEntry = (index: number, field: keyof EngineEntry, value: string | boolean) => {
    setEntries(prev => prev.map((e, i) => {
      if (i !== index) return e;
      const updated = { ...e, [field]: value };
      // Auto-infer provider type when name or key changes, reset validation
      if (field === 'name' || field === 'apiKey') {
        updated.providerType = inferProviderType(
          field === 'name' ? (value as string) : e.name,
          field === 'apiKey' ? (value as string) : e.apiKey,
        );
        updated.validStatus = 'idle';
        updated.validMsg = '';
      }
      return updated;
    }));
  };

  const setEntryValidation = (index: number, status: EngineEntry['validStatus'], msg: string) => {
    setEntries(prev => prev.map((e, i) => i === index ? { ...e, validStatus: status, validMsg: msg } : e));
  };

  const addEntry = () => {
    if (entries.length >= 3) return;
    setEntries(prev => [...prev, { name: '', apiKey: '', providerType: 'GEMINI', showKey: false, validStatus: 'idle', validMsg: '' }]);
  };

  const handleSave = async () => {
    const valid = entries.filter(e => e.name.trim() && e.apiKey.trim());
    if (valid.length === 0) {
      setGlobalError('Add at least one engine name and API key.');
      return;
    }
    setGlobalError('');
    setIsSaving(true);

    // ── Validate each entry live ──────────────────────────────────────────────
    const { validateAiKey } = await import('../../lib/api');
    let allOk = true;

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.name.trim() || !e.apiKey.trim()) continue;
      setEntryValidation(i, 'testing', 'Testing…');
      try {
        const result = await validateAiKey(e.providerType, e.apiKey.trim());
        if (result.ok) {
          setEntryValidation(i, 'ok', result.message || 'Connected ✓');
        } else {
          setEntryValidation(i, 'fail', result.message || 'Key rejected.');
          allOk = false;
        }
      } catch (err: any) {
        setEntryValidation(i, 'fail', err.message || 'Validation failed.');
        allOk = false;
      }
    }

    if (!allOk) {
      setGlobalError('Fix the errors above, then try again. Or save anyway below.');
      setIsSaving(false);
      return;
    }

    await persistAndClose(entries.filter(e => e.name.trim() && e.apiKey.trim()));
    setIsSaving(false);
  };

  const handleSaveAnyway = async () => {
    const valid = entries.filter(e => e.name.trim() && e.apiKey.trim());
    if (valid.length === 0) return;
    setIsSaving(true);
    await persistAndClose(valid);
    setIsSaving(false);
  };

  const persistAndClose = async (valid: EngineEntry[]) => {
    const providers = valid.map((e, i) => ({
      id: `ap_${Date.now()}_${i}`,
      name: e.name.trim(),
      apiKeyRaw: e.apiKey.trim(),
      baseUrl: null,
      providerType: e.providerType,
      isActive: i === 0, // first engine auto-activated
      createdAt: new Date().toISOString(),
      colorIndex: i % CARD_COLORS.length,
    }));

    try {
      const { addAiProvider } = await import('../../lib/api');
      for (const p of providers) {
        const savedProvider = await addAiProvider(p.name, p.providerType || 'GEMINI', p.apiKeyRaw, p.baseUrl || undefined);
        if (savedProvider && savedProvider.id) p.id = savedProvider.id;
      }
    } catch (err) {
      console.error('Failed to sync to backend:', err);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
    window.dispatchEvent(new Event('storage'));
    localStorage.setItem('fasca_onboarded', '1');
    onClose();
  };

  const hasAnyFail = entries.some(e => e.validStatus === 'fail');

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ scale: 0.93, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.93, y: 24 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full max-w-md relative"
        style={{
          background: 'linear-gradient(135deg,#0f0f1a 0%,#12121f 100%)',
          border: '1px solid rgba(124,92,252,0.35)',
          borderRadius: 14,
          boxShadow: '0 0 50px rgba(124,92,252,0.2), 0 30px 60px rgba(0,0,0,0.6)',
        }}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-white/25 hover:text-white/60 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 pt-7 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.35)' }}>
              <Zap className="w-4 h-4 text-[#7c5cfc]" />
            </div>
            <h2 className="font-mono text-[15px] font-bold text-white/90 uppercase tracking-wider">Connect your AI</h2>
          </div>
          <p className="font-mono text-[9px] text-white/35 mt-2 leading-relaxed">
            Paste your API key — the app will test it live before saving. Keys stay in your browser only.
          </p>
        </div>

        <div className="px-7 py-5 space-y-4">
          <AnimatePresence initial={false}>
            {entries.map((entry, i) => {
              const palette = CARD_COLORS[i % CARD_COLORS.length];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="space-y-2.5 p-4 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${palette.color}25` }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: palette.color, boxShadow: `0 0 6px ${palette.color}` }} />
                    <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: palette.color }}>
                      Engine {i + 1}
                    </span>
                  </div>

                  <input
                    value={entry.name}
                    onChange={e => updateEntry(i, 'name', e.target.value)}
                    placeholder="e.g. My Gemini Key"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
                  />

                  <div className="relative">
                    <input
                      type={entry.showKey ? 'text' : 'password'}
                      value={entry.apiKey}
                      onChange={e => updateEntry(i, 'apiKey', e.target.value)}
                      placeholder="sk-•••••••• or AIza••••••"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 pr-10 py-2 text-[12px] text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => updateEntry(i, 'showKey', !entry.showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/55 cursor-pointer"
                    >
                      {entry.showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Per-row provider type selector */}
                  <select
                    value={entry.providerType}
                    onChange={e => updateEntry(i, 'providerType', e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white/70 font-mono focus:outline-none focus:border-white/25 transition-colors cursor-pointer"
                  >
                    <option value="GEMINI" className="bg-[#0f0f1a]">GEMINI</option>
                    <option value="OPENAI" className="bg-[#0f0f1a]">OPENAI</option>
                    <option value="ANTHROPIC" className="bg-[#0f0f1a]">ANTHROPIC</option>
                    <option value="DEEPSEEK" className="bg-[#0f0f1a]">DEEPSEEK</option>
                    <option value="OPENROUTER" className="bg-[#0f0f1a]">OPENROUTER</option>
                    <option value="CUSTOM" className="bg-[#0f0f1a]">CUSTOM</option>
                  </select>

                  {/* Per-row validation status */}
                  <AnimatePresence>
                    {entry.validStatus === 'testing' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 font-mono text-[9px] text-white/40">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> {entry.validMsg}
                      </motion.div>
                    )}
                    {entry.validStatus === 'ok' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 font-mono text-[9px] text-emerald-400">
                        <CheckCircle className="w-2.5 h-2.5" /> {entry.validMsg}
                      </motion.div>
                    )}
                    {entry.validStatus === 'fail' && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 font-mono text-[9px] text-[#ff4d6d]">
                        <AlertCircle className="w-2.5 h-2.5 shrink-0" /> {entry.validMsg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {entries.length < 3 && (
            <button
              type="button"
              onClick={addEntry}
              className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-white/30 hover:text-[#7c5cfc] transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add another
            </button>
          )}

          <AnimatePresence>
            {globalError && (
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="font-mono text-[9px] text-[#ff4d6d] uppercase tracking-wider"
              >
                {globalError}
              </motion.p>
            )}
          </AnimatePresence>

          <p className="font-mono text-[7.5px] text-white/20 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Keys are stored locally in your browser — never sent to our servers.
          </p>
        </div>

        <div className="px-7 pb-7 flex flex-col gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-xl font-mono text-[11px] uppercase tracking-[0.2em] font-bold cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
            style={{
              background: 'linear-gradient(135deg,rgba(124,92,252,0.25),rgba(124,92,252,0.12))',
              border: '1px solid rgba(124,92,252,0.55)',
              color: '#a78bfa',
            }}
          >
            {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Testing keys…</> : 'Test & Save'}
          </button>

          {hasAnyFail && (
            <button
              onClick={handleSaveAnyway}
              disabled={isSaving}
              className="w-full py-2 font-mono text-[9px] uppercase tracking-wider text-white/30 hover:text-white/55 transition-colors cursor-pointer"
            >
              Save anyway (skip validation)
            </button>
          )}

          <button
            onClick={dismiss}
            className="w-full py-2 font-mono text-[9px] uppercase tracking-wider text-white/20 hover:text-white/40 transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
