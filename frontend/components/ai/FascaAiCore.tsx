'use client';

import React, { useState } from 'react';
import { IntegratedAiChat } from './IntegratedAiChat';
import { useFouzar } from '../../lib/FouzarContext';
import { Plus, Key, Sparkles } from 'lucide-react';

interface AvailableModel {
  id: string;
  apiId: string;
  name: string;
  provider: string;
  isFree: boolean;
}

const DEFAULT_MODELS: AvailableModel[] = [
  { id: 'gemini', apiId: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', isFree: true },
  { id: 'deepseek', apiId: 'deepseek', name: 'DeepSeek', provider: 'DeepSeek', isFree: true },
];

export const FascaAiCore: React.FC = () => {
  const { aiModel, setAiModel } = useFouzar();
  const [showAddKey, setShowAddKey] = useState(false);
  const [customKeyName, setCustomKeyName] = useState('');
  const [customKeyValue, setCustomKeyValue] = useState('');
  const [customModels, setCustomModels] = useState<AvailableModel[]>(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem('fasca_custom_models');
    return saved ? JSON.parse(saved) : [];
  });

  const allModels = [...DEFAULT_MODELS, ...customModels];
  const activeModel = allModels.find((m) => m.apiId === aiModel) || allModels[0];

  const handleAddCustomKey = () => {
    if (!customKeyName.trim() || !customKeyValue.trim()) return;

    const newModel: AvailableModel = {
      id: `custom-${Date.now()}`,
      apiId: 'custom-endpoint',
      name: customKeyName.trim(),
      provider: 'Personal',
      isFree: false,
    };

    // Save key to localStorage
    localStorage.setItem('fasca_ai_mode', 'custom');
    localStorage.setItem('fasca_ai_token', customKeyValue.trim());

    const updated = [...customModels, newModel];
    setCustomModels(updated);
    localStorage.setItem('fasca_custom_models', JSON.stringify(updated));
    setCustomKeyName('');
    setCustomKeyValue('');
    setShowAddKey(false);
    setAiModel(newModel.apiId);
  };

  return (
    <div className="w-full bg-[#111118]/40 border border-[#2a2a3a] rounded-[6px] p-6 space-y-4 flex flex-col justify-between min-h-[480px]">

      {/* Active Model Selector - Compact */}
      <div className="shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#7c5cfc]" />
            <span className="text-[8.5px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a]">
              AI Model
            </span>
          </div>
          <button
            onClick={() => setShowAddKey(!showAddKey)}
            className="flex items-center gap-1 px-2 py-1 text-[7.5px] font-mono uppercase tracking-wider text-[#6b6b8a] hover:text-[#f0f0ff] border border-[#2a2a3a] hover:border-[#7c5cfc]/40 rounded-[4px] transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            Add Your AI
          </button>
        </div>

        {/* Model pills */}
        <div className="flex flex-wrap gap-2">
          {allModels.map((model) => {
            const isActive = aiModel === model.apiId;
            return (
              <button
                key={model.id}
                onClick={() => setAiModel(model.apiId)}
                className={`flex items-center gap-2 px-3 py-2 rounded-[4px] border text-[9px] font-mono transition-all cursor-pointer ${
                  isActive
                    ? 'border-[#7c5cfc] bg-[#7c5cfc]/10 text-[#f0f0ff] shadow-[0_0_8px_rgba(124,92,252,0.1)]'
                    : 'border-[#2a2a3a] bg-[#16161f]/40 text-[#6b6b8a] hover:border-[#7c5cfc]/40 hover:text-[#f0f0ff]'
                }`}
              >
                <span className="font-medium">{model.name}</span>
                {model.isFree && (
                  <span className="px-1 py-0.5 text-[6.5px] bg-emerald-500/20 text-emerald-400 rounded uppercase">Free</span>
                )}
                {!model.isFree && (
                  <span className="px-1 py-0.5 text-[6.5px] bg-[#7c5cfc]/20 text-[#7c5cfc] rounded uppercase">Personal</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Add custom AI key panel */}
        {showAddKey && (
          <div className="p-3 bg-[#16161f] border border-[#2a2a3a] rounded-[4px] space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Key className="w-3 h-3 text-[#7c5cfc]" />
              <span className="text-[8px] font-mono uppercase tracking-wider text-[#6b6b8a]">Connect Your AI Provider</span>
            </div>
            <input
              type="text"
              placeholder="Model name (e.g. My GPT-4)"
              value={customKeyName}
              onChange={(e) => setCustomKeyName(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#2a2a3a] px-3 py-1.5 text-[9px] font-mono text-[#f0f0ff] rounded-[4px] focus:outline-none focus:border-[#7c5cfc]/50 placeholder-[#6b6b8a]/40"
            />
            <input
              type="password"
              placeholder="API Key"
              value={customKeyValue}
              onChange={(e) => setCustomKeyValue(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#2a2a3a] px-3 py-1.5 text-[9px] font-mono text-[#f0f0ff] rounded-[4px] focus:outline-none focus:border-[#7c5cfc]/50 placeholder-[#6b6b8a]/40"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCustomKey}
                className="flex-1 py-1.5 text-[7.5px] font-mono uppercase bg-[#7c5cfc]/10 border border-[#7c5cfc]/30 text-[#7c5cfc] rounded-[4px] hover:bg-[#7c5cfc]/20 cursor-pointer transition-colors"
              >
                Connect
              </button>
              <button
                onClick={() => setShowAddKey(false)}
                className="px-3 py-1.5 text-[7.5px] font-mono uppercase border border-[#2a2a3a] text-[#6b6b8a] rounded-[4px] hover:text-[#f0f0ff] cursor-pointer transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* API-integrated chat */}
      <div className="flex-1 min-h-[240px]">
        <IntegratedAiChat
          contextLabel="Dashboard · AI Core"
          slideId="4"
          storageKey="fouzar-dashboard-ai"
        />
      </div>

    </div>
  );
};
