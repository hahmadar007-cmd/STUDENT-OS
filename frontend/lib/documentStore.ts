/**
 * Browser-side binary storage for lecture slides and course files.
 * Uses IndexedDB so PDFs/PPTs persist across sessions without a backend upload API.
 */

const DB_NAME = 'fouzar-documents';
const STORE_NAME = 'files';
const DB_VERSION = 1;

export interface StoredDocument {
  id: string;
  fileName: string;
  mimeType: string;
  blob: Blob;
  uploadedAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveDocument(file: File): Promise<StoredDocument> {
  const id = `file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record: StoredDocument = {
    id,
    fileName: file.name,
    mimeType: file.type || guessMimeType(file.name),
    blob: file,
    uploadedAt: new Date().toISOString(),
  };
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDocument(id: string): Promise<StoredDocument | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve((req.result as StoredDocument) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}

function guessMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    txt: 'text/plain',
    md: 'text/markdown',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  return map[ext ?? ''] ?? 'application/octet-stream';
}

export function isViewableInBrowser(mimeType: string, fileName: string): boolean {
  if (mimeType === 'application/pdf') return true;
  if (mimeType.startsWith('image/')) return true;
  if (mimeType.startsWith('text/')) return true;
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext === 'pdf' || ext === 'txt' || ext === 'md';
}
