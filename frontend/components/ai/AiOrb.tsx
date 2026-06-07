'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ChevronDown, X, Sparkles, Cpu } from 'lucide-react';
import { useFouzar } from '../../lib/FouzarContext';
import { getBackendUrl } from '../../lib/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  responseTime?: string;
}

export const AiOrb: React.FC = () => {
  const { isOrbOpen, setIsOrbOpen, aiModel, setAiModel, space } = useFouzar();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Fouzar AI companion active. Adjust configuration in header settings. Ask anything.',
      model: 'deepseek',
      responseTime: '22ms',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const models = [
    { id: 'deepseek', name: 'DeepSeek Chat', provider: 'DeepSeek' },
    { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsOrbOpen(!isOrbOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOrbOpen, setIsOrbOpen]);

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
          userId: 'user-1',
          prompt: userPrompt,
          slideId: space === 'study' ? '4' : null,
          modelName: aiModel,
        }),
      });

      const responseTimeMs = `${Date.now() - startTime}ms`;

      if (response.ok) {
        const data = await response.json();
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.text, model: aiModel, responseTime: responseTimeMs },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'SYSTEM ERROR: Connection failed. Verify provider configs.', model: aiModel, responseTime: '0ms' },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'SYSTEM TIMEOUT: Verify your local backend server status.', model: aiModel, responseTime: '0ms' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Orb trigger */}
      {!isOrbOpen && (
        <motion.button
          onClick={() => setIsOrbOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer relative"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Glowing Aura Rings */}
          <div className="absolute inset-0 rounded-full bg-fouzar-accent opacity-20 blur-[12px] animate-pulse" />
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            className="absolute inset-[-4px] rounded-full border border-fouzar-accent/30 animate-pulse"
          />

          {/* Central Core sphere */}
          <div className="w-9 h-9 rounded-full bg-fouzar-surface border border-fouzar-border flex items-center justify-center relative overflow-hidden shadow-[0_0_15px_var(--fouzar-accent-glow)]">
            <Sparkles className="w-4 h-4 text-fouzar-accent" />
          </div>
        </motion.button>
      )}

      {/* Floating Orb Dialog overlay */}
      <AnimatePresence>
        {isOrbOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-6 right-6 z-50 w-[385px] h-[480px] bg-fouzar-surface/90 backdrop-blur-xl border border-fouzar-border rounded-[8px] flex flex-col justify-between overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] glow-panel"
          >
            {/* Header */}
            <div className="p-3 bg-fouzar-bg/50 border-b border-fouzar-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-fouzar-accent animate-ping" />
                <span className="font-sans font-light text-[9px] uppercase tracking-[0.25em] text-fouzar-text-primary">
                  Companion Core
                </span>
              </div>

              {/* Model swappable dropdown */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowModels(!showModels)}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 bg-fouzar-card/50 border border-fouzar-border rounded-[4px] text-[8px] font-mono text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-fouzar-accent transition-colors cursor-pointer"
                  >
                    <Cpu className="w-2.5 h-2.5 text-fouzar-accent" />
                    <span>{models.find((m) => m.id === aiModel)?.name}</span>
                    <ChevronDown className="w-2.5 h-2.5" />
                  </button>

                  <AnimatePresence>
                    {showModels && (
                      <motion.div
                        initial={{ opacity: 0, y: 3 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 3 }}
                        className="absolute right-0 mt-1.5 w-36 bg-fouzar-surface border border-fouzar-border rounded-[4px] z-50 overflow-hidden shadow-2xl"
                      >
                        {models.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setAiModel(m.id);
                              setShowModels(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 text-[8px] font-mono transition-colors hover:bg-white/5 flex flex-col border-b border-fouzar-border/10 last:border-b-0 ${
                              aiModel === m.id ? 'bg-white/5 text-fouzar-accent' : 'text-fouzar-text-secondary'
                            }`}
                          >
                            <span>{m.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setIsOrbOpen(false)}
                  className="p-1 hover:bg-white/5 rounded-[4px] text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`text-[11px] p-2.5 leading-relaxed rounded-[6px] max-w-[85%] ${
                        isUser
                          ? 'bg-transparent border-l border-fouzar-accent text-fouzar-text-primary rounded-tr-none font-medium'
                          : 'bg-fouzar-card/50 border border-fouzar-border text-fouzar-text-primary rounded-tl-none'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {!isUser && (msg.model || msg.responseTime) && (
                      <div className="flex items-center gap-1.5 text-[7px] font-mono text-fouzar-text-secondary mt-1 px-1">
                        <span>{msg.model}</span>
                        <span>•</span>
                        <span>{msg.responseTime}</span>
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start">
                  <div className="bg-fouzar-card/50 border border-fouzar-border px-3 py-2.5 rounded-[6px] rounded-tl-none text-[11px] text-fouzar-accent font-mono flex gap-1">
                    <span className="animate-pulse">_</span>
                    <span className="animate-pulse delay-75">_</span>
                    <span className="animate-pulse delay-150">_</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-fouzar-border bg-fouzar-bg/50 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Send context query..."
                className="flex-1 bg-transparent border-b border-fouzar-border py-1 px-1 text-[11px] text-fouzar-text-primary focus:outline-none focus:border-fouzar-accent transition-colors placeholder:text-fouzar-text-secondary/35"
              />
              <button
                type="submit"
                className="p-1.5 bg-fouzar-accent hover:opacity-90 text-fouzar-bg rounded-[4px] transition-all cursor-pointer shadow-[0_0_8px_var(--fouzar-accent-glow)]"
              >
                <Send className="w-3 h-3 text-fouzar-bg" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
