'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles } from 'lucide-react';
import { askAi } from '../../lib/api';
import { useFouzar } from '../../lib/FouzarContext';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
}

interface IntegratedAiChatProps {
  /** Context chip label (e.g. "Semester Notes", "Slide 4") */
  contextLabel?: string;
  /** Slide ID passed to the AI API for contextual answers */
  slideId?: string | null;
  /** localStorage key — persists chat per user/space when set */
  storageKey?: string;
  /** Compact layout for side panels */
  compact?: boolean;
  placeholder?: string;
}

const MODEL_OPTIONS = [
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
  { id: 'claude-3-5-sonnet', label: 'Claude 3.5' },
  { id: 'gpt-4o', label: 'GPT-4o' },
];

/**
 * Shared AI chat surface wired to POST /ai/chat.
 * Used in Personal Sanctuary and group study rooms — one API, consistent UX.
 */
export const IntegratedAiChat: React.FC<IntegratedAiChatProps> = ({
  contextLabel = 'Study Context',
  slideId = null,
  storageKey,
  compact = false,
  placeholder = 'Ask about your material, deadlines, or concepts...',
}) => {
  const { aiModel, setAiModel } = useFouzar();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setMessages(JSON.parse(saved));
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || messages.length === 0) return;
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const activeModelLabel =
    MODEL_OPTIONS.find((m) => m.id === aiModel)?.label ?? aiModel;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: AiChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      model: 'You',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await askAi(userMsg.content, slideId, aiModel);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: res.text ?? 'No response received.',
          model: res.model ?? activeModelLabel,
        },
      ]);
    } catch {
      setError('AI unreachable. Ensure the backend is running on port 3001.');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Connection failed. Start the backend with npm run dev:backend and try again.',
          model: 'System',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-full bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-shadow-sm)] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-fouzar-accent" />
          <span className="font-mono text-[8px] uppercase tracking-widest text-fouzar-text-secondary">
            Fouzar AI
          </span>
        </div>
        <select
          value={aiModel}
          onChange={(e) => setAiModel(e.target.value)}
          className="bg-fouzar-elevated border border-fouzar-border text-[8px] font-mono uppercase px-2 py-1 rounded-[var(--fouzar-radius-sm)] text-fouzar-text-primary focus:outline-none"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`flex-1 overflow-y-auto space-y-2.5 scrollbar-none mb-3 ${
          compact ? 'max-h-48' : 'min-h-[200px]'
        }`}
      >
        {messages.length === 0 && (
          <div className="text-center py-6 text-fouzar-text-tertiary">
            <Sparkles className="w-5 h-5 mx-auto mb-2 opacity-40" />
            <p className="font-mono text-[8px] uppercase tracking-wider">
              Your private AI study partner
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`text-[10px] leading-relaxed max-w-[92%] p-2.5 rounded-[var(--fouzar-radius-md)] ${
                msg.role === 'user'
                  ? 'bg-fouzar-accent/10 border border-fouzar-accent/25 text-fouzar-text-primary'
                  : 'bg-fouzar-elevated border border-fouzar-border text-fouzar-text-primary/90'
              }`}
            >
              {msg.content}
            </div>
            {msg.role === 'assistant' && (
              <span className="font-mono text-[6.5px] text-fouzar-text-tertiary mt-0.5 uppercase">
                {msg.model}
              </span>
            )}
          </div>
        ))}
        {isLoading && (
          <p className="font-mono text-[8px] text-fouzar-accent animate-pulse">Thinking...</p>
        )}
        <div ref={chatEndRef} />
      </div>

      {error && (
        <p className="text-[7px] font-mono text-fouzar-signal mb-2 uppercase">{error}</p>
      )}

      <div className="shrink-0 space-y-2 border-t border-fouzar-border pt-2">
        <span className="inline-block px-2 py-0.5 bg-fouzar-accent/10 border border-fouzar-accent/20 text-fouzar-accent font-mono text-[7px] uppercase rounded-[var(--fouzar-radius-sm)]">
          {contextLabel}
        </span>
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-fouzar-elevated/50 border border-fouzar-border px-3 py-2 text-[10px] rounded-[var(--fouzar-radius-md)] focus:outline-none focus:shadow-[var(--fouzar-focus-ring)]"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="p-2 bg-fouzar-accent text-fouzar-text-inverse rounded-[var(--fouzar-radius-md)] hover:opacity-90 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
