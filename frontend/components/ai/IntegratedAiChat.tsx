'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, Paperclip, X } from 'lucide-react';
import { askAi, indexDocument, indexDocumentFile } from '../../lib/api';
import { useFouzar } from '../../lib/FouzarContext';
import { extractTextFromPdf } from '../documents/DocumentViewer';

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
  /** Text content of the active slide to append as prompt context */
  slideContextText?: string;
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
  slideContextText,
  storageKey,
  compact = false,
  placeholder = 'Ask about your material, deadlines, or concepts...',
}) => {
  const { 
    aiModel, 
    setAiModel, 
    activeDoc, 
    activeDocText, 
    activeVideoUrl, 
    activeVideoTimestamp 
  } = useFouzar();
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTechnical, setIsTechnical] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string; id: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  // Automatically trigger AI document summary/welcome message when a new document is opened
  const lastOpenedDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!activeDoc) {
      lastOpenedDocIdRef.current = null;
      return;
    }
    
    // Only trigger once per unique document open event
    if (lastOpenedDocIdRef.current === activeDoc.id) return;
    lastOpenedDocIdRef.current = activeDoc.id;

    const autoAnalyze = async () => {
      setIsLoading(true);
      setError(null);

      // Add a system welcome message/acknowledgment from the assistant
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-open-${Date.now()}`,
          role: 'assistant',
          content: `📂 **Opened: ${activeDoc.fileName}**\nAnalyzing study material...`,
          model: 'System',
        }
      ]);

      try {
        let systemPrompt = `[System Action: Document Opened] The user has just opened the document "${activeDoc.fileName}" (Category: ${activeDoc.category}, Course: ${activeDoc.courseCode}).\n`;
        if (activeDocText) {
          systemPrompt += `Please inspect the following text content and provide a very brief (2-3 sentences max) welcoming study partner response. Acknowledge what this document is about and offer specific ways you can help them study it (e.g. summarize, explain formulas, generate code, or quiz them):\n\n${activeDocText.slice(0, 8000)}`;
        } else {
          systemPrompt += `Please provide a very brief (2 sentences max) welcoming study partner response acknowledging the opened file and asking what they would like to know about it.`;
        }

        const res = await askAi(systemPrompt, slideId, aiModel);
        
        // Remove the temporary "Analyzing..." system message and add the real AI welcome message
        setMessages((prev) => {
          const filtered = prev.filter(m => !m.id.startsWith('sys-open-'));
          return [
            ...filtered,
            {
              id: `ai-welcome-${Date.now()}`,
              role: 'assistant',
              content: res.text ?? `I see you opened ${activeDoc.fileName}. How can I help you study it?`,
              model: res.model ?? activeModelLabel,
            }
          ];
        });
      } catch (err) {
        console.error('Auto-analysis failed:', err);
        setMessages((prev) => {
          const filtered = prev.filter(m => !m.id.startsWith('sys-open-'));
          return [
            ...filtered,
            {
              id: `ai-welcome-${Date.now()}`,
              role: 'assistant',
              content: `📂 **Opened: ${activeDoc.fileName}**\nHow would you like to study this material? Ask me anything about it.`,
              model: activeModelLabel,
            }
          ];
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Small delay to make sure activeDocText has finished loading
    const t = setTimeout(autoAnalyze, 600);
    return () => clearTimeout(t);
  }, [activeDoc, activeDocText, aiModel, slideId, activeModelLabel]);

  const handleAttachFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const docId = `doc-attached-${Date.now()}`;
    const courseCode = activeDoc?.courseCode || 'general';

    try {
      let extractedText = '';
      let textChunks: { text: string; pageNum: number }[] = [];

      // Add a loader system message to let the user know we're parsing
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-upload-${Date.now()}`,
          role: 'assistant',
          content: `⏳ **Analyzing & Indexing Attachment: ${file.name}**...`,
          model: 'System',
        }
      ]);

      if (file.name.toLowerCase().endsWith('.pdf')) {
        // Parse PDF in browser
        const { fullText, chunks } = await extractTextFromPdf(file);
        extractedText = fullText;
        textChunks = chunks;

        // Index in backend vector database
        await indexDocument(courseCode, docId, textChunks);
      } else if (file.name.toLowerCase().endsWith('.pptx')) {
        // PPTX unzipping on backend
        const res = await indexDocumentFile(courseCode, docId, file, file.name);
        if (res && res.chunks) {
          extractedText = res.chunks.map((c: any) => `--- Slide/Page ${c.pageNum} ---\n${c.text}`).join('\n\n');
        } else {
          throw new Error('PowerPoint parsed successfully but no slide text was returned.');
        }
      } else {
        // Assume text file
        extractedText = await file.text();
        textChunks = [{ text: extractedText, pageNum: 1 }];
        await indexDocument(courseCode, docId, textChunks);
      }

      setAttachedFile({
        name: file.name,
        text: extractedText,
        id: docId
      });

      // Clear the temporary analyzing indicator and print system status
      setMessages((prev) => {
        const filtered = prev.filter(m => !m.id.startsWith('sys-upload-'));
        return [
          ...filtered,
          {
            id: `sys-upload-ok-${Date.now()}`,
            role: 'assistant',
            content: `📎 **Attached & Indexed**: \`${file.name}\` successfully! Asking AI to summarize...`,
            model: 'System',
          }
        ];
      });

      // Automatically trigger a summarizing welcome query for the file
      try {
        const summaryPrompt = `[System Action: File Attached] The student has directly attached the document "${file.name}".\nHere is its text content:\n\n${extractedText.slice(0, 15000)}\n\nPlease provide a very brief (2-3 sentences max) summary of this file and explain how you can help them study it (e.g. solve its exercises, explain formulas, or generate flashcards).`;
        const res = await askAi(summaryPrompt, slideId, aiModel, {
          currentSlideText: extractedText,
          courseId: courseCode
        });

        setMessages((prev) => {
          const filtered = prev.filter(m => !m.id.startsWith('sys-upload-ok-'));
          return [
            ...filtered,
            {
              id: `ai-attach-summary-${Date.now()}`,
              role: 'assistant',
              content: res.text ?? `I've processed \`${file.name}\`. Ask me anything about it!`,
              model: res.model ?? activeModelLabel,
            }
          ];
        });
      } catch (err) {
        console.error('Failed to summarize attachment:', err);
      }

    } catch (err: any) {
      console.error('File attachment processing error:', err);
      setError(`Failed to process attachment: ${err.message || err}`);
      setMessages((prev) => prev.filter(m => !m.id.startsWith('sys-upload-')));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSend = async (e: React.FormEvent | null, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptText = customPrompt || input;
    if (!promptText.trim() || isLoading) return;

    const userMsg: AiChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: promptText.trim(),
      model: 'You',
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Style setting payload wrapper
      const styleInstruction = isTechnical 
        ? "\n\n(Note: Provide a highly technical, rigorous, and deep academic explanation with mathematical depth.)"
        : "\n\n(Note: Explain in extremely simple terms, using relatable everyday analogies for quick understanding.)";

      const finalPrompt = userMsg.content + styleInstruction;

      const extraContext = {
        currentSlideText: attachedFile ? attachedFile.text : (activeDocText || slideContextText || ''),
        videoUrl: activeVideoUrl || '',
        videoTimestamp: activeVideoTimestamp || 0,
        courseId: activeDoc?.courseCode || 'general'
      };

      const res = await askAi(finalPrompt, slideId, aiModel, extraContext);
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
      setError('AI unreachable. Ensure the backend is running.');
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

      {/* Quick Study Tools Panel */}
      <div className="shrink-0 py-2 border-t border-fouzar-border flex flex-col gap-2 bg-fouzar-surface/40">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[7px] text-fouzar-text-secondary uppercase">Study Tools</span>
          
          <button
            type="button"
            onClick={() => setIsTechnical(!isTechnical)}
            className={`px-2 py-0.5 font-mono text-[6.5px] uppercase border rounded-[var(--fouzar-radius-sm)] transition-all cursor-pointer ${
              isTechnical 
                ? 'border-fouzar-accent text-fouzar-accent bg-fouzar-accent/5' 
                : 'border-fouzar-border text-fouzar-text-secondary'
            }`}
          >
            {isTechnical ? '🔬 Technical Mode' : '💡 Simple Mode'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleSend(null, "Generate a 3-question multiple choice quiz with answers based on the active slide context.")}
            className="flex-1 min-w-[70px] px-2 py-1 bg-fouzar-elevated hover:bg-fouzar-accent/10 border border-fouzar-border hover:border-fouzar-accent/20 rounded-[var(--fouzar-radius-sm)] font-mono text-[7px] text-fouzar-text-primary uppercase tracking-wider text-center cursor-pointer transition-all disabled:opacity-40"
          >
            📝 Quiz
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleSend(null, "Create a set of interactive Q&A study flashcards summarizing the core concepts in the active slide context.")}
            className="flex-1 min-w-[70px] px-2 py-1 bg-fouzar-elevated hover:bg-fouzar-accent/10 border border-fouzar-border hover:border-fouzar-accent/20 rounded-[var(--fouzar-radius-sm)] font-mono text-[7px] text-fouzar-text-primary uppercase tracking-wider text-center cursor-pointer transition-all disabled:opacity-40"
          >
            🎴 Flashcards
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleSend(null, "Compile a clean, high-yield study sheet and exam notes summarizing the active slide context.")}
            className="flex-1 min-w-[70px] px-2 py-1 bg-fouzar-elevated hover:bg-fouzar-accent/10 border border-fouzar-border hover:border-fouzar-accent/20 rounded-[var(--fouzar-radius-sm)] font-mono text-[7px] text-fouzar-text-primary uppercase tracking-wider text-center cursor-pointer transition-all disabled:opacity-40"
          >
            ✍️ Study Guide
          </button>
        </div>
      </div>

      {/* Attachment badge */}
      {attachedFile && (
        <div className="shrink-0 px-2 py-1 bg-fouzar-accent/5 border border-fouzar-accent/20 rounded-[var(--fouzar-radius-sm)] flex items-center justify-between text-[7px] font-mono text-fouzar-accent uppercase mt-2">
          <div className="flex items-center gap-1.5 truncate">
            <Paperclip className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">Attached: {attachedFile.name}</span>
          </div>
          <button
            type="button"
            onClick={() => setAttachedFile(null)}
            className="p-0.5 hover:bg-fouzar-accent/10 rounded-full cursor-pointer transition-colors"
            title="Remove attachment"
          >
            <X className="w-2.5 h-2.5 text-fouzar-text-secondary hover:text-fouzar-signal" />
          </button>
        </div>
      )}

      <div className="shrink-0 space-y-2 border-t border-fouzar-border pt-2">
        <div className="flex justify-between items-center">
          <span className="inline-block px-2 py-0.5 bg-fouzar-accent/10 border border-fouzar-accent/20 text-fouzar-accent font-mono text-[7px] uppercase rounded-[var(--fouzar-radius-sm)]">
            {contextLabel}
          </span>
          {activeVideoTimestamp > 0 && (
            <span className="font-mono text-[6.5px] text-fouzar-text-secondary uppercase">
              Synced at {Math.floor(activeVideoTimestamp / 60)}:{(activeVideoTimestamp % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
        <form onSubmit={(e) => handleSend(e)} className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.pptx,.txt,.md,.js,.ts,.tsx,.py,.css,.html,.cpp,.java"
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading || isLoading}
            onClick={handleAttachFileClick}
            className="p-2 border border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-accent rounded-[var(--fouzar-radius-md)] hover:bg-fouzar-elevated/40 disabled:opacity-40 cursor-pointer animate-none"
            title="Attach study slides, PDF, or code files"
          >
            {isUploading ? (
              <span className="w-4 h-4 block border-2 border-fouzar-accent border-t-transparent rounded-full animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 bg-fouzar-elevated/50 border border-fouzar-border px-3 py-2 text-[10px] rounded-[var(--fouzar-radius-md)] focus:outline-none focus:shadow-[var(--fouzar-focus-ring)]"
          />
          <button
            type="submit"
            disabled={isLoading || isUploading}
            className="p-2 bg-fouzar-accent text-fouzar-text-inverse rounded-[var(--fouzar-radius-md)] hover:opacity-90 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
