'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  Loader2, Zap, Globe, Lock, X, Eye, EyeOff, AlertCircle, CheckCircle, Cpu,
} from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';
import { useAiProviders } from '../../hooks/useAiProviders';
import {
  CARD_COLORS,
  PROVIDER_META,
  defaultModelForProvider,
  inferProviderType,
  maskApiKey,
  type AiProviderConfig,
  type ProviderType,
} from '../../lib/aiConfig';
import { validateAiKey, addAiProvider, deleteAiProvider, toggleAiProviderActive } from '../../lib/api';

interface AddModalProps {
  onClose: () => void;
  onAdded: (p: AiProviderConfig) => void;
  nextColorIndex: number;
}

function AddProviderModal({ onClose, onAdded, nextColorIndex }: AddModalProps) {
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [validationStatus, setValidationStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [validationMsg, setValidationMsg] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('GEMINI');
  const [modelId, setModelId] = useState(defaultModelForProvider('GEMINI'));

  const palette = CARD_COLORS[nextColorIndex % CARD_COLORS.length];
  const meta = PROVIDER_META[providerType];

  const handleProviderTypeChange = (val: ProviderType) => {
    setProviderType(val);
    setModelId(defaultModelForProvider(val));
    setValidationStatus('idle');
    setValidationMsg('');
  };

  const handleNameOrKeyChange = (field: 'name' | 'apiKey', value: string) => {
    if (field === 'name') setName(value);
    else setApiKey(value);
    const inferred = inferProviderType(field === 'name' ? value : name, field === 'apiKey' ? value : apiKey);
    setProviderType(inferred);
    setModelId(defaultModelForProvider(inferred));
    setValidationStatus('idle');
    setValidationMsg('');
  };

  const buildProvider = (): AiProviderConfig => ({
    id: `ap_${Date.now()}`,
    name: name.trim(),
    apiKeyRaw: apiKey.trim(),
    baseUrl: baseUrl.trim() || null,
    providerType,
    modelId,
    isActive: true,
    createdAt: new Date().toISOString(),
    colorIndex: nextColorIndex % CARD_COLORS.length,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Engine name is required.'); return; }
    if (!apiKey.trim()) { setError('API key is required.'); return; }
    if (meta.needsBaseUrl && !baseUrl.trim()) { setError('Base URL is required for custom endpoints.'); return; }
    setError('');

    setValidationStatus('testing');
    setValidationMsg('Testing connection…');
    try {
      const result = await validateAiKey(providerType, apiKey.trim(), baseUrl.trim() || undefined, modelId);
      if (!result.ok) {
        setValidationStatus('fail');
        setValidationMsg(result.message || 'Key validation failed.');
        return;
      }
      setValidationStatus('ok');
      setValidationMsg(result.message || 'Connected ✓');
    } catch (err: any) {
      setValidationStatus('fail');
      setValidationMsg(err.message || 'Could not reach validation endpoint.');
      return;
    }

    let provider = buildProvider();
    try {
      const saved = await addAiProvider(provider.name, provider.providerType, provider.apiKeyRaw, provider.baseUrl || undefined);
      if (saved?.id) provider = { ...provider, id: saved.id };
    } catch (err) {
      console.error('Failed to save AI provider to backend:', err);
    }

    onAdded(provider);
    onClose();
  };

  const handleSaveAnyway = async () => {
    if (!name.trim() || !apiKey.trim()) return;
    let provider = buildProvider();
    try {
      const saved = await addAiProvider(provider.name, provider.providerType, provider.apiKeyRaw, provider.baseUrl || undefined);
      if (saved?.id) provider = { ...provider, id: saved.id };
    } catch {}
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
        className="w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          background: 'var(--fouzar-surface)',
          border: `1px solid ${palette.color}40`,
          borderRadius: 12,
          boxShadow: `0 0 40px ${palette.glow}, 0 24px 48px rgba(0,0,0,0.5)`,
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ background: 'var(--fouzar-surface)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" style={{ color: palette.color }} />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-fouzar-text-primary/60">Connect AI Engine</span>
          </div>
          <button onClick={onClose} className="text-fouzar-text-primary/30 hover:text-fouzar-text-primary/70 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-fouzar-text-primary/40">Engine Name</label>
            <input
              value={name}
              onChange={e => handleNameOrKeyChange('name', e.target.value)}
              placeholder="e.g. My Study AI"
              className="w-full bg-white/[0.04] border border-fouzar-border-subtle rounded-lg px-3 py-2.5 text-sm text-fouzar-text-primary/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-fouzar-text-primary/40">Provider</label>
              <select
                value={providerType}
                onChange={e => handleProviderTypeChange(e.target.value as ProviderType)}
                className="w-full bg-white/[0.04] border border-fouzar-border-subtle rounded-lg px-3 py-2.5 text-sm text-fouzar-text-primary/90 font-mono focus:outline-none focus:border-white/25 cursor-pointer"
              >
                {(Object.keys(PROVIDER_META) as ProviderType[]).map(pt => (
                  <option key={pt} value={pt} className="bg-fouzar-bg">{PROVIDER_META[pt].label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-fouzar-text-primary/40">Model</label>
              <select
                value={modelId}
                onChange={e => setModelId(e.target.value)}
                className="w-full bg-white/[0.04] border border-fouzar-border-subtle rounded-lg px-3 py-2.5 text-sm text-fouzar-text-primary/90 font-mono focus:outline-none focus:border-white/25 cursor-pointer"
              >
                {meta.models.map(m => (
                  <option key={m.id} value={m.id} className="bg-fouzar-bg">
                    {m.label} {m.tier === 'free' ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-fouzar-text-primary/40">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => handleNameOrKeyChange('apiKey', e.target.value)}
                placeholder={meta.keyPlaceholder}
                className="w-full bg-white/[0.04] border border-fouzar-border-subtle rounded-lg px-3 pr-10 py-2.5 text-sm text-fouzar-text-primary/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
              />
              <button type="button" onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-fouzar-text-primary/30 hover:text-fouzar-text-primary/60 cursor-pointer">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="font-mono text-[8px] text-fouzar-text-primary/25 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> {meta.keyHint}
            </p>
          </div>

          {(meta.needsBaseUrl || providerType === 'OPENROUTER') && (
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-[0.2em] text-fouzar-text-primary/40">
                Base URL {providerType !== 'CUSTOM' && <span className="text-fouzar-text-primary/20 normal-case">(optional)</span>}
              </label>
              <input
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder={providerType === 'CUSTOM' ? 'http://localhost:11434/v1' : 'https://openrouter.ai/api/v1'}
                className="w-full bg-white/[0.04] border border-fouzar-border-subtle rounded-lg px-3 py-2.5 text-sm text-fouzar-text-primary/90 placeholder-white/20 font-mono focus:outline-none focus:border-white/25 transition-colors"
              />
            </div>
          )}

          <AnimatePresence>
            {validationStatus === 'testing' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 font-mono text-[10px] text-fouzar-text-primary/50 bg-white/[0.03] border border-fouzar-border-subtle rounded-lg px-3 py-2">
                <Loader2 className="w-3 h-3 animate-spin" /> {validationMsg}
              </motion.div>
            )}
            {validationStatus === 'ok' && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2 font-mono text-[10px] text-emerald-400 bg-emerald-500/[0.08] border border-emerald-500/25 rounded-lg px-3 py-2">
                <CheckCircle className="w-3 h-3 shrink-0" /> {validationMsg}
              </motion.div>
            )}
            {validationStatus === 'fail' && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-1.5 bg-[#ff4d6d]/[0.08] border border-[#ff4d6d]/25 rounded-lg px-3 py-2">
                <div className="flex items-start gap-2 font-mono text-[10px] text-[#ff4d6d]">
                  <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{validationMsg}</span>
                </div>
                <button type="button" onClick={handleSaveAnyway}
                  className="text-left font-mono text-[8px] text-fouzar-text-primary/25 hover:text-fouzar-text-primary/50 underline transition-colors cursor-pointer">
                  Save anyway (skip validation)
                </button>
              </motion.div>
            )}
            {error && validationStatus === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-[#ff4d6d] font-mono text-[10px] bg-[#ff4d6d]/10 border border-[#ff4d6d]/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-3 h-3 shrink-0" />{error}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={validationStatus === 'testing'}
            className="w-full py-3 rounded-lg font-mono text-[11px] uppercase tracking-[0.2em] font-bold cursor-pointer flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: `linear-gradient(135deg,${palette.color}20,${palette.color}10)`, border: `1px solid ${palette.color}60`, color: palette.color }}>
            {validationStatus === 'testing' ? <><Loader2 className="w-4 h-4 animate-spin" /> Testing…</> : <><Plus className="w-4 h-4" /> Test &amp; Add Engine</>}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export function AiControlCenter() {
  const { providers, setProviders, activeProvider } = useAiProviders();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const { setAiModel } = useFouzar();

  const handleAdded = (p: AiProviderConfig) => {
    const updated = p.isActive
      ? [p, ...providers.map(existing => ({ ...existing, isActive: false }))]
      : [p, ...providers];
    setProviders(updated);
    setAiModel(p.modelId);
  };

  const handleToggle = async (id: string) => {
    if (isMutating) return;
    setIsMutating(true);
    const target = providers.find(p => p.id === id);
    if (!target) { setIsMutating(false); return; }

    const nextActive = !target.isActive;
    const next = providers.map(p => ({ ...p, isActive: p.id === id ? nextActive : false }));
    setProviders(next);
    setAiModel(nextActive ? target.modelId : '');

    try { await toggleAiProviderActive(id); } catch (err) { console.error('Toggle sync failed:', err); }
    finally { setIsMutating(false); }
  };

  const handleDelete = async (id: string) => {
    if (isMutating) return;
    setIsMutating(true);
    setDeletingId(id);
    const target = providers.find(p => p.id === id);
    const next = providers.filter(p => p.id !== id);
    setProviders(next);
    if (target?.isActive) setAiModel('');
    try { await deleteAiProvider(id); } catch (err) { console.error('Delete sync failed:', err); }
    finally { setDeletingId(null); setIsMutating(false); }
  };

  return (
    <>
      <AnimatePresence>
        {showAddModal && (
          <AddProviderModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} nextColorIndex={providers.length} />
        )}
      </AnimatePresence>

      <div id="ai-engines-panel" className="rounded-xl overflow-hidden" style={{
        background: 'var(--fouzar-surface)',
        border: '1px solid rgba(124,92,252,0.2)',
        boxShadow: '0 0 30px rgba(124,92,252,0.08), 0 8px 32px rgba(0,0,0,0.4)',
      }}>
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
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-fouzar-text-primary/90 font-bold">AI Engines</h3>
              <p className="font-mono text-[8px] text-fouzar-text-primary/30 mt-0.5">
                {activeProvider
                  ? `${PROVIDER_META[activeProvider.providerType]?.label} · ${activeProvider.modelId}`
                  : providers.length === 0 ? 'Bring your own API key (BYOK)' : `${providers.length} engine${providers.length !== 1 ? 's' : ''} · none active`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{
              background: activeProvider ? '#10b981' : 'rgba(255,255,255,0.15)',
              boxShadow: activeProvider ? '0 0 6px rgba(16,185,129,0.6)' : 'none',
            }} />
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-fouzar-text-primary/30" /> : <ChevronDown className="w-3.5 h-3.5 text-fouzar-text-primary/30" />}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="px-5 py-4 space-y-3">
                {providers.length === 0 && (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-fouzar-border-subtle flex items-center justify-center mx-auto mb-3">
                      <Zap className="w-4 h-4 text-fouzar-text-primary/20" />
                    </div>
                    <p className="font-mono text-[10px] text-fouzar-text-primary/40 mb-1">No AI engine connected</p>
                    <p className="font-mono text-[8px] text-fouzar-text-primary/25 leading-relaxed max-w-xs mx-auto">
                      Add Gemini, OpenAI, Claude, DeepSeek, or OpenRouter. Keys stay in your browser.
                    </p>
                  </div>
                )}

                {providers.map(provider => {
                  const palette = CARD_COLORS[provider.colorIndex ?? 0];
                  const pMeta = PROVIDER_META[provider.providerType];
                  const isDeleting = deletingId === provider.id;
                  return (
                    <motion.div
                      key={provider.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: isDeleting ? 0 : 1, x: isDeleting ? 20 : 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      onClick={() => !isMutating && handleToggle(provider.id)}
                      className={`relative rounded-lg p-3.5 transition-all select-none ${isMutating ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'} ${provider.isActive ? 'border border-fouzar-primary/50 shadow-[0_0_15px_var(--fouzar-primary-shadow)]' : 'border border-white/[0.06]'}`}
                      style={{ background: provider.isActive ? `linear-gradient(135deg,${palette.color}10,${palette.color}06)` : 'rgba(255,255,255,0.02)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{
                          background: provider.isActive ? pMeta?.color || palette.color : 'rgba(255,255,255,0.12)',
                          boxShadow: provider.isActive ? `0 0 8px ${pMeta?.color || palette.color}` : 'none',
                        }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-semibold text-fouzar-text-primary/90 truncate block">{provider.name}</span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="font-mono text-[7px] uppercase px-1 py-0.5 rounded" style={{ background: `${pMeta?.color}15`, color: pMeta?.color }}>
                              {pMeta?.label || provider.providerType}
                            </span>
                            <span className="font-mono text-[7px] text-fouzar-text-primary/30 truncate max-w-[120px]">{provider.modelId}</span>
                            <span className="font-mono text-[7px] text-fouzar-text-primary/20 flex items-center gap-0.5">
                              <Lock className="w-2 h-2" />{maskApiKey(provider.apiKeyRaw)}
                            </span>
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
                          className="w-6 h-6 rounded flex items-center justify-center text-fouzar-text-primary/20 hover:text-[#ff4d6d] hover:bg-[#ff4d6d]/10 transition-all shrink-0 cursor-pointer"
                          title="Remove engine"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}

                <button onClick={() => setShowAddModal(true)}
                  className="w-full py-2.5 rounded-lg font-mono text-[9px] uppercase tracking-[0.2em] text-fouzar-text-primary/30 hover:text-[#7c5cfc] border border-dashed border-fouzar-border-subtle hover:border-[#7c5cfc]/40 hover:bg-[#7c5cfc]/[0.04] transition-all cursor-pointer flex items-center justify-center gap-2">
                  <Plus className="w-3.5 h-3.5" /> Add AI Engine
                </button>
              </div>

              <div className="px-5 py-2.5 flex items-center gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                <Lock className="w-2.5 h-2.5 text-fouzar-text-primary/20 shrink-0" />
                <p className="font-mono text-[8px] text-fouzar-text-primary/20">BYOK — your key, your quota. Click a card to activate. Use Flash/Mini models on free tiers.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
