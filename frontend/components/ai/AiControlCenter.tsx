'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, Zap, Globe, Lock, X, Eye, EyeOff, AlertCircle,
} from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';

interface AiProvider {
  id: string;
  name: string;
  apiKeyRaw: string;
  baseUrl: string | null;
  providerType?: string;
  isActive: boolean;
  createdAt: string;
  colorIndex: number;
}

const STORAGE_KEY = 'fasca_ai_providers_v1';

const CARD_COLORS = [
  { color: '#7c5cfc', glow: 'rgba(124,92,252,0.35)' },
  { color: '#06b6d4', glow: 'rgba(6,182,212,0.35)' },
  { color: '#f472b6', glow: 'rgba(244,114,182,0.35)' },
  { color: '#10b981', glow: 'rgba(16,185,129,0.35)' },
  { color: '#f59e0b', glow: 'rgba(245,158,11,0.35)' },
];

function maskKey(key: string): string {
  if (!key || key.length <= 4) return '••••';
  return `••••••••${key.slice(-4)}`;
}

function inferProviderType(name: string, key: string): string {
  const n = name.trim().toUpperCase();
  const k = key.trim();
  if (k.startsWith('sk-ant-') || n.includes('ANTHROPIC') || n.includes('CLAUDE')) return 'ANTHROPIC';
  if (n.includes('DEEPSEEK')) return 'DEEPSEEK';
  if (k.startsWith('sk-') || n.includes('OPENAI') || n.includes('GPT')) return 'OPENAI';
  if (k.startsWith('AIza') || n.includes('GEMINI') || n.includes('GOOGLE')) return 'GEMINI';
  return 'CUSTOM';
}

interface AddModalProps {
  onClose: () => void;
  onAdded: (p: AiProvider) => void;
  nextColorIndex: number;
}

