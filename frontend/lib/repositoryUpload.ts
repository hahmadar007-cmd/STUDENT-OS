import { saveDocument } from './documentStore';
import type { LmsRepositoryItem } from './FouzarContext';

export function formatFileSize(bytes: number): string {
  if (bytes > 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.ceil(bytes / 1024)} KB`;
}

export function inferCategory(fileName: string): LmsRepositoryItem['category'] {
  const lower = fileName.toLowerCase();
  if (lower.includes('syllabus')) return 'syllabus';
  if (lower.includes('lab')) return 'lab';
  if (lower.includes('lecture') || lower.includes('slide') || lower.endsWith('.ppt') || lower.endsWith('.pptx')) {
    return 'lecture';
  }
  if (lower.includes('exam') || lower.includes('midterm') || lower.includes('final')) return 'exam';
  return 'other';
}

/**
 * Saves the file blob to IndexedDB and returns metadata for the repository catalog.
 */
export async function buildRepositoryEntryFromFile(
  file: File,
  courseCode: string,
): Promise<Omit<LmsRepositoryItem, 'id' | 'uploadedAt'>> {
  const stored = await saveDocument(file);
  return {
    fileName: file.name,
    courseCode,
    category: inferCategory(file.name),
    sizeLabel: formatFileSize(file.size),
    storageId: stored.id,
    mimeType: stored.mimeType,
  };
}
