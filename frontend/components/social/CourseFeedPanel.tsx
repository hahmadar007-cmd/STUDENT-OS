'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book, Folder, Search, Star, StarOff, Download, ExternalLink,
  ChevronDown, ChevronRight, Clock, Sparkles, SlidersHorizontal, X
} from 'lucide-react';
import { fetchUserCourses, fetchCourseResources } from '../../lib/api';
import {
  getAllCourses, getAllResources, saveCourses, saveResources,
  getRecentlyAdded, getRecentlyOpened, searchResources as dbSearch,
  toggleFavorite as dbToggleFavorite, markOpened, normalizeResource,
  setSyncMeta, DBResource, DBCourse
} from '../../lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────
const RESOURCE_TYPES: { key: string; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '📋' },
  { key: 'slide', label: 'Slides', emoji: '📘' },
  { key: 'assignment', label: 'Assignments', emoji: '📝' },
  { key: 'lab', label: 'Labs', emoji: '🧪' },
  { key: 'book', label: 'PDFs', emoji: '📄' },
  { key: 'zip', label: 'ZIPs', emoji: '📦' },
  { key: 'video', label: 'Videos', emoji: '🎥' },
  { key: 'other', label: 'Other', emoji: '📂' },
];

const TYPE_EMOJI: Record<string, string> = {
  slide: '📘', assignment: '📝', lab: '🧪',
  book: '📄', zip: '📦', video: '🎥', link: '🔗', other: '📂',
};

const TYPE_ORDER = ['slide', 'assignment', 'lab', 'book', 'zip', 'video', 'link', 'other'];

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

