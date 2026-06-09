'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Power, ChevronDown, ChevronUp,
  Loader2, Zap, Globe, Lock, CheckCircle, X, Eye, EyeOff, AlertCircle,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type ProviderType = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'CUSTOM';

interface AiProvider {
  id: string;
  name: string;
  providerType: ProviderType;
  apiKeyMasked: string;   // for display only: ••••••••[last4]
  apiKeyRaw: string;      // stored locally (not sent anywhere)
  baseUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'fasca_ai_providers_v1';

// ── Provider metadata ──────────────────────────────────────────────────────────
const PROVIDER_META: Record<ProviderType, { label: string; color: string; glow: string; icon: string }> = {
  OPENAI:    { label: 'OpenAI',    color: '#10a37f', glow: 'rgba(16,163,127,0.3)',  icon: '⬡' },
  ANTHROPIC: { label: 'Anthropic', color: '#d97757', glow: 'rgba(217,119,87,0.3)',  icon: '◈' },
  GEMINI:    { label: 'Gemini',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)',  icon: '◇' },
  CUSTOM:    { label: 'Custom',    color: '#06b6d4', glow: 'rgba(6,182,212,0.3)',   icon: '⬡' },
};

const ALL_PROVIDER_TYPES: ProviderType[] = ['OPENAI', 'ANTHROPIC', 'GEMINI', 'CUSTOM'];

function maskKey(key: string): string {
  if (!key || key.length <= 4) return '••••';
  return `••••••••${key.slice(-4)}`;
}

// ── Add Provider Modal ─────────────────────────────────────────────────────────
interface AddModalProps {
  onClose: () => void;
  onAdded: (p: AiProvider) => void;
}

function AddProviderModal({ onClose, onAdded }: AddModalProps) {
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('OPENAI');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!apiKey.trim()) { setError('API key is required.'); return; }
    setError('');

