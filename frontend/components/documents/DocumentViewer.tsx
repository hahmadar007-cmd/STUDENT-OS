'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, ExternalLink, Maximize2, Minimize2, Eye, EyeOff } from 'lucide-react';
import {
  getDocument,
  createObjectUrl,
  revokeObjectUrl,
  isViewableInBrowser,
  updateDocumentPdfPreview,
} from '../../lib/documentStore';
import { useFouzar } from '../../lib/FouzarContext';
import type { LmsRepositoryItem } from '../../lib/FouzarContext';
import { indexDocument, indexDocumentFile } from '../../lib/api';

interface DocumentViewerProps {
  document: LmsRepositoryItem | null;
  onClose: () => void;
  isInline?: boolean;
}

export async function extractTextFromPdf(blob: Blob): Promise<{ fullText: string; chunks: { text: string; pageNum: number }[] }> {
  return new Promise(async (resolve, reject) => {
    try {
      if (typeof window === 'undefined') {
        resolve({ fullText: '', chunks: [] });
        return;
      }
      
      // Load PDF.js dynamically from CDN if not already loaded
      if (!(window as any).pdfjsLib) {
        const script = window.document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
        window.document.head.appendChild(script);
        await new Promise((res) => {
          script.onload = res;
          script.onerror = () => reject(new Error('Failed to load PDF.js script.'));
        });
      }

      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let fullText = '';
      const chunks: { text: string; pageNum: number }[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += `--- Slide/Page ${i} ---\n${pageText}\n\n`;
        chunks.push({ text: pageText, pageNum: i });
      }
      
      resolve({ fullText, chunks });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * In-app viewer for uploaded lecture slides and course files.
 * PDFs and images render inline; other formats offer download.
 */
export const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose, isInline = false }) => {
  const { setActiveDocText } = useFouzar();
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showTextMode, setShowTextMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document?.storageId) return;

    let dlUrl: string | null = null;
    let prvUrl: string | null = null;
    setLoading(true);
    setIsConverting(false);
    setError(null);
    setTextContent(null);
    setDownloadUrl(null);
    setPreviewUrl(null);
    setShowTextMode(false);

    getDocument(document.storageId)
      .then(async (stored) => {
        if (!stored) {
          setError('File not found. It may have been cleared from browser storage.');
          return;
        }

        // Always create a download URL for the original file
        dlUrl = createObjectUrl(stored.blob);
        setDownloadUrl(dlUrl);

        const metaText = `[Study Material: ${document.fileName}]\nCategory: ${document.category}\nCourse: ${document.courseCode}`;

        if (stored.mimeType.startsWith('text/') || document.fileName.endsWith('.md') || document.fileName.endsWith('.txt') || document.fileName.endsWith('.js') || document.fileName.endsWith('.ts') || document.fileName.endsWith('.tsx') || document.fileName.endsWith('.py') || document.fileName.endsWith('.json') || document.fileName.endsWith('.css') || document.fileName.endsWith('.html') || document.fileName.endsWith('.cpp') || document.fileName.endsWith('.java')) {
          const text = await stored.blob.text();
          setTextContent(text);
          setActiveDocText(`${metaText}\n\n[Content]:\n${text}`);
          // Index text file in Vector DB
          indexDocument(document.courseCode || 'general', document.id || document.storageId || 'text-doc', [{ text, pageNum: 1 }])
            .catch(e => console.error('Failed to index text file:', e));
        } else if (stored.mimeType === 'application/pdf' || document.fileName.toLowerCase().endsWith('.pdf')) {
          prvUrl = dlUrl;
          setPreviewUrl(prvUrl);
          setActiveDocText(metaText);
          // Extract and load PDF text contents asynchronously
          try {
            const { fullText, chunks } = await extractTextFromPdf(stored.blob);
            setActiveDocText(`${metaText}\n\n[Extracted Slide Content]:\n${fullText}`);
            setTextContent(fullText); // Plain text view option
            // Index PDF page chunks in Vector DB
            indexDocument(document.courseCode || 'general', document.id || document.storageId || 'pdf-doc', chunks)
              .catch(e => console.error('Failed to index PDF:', e));
          } catch (e) {
            console.error('PDF text extraction error:', e);
          }
        } else if (stored.mimeType.startsWith('image/')) {
          prvUrl = dlUrl;
          setPreviewUrl(prvUrl);
          setActiveDocText(`${metaText}\nType: Image`);
        } else if (document.fileName.toLowerCase().endsWith('.pptx')) {
          setActiveDocText(metaText);

          // Check if we already have the converted PDF preview cached locally
          if (stored.pdfPreviewBlob) {
            prvUrl = createObjectUrl(stored.pdfPreviewBlob);
            setPreviewUrl(prvUrl);
            
            // Extract slide text for activeDocText by hitting index-document silently
            try {
              const res = await indexDocumentFile(document.courseCode || 'general', document.id || document.storageId || 'pptx-doc', stored.blob, document.fileName);
              if (res && res.chunks) {
                const fullText = res.chunks.map((c: any) => `--- Slide/Page ${c.pageNum} ---\n${c.text}`).join('\n\n');
                setActiveDocText(`${metaText}\n\n[Extracted PowerPoint Content]:\n${fullText}`);
                setTextContent(fullText);
              }
            } catch (e) {
              console.error('Failed to retrieve PPTX chunks for cached preview:', e);
            }
          } else {
            // No cached PDF, call backend to parse and convert
            setIsConverting(true);
            try {
              const res = await indexDocumentFile(
                document.courseCode || 'general',
                document.id || document.storageId || 'pptx-doc',
                stored.blob,
                document.fileName
              );
              if (res && res.chunks && res.chunks.length > 0) {
                const fullText = res.chunks.map((c: any) => `--- Slide/Page ${c.pageNum} ---\n${c.text}`).join('\n\n');
                setActiveDocText(`${metaText}\n\n[Extracted PowerPoint Content]:\n${fullText}`);
                setTextContent(fullText);

                // If backend returned converted PDF base64 string, decode and cache it
                if (res.pdfBase64) {
                  try {
                    const byteCharacters = atob(res.pdfBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
                    
                    // Save to IndexedDB
                    await updateDocumentPdfPreview(stored.id, pdfBlob);
                    
                    // Create object URL for preview
                    prvUrl = createObjectUrl(pdfBlob);
                    setPreviewUrl(prvUrl);
                  } catch (e) {
                    console.error('Failed to decode and save PPTX PDF preview:', e);
                  }
                }
              } else {
                setError('Failed to extract text. No slide text content could be read from this PowerPoint file.');
              }
            } catch (e: any) {
              console.error('PPTX text indexing/extraction error:', e);
              setError(`Failed to process PowerPoint: ${e.message || 'API is offline or unreachable'}. Please make sure the backend is running.`);
            } finally {
              setIsConverting(false);
            }
          }
        } else {
          setActiveDocText(`${metaText}\nType: ${stored.mimeType}`);
        }
      })
      .catch(() => setError('Failed to load document.'))
      .finally(() => setLoading(false));

    return () => {
      if (dlUrl) revokeObjectUrl(dlUrl);
      if (prvUrl) revokeObjectUrl(prvUrl);
      setActiveDocText(null);
    };
  }, [document, setActiveDocText]);

  if (!document) return null;

  const isPdf =
    document.mimeType === 'application/pdf' || 
    document.fileName.toLowerCase().endsWith('.pdf') ||
    (document.fileName.toLowerCase().endsWith('.pptx') && previewUrl !== null);

  const isImage = document.mimeType?.startsWith('image/');

  const canPreview =
    document.storageId &&
    (isViewableInBrowser(document.mimeType ?? '', document.fileName) ||
      (document.fileName.toLowerCase().endsWith('.pptx') && (textContent !== null || previewUrl !== null)));

  // If in inline mode and NOT expanded to fullscreen
  if (isInline && !isFullscreen) {
    return (
      <div className="w-full h-full flex flex-col bg-fouzar-surface border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="min-w-0 flex-1 mr-2">
            <h2 className="font-serif text-xs font-bold truncate" title={document.fileName}>{document.fileName}</h2>
            <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">
              {document.courseCode} · {document.category} · {document.sizeLabel}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* View Mode Toggle */}
            {textContent !== null && (isPdf || isImage) && (
              <button
                type="button"
                onClick={() => setShowTextMode(!showTextMode)}
                className={`p-1.5 border rounded-[var(--fouzar-radius-md)] flex items-center gap-1 font-mono text-[7px] uppercase cursor-pointer ${
                  showTextMode
                    ? 'bg-fouzar-accent/20 border-fouzar-accent text-fouzar-accent'
                    : 'border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-text-primary'
                }`}
                title={showTextMode ? "Switch to Visual Presentation View" : "View Extracted Plain Text"}
              >
                {showTextMode ? <Eye className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{showTextMode ? "Slides" : "Text"}</span>
              </button>
            )}

            {/* Open in New Tab (gives native PDF zoom/print controls) */}
            {previewUrl && isPdf && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-accent"
                title="Open in new tab (Zoom, Print, Present)"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={document.fileName}
                className="p-1.5 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-accent"
                title="Download Original File"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Maximize to fullscreen modal */}
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="p-1.5 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-accent cursor-pointer"
              title="Expand to Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

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
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="font-mono text-[9px] text-fouzar-accent animate-pulse uppercase font-bold tracking-wider">
                {isConverting ? 'Converting PPT to PDF...' : 'Loading document...'}
              </span>
              {isConverting && (
                <span className="font-mono text-[7.5px] text-fouzar-text-secondary uppercase">
                  ⚡ Pre-rendering slides for visual preview. Please wait...
                </span>
              )}
            </div>
          )}

          {!loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
              <FileText className="w-8 h-8 text-fouzar-signal opacity-60" />
              <p className="font-mono text-[8px] text-fouzar-signal uppercase max-w-sm">{error}</p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={document.fileName}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[8px] uppercase font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-opacity mt-1"
                >
                  <Download className="w-3.5 h-3.5" /> Download File
                </a>
              )}
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

          {!loading && !error && previewUrl && isPdf && !showTextMode && (
            <iframe
              src={previewUrl}
              title={document.fileName}
              className="flex-1 w-full border-0 bg-white/5"
            />
          )}

          {!loading && !error && previewUrl && isImage && !showTextMode && (
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
              <img src={previewUrl} alt={document.fileName} className="max-w-full max-h-full object-contain" />
            </div>
          )}

          {!loading && !error && textContent !== null && (showTextMode || (!isPdf && !isImage)) && (
            <pre className="flex-1 overflow-auto p-4 font-mono text-[10px] leading-relaxed text-fouzar-text-primary whitespace-pre-wrap bg-fouzar-bg/20">
              {textContent}
            </pre>
          )}

          {!loading && !error && downloadUrl && !canPreview && (
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
                href={downloadUrl}
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

  // Fullscreen layout (rendered inside fixed backdrop modal)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-fouzar-bg/95 backdrop-blur-md flex flex-col p-4 md:p-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="min-w-0">
            <h2 className="font-serif text-sm font-bold truncate">{document.fileName}</h2>
            <p className="font-mono text-[7px] text-fouzar-text-secondary uppercase mt-0.5">
              {document.courseCode} · {document.category} · {document.sizeLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle */}
            {textContent !== null && (isPdf || isImage) && (
              <button
                type="button"
                onClick={() => setShowTextMode(!showTextMode)}
                className={`px-3 py-1.5 border rounded-[var(--fouzar-radius-md)] flex items-center gap-1.5 font-mono text-[8.5px] uppercase cursor-pointer ${
                  showTextMode
                    ? 'bg-fouzar-accent/20 border-fouzar-accent text-fouzar-accent'
                    : 'border-fouzar-border text-fouzar-text-secondary hover:text-fouzar-text-primary'
                }`}
                title={showTextMode ? "Switch to Slides View" : "View Extracted Text"}
              >
                {showTextMode ? <Eye className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                <span>{showTextMode ? "Slides View" : "Text Version"}</span>
              </button>
            )}

            {previewUrl && isPdf && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-accent"
                title="Open in new tab (Zoom, Print, Present)"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {downloadUrl && (
              <a
                href={downloadUrl}
                download={document.fileName}
                className="p-2 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-fouzar-text-secondary hover:text-fouzar-accent"
                title="Download Original File"
              >
                <Download className="w-4 h-4" />
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                if (isInline) {
                  setIsFullscreen(false);
                } else {
                  onClose();
                }
              }}
              className="p-2 border border-fouzar-border rounded-[var(--fouzar-radius-md)] hover:bg-fouzar-elevated"
              title="Exit Fullscreen"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Panel */}
        <div className="flex-1 min-h-0 fouzar-card overflow-hidden flex flex-col bg-fouzar-surface/40 border border-fouzar-border">
          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-6">
              <span className="font-mono text-[10px] text-fouzar-accent animate-pulse uppercase font-bold tracking-wider">
                {isConverting ? 'Converting PPT to PDF...' : 'Loading document...'}
              </span>
              {isConverting && (
                <span className="font-mono text-[8px] text-fouzar-text-secondary uppercase">
                  ⚡ Pre-rendering slides for visual preview. Please wait...
                </span>
              )}
            </div>
          )}

          {!loading && error && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center max-w-md mx-auto">
              <FileText className="w-12 h-12 text-fouzar-signal opacity-60" />
              <p className="font-mono text-[9px] text-fouzar-signal uppercase">{error}</p>
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={document.fileName}
                  className="flex items-center gap-2 px-4 py-2 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-opacity mt-2"
                >
                  <Download className="w-4 h-4" /> Download {document.fileName}
                </a>
              )}
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

          {!loading && !error && previewUrl && isPdf && !showTextMode && (
            <iframe
              src={previewUrl}
              title={document.fileName}
              className="flex-1 w-full border-0 bg-white/5"
            />
          )}

          {!loading && !error && previewUrl && isImage && !showTextMode && (
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
              <img src={previewUrl} alt={document.fileName} className="max-w-full max-h-full object-contain" />
            </div>
          )}

          {!loading && !error && textContent !== null && (showTextMode || (!isPdf && !isImage)) && (
            <pre className="flex-1 overflow-auto p-6 font-mono text-[11px] leading-relaxed text-fouzar-text-primary whitespace-pre-wrap">
              {textContent}
            </pre>
          )}

          {!loading && !error && downloadUrl && !canPreview && (
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
                href={downloadUrl}
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