// ─── File Card ─────────────────────────────────────────────────────────────────
function FileCard({ resource, onFavoriteToggle }: { resource: DBResource; onFavoriteToggle: (id: string) => void }) {
  const handleOpen = () => {
    markOpened(resource.id);
    window.open(resource.downloadUrl, '_blank');
  };
  const handleDownload = () => {
    markOpened(resource.id);
    const a = document.createElement('a');
    a.href = resource.downloadUrl;
    a.download = resource.title;
    a.click();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
    >
      {/* Icon */}
      <span className="text-xl flex-shrink-0 w-8 text-center">{TYPE_EMOJI[resource.type] ?? '📂'}</span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-white/90 truncate group-hover:text-white transition-colors">{resource.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {resource.extension && <span className="text-[9px] font-mono text-[#7c5cfc] bg-[#7c5cfc]/10 px-1.5 py-0.5 rounded uppercase">{resource.extension}</span>}
          {resource.size > 0 && <span className="text-[9px] font-mono text-white/30">{formatSize(resource.size)}</span>}
          {resource.uploadedAt && <span className="text-[9px] font-mono text-white/30">{timeAgo(resource.uploadedAt)}</span>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={() => onFavoriteToggle(resource.id)}
          title={resource.isFavorite ? 'Unfavorite' : 'Favorite'}
          className={`p-1.5 rounded transition-colors ${resource.isFavorite ? 'text-yellow-400' : 'text-white/30 hover:text-yellow-400'}`}
        >
          {resource.isFavorite ? <Star className="w-3.5 h-3.5 fill-current" /> : <StarOff className="w-3.5 h-3.5" />}
        </button>
        {resource.downloadUrl && (
          <>
            <button onClick={handleOpen} title="Open" className="p-1.5 rounded bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleDownload} title="Download" className="p-1.5 rounded bg-[#7c5cfc]/10 hover:bg-[#7c5cfc]/30 text-[#7c5cfc] hover:text-white transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ─── Collapsible Category ─────────────────────────────────────────────────────
function ResourceGroup({
  type, resources, defaultOpen = true, onFavoriteToggle
}: {
  type: string; resources: DBResource[]; defaultOpen?: boolean; onFavoriteToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const info = RESOURCE_TYPES.find(t => t.key === type) ?? { label: type, emoji: '📂', key: type };

  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors rounded-lg"
      >
        <span className="text-sm">{info.emoji}</span>
        <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider flex-1 text-left">{info.label}</span>
        <span className="text-[10px] font-mono text-white/30 bg-white/5 px-2 py-0.5 rounded-full">{resources.length}</span>
        {open ? <ChevronDown className="w-3 h-3 text-white/30" /> : <ChevronRight className="w-3 h-3 text-white/30" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pb-2">
              {resources.map(r => <FileCard key={r.id} resource={r} onFavoriteToggle={onFavoriteToggle} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mini Resource Row (for Recently Added / Continue Studying) ────────────────
function MiniResourceRow({ resource }: { resource: DBResource }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
      onClick={() => { markOpened(resource.id); window.open(resource.downloadUrl, '_blank'); }}
    >
      <span className="text-base">{TYPE_EMOJI[resource.type] ?? '📂'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-white/80 truncate group-hover:text-white transition-colors">{resource.title}</p>
        <p className="text-[9px] font-mono text-white/30 mt-0.5">{resource.courseName}</p>
      </div>
      <span className="text-[9px] font-mono text-[#00d4ff]/70 flex-shrink-0">{timeAgo(resource.uploadedAt)}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function CourseFeedPanel({ onOpenConnect }: { onOpenConnect?: () => void }) {
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [resourcesByCourse, setResourcesByCourse] = useState<Record<string, DBResource[]>>({});
  const [recentlyAdded, setRecentlyAdded] = useState<DBResource[]>([]);
  const [recentlyOpened, setRecentlyOpened] = useState<DBResource[]>([]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DBResource[]>([]);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'courses' | 'recent' | 'favorites' | 'search'>('courses');
  const [favorites, setFavorites] = useState<DBResource[]>([]);
  const [, forceUpdate] = useState(0);

  // ── Load from IndexedDB first (instant) ────────────────────────────────────
  const loadFromCache = useCallback(async () => {
    const [cachedCourses, allResources, recent, opened] = await Promise.all([
      getAllCourses(),
      getAllResources(),
      getRecentlyAdded(10),
      getRecentlyOpened(5),
    ]);

    if (cachedCourses.length) {
      setCourses(cachedCourses);
      const byC: Record<string, DBResource[]> = {};
      for (const r of allResources) {
        if (!byC[r.courseId]) byC[r.courseId] = [];
        byC[r.courseId].push(r);
      }
      setResourcesByCourse(byC);
      setRecentlyAdded(recent);
      setRecentlyOpened(opened);
      setFavorites(allResources.filter(r => r.isFavorite));
      setLoading(false);
    }
  }, []);

  // ── Background sync from API ───────────────────────────────────────────────
  const syncFromApi = useCallback(async () => {
    setSyncing(true);
    try {
      const cData = await fetchUserCourses();
      if (!cData || !Array.isArray(cData)) return;

      const dbCourses: DBCourse[] = cData.map((c: any) => ({
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        teacher: c.teacher,
        lastUpdated: Date.now(),
      }));
      await saveCourses(dbCourses);
      setCourses(dbCourses);

      const byC: Record<string, DBResource[]> = {};
      const allDbRes: import('../../lib/db').DBResource[] = [];

      await Promise.all(
        cData.map(async (c: any) => {
          try {
            const resList = await fetchCourseResources(c.id);
            const dbRes = Array.isArray(resList)
              ? resList.map((r: any) => normalizeResource({ ...r, courseId: c.id }, c.name))
              : [];
            byC[c.id] = dbRes;
            allDbRes.push(...dbRes);
          } catch {}
        })
      );

      await saveResources(allDbRes);
      setResourcesByCourse(byC);

      const [recent, opened] = await Promise.all([getRecentlyAdded(10), getRecentlyOpened(5)]);
      setRecentlyAdded(recent);
      setRecentlyOpened(opened);
      const all = await getAllResources();
      setFavorites(all.filter(r => r.isFavorite));

      await setSyncMeta({ lastSync: Date.now(), portalStatus: 'online' });
      window.dispatchEvent(new Event('lms-synced'));
    } catch {}
    finally { setSyncing(false); setLoading(false); }
  }, []);

  const handleFavoriteToggle = useCallback(async (id: string) => {
    await dbToggleFavorite(id);
    forceUpdate(n => n + 1);
    const all = await getAllResources();
    const byC: Record<string, DBResource[]> = {};
    for (const r of all) {
      if (!byC[r.courseId]) byC[r.courseId] = [];
      byC[r.courseId].push(r);
    }
    setResourcesByCourse(byC);
    setFavorites(all.filter(r => r.isFavorite));
  }, []);

  useEffect(() => {
    loadFromCache().then(() => syncFromApi());
    const handler = () => syncFromApi();
    window.addEventListener('refresh-courses', handler);
    return () => window.removeEventListener('refresh-courses', handler);
  }, [loadFromCache, syncFromApi]);

  // ── Search ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const debounce = setTimeout(async () => {
      const results = await dbSearch(searchQuery);
      setSearchResults(results);
    }, 150);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // ── Apply filters ───────────────────────────────────────────────────────────
  const filterResources = useCallback((resources: DBResource[]) => {
    if (!activeFilters.length) return resources;
    return resources.filter(r => activeFilters.includes(r.type));
  }, [activeFilters]);

  const toggleFilter = (type: string) => {
    setActiveFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const allResourcesFlat = useMemo(() => Object.values(resourcesByCourse).flat(), [resourcesByCourse]);
  const hasAnyCourses = courses.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="w-full h-full flex flex-col bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06] bg-[#111119]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Book className="w-4 h-4 text-[#7c5cfc]" />
            <h2 className="text-[11px] font-bold text-white uppercase tracking-wider">My Courses</h2>
            {syncing && <div className="w-2 h-2 rounded-full bg-[#00d4ff] animate-pulse ml-1" title="Syncing..." />}
          </div>
          {hasAnyCourses && (
            <span className="text-[9px] font-mono text-white/30">
              {allResourcesFlat.length} resources
            </span>
          )}
        </div>

        {/* ── Search Bar ─────────────────────────────────────────────────────── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (e.target.value) setActiveTab('search'); else setActiveTab('courses'); }}
            placeholder="Search slides, labs, assignments..."
            className="w-full bg-white/5 border border-white/[0.08] rounded-lg pl-9 pr-9 py-2 text-[11px] text-white/80 placeholder-white/25 outline-none focus:border-[#7c5cfc]/40 focus:bg-white/[0.07] transition-all"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setActiveTab('courses'); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────────── */}
      {!isSearching && (
        <div className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center gap-1 border-b border-white/[0.06]">
          {[
            { key: 'courses', label: 'Courses', icon: <Book className="w-3 h-3" /> },
            { key: 'recent', label: 'Recent', icon: <Sparkles className="w-3 h-3" /> },
            { key: 'favorites', label: 'Favorites', icon: <Star className="w-3 h-3" /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-mono uppercase transition-all ${activeTab === tab.key ? 'bg-[#7c5cfc]/20 text-[#9b82ff] border border-[#7c5cfc]/30' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Filter Pill Bar (only on Courses tab) ─────────────────────────────── */}
      {!isSearching && activeTab === 'courses' && hasAnyCourses && (
        <div className="flex-shrink-0 px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-b border-white/[0.04]">
          <SlidersHorizontal className="w-3 h-3 text-white/30 flex-shrink-0" />
          {RESOURCE_TYPES.filter(t => t.key !== 'all').map(t => {
            const isActive = activeFilters.includes(t.key);
            const count = allResourcesFlat.filter(r => r.type === t.key).length;
            if (count === 0) return null;
            return (
              <button
                key={t.key}
                onClick={() => toggleFilter(t.key)}
                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-mono uppercase border transition-all ${isActive ? 'bg-[#7c5cfc]/25 text-[#9b82ff] border-[#7c5cfc]/40' : 'bg-white/5 text-white/40 border-white/10 hover:text-white/70 hover:bg-white/10'}`}
              >
                {t.emoji} {t.label} <span className="opacity-50 ml-0.5">({count})</span>
              </button>
            );
          })}
          {activeFilters.length > 0 && (
            <button onClick={() => setActiveFilters([])} className="flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-mono text-[#ff2d55]/70 border border-[#ff2d55]/20 hover:bg-[#ff2d55]/10 transition-all">
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Main Content Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-3 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-5 h-5 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-mono text-white/30 uppercase animate-pulse">Syncing courses & files...</span>
          </div>
        ) : !hasAnyCourses ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Folder className="w-10 h-10 text-white/10 mb-4" />
            <p className="text-[12px] font-bold text-white/50">No courses synced yet</p>
            <p className="text-[10px] text-white/30 mt-1 mb-5">Connect your LMS to sync all your slides, assignments, and labs.</p>
            {onOpenConnect && (
              <button onClick={onOpenConnect} className="px-5 py-2.5 bg-[#7c5cfc] hover:bg-[#9b82ff] text-white text-[11px] font-bold rounded-lg transition-colors">
                Connect LMS
              </button>
            )}
          </div>
        ) : isSearching ? (
          /* Search Results */
          <div className="space-y-1">
            {searchResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-[11px] text-white/30">No results for "<span className="text-white/60">{searchQuery}</span>"</p>
              </div>
            ) : (
              <>
                <p className="text-[9px] font-mono text-white/30 px-2 mb-2 uppercase">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                {searchResults.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => { markOpened(r.id); window.open(r.downloadUrl, '_blank'); }}>
                    <span className="text-lg">{TYPE_EMOJI[r.type] ?? '📂'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-white/90 truncate">{r.title}</p>
                      <p className="text-[9px] font-mono text-[#7c5cfc]/70 truncate mt-0.5">{r.courseName} · {r.type}</p>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" />
                  </div>
                ))}
              </>
            )}
          </div>
        ) : activeTab === 'recent' ? (
          /* Recently Added & Continue Studying */
          <div className="space-y-4">
            {recentlyOpened.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-1 mb-2">
                  <Clock className="w-3 h-3 text-[#00d4ff]/70" />
                  <p className="text-[9px] font-mono text-[#00d4ff]/70 uppercase tracking-wider">Continue Studying</p>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
                  {recentlyOpened.map(r => <MiniResourceRow key={r.id} resource={r} />)}
                </div>
              </div>
            )}
            {recentlyAdded.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-1 mb-2">
                  <Sparkles className="w-3 h-3 text-[#7c5cfc]/70" />
                  <p className="text-[9px] font-mono text-[#7c5cfc]/70 uppercase tracking-wider">Recently Added</p>
                </div>
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
                  {recentlyAdded.map(r => <MiniResourceRow key={r.id} resource={r} />)}
                </div>
              </div>
            )}
            {recentlyAdded.length === 0 && recentlyOpened.length === 0 && (
              <p className="text-center text-[11px] text-white/30 py-8">Nothing recently added or opened.</p>
            )}
          </div>
        ) : activeTab === 'favorites' ? (
          /* Favorites */
          <div>
            {favorites.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <Star className="w-8 h-8 text-white/10" />
                <p className="text-[11px] text-white/30">No favorites yet</p>
                <p className="text-[9px] text-white/20">Click ⭐ next to any file to save it here</p>
              </div>
            ) : (
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg overflow-hidden">
                {favorites.map(r => <FileCard key={r.id} resource={r} onFavoriteToggle={handleFavoriteToggle} />)}
              </div>
            )}
          </div>
        ) : (
          /* Courses Tab — Grouped by Course then Type */
          courses.map((course, ci) => {
            const courseResources = filterResources(resourcesByCourse[course.id] ?? []);
            const byType: Record<string, DBResource[]> = {};
            for (const r of courseResources) {
              if (!byType[r.type]) byType[r.type] = [];
              byType[r.type].push(r);
            }
            const sortedTypes = TYPE_ORDER.filter(t => byType[t]?.length > 0);

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ci * 0.04 }}
                className="bg-[#111119] border border-white/[0.07] rounded-xl overflow-hidden"
              >
                {/* Course Header */}
                <div className="bg-gradient-to-r from-[#7c5cfc]/10 to-transparent px-4 py-3 border-b border-white/[0.06]">
                  <h3 className="text-[13px] font-bold text-white">{course.name}</h3>
                  {course.shortName && course.shortName !== course.name && (
                    <p className="text-[9px] font-mono text-[#00d4ff]/70 uppercase mt-0.5">{course.shortName}</p>
                  )}
                  {course.teacher && (
                    <p className="text-[10px] text-white/40 mt-0.5">👤 {course.teacher}</p>
                  )}
                </div>

                {/* Resource Groups */}
                <div className="p-1">
                  {sortedTypes.length === 0 ? (
                    <p className="text-center text-[10px] text-white/25 italic py-4">No resources available yet</p>
                  ) : (
                    sortedTypes.map(type => (
                      <ResourceGroup
                        key={type}
                        type={type}
                        resources={byType[type]}
                        onFavoriteToggle={handleFavoriteToggle}
                        defaultOpen={sortedTypes.indexOf(type) === 0}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}


