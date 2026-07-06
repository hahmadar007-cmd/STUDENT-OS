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
  gemini: 'gemini-2.5-pro',
  claude: 'claude-3-5-sonnet',
  gpt4: 'gpt-4o',
  custom: 'custom-endpoint',
};

export const FascaAiCore: React.FC = () => {
  const { aiModel, setAiModel } = useFouzar();

  const models: ModelCard[] = [
    {
      id: 'gemini',
      name: 'Gemini 2.5 Pro',
      provider: 'Google',
      latency: '28ms',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="#8b5cf6" strokeWidth="2" fill="rgba(139,92,246,0.2)" strokeLinejoin="round" />
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
        <svg className="w-5 h-5 text-fouzar-text-secondary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="2.5" />
          <path d="M9 9L6 12L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M15 9L18 12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full bg-fouzar-surface/40 border border-fouzar-border-strong rounded-[6px] p-6 space-y-6 flex flex-col justify-between min-h-[480px]">
      
      {/* 1. Model Selector Cards Grid */}
      <div className="space-y-3 shrink-0">
        <span className="text-[8.5px] font-mono uppercase tracking-[0.25em] text-fouzar-text-secondary block">
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
                    ? 'border-[#7c5cfc] shadow-[0_0_12px_rgba(124,92,252,0.15)] bg-fouzar-card' 
                    : 'border-fouzar-border-strong bg-fouzar-card/40 hover:border-fouzar-border-strong/80'
                }`}
              >
                {/* Header: Geometric Icon & Provider */}
                <div className="flex justify-between items-start">
                  <div className="p-1.5 bg-fouzar-bg border border-fouzar-border-strong rounded-[4px]">
                    {model.icon}
                  </div>
                  <span className="text-[8px] font-mono text-fouzar-text-secondary uppercase">
                    {model.provider}
                  </span>
                </div>

                {/* Body: Model details & latency */}
                <div className="mt-2 text-left">
                  <h4 className="text-[10px] font-bold text-fouzar-text-primary truncate">
                    {model.name}
                  </h4>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00d4ff] animate-ping" />
                    <span className="text-[8px] font-mono text-fouzar-text-secondary">
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
                      : 'border-fouzar-border-strong hover:border-[#7c5cfc]/60 text-fouzar-text-secondary hover:text-fouzar-text-primary'
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
