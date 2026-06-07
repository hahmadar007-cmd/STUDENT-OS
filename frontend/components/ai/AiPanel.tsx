'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, Hash, ChevronDown, X } from 'lucide-react';
import { getBackendUrl } from '../../lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  responseTime?: string;
}

interface AiPanelProps {
  currentSlideId: string | null;
  currentSlideTitle?: string;
  userId: string;
  onClose?: () => void;
}

export const AiPanel: React.FC<AiPanelProps> = ({
  currentSlideId,
  currentSlideTitle = 'Introduction to Neural Networks',
  userId,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'FASCA AI connection initialized. Slide context successfully parsed. Ask your query.',
      model: 'deepseek',
      responseTime: '45ms',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('deepseek');
  const [isLoading, setIsLoading] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const models = [
    { id: 'deepseek', name: 'DeepSeek Chat', provider: 'DeepSeek', isDefault: true },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', isDefault: false },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', isDefault: false },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userPrompt = inputText;
    setInputText('');
    setMessages((prev) => [...prev, { role: 'user', content: userPrompt }]);
    setIsLoading(true);

    const startTime = Date.now();

    try {
      const apiBase = getBackendUrl();
      const response = await fetch(`${apiBase}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          prompt: userPrompt,
          slideId: currentSlideId,
          modelName: selectedModel,
        }),
      });

      const responseTimeMs = `${Date.now() - startTime}ms`;

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.text, model: selectedModel, responseTime: responseTimeMs },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'SYSTEM ERROR: Connection failed. Verify provider configs.', model: selectedModel, responseTime: '0ms' },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'SYSTEM TIMEOUT: Verify your local backend server status.', model: selectedModel, responseTime: '0ms' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-[420px] h-full bg-[#111118] border-l border-violet shadow-[0_0_30px_rgba(124,92,252,0.15)] flex flex-col justify-between select-none relative z-40">
      
      {/* Header */}
      <div className="p-4 border-b border-border-color flex flex-col gap-2 bg-[#0a0a0f]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet text-glow-violet" strokeWidth={1.5} />
            <span className="font-serif font-extrabold text-sm uppercase tracking-[0.15em] text-text-primary">
              Fasca AI
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Model Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModels(!showModels)}
                className="flex items-center gap-1 px-3 py-1 bg-fasca-card border border-border-color rounded-[4px] text-[10px] font-mono text-text-secondary hover:text-text-primary hover:border-violet/40 cursor-pointer"
              >
                <span>{models.find((m) => m.id === selectedModel)?.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {showModels && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute right-0 mt-2 w-48 bg-[#111118] border border-border-color rounded-[4px] shadow-2xl z-50 overflow-hidden"
                  >
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setShowModels(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[10px] font-mono transition-colors hover:bg-white/5 flex flex-col border-b border-border-color/20 last:border-b-0 ${
                          selectedModel === m.id ? 'bg-white/5 text-violet' : 'text-text-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{m.name}</span>
                          {m.isDefault && (
                            <span className="px-1 py-0.5 text-[7px] bg-emerald-500/20 text-emerald-400 rounded uppercase tracking-wider">Free</span>
                          )}
                        </div>
                        <span className="text-[8px] text-text-secondary/60 mt-0.5">{m.provider}</span>
                      </button>
                    ))}
                    <div className="px-3 py-2 text-[8px] text-text-secondary/50 border-t border-border-color/30 bg-white/[0.02]">
                      Add your own AI key in Settings
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {onClose && (
              <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-[4px] text-text-secondary hover:text-text-primary cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {currentSlideId && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#16161f] border border-border-color text-[10px] font-mono text-text-secondary rounded-[4px]">
            <Hash className="w-3.5 h-3.5 text-violet" />
            <span>Context: Slide {currentSlideId} - {currentSlideTitle}</span>
          </div>
        )}

        {/* Default AI info bar */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-500/5 border border-emerald-500/15 rounded-[4px]">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span className="text-[9px] font-mono text-emerald-400/80">
            Default AI core active: <strong>DeepSeek Chat</strong> — or link your own key
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-140px)] scrollbar-thin">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`text-xs p-3 leading-relaxed rounded-[6px] max-w-[90%] ${
                  isUser
                    ? 'bg-transparent border-l-2 border-violet text-text-primary font-medium rounded-tr-none'
                    : 'bg-[#16161f] border border-border-color text-text-primary rounded-tl-none'
                }`}
              >
                {msg.content}
              </div>

              {/* Muted Mono Footer for AI responses */}
              {!isUser && (msg.model || msg.responseTime) && (
                <div className="flex items-center gap-2 text-[8px] font-mono text-text-secondary mt-1 px-1">
                  <span>{msg.model}</span>
                  <span>•</span>
                  <span>{msg.responseTime}</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator using three blinking underscores */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="bg-[#16161f] border border-border-color p-3 rounded-[6px] rounded-tl-none text-xs text-violet font-mono flex gap-1">
              <span className="animate-pulse">_</span>
              <span className="animate-pulse delay-75">_</span>
              <span className="animate-pulse delay-150">_</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Fixed Input at Bottom */}
      <form onSubmit={handleSend} className="p-4 border-t border-border-color bg-[#0a0a0f] flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask Fasca AI..."
          className="flex-1 bg-transparent border-b border-border-color py-2.5 px-1 text-xs text-text-primary focus:outline-none focus:border-violet transition-colors placeholder:text-text-secondary/40 font-sans"
        />
        <div className="text-[9px] font-mono text-text-secondary shrink-0 select-none mr-2">
          Ctrl+Enter
        </div>
        <button
          type="submit"
          className="p-2.5 bg-violet hover:opacity-90 text-fasca-bg rounded-[4px] shadow-lg transition-all"
        >
          <Send className="w-3.5 h-3.5 fill-fasca-bg" strokeWidth={1.5} />
        </button>
      </form>
    </div>
  );
};