function AddProviderModal({ onClose, onAdded, nextColorIndex }: AddModalProps) {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [providerType, setProviderType] = useState('CUSTOM');

  useEffect(() => {
    setProviderType(inferProviderType(name, apiKey));
  }, [name, apiKey]);

  const palette = CARD_COLORS[nextColorIndex % CARD_COLORS.length];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Engine name is required.'); return; }
    if (!apiKey.trim()) { setError('API key is required.'); return; }
    setError('');

    let provider: AiProvider = {
      id: `ap_${Date.now()}`,
      name: name.trim(),
      apiKeyRaw: apiKey.trim(),
      baseUrl: baseUrl.trim() || null,
      providerType: providerType,
      isActive: false,
      createdAt: new Date().toISOString(),
      colorIndex: nextColorIndex % CARD_COLORS.length,
    };

    try {
      const { addAiProvider } = await import('../../lib/api');
      const savedProvider = await addAiProvider(provider.name, provider.providerType || 'CUSTOM', provider.apiKeyRaw, provider.baseUrl || undefined);
      if (savedProvider && savedProvider.id) {
        provider.id = savedProvider.id;
      }
    } catch (err) {
      console.error('Failed to save AI provider to backend:', err);
      // Fallback to local storage only if backend fails
    }

    onAdded(provider);
    onClose();
  };


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
        className="w-full max-w-sm"
        style={{
          background: 'linear-gradient(135deg,#0f0f1a 0%,#12121f 100%)',
          border: `1px solid ${palette.color}40`,
          borderRadius: 12,
          boxShadow: `0 0 40px ${palette.glow}, 0 24px 48px rgba(0,0,0,0.5)`,
        }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">Connect AI Engine</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Engine Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My GPT-4o Key"
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-•••••••••••••••"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="font-mono text-[8px] text-white/25 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> Stored locally in your browser only
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              Base URL <span className="text-white/20 normal-case">(optional — for Ollama / custom endpoints)</span>
            </label>
            <input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://openrouter.ai/api/v1"
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Provider Type</label>
            <select
              value={providerType}
              onChange={e => setProviderType(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white/90 font-mono focus:outline-none focus:border-white/25 transition-colors cursor-pointer"
            >
              <option value="OPENAI" className="bg-[#0f0f1a]">OPENAI</option>
              <option value="GEMINI" className="bg-[#0f0f1a]">GEMINI</option>
              <option value="ANTHROPIC" className="bg-[#0f0f1a]">ANTHROPIC</option>
              <option value="CUSTOM" className="bg-[#0f0f1a]">CUSTOM</option>
            </select>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-[#ff4d6d] font-mono text-[10px] bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 rounded-lg px-3 py-2"
              >
                <AlertCircle className="w-3 h-3 shrink-0" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            className="w-full py-3 rounded-lg font-mono text-[11px] uppercase tracking-[0.2em] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all"
            style={{
              background: `linear-gradient(135deg,${palette.color}20,${palette.color}10)`,
              border: `1px solid ${palette.color}60`,
              color: palette.color,
            }}
          >
            <Plus className="w-4 h-4" /> Add Engine
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function AiControlCenter() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const { setAiModel } = useFouzar();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProviders(JSON.parse(raw));
    } catch {}
  }, []);

  const save = useCallback((data: AiProvider[]) => {
    setProviders(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('storage'));
  }, []);

  const handleAdded = (p: AiProvider) => save([p, ...providers]);

  const handleToggle = async (id: string) => {
    if (isMutating) return;
    setIsMutating(true);
    
    const target = providers.find(p => p.id === id);
    if (!target) {
      setIsMutating(false);
      return;
    }
    
    const isCurrentlyActive = target.isActive;
    const nextActiveState = !isCurrentlyActive;
    
    const nextProvidersState = providers.map(p => ({
      ...p,
      isActive: p.id === id ? nextActiveState : false
    }));
    save(nextProvidersState);

    if (!nextActiveState) {
      setAiModel('deepseek');
    }

    try {
      const { toggleAiProviderActive } = await import('../../lib/api');
      await toggleAiProviderActive(id);
    } catch (err) {
      console.error('Failed to sync toggle with backend:', err);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isMutating) return;
    setIsMutating(true);
    setDeletingId(id);
    
    const target = providers.find(p => p.id === id);
    const updatedProviders = providers.filter(p => p.id !== id);
    save(updatedProviders);
    
    if (target?.isActive) {
      setAiModel('deepseek');
    }

    try {
      const { deleteAiProvider } = await import('../../lib/api');
      await deleteAiProvider(id);
    } catch (err) {
      console.error('Failed to sync delete with backend:', err);
    } finally {
      setDeletingId(null);
      setIsMutating(false);
    }
  };

  const activeProvider = providers.find(p => p.isActive);

  return (
    <>
      <AnimatePresence>
        {showAddModal && (
          <AddProviderModal
            onClose={() => setShowAddModal(false)}
            onAdded={handleAdded}
            nextColorIndex={providers.length}
          />
        )}
      </AnimatePresence>

      <div className="rounded-xl overflow-hidden" style={{
        background: 'linear-gradient(135deg,rgba(15,15,26,0.9) 0%,rgba(10,10,20,0.95) 100%)',
        border: '1px solid rgba(124,92,252,0.2)',
        boxShadow: '0 0 30px rgba(124,92,252,0.08), 0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
          style={{ borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
              background: 'linear-gradient(135deg,rgba(124,92,252,0.2),rgba(139,92,246,0.1))',
              border: '1px solid rgba(124,92,252,0.3)',
            }}>
              <Zap className="w-4 h-4 text-[#7c5cfc]" />
            </div>
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/90 font-bold">AI Engines</h3>
              <p className="font-mono text-[8px] text-white/30 mt-0.5">
                {providers.length === 0
                  ? 'No engines configured'
                  : activeProvider
                    ? `Active: ${activeProvider.name}`
                    : `${providers.length} engine${providers.length !== 1 ? 's' : ''} · none active`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{
              background: activeProvider ? '#10b981' : 'rgba(255,255,255,0.15)',
              boxShadow: activeProvider ? '0 0 6px rgba(16,185,129,0.6)' : 'none',
            }} />
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/30" /> : <ChevronDown className="w-3.5 h-3.5 text-white/30" />}
          </div>
        </div>

        {/* Body */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            >
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
                    const palette = CARD_COLORS[provider.colorIndex ?? 0];
                    const isDeleting = deletingId === provider.id;
                    return (
                      <motion.div
                        key={provider.id}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: isDeleting ? 0 : 1, x: isDeleting ? 20 : 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => !isMutating && handleToggle(provider.id)}
                        className={`relative rounded-lg p-3.5 transition-all select-none ${
                          isMutating ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                        }`}
                        style={{
                          background: provider.isActive
                            ? `linear-gradient(135deg,${palette.color}10,${palette.color}06)`
                            : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${provider.isActive ? palette.color : 'rgba(255,255,255,0.06)'}`,
                          boxShadow: provider.isActive
                            ? `0 0 20px ${palette.glow}, 0 0 40px ${palette.glow.replace('0.35', '0.15')}`
                            : 'none',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Active glow dot */}
                          <div className="w-2 h-2 rounded-full shrink-0 transition-all" style={{
                            background: provider.isActive ? palette.color : 'rgba(255,255,255,0.12)',
                            boxShadow: provider.isActive ? `0 0 8px ${palette.color}` : 'none',
                          }} />

                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] font-semibold text-white/90 truncate block">
                              {provider.name}
                            </span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[8px] text-white/25 flex items-center gap-1">
                                <Lock className="w-2 h-2" />{maskKey(provider.apiKeyRaw)}
                              </span>
                              {provider.baseUrl && (
                                <span className="font-mono text-[8px] text-white/20 flex items-center gap-0.5">
                                  <Globe className="w-2 h-2 shrink-0" />custom
                                </span>
                              )}
                            </div>
                          </div>

                          {provider.isActive && (
                            <span className="font-mono text-[7px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: `${palette.color}20`, color: palette.color, border: `1px solid ${palette.color}40` }}>
                              Active
                            </span>
                          )}

                          <button
                            onClick={e => { e.stopPropagation(); !isMutating && handleDelete(provider.id); }}
                            disabled={isMutating}
                            className={`w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/10 transition-all shrink-0 ${
                              isMutating ? 'cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title="Remove engine"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full py-2.5 rounded-lg font-mono text-[9px] uppercase tracking-[0.2em] text-white/30 hover:text-[#7c5cfc] border border-dashed border-white/10 hover:border-[#7c5cfc]/40 hover:bg-[#7c5cfc]/[0.04] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Add AI Engine
                </button>
              </div>

              <div className="px-5 py-2.5 flex items-center gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Lock className="w-2.5 h-2.5 text-white/20 shrink-0" />
                <p className="font-mono text-[8px] text-white/20">Keys stored locally. Click a card to activate. One engine active at a time.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
