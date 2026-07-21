/**
 * Fasca Resource Engine — IndexedDB Cache Layer
 * 4 stores: courses | resources | sync | settings
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface DBCourse {
  id: string;
  name: string;
  shortName: string;
  teacher?: string;
  lastUpdated: number;
}

export interface DBResource {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  type: 'slide' | 'assignment' | 'lab' | 'book' | 'zip' | 'video' | 'link' | 'other';
  extension: string;
  size: number;
  uploadedAt: number;
  modifiedAt: number;
  downloadUrl: string;
  localPath?: string;
  isDownloaded: boolean;
  isFavorite: boolean;
  lastOpened?: number;
  description?: string;
  moduleName?: string;
}

export interface DBSync {
  id: 'main';
  lastSync: number;
  portalStatus: 'online' | 'offline' | 'unknown';
  version: number;
  userId?: string;
}

export interface DBSettings {
  id: 'main';
  groupBy: 'type' | 'course' | 'date';
  activeFilters: string[];
}

interface FascaDB extends DBSchema {
  courses: {
    key: string;
    value: DBCourse;
    indexes: { 'by-name': string };
  };
  resources: {
    key: string;
    value: DBResource;
    indexes: {
      'by-course': string;
      'by-type': string;
      'by-uploadedAt': number;
      'by-lastOpened': number;
      'by-favorite': number;
    };
  };
  sync: {
    key: string;
    value: DBSync;
  };
  settings: {
    key: string;
    value: DBSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<FascaDB>> | null = null;

export const getDB = (): Promise<IDBPDatabase<FascaDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<FascaDB>('fasca-lms', 1, {
      upgrade(db) {
        // courses
        const courseStore = db.createObjectStore('courses', { keyPath: 'id' });
        courseStore.createIndex('by-name', 'name');

        // resources
        const resourceStore = db.createObjectStore('resources', { keyPath: 'id' });
        resourceStore.createIndex('by-course', 'courseId');
        resourceStore.createIndex('by-type', 'type');
        resourceStore.createIndex('by-uploadedAt', 'uploadedAt');
        resourceStore.createIndex('by-lastOpened', 'lastOpened');
        resourceStore.createIndex('by-favorite', 'isFavorite');

        // sync & settings
        db.createObjectStore('sync', { keyPath: 'id' });
        db.createObjectStore('settings', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
};

// ── Courses ────────────────────────────────────────────────────────
export async function saveCourses(courses: DBCourse[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('courses', 'readwrite');
  for (const c of courses) await tx.store.put(c);
  await tx.done;
}

export async function getAllCourses(): Promise<DBCourse[]> {
  const db = await getDB();
  return db.getAll('courses');
}

// ── Resources ──────────────────────────────────────────────────────
export async function saveResources(resources: DBResource[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('resources', 'readwrite');
  for (const r of resources) {
    const existing = await tx.store.get(r.id);
    if (existing) {
      // Preserve user preferences
      await tx.store.put({ ...r, isFavorite: existing.isFavorite, lastOpened: existing.lastOpened });
    } else {
      await tx.store.put(r);
    }
  }
  await tx.done;
}

export async function getResourcesByCourse(courseId: string): Promise<DBResource[]> {
  const db = await getDB();
  return db.getAllFromIndex('resources', 'by-course', courseId);
}

export async function getAllResources(): Promise<DBResource[]> {
  const db = await getDB();
  return db.getAll('resources');
}

export async function toggleFavorite(id: string): Promise<void> {
  const db = await getDB();
  const resource = await db.get('resources', id);
  if (resource) {
    await db.put('resources', { ...resource, isFavorite: !resource.isFavorite });
  }
}

export async function markOpened(id: string): Promise<void> {
  const db = await getDB();
  const resource = await db.get('resources', id);
  if (resource) {
    await db.put('resources', { ...resource, lastOpened: Date.now() });
  }
}

export async function getRecentlyAdded(limit = 10): Promise<DBResource[]> {
  const all = await getAllResources();
  return [...all].sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, limit);
}

export async function getRecentlyOpened(limit = 5): Promise<DBResource[]> {
  const all = await getAllResources();
  return all
    .filter(r => r.lastOpened != null)
    .sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0))
    .slice(0, limit);
}

export async function getFavorites(): Promise<DBResource[]> {
  const all = await getAllResources();
  return all.filter(r => r.isFavorite);
}

// ── Search ─────────────────────────────────────────────────────────
export async function searchResources(query: string): Promise<DBResource[]> {
  const all = await getAllResources();
  const q = query.toLowerCase().trim();
  if (!q) return [];

  return all
    .map(r => {
      const title = r.title.toLowerCase();
      const course = r.courseName.toLowerCase();
      let score = 0;
      if (title === q) score = 100;
      else if (title.startsWith(q)) score = 80;
      else if (title.includes(q)) score = 60;
      else if (course.includes(q)) score = 40;
      else if (r.type.includes(q)) score = 20;
      return { resource: r, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.resource);
}

// ── Sync Metadata ──────────────────────────────────────────────────
export async function setSyncMeta(meta: Partial<DBSync>): Promise<void> {
  const db = await getDB();
  const existing = (await db.get('sync', 'main')) ?? {
    id: 'main', lastSync: 0, portalStatus: 'unknown', version: 1
  };
  await db.put('sync', { ...existing, ...meta } as DBSync);
}

export async function getSyncMeta(): Promise<DBSync | undefined> {
  const db = await getDB();
  return db.get('sync', 'main');
}

// ── Settings ───────────────────────────────────────────────────────
export async function getSettings(): Promise<DBSettings> {
  const db = await getDB();
  return (await db.get('settings', 'main')) ?? {
    id: 'main',
    groupBy: 'type',
    activeFilters: [],
  };
}

export async function saveSettings(settings: Partial<DBSettings>): Promise<void> {
  const db = await getDB();
  const existing = await getSettings();
  await db.put('settings', { ...existing, ...settings });
}

// ── Normalizer: API Resource → DBResource ──────────────────────────
export function normalizeResource(apiRes: any, courseName: string): DBResource {
  const nameLower = apiRes.name.toLowerCase();
  const ext = nameLower.split('.').pop() ?? '';
  let type: DBResource['type'] = 'other';
  if (['ppt', 'pptx', 'key'].includes(ext) || nameLower.includes('slide') || nameLower.includes('lecture')) type = 'slide';
  else if (nameLower.includes('assignment') || nameLower.includes('task') || nameLower.includes('hw')) type = 'assignment';
  else if (nameLower.includes('lab')) type = 'lab';
  else if (['zip', 'rar', '7z', 'tar'].includes(ext)) type = 'zip';
  else if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) type = 'video';
  else if (['pdf', 'doc', 'docx', 'txt', 'epub'].includes(ext)) type = 'book';

  return {
    id: apiRes.id,
    courseId: apiRes.courseId,
    courseName,
    title: apiRes.name,
    type,
    extension: ext.toUpperCase(),
    size: apiRes.fileSize ?? 0,
    uploadedAt: apiRes.lastModified ?? Date.now(),
    modifiedAt: apiRes.lastModified ?? Date.now(),
    downloadUrl: apiRes.downloadUrl ?? '',
    isDownloaded: false,
    isFavorite: false,
    lastOpened: undefined,
    description: apiRes.description,
    moduleName: apiRes.moduleName,
  };
}
