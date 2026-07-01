'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, Paperclip, X, History, Plus, MessageSquare } from 'lucide-react';
import { askAi, indexDocument, indexDocumentFile } from '../../lib/api';
import { useFouzar } from '../../lib/FouzarContext';
import { extractTextFromPdf } from '../documents/DocumentViewer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model: string;
}

export interface AiChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: AiChatMessage[];
}

const MarkdownComponents: any = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus as any}
        language={match[1]}
        PreTag="div"
        className="rounded-md my-2 text-[9px] scrollbar-thin !bg-black/40 !border !border-white/10"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className="bg-white/10 px-1 py-0.5 rounded font-mono text-[9px] text-fouzar-accent" {...props}>
        {children}
      </code>
    );
  },
  table({ node, ...props }: any) {
    return <div className="overflow-x-auto my-2 border border-fouzar-border rounded-lg"><table className="min-w-full text-left border-collapse" {...props} /></div>;
  },
  thead({ node, ...props }: any) {
    return <thead className="bg-fouzar-elevated text-fouzar-text-primary" {...props} />;
  },
  th({ node, ...props }: any) {
    return <th className="px-3 py-2 border-b border-fouzar-border font-bold" {...props} />;
  },
  td({ node, ...props }: any) {
    return <td className="px-3 py-2 border-b border-fouzar-border/50 text-fouzar-text-secondary" {...props} />;
  },
  p({ node, ...props }: any) {
    return <p className="mb-2 last:mb-0" {...props} />;
  },
  ul({ node, ...props }: any) {
    return <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />;
  },
  ol({ node, ...props }: any) {
    return <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />;
  },
  h1({ node, ...props }: any) {
    return <h1 className="text-sm font-bold text-white mt-4 mb-2" {...props} />;
  },
  h2({ node, ...props }: any) {
    return <h2 className="text-xs font-bold text-white mt-3 mb-1.5" {...props} />;
  },
  h3({ node, ...props }: any) {
    return <h3 className="text-[11px] font-bold text-white mt-2 mb-1" {...props} />;
  },
  a({ node, ...props }: any) {
    return <a className="text-fouzar-accent hover:underline" target="_blank" rel="noopener noreferrer" {...props} />;
  },
  blockquote({ node, ...props }: any) {
    return <blockquote className="border-l-2 border-fouzar-accent pl-2 italic text-fouzar-text-tertiary my-2" {...props} />;
  }
};

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

const AI_PROVIDERS_KEY = 'fasca_ai_providers_v1';

interface StoredProvider {
  id: string;
  name: string;
  isActive: boolean;
  apiKeyRaw: string;
  baseUrl: string | null;
  providerType: 'OPENAI' | 'ANTHROPIC' | 'GEMINI' | 'CUSTOM';
}

