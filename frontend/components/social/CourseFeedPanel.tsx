import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Book, Folder, ChevronRight, DownloadCloud, CheckCircle2 } from 'lucide-react';
import { fetchUserCourses, fetchCourseResources } from '../../lib/api';
import { useRouter } from 'next/navigation';

interface Course {
  id: string;
  name: string;
  shortName: string;
  source: string;
}

interface Resource {
  id: string;
  name: string;
  course: string;
  courseId: string;
  type: string;
  source: string;
  downloadUrl?: string;
  lastModified: number;
}

export function CourseFeedPanel({ onOpenConnect }: { onOpenConnect?: () => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [resourcesByCourse, setResourcesByCourse] = useState<Record<string, Resource[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = async () => {
    // 1. Try to load from cache immediately
    const cached = localStorage.getItem('fasca-lms-cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setCourses(parsed.courses || []);
        setResourcesByCourse(parsed.resourcesByCourse || {});
        setLoading(false); // Disable loading spinner if we have cached data
      } catch (e) {
        console.error('Failed to parse LMS cache', e);
      }
    }

    // 2. Background sync
    try {
      const cData = await fetchUserCourses();
      if (cData && Array.isArray(cData)) {
        setCourses(cData);
        
        // Fetch resources for each course
        const resMap: Record<string, Resource[]> = {};
        await Promise.all(
          cData.map(async (c: Course) => {
            try {
              const rData = await fetchCourseResources(c.id);
              if (rData && Array.isArray(rData)) {
                resMap[c.id] = rData;
              }
            } catch (e) {
              console.error('Failed to load resources for course', c.id, e);
            }
          })
        );
        setResourcesByCourse(resMap);

        // Update cache
        localStorage.setItem('fasca-lms-cache', JSON.stringify({
          courses: cData,
          resourcesByCourse: resMap,
          lastSync: Date.now()
        }));
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    window.addEventListener('refresh-courses', load);
    return () => window.removeEventListener('refresh-courses', load);
  }, []);

  const handleOpenSanctuary = (courseName: string) => {
    // Navigate to Sanctuary and pre-fill course context if possible
    router.push('/dashboard?tab=sanctuary'); // Assuming simple tab navigation or custom event
    // We can dispatch an event to open Sanctuary with this course context
    window.dispatchEvent(new CustomEvent('open-sanctuary', { detail: { courseName } }));
  };

  const getResourceIcon = (type: string, name: string) => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.zip') || lower.endsWith('.rar')) return '📦';
    if (type === 'slide') return '📘';
    if (type === 'assignment') return '📝';
    if (type === 'lab') return '🧪';
    if (type === 'past-paper') return '📄';
    return '📄';
  };

  return (
    <div className="w-full h-full flex flex-col bg-fouzar-surface/40 border border-fouzar-border-strong rounded-[6px] shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-fouzar-border-strong bg-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#7c5cfc]/20 flex items-center justify-center border border-[#7c5cfc]/30">
            <Book className="w-4 h-4 text-[#7c5cfc]" />
          </div>
          <div>
            <h2 className="text-[11px] font-bold text-fouzar-text-primary uppercase tracking-wider">My Courses</h2>
            <p className="text-[8px] font-mono text-fouzar-text-secondary uppercase tracking-widest mt-0.5">Resources & Materials</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-5 h-5 border-2 border-[#7c5cfc] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[10px] font-mono text-fouzar-text-secondary animate-pulse uppercase">Syncing Courses & Files...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Folder className="w-8 h-8 text-fouzar-border-strong mb-3" />
            <p className="text-[10px] font-mono text-fouzar-text-secondary uppercase">No courses found</p>
            <p className="text-[8px] font-mono text-fouzar-text-tertiary mt-1 mb-4">Connect your university to sync courses.</p>
            {onOpenConnect && (
              <button
                onClick={onOpenConnect}
                className="px-4 py-2 bg-[#7c5cfc] hover:bg-[#9b82ff] text-white text-[10px] font-bold rounded-[6px] transition-colors"
              >
                Connect Portal
              </button>
            )}
          </div>
        ) : (
          courses.map(course => {
            const resources = resourcesByCourse[course.id] || [];
            
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#12121a] border border-fouzar-border-strong/50 rounded-xl flex flex-col overflow-hidden"
              >
                {/* Course Header */}
                <div className="bg-[#1a1a24] p-4 border-b border-fouzar-border-strong/50 flex flex-col">
                  <h3 className="text-[14px] font-bold text-white">{course.name}</h3>
                  {course.shortName && course.shortName !== course.name && (
                    <p className="text-[10px] font-mono text-[#00d4ff] mt-1 uppercase">{course.shortName}</p>
                  )}
                </div>

                {/* Resource List */}
                <div className="flex flex-col p-2">
                  {resources.length === 0 ? (
                    <div className="p-4 text-center text-[10px] text-white/40 italic">No resources available yet.</div>
                  ) : (
                    resources.map((res, idx) => (
                      <React.Fragment key={res.id}>
                        <div className="flex items-center justify-between py-3 px-3 hover:bg-white/5 rounded-lg transition-colors group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <span className="text-lg">{getResourceIcon(res.type, res.name)}</span>
                            <span className="text-[12px] text-white/90 truncate font-medium group-hover:text-white transition-colors">{res.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {res.downloadUrl ? (
                              <>
                                <a 
                                  href={res.downloadUrl} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors"
                                >
                                  Open
                                </a>
                                <a 
                                  href={res.downloadUrl} 
                                  download
                                  className="px-3 py-1.5 bg-[#7c5cfc] hover:bg-[#9b82ff] text-white text-[10px] font-bold rounded flex items-center gap-1.5 transition-colors"
                                >
                                  Download
                                </a>
                              </>
                            ) : (
                              <span className="text-[10px] text-white/40 italic">Unavailable</span>
                            )}
                          </div>
                        </div>
                        {idx < resources.length - 1 && (
                          <div className="h-[1px] w-full bg-white/5 my-0.5"></div>
                        )}
                      </React.Fragment>
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
