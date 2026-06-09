'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Power,
  ChevronDown,
  ChevronUp,
  Loader2,
  Zap,
  Globe,
  Lock,
  CheckCircle,
  AlertCircle,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
type ProviderType = 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'CUSTOM';

interface AiProvider {
  id: string;
  name: string;
  providerType: ProviderType;
  apiKeyMasked: string;
  baseUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

// ── Provider metadata ──────────────────────────────────────────────────────────
const PROVIDER_META: Record<ProviderType, { label: string; color: string; glow: string; icon: string }> = {
  OPENAI:    { label: 'OpenAI',    color: '#10a37f', glow: 'rgba(16,163,127,0.3)',  icon: '⬡' },
  ANTHROPIC: { label: 'Anthropic', color: '#d97757', glow: 'rgba(217,119,87,0.3)',  icon: '◈' },
  GEMINI:    { label: 'Gemini',    color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)',  icon: '◇' },
  CUSTOM:    { label: 'Custom',    color: '#06b6d4', glow: 'rgba(6,182,212,0.3)',   icon: '⬡' },
};

const ALL_PROVIDER_TYPES: ProviderType[] = ['OPENAI', 'ANTHROPIC', 'GEMINI', 'CUSTOM'];

// ── API helpers ────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch(path: string, userId: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

// ── Add Provider Modal ─────────────────────────────────────────────────────────
interface AddModalProps {
  userId: string;
  onClose: () => void;
  onAdded: (p: AiProvider) => void;
}

function AddProviderModal({ userId, onClose, onAdded }: AddModalProps) {
  const [name, setName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('OPENAI');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!apiKey.trim()) { setError('API key is required.'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await apiFetch('/ai-providers', userId, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          providerType,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim() || undefined,
        }),
      });
      onAdded(result);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const needsBaseUrl = providerType === 'CUSTOM';
  const meta = PROVIDER_META[providerType];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md relative"
        style={{
          background: 'linear-gradient(135deg, #0f0f1a 0%, #12121f 100%)',
          border: `1px solid ${meta.color}40`,
          borderRadius: '12px',
          boxShadow: `0 0 40px ${meta.glow}, 0 24px 48px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span style={{ color: meta.color, fontSize: '18px' }}>{meta.icon}</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">New AI Engine</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Provider type selector */}
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">Provider</label>
            <div className="grid grid-cols-4 gap-2">
              {ALL_PROVIDER_TYPES.map((pt) => {
                const m = PROVIDER_META[pt];
                return (
                  <button
                    key={pt}
                    type="button"
                    onClick={() => setProviderType(pt)}
                    className="relative py-2 rounded-[6px] transition-all cursor-pointer"
                    style={{
                      background: providerType === pt ? `${m.color}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${providerType === pt ? m.color : 'rgba(255,255,255,0.08)'}`,
                      color: providerType === pt ? m.color : 'rgba(255,255,255,0.4)',
                    }}
                  >
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
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. My ${meta.label} GPT-4o`}
              className="w-full bg-white/[0.04] border border-white/10 rounded-[6px] px-3 py-2.5 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-•••••••••••••••••••••"
                className="w-full bg-white/[0.04] border border-white/10 rounded-[6px] px-3 pr-10 py-2.5 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="font-mono text-[8px] text-white/25 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              Encrypted with AES-256 before storage
            </p>
          </div>

          {/* Base URL (Custom only) */}
          {needsBaseUrl && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
                Base URL <span className="text-white/20">(optional for Ollama/local)</span>
              </label>
              <input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:11434/v1"
                className="w-full bg-white/[0.04] border border-white/10 rounded-[6px] px-3 py-2.5 text-sm text-white/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
              />
            </motion.div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="flex items-center gap-2 text-[#ff4d6d] font-mono text-[10px] bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 rounded-[6px] px-3 py-2"
              >
                <AlertCircle className="w-3 h-3 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-[6px] font-mono text-[11px] uppercase tracking-[0.2em] font-bold transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, ${meta.color}20, ${meta.color}10)`,
              border: `1px solid ${meta.color}60`,
              color: meta.color,
            }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Encrypting & Saving...' : 'Add Engine'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface AiControlCenterProps {
  userId: string;
}

export function AiControlCenter({ userId }: AiControlCenterProps) {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/ai-providers', userId);
      setProviders(data);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadProviders();
  }, [userId, loadProviders]);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const updated = await apiFetch(`/ai-providers/${id}/toggle`, userId, { method: 'PATCH' });
      setProviders((prev) =>
        prev.map((p) => {
          if (updated.isActive && p.id !== id) return { ...p, isActive: false };
          if (p.id === id) return { ...p, ...updated };
          return p;
        })
      );
    } catch {
      // silent fail
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiFetch(`/ai-providers/${id}`, userId, { method: 'DELETE' });
      setProviders((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // silent fail
    } finally {
      setDeletingId(null);
    }
  };

  const activeProvider = providers.find((p) => p.isActive);

  return (
    <>
      {/* Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddProviderModal
            userId={userId}
            onClose={() => setShowAddModal(false)}
            onAdded={(p) => setProviders((prev) => [p, ...prev])}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(15,15,26,0.9) 0%, rgba(10,10,20,0.95) 100%)',
          border: '1px solid rgba(124,92,252,0.2)',
          boxShadow: '0 0 30px rgba(124,92,252,0.08), 0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* ── Panel Header ── */}
        <div
          className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none"
          style={{ borderBottom: expanded ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(124,92,252,0.2), rgba(139,92,246,0.1))',
                border: '1px solid rgba(124,92,252,0.3)',
              }}
            >
              <Zap className="w-4 h-4 text-[#7c5cfc]" />
            </div>
            <div>
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/90 font-bold">
                AI Control Center
              </h3>
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
            {/* Status dot */}
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: activeProvider ? '#10b981' : 'rgba(255,255,255,0.15)',
                boxShadow: activeProvider ? '0 0 6px rgba(16,185,129,0.6)' : 'none',
              }}
            />
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-white/30" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-white/30" />
            )}
          </div>
        </div>

        {/* ── Panel Body ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <div className="px-5 py-4 space-y-3">
                {/* Loading */}
                {loading && (
                  <div className="flex items-center justify-center py-6 gap-2 text-white/30">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-mono text-[10px]">Loading engines...</span>
                  </div>
                )}

                {/* Empty state */}
                {!loading && providers.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto mb-3">
                      <Zap className="w-4 h-4 text-white/20" />
                    </div>
                    <p className="font-mono text-[10px] text-white/30">No AI engines configured yet.</p>
                    <p className="font-mono text-[9px] text-white/20 mt-1">Add one to power your AI features.</p>
                  </div>
                )}

                {/* Provider list */}
                <AnimatePresence>
                  {providers.map((provider) => {
                    const meta = PROVIDER_META[provider.providerType];
                    const isToggling = togglingId === provider.id;
                    const isDeleting = deletingId === provider.id;

                    return (
                      <motion.div
                        key={provider.id}
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="relative rounded-[8px] p-3.5 transition-all"
                        style={{
                          background: provider.isActive
                            ? `linear-gradient(135deg, ${meta.color}08, ${meta.color}04)`
                            : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${provider.isActive ? meta.color + '35' : 'rgba(255,255,255,0.06)'}`,
                          boxShadow: provider.isActive ? `0 0 16px ${meta.glow}` : 'none',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          {/* Provider icon */}
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-mono text-base font-bold"
                            style={{
                              background: `${meta.color}15`,
                              border: `1px solid ${meta.color}30`,
                              color: meta.color,
                            }}
                          >
                            {meta.icon}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-white/90 truncate">{provider.name}</span>
                              {provider.isActive && (
                                <CheckCircle className="w-3 h-3 text-[#10b981] shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="font-mono text-[8px] px-1.5 py-0.5 rounded"
                                style={{ background: `${meta.color}15`, color: meta.color }}
                              >
                                {meta.label}
                              </span>
                              <span className="font-mono text-[8px] text-white/25 flex items-center gap-1">
                                <Lock className="w-2 h-2" />
                                {provider.apiKeyMasked}
                              </span>
                              {provider.baseUrl && (
                                <span className="font-mono text-[8px] text-white/20 flex items-center gap-0.5 truncate max-w-[80px]">
                                  <Globe className="w-2 h-2 shrink-0" />
                                  local
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Toggle */}
                            <button
                              onClick={() => handleToggle(provider.id)}
                              disabled={isToggling || isDeleting}
                              className="relative w-7 h-7 rounded-[6px] flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
                              style={{
                                background: provider.isActive ? `${meta.color}20` : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${provider.isActive ? meta.color + '40' : 'rgba(255,255,255,0.08)'}`,
                                color: provider.isActive ? meta.color : 'rgba(255,255,255,0.3)',
                              }}
                              title={provider.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {isToggling ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Power className="w-3 h-3" />
                              )}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(provider.id)}
                              disabled={isDeleting || isToggling}
                              className="w-7 h-7 rounded-[6px] flex items-center justify-center text-white/20 hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/10 border border-transparent hover:border-[#ff4d6d]/20 transition-all cursor-pointer disabled:opacity-40"
                              title="Remove engine"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Add button */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full py-2.5 rounded-[8px] font-mono text-[9px] uppercase tracking-[0.2em] text-white/30 hover:text-[#7c5cfc] border border-dashed border-white/10 hover:border-[#7c5cfc]/40 hover:bg-[#7c5cfc]/[0.04] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add AI Engine
                </button>
              </div>

              {/* Footer note */}
              <div
                className="px-5 py-2.5 flex items-center gap-1.5"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
              >
                <Lock className="w-2.5 h-2.5 text-white/20 shrink-0" />
                <p className="font-mono text-[8px] text-white/20">
                  All API keys are AES-256 encrypted. Only one engine can be active at a time.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
