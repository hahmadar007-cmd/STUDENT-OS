'use client';

import React from 'react';
import { FascaCard } from '../ui/FascaCard';
import { IntegratedAiChat } from './IntegratedAiChat';
import { useFouzar } from '../../lib/FouzarContext';

interface ModelCard {
  id: string;
  name: string;
  provider: string;
  latency: string;
  icon: React.ReactNode;
}

const MODEL_API_IDS: Record<string, string> = {
  deepseek: 'deepseek',
  claude: 'claude-3-5-sonnet',
  gpt4: 'gpt-4o',
  custom: 'custom-endpoint',
};

export const FascaAiCore: React.FC = () => {
  const { aiModel, setAiModel } = useFouzar();

  const models: ModelCard[] = [
    {
      id: 'deepseek',
      name: 'DeepSeek Chat',
      provider: 'DeepSeek',
      latency: '24ms',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'claude',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic',
      latency: '42ms',
      icon: (
        <svg className="w-5 h-5 text-[#ff2d55]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,3 2,21 22,21" stroke="currentColor" strokeWidth="2.5" fill="none" />
          <polygon points="12,9 6,19 18,19" fill="currentColor" opacity="0.3" />
        </svg>
      ),
    },
    {
      id: 'gpt4',
      name: 'GPT-4o',
      provider: 'OpenAI',
      latency: '38ms',
      icon: (
        <svg className="w-5 h-5 text-[#00d4ff]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'custom',
      name: 'Custom Endpoint',
      provider: 'Self-Hosted',
      latency: '110ms',
      icon: (
        <svg className="w-5 h-5 text-[#6b6b8a]" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="2.5" />
          <path d="M9 9L6 12L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M15 9L18 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full bg-[#111118]/40 border border-[#2a2a3a] rounded-[6px] p-6 space-y-6 flex flex-col justify-between min-h-[480px]">
      
      {/* 1. Model Selector Cards Grid */}
      <div className="space-y-3 shrink-0">
        <span className="text-[8.5px] font-mono uppercase tracking-[0.25em] text-[#6b6b8a] block">
          Select Thinking Partner
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {models.map((model) => {
            const isActive = aiModel === MODEL_API_IDS[model.id];
            return (
              <FascaCard
                key={model.id}
                className={`p-3 flex flex-col justify-between h-32 relative transition-all duration-200 ${
                  isActive 
                    ? 'border-[#7c5cfc] shadow-[0_0_12px_rgba(124,92,252,0.15)] bg-[#16161f]' 
                    : 'border-[#2a2a3a] bg-[#16161f]/40 hover:border-[#2a2a3a]/80'
                }`}
              >
                {/* Header: Geometric Icon & Provider */}
                <div className="flex justify-between items-start">
                  <div className="p-1.5 bg-[#0a0a0f] border border-[#2a2a3a] rounded-[4px]">
                    {model.icon}
                  </div>
                  <span className="text-[8px] font-mono text-[#6b6b8a] uppercase">
                    {model.provider}
                  </span>
                </div>

                {/* Body: Model details & latency */}
                <div className="mt-2 text-left">
                  <h4 className="text-[10px] font-bold text-[#f0f0ff] truncate">
                    {model.name}
                  </h4>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-ping" />
                    <span className="text-[8px] font-mono text-[#6b6b8a]">
                      LATENCY: {model.latency}
                    </span>
                  </div>
                </div>

                {/* Footer: SET AS ACTIVE Button */}
                <button
                  onClick={() => setAiModel(MODEL_API_IDS[model.id])}
                  disabled={isActive}
                  className={`w-full py-1 text-[7.5px] font-mono uppercase tracking-widest mt-2.5 transition-colors cursor-pointer border ${
                    isActive
                      ? 'border-[#7c5cfc]/20 bg-[#7c5cfc]/10 text-[#7c5cfc] cursor-default'
                      : 'border-[#2a2a3a] hover:border-[#7c5cfc]/60 text-[#6b6b8a] hover:text-[#f0f0ff]'
                  }`}
                >
                  {isActive ? 'ACTIVE PARTNER' : 'SET AS ACTIVE'}
                </button>
              </FascaCard>
            );
          })}
        </div>
      </div>

      {/* 2. API-integrated chat */}
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
