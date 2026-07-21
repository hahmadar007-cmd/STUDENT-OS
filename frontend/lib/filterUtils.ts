import type { LmsRepositoryItem, FouzarFolder } from './FouzarContext';

/**
 * Safely converts a string to lowercase, returning an empty string if null or undefined.
 */
export function safeLowerCase(str?: string | null): string {
  return (str || '').toLowerCase();
}

/**
 * Safely checks if a target string includes a search query, case-insensitively.
 */
export function safeIncludes(str: string | null | undefined, query: string): boolean {
  return safeLowerCase(str).includes(safeLowerCase(query));
}

/**
 * Filters LMS repository items by the active folder.
 * Preserves strict matching behavior: items with missing or undefined courseCode fall through when activeFolderId !== 'all'.
 */
export function filterRepositoryByFolder(
  repository: LmsRepositoryItem[] = [],
  activeFolderId: string,
  activeFolder?: FouzarFolder | null
): LmsRepositoryItem[] {
  if (activeFolderId === 'all') return repository;
  if (!activeFolder?.code) return [];
  const targetCode = safeLowerCase(activeFolder.code);
  return repository.filter((doc) => {
    return Boolean(doc.courseCode) && safeLowerCase(doc.courseCode) === targetCode;
  });
}