function useConfiguredEngines() {
  const [engines, setEngines] = useState<StoredProvider[]>([]);
  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(AI_PROVIDERS_KEY);
        if (raw) setEngines(JSON.parse(raw));
        else setEngines([]);
      } catch { setEngines([]); }
    };
    load();
    // Re-sync when user switches tabs back or adds an engine
    window.addEventListener('focus', load);
    window.addEventListener('storage', load);
    return () => { window.removeEventListener('focus', load); window.removeEventListener('storage', load); };
  }, []);
  return engines;
}

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
    activeVideoTimestamp,
    aiTriggerQuery,
    setAiTriggerQuery
  } = useFouzar();
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages || [];

  const setMessages = (updater: React.SetStateAction<AiChatMessage[]>) => {
    setSessions(prev => {
      let activeId = activeSessionId;
      let newSessions = [...prev];

      if (!activeId) {
        activeId = `session-${Date.now()}`;
        newSessions = [{ id: activeId, title: 'New Chat', updatedAt: Date.now(), messages: [] }, ...newSessions];
        setTimeout(() => setActiveSessionId(activeId), 0);
      }

      return newSessions.map(s => {
        if (s.id === activeId) {
          const nextMsgs = typeof updater === 'function' ? updater(s.messages) : updater;
          let newTitle = s.title;
          if (s.title === 'New Chat' && nextMsgs.length > 0) {
            const first = nextMsgs.find(m => m.role === 'user');
            if (first) newTitle = first.content.slice(0, 24) + '...';
          }
          return { ...s, messages: nextMsgs, updatedAt: Date.now(), title: newTitle };
        }
        return s;
      });
    });
  };
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const engines = useConfiguredEngines();
  const activeEngine = engines.find(e => e.isActive) ?? null;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; text: string; id: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Migration from old array
          if (parsed.length > 0) {
            const migratedSession: AiChatSession = {
              id: `session-migrated-${Date.now()}`,
              title: 'Previous Chat',
              updatedAt: Date.now(),
              messages: parsed
            };
            setSessions([migratedSession]);
            setActiveSessionId(migratedSession.id);
          }
        } else if (parsed.sessions && Array.isArray(parsed.sessions)) {
          setSessions(parsed.sessions);
          setActiveSessionId(parsed.activeSessionId || (parsed.sessions.length > 0 ? parsed.sessions[0].id : null));
        }
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    if (sessions.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify({ sessions, activeSessionId }));
    }
  }, [sessions, activeSessionId, storageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);


  const activeModelLabel = activeEngine?.name ?? (aiModel ? aiModel : 'No Engine');

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

  const processFile = async (file: File) => {
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
    }
  };

  const processFileRef = useRef(processFile);
  useEffect(() => {
    processFileRef.current = processFile;
  }, [processFile]);

  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
        setIsDragging(false);
      }
    };

    const handleWindowDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      const supportedExtensions = ['.pdf', '.pptx', '.txt', '.md', '.js', '.ts', '.tsx', '.py', '.css', '.html', '.cpp', '.java'];
      const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

      if (!supportedExtensions.includes(fileExtension)) {
        setError(`Unsupported file type. Supported types: ${supportedExtensions.join(', ')}`);
        return;
      }

      await processFileRef.current(file);
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  const handleAttachFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const supportedExtensions = ['.pdf', '.pptx', '.txt', '.md', '.js', '.ts', '.tsx', '.py', '.css', '.html', '.cpp', '.java'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!supportedExtensions.includes(fileExtension)) {
      setError(`Unsupported file type. Supported types: ${supportedExtensions.join(', ')}`);
      return;
    }

    await processFile(file);
  };

  const handleSend = async (e: React.FormEvent | null, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptText = customPrompt || input;
    if (!promptText.trim() || isLoading) return;

    // Guard: require an active engine before firing any request
    if (!activeEngine) {
      setError('No AI engine is active. Add and activate one in the AI Engines panel below.');
      window.dispatchEvent(new CustomEvent('fasca:open-ai-engines'));
      return;
    }

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
      const extraContext = {
        currentSlideText: attachedFile ? attachedFile.text : (activeDocText || slideContextText || ''),
        videoUrl: activeVideoUrl || '',
        videoTimestamp: activeVideoTimestamp || 0,
        courseId: activeDoc?.courseCode || 'general'
      };

      const modelName = activeEngine?.name ?? aiModel;
      const res = await askAi(userMsg.content, slideId, modelName, extraContext, activeEngine ?? undefined);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: res.text ?? 'No response received.',
          model: res.model ?? activeModelLabel,
        },
      ]);
    } catch (err: any) {
      setError(`API Error: ${err.message || 'Connection failed. Ensure the backend is running.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!aiTriggerQuery) return;
    handleSend(null, aiTriggerQuery.text);
    setAiTriggerQuery(null);
  }, [aiTriggerQuery, setAiTriggerQuery]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col h-full bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-md)] shadow-[var(--fouzar-shadow-sm)] ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      {isDragging && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md border-4 border-dashed border-fouzar-accent flex flex-col items-center justify-center z-[9999] pointer-events-none transition-all duration-300">
          <div className="p-8 bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] flex flex-col items-center justify-center max-w-sm text-center shadow-[var(--fouzar-shadow-lg)]">
            <Sparkles className="w-12 h-12 text-fouzar-accent animate-bounce mb-4" />
            <p className="font-serif text-sm font-bold text-fouzar-text-primary uppercase tracking-wider mb-2">
              Drop file here to study
            </p>
            <p className="font-mono text-[9px] text-fouzar-text-secondary uppercase tracking-widest leading-relaxed">
              Upload PDF, PPTX, or text/code files to instantly index &amp; chat with AI
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-fouzar-accent" />
          <span className="font-mono text-[8px] uppercase tracking-widest text-fouzar-text-secondary">
            Fouzar AI
          </span>
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => {
                const newId = `session-${Date.now()}`;
                setSessions(prev => [{ id: newId, title: 'New Chat', updatedAt: Date.now(), messages: [] }, ...prev]);
                setActiveSessionId(newId);
              }}
              className="p-1 rounded hover:bg-fouzar-accent/10 text-fouzar-text-secondary hover:text-fouzar-accent transition-colors"
              title="New Chat"
            >
              <Plus className="w-3 h-3" />
            </button>
            <div className="relative group">
              <button
                className="p-1 rounded hover:bg-fouzar-accent/10 text-fouzar-text-secondary hover:text-fouzar-accent transition-colors"
                title="Chat History"
              >
                <History className="w-3 h-3" />
              </button>
              <div className="absolute top-full left-0 mt-1 w-48 bg-fouzar-elevated border border-fouzar-border rounded-[var(--fouzar-radius-md)] shadow-xl z-50 hidden group-hover:block group-focus-within:block max-h-60 overflow-y-auto">
                <div className="p-2 space-y-1">
                  <div className="text-[7px] font-mono uppercase text-fouzar-text-tertiary px-1 pb-1">Past Sessions</div>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSessionId(s.id)}
                      className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-[var(--fouzar-radius-sm)] text-[9px] ${
                        activeSessionId === s.id ? 'bg-fouzar-accent/20 text-fouzar-accent' : 'hover:bg-fouzar-accent/10 text-fouzar-text-secondary'
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 shrink-0" />
                      <span className="truncate flex-1">{s.title}</span>
                    </button>
                  ))}
                  {sessions.length === 0 && (
                    <div className="text-[8px] text-fouzar-text-tertiary px-1 py-2 italic">No history yet</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Engine selector — shows user's configured engines only (BYOK) */}
        <select
          value={activeEngine ? activeEngine.id : ''}
          onChange={async (e) => {
            const selectedId = e.target.value;
            if (!selectedId) return;
            try {
              const raw = localStorage.getItem(AI_PROVIDERS_KEY);
              if (raw) {
                const all: StoredProvider[] = JSON.parse(raw);
                const updated = all.map(p => ({ ...p, isActive: p.id === selectedId }));
                localStorage.setItem(AI_PROVIDERS_KEY, JSON.stringify(updated));
                window.dispatchEvent(new Event('storage'));
              }
              const { toggleAiProviderActive } = await import('../../lib/api');
              await toggleAiProviderActive(selectedId);
            } catch (err) {
              console.error('Failed to sync toggle with backend:', err);
            }
          }}
          className="bg-[#0f0f1a] border border-fouzar-border text-[8px] font-mono uppercase px-2 py-1 rounded-[var(--fouzar-radius-sm)] text-fouzar-text-primary focus:outline-none max-w-[130px] truncate cursor-pointer"
        >
          {engines.length === 0 ? (
            <option value="" className="bg-[#0f0f1a] text-white">No Engine</option>
          ) : (
            <>
              {!activeEngine && <option value="" disabled hidden className="bg-[#0f0f1a] text-white">Select Engine...</option>}
              {engines.map((e) => (
                <option key={e.id} value={e.id} className="bg-[#0f0f1a] text-white">{e.name}</option>
              ))}
            </>
          )}
        </select>
      </div>

      {messages.length === 0 && engines.length === 0 && (
        <div className="shrink-0 mb-2 px-3 py-3 bg-[#7c5cfc]/5 border border-[#7c5cfc]/20 rounded-[var(--fouzar-radius-sm)]">
          <p className="font-mono text-[8px] text-[#7c5cfc] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cfc] animate-pulse inline-block" />
            No AI Engine Connected
          </p>
          <p className="font-mono text-[7px] text-fouzar-text-secondary leading-relaxed mb-2">
            This app is <strong className="text-white/60">BYOK</strong>. Paste a Gemini, OpenAI, Anthropic, or DeepSeek key in AI Engines — it's tested live before saving.
          </p>
          <button
            onClick={() => {
              // Scroll to / open AI engines panel — dispatch a custom event the parent can listen for
              window.dispatchEvent(new CustomEvent('fasca:open-ai-engines'));
              // Fallback: scroll to element with this ID if it exists
              document.getElementById('ai-engines-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="font-mono text-[8px] uppercase tracking-wider text-[#7c5cfc] hover:text-[#a78bfa] border border-[#7c5cfc]/30 hover:border-[#7c5cfc]/60 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            + Add AI Engine →
          </button>
        </div>
      )}


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
                  ? 'bg-fouzar-accent/10 border border-fouzar-accent/25 text-fouzar-text-primary whitespace-pre-wrap'
                  : 'bg-fouzar-elevated border border-fouzar-border text-fouzar-text-primary/90'
              }`}
            >
              {msg.role === 'user' ? (
                msg.content
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {msg.content}
                </ReactMarkdown>
              )}
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
