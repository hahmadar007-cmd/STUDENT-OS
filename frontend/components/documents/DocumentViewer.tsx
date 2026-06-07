'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import {
  getDocument,
  createObjectUrl,
  revokeObjectUrl,
  isViewableInBrowser,
} from '../../lib/documentStore';
import { useFouzar } from '../../lib/FouzarContext';
import type { LmsRepositoryItem } from '../../lib/FouzarContext';

interface DocumentViewerProps {
  document: LmsRepositoryItem | null;
  onClose: () => void;
  isInline?: boolean;
}

/**
 * In-app viewer for uploaded lecture slides and course files.
 * PDFs and images render inline; other formats offer download.
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose, isInline = false }) => {
  const { setActiveDocText } = useFouzar();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document?.storageId) return;

    let url: string | null = null;
    setLoading(true);
    setError(null);
    setTextContent(null);

    getDocument(document.storageId)
      .then(async (stored) => {
        if (!stored) {
          setError('File not found. It may have been cleared from browser storage.');
          return;
        }
        url = createObjectUrl(stored.blob);
        setObjectUrl(url);

        if (stored.mimeType.startsWith('text/') || document.fileName.endsWith('.md') || document.fileName.endsWith('.txt') || document.fileName.endsWith('.js') || document.fileName.endsWith('.ts') || document.fileName.endsWith('.tsx') || document.fileName.endsWith('.py') || document.fileName.endsWith('.json') || document.fileName.endsWith('.css') || document.fileName.endsWith('.html') || document.fileName.endsWith('.cpp') || document.fileName.endsWith('.java')) {
          const text = await stored.blob.text();
          setTextContent(text);
          setActiveDocText(text);
        } else if (stored.mimeType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf')) {
          setActiveDocText(`[Study Material: PDF Document]\nName: ${document.fileName}\nCategory: ${document.category}\nCourse: ${document.courseCode}`);
        } else {
          setActiveDocText(`[Study Material: File]\nName: ${document.fileName}\nCategory: ${document.category}\nCourse: ${document.courseCode}\nType: ${stored.mimeType}`);
        }
      })
      .catch(() => setError('Failed to load document.'))
      .finally(() => setLoading(false));

    return () => {
      if (url) revokeObjectUrl(url);
      setActiveDocText(null);
    };
  }, [document, setActiveDocText]);

  if (!document) return null;

  const canPreview =
    document.storageId &&
    isViewableInBrowser(document.mimeType ?? '', document.fileName);

  const isPdf =
    document.mimeType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf');
  const isImage = document.mimeType?.startsWith('image/');

  if (isInline) {
    return (
      <div className="w-full h-full flex flex-col bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="min-w-0">
            <h2 className="font-serif text-xs font-bold truncate">{document.fileName}</h2>
            <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">
              {document.courseCode} · {document.category} · {document.sizeLabel}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {objectUrl && (
              <a
                href={objectUrl}
                download={document.fileName}
                className="p-1.5 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-accent"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 border border-fouzar-border rounded-[var(--fouzar-radius-md)] hover:bg-fouzar-elevated font-mono text-[7.5px] uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 min-h-0 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)] overflow-hidden flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <span className="font-mono text-[9px] text-fouzar-accent animate-pulse uppercase">
                Loading document...
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText className="w-8 h-8 text-fouzar-signal opacity-60" />
              <p className="font-mono text-[8px] text-fouzar-signal uppercase max-w-sm">{error}</p>
            </div>
          )}

          {!loading && !error && !document.storageId && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText className="w-8 h-8 text-fouzar-text-tertiary" />
              <p className="font-mono text-[8px] text-fouzar-text-secondary uppercase">
                No preview available. Re-upload.
              </p>
            </div>
          )}

          {!loading && !error && objectUrl && isPdf && (
            <iframe
              src={objectUrl}
              title={document.fileName}
              className="flex-1 w-full border-0 bg-white/5"
            />
          )}

          {!loading && !error && objectUrl && isImage && (
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
              <img src={objectUrl} alt={document.fileName} className="max-w-full max-h-full object-contain" />
            </div>
          )}

          {!loading && !error && textContent !== null && (
            <pre className="flex-1 overflow-auto p-4 font-mono text-[10px] leading-relaxed text-fouzar-text-primary whitespace-pre-wrap bg-fouzar-bg/20">
              {textContent}
            </pre>
          )}

          {!loading && !error && objectUrl && !canPreview && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3.5 p-6 text-center max-w-sm mx-auto">
              <FileText className="w-8 h-8 text-fouzar-accent opacity-80" />
              <div className="space-y-1.5">
                <p className="font-mono text-[8.5px] text-fouzar-text-primary uppercase tracking-wider font-bold">
                  PowerPoint / Word Preview Limited
                </p>
                <p className="font-mono text-[7.5px] text-fouzar-text-secondary uppercase leading-normal">
                  Web browsers cannot natively preview Office files (.pptx, .docx).
                </p>
                <p className="font-mono text-[7px] text-fouzar-accent uppercase leading-normal bg-fouzar-accent/10 border border-fouzar-accent/20 px-2 py-1.5 rounded-[var(--fouzar-radius-sm)]">
                  💡 Tip: Save your PowerPoint slides as a PDF (.pdf) and upload the PDF version to read them here!
                </p>
              </div>
              <a
                href={objectUrl}
                download={document.fileName}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8px] uppercase font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-opacity mt-1"
              >
                <Download className="w-3.5 h-3.5" /> Download File
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-fouzar-bg/90 backdrop-blur-md flex flex-col p-4 md:p-6"
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="min-w-0">
            <h2 className="font-serif text-sm font-bold truncate">{document.fileName}</h2>
            <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">
              {document.courseCode} · {document.category} · {document.sizeLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {objectUrl && (
              <a
                href={objectUrl}
                download={document.fileName}
                className="p-2 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-accent"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 border border-fouzar-border rounded-[var(--fouzar-radius-md)] hover:bg-fouzar-elevated"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 fouzar-card overflow-hidden flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <span className="font-mono text-[9px] text-fouzar-accent animate-pulse uppercase">
                Loading document...
              </span>
            </div>
          )}

          {!loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText className="w-10 h-10 text-fouzar-signal opacity-60" />
              <p className="font-mono text-[9px] text-fouzar-signal uppercase max-w-sm">{error}</p>
            </div>
          )}

          {!loading && !error && !document.storageId && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText className="w-10 h-10 text-fouzar-text-tertiary" />
              <p className="font-mono text-[9px] text-fouzar-text-secondary uppercase">
                This file was cataloged before viewer support. Re-upload to open it.
              </p>
            </div>
          )}

          {!loading && !error && objectUrl && isPdf && (
            <iframe
              src={objectUrl}
              title={document.fileName}
              className="flex-1 w-full border-0 bg-white/5"
            />
          )}

          {!loading && !error && objectUrl && isImage && (
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
              <img src={objectUrl} alt={document.fileName} className="max-w-full max-h-full object-contain" />
            </div>
          )}

          {!loading && !error && textContent !== null && (
            <pre className="flex-1 overflow-auto p-6 font-mono text-[11px] leading-relaxed text-fouzar-text-primary whitespace-pre-wrap">
              {textContent}
            </pre>
          )}

          {!loading && !error && objectUrl && !canPreview && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md mx-auto">
              <FileText className="w-12 h-12 text-fouzar-accent opacity-80" />
              <div className="space-y-2">
                <p className="font-mono text-[10px] text-fouzar-text-primary uppercase tracking-wider font-bold">
                  PowerPoint / Word Preview Limited
                </p>
                <p className="font-mono text-[8.5px] text-fouzar-text-secondary uppercase leading-normal">
                  Standard web browsers do not natively support PowerPoint (.pptx) or Word (.docx) rendering.
                </p>
                <p className="font-mono text-[8px] text-fouzar-accent uppercase leading-normal bg-fouzar-accent/10 border border-fouzar-accent/20 px-3 py-2 rounded-[var(--fouzar-radius-md)]">
                  💡 Study Hack: Export/Save your presentation as a PDF (.pdf) inside Microsoft PowerPoint or Keynote, and upload that PDF instead to view and read it directly within FASCA!
                </p>
              </div>
              <a
                href={objectUrl}
                download={document.fileName}
                className="flex items-center gap-2 px-4 py-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-opacity mt-2"
              >
                <Download className="w-4 h-4" /> Download {document.fileName}
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