    const provider: AiProvider = {
      id: `ap_${Date.now()}`,
      name: name.trim(),
      providerType,
      apiKeyRaw: apiKey.trim(),
      apiKeyMasked: maskKey(apiKey.trim()),
      baseUrl: baseUrl.trim() || null,
      isActive: false,
      createdAt: new Date().toISOString(),
    };
    onAdded(provider);
    onClose();
  };

  const meta = PROVIDER_META[providerType];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md"
        style={{
          background: 'linear-gradient(135deg,#0f0f1a 0%,#12121f 100%)',
          border: `1px solid ${meta.color}40`,
          borderRadius: 12,
          boxShadow: `0 0 40px ${meta.glow}, 0 24px 48px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <span style={{ color: meta.color, fontSize: 18 }}>{meta.icon}</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">New AI Engine</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Provider type */}
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Provider</label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_PROVIDER_TYPES.map(pt => {
                const m = PROVIDER_META[pt];
                return (
                  <button key={pt} type="button" onClick={() => setProviderType(pt)}
                    className="py-2 rounded-lg transition-all cursor-pointer"
                    style={{
                      background: providerType === pt ? `${m.color}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${providerType === pt ? m.color : 'rgba(255,255,255,0.08)'}`,
                      color: providerType === pt ? m.color : 'rgba(255,255,255,0.4)',
                    }}>
                    <div className="text-xs font-mono font-bold">{m.icon}</div>
                    <div className="text-[8px] font-mono mt-0.5">{m.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Engine Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={`e.g. My ${meta.label} Key`}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors" />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">API Key</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                placeholder="sk-•••••••••••••••"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors" />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="font-mono text-[8px] text-white/25 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Stored locally in your browser only
            </p>
          </div>

          {/* Base URL for Custom */}
          {providerType === 'CUSTOM' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Base URL <span className="text-white/20 normal-case">(Ollama / local)</span></label>
              <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="http://localhost:11434/v1"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors" />
            </motion.div>
          )}

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-[#ff4d6d] font-mono text-[10px] bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3 h-3 shrink-0" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit"
            className="w-full py-3 rounded-lg font-mono text-[11px] uppercase tracking-[0.2em] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all"
            style={{ background: `linear-gradient(135deg,${meta.color}20,${meta.color}10)`, border: `1px solid ${meta.color}60`, color: meta.color }}>
            <Plus className="w-4 h-4" /> Add Engine
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AiControlCenter() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProviders(JSON.parse(raw));
    } catch {}
  }, []);

  const save = useCallback((data: AiProvider[]) => {
    setProviders(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const handleAdded = (p: AiProvider) => save([p, ...providers]);

  const handleToggle = (id: string) => {
    const updated = providers.map(p => ({
      ...p,
      isActive: p.id === id ? !p.isActive : (providers.find(x => x.id === id)?.isActive ? false : p.isActive),
    }));
    // enforce single-active
    const target = updated.find(p => p.id === id);
    if (target?.isActive) {
      save(updated.map(p => p.id === id ? p : { ...p, isActive: false }));
    } else {
      save(updated);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      save(providers.filter(p => p.id !== id));
      setDeletingId(null);
    }, 300);
  };

  const activeProvider = providers.find(p => p.isActive);

  return (
    <>
      <AnimatePresence>
        {showAddModal && <AddProviderModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />}
      </AnimatePresence>

      <div className="rounded-xl overflow-hidden" style={{
        background: 'linear-gradient(135deg,rgba(15,15,26,0.9) 0%,rgba(10,10,20,0.95) 100%)',
        border: '1px solid rgba(124,92,252,0.2)',
        boxShadow: '0 0 30px rgba(124,92,252,0.08), 0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
          style={{ borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(124,92,252,0.2),rgba(139,92,246,0.1))', border: '1px solid rgba(124,92,252,0.3)' }}>
              <Zap className="w-4 h-4 text-[#7c5cfc]" />
            </div>
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/90 font-bold">AI Control Center</h3>
              <p className="font-mono text-[8px] text-white/30 mt-0.5">
                {providers.length === 0 ? 'No engines configured' : activeProvider ? `Active: ${activeProvider.name}` : `${providers.length} engine${providers.length !== 1 ? 's' : ''} · none active`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full"
              style={{ background: activeProvider ? '#10b981' : 'rgba(255,255,255,0.15)', boxShadow: activeProvider ? '0 0 6px rgba(16,185,129,0.6)' : 'none' }} />
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
          </div>
        </div>

        {/* Body */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="px-5 py-4 space-y-3">
                {providers.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-3">
                      <Zap className="w-4 h-4 text-white/20" />
                    </div>
                    <p className="font-mono text-[10px] text-white/30">No AI engines configured yet.</p>
                    <p className="font-mono text-[9px] text-white/20 mt-1">Add one to power your AI features.</p>
                  </div>
                )}

                <AnimatePresence>
                  {providers.map(provider => {
                    const meta = PROVIDER_META[provider.providerType];
                    const isDeleting = deletingId === provider.id;
                    return (
                      <motion.div key={provider.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: isDeleting ? 0 : 1, x: isDeleting ? 20 : 0 }}
                        exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
                        className="relative rounded-lg p-3.5 transition-all"
                        style={{
                          background: provider.isActive ? `linear-gradient(135deg,${meta.color}08,${meta.color}04)` : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${provider.isActive ? meta.color + '35' : 'rgba(255,255,255,0.06)'}`,
                          boxShadow: provider.isActive ? `0 0 16px ${meta.glow}` : 'none',
                        }}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-mono text-base font-bold"
                            style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30`, color: meta.color }}>
                            {meta.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-white/90 truncate">{provider.name}</span>
                              {provider.isActive && <CheckCircle className="w-3 h-3 text-[#10b981] shrink-0" />}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                                style={{ background: `${meta.color}15`, color: meta.color }}>{meta.label}</span>
                              <span className="font-mono text-[8px] text-white/25 flex items-center gap-1">
                                <Lock className="w-2 h-2" />{provider.apiKeyMasked}
                              </span>
                              {provider.baseUrl && (
                                <span className="font-mono text-[8px] text-white/20 flex items-center gap-0.5">
                                  <Globe className="w-2 h-2 shrink-0" />local
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => handleToggle(provider.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                              style={{
                                background: provider.isActive ? `${meta.color}20` : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${provider.isActive ? meta.color + '40' : 'rgba(255,255,255,0.08)'}`,
                                color: provider.isActive ? meta.color : 'rgba(255,255,255,0.3)',
                              }} title={provider.isActive ? 'Deactivate' : 'Activate'}>
                              <Power className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(provider.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/10 border border-transparent hover:border-[#ff4d6d]/20 transition-all cursor-pointer"
                              title="Remove engine">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                <button onClick={() => setShowAddModal(true)}
                  className="w-full py-2.5 rounded-lg font-mono text-[9px] uppercase tracking-[0.2em] text-white/30 hover:text-[#7c5cfc] border border-dashed border-white/10 hover:border-[#7c5cfc]/40 hover:bg-[#7c5cfc]/[0.04] transition-all cursor-pointer flex items-center justify-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Add AI Engine
                </button>
              </div>

              <div className="px-5 py-2.5 flex items-center gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Lock className="w-2.5 h-2.5 text-white/20 shrink-0" />
                <p className="font-mono text-[8px] text-white/20">Keys are stored locally in your browser. One engine active at a time.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
