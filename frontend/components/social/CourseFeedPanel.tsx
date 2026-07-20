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

export function CourseFeedPanel() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [resourcesByCourse, setResourcesByCourse] = useState<Record<string, Resource[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
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
        }
      } catch (err) {
        console.error('Failed to load courses:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleOpenSanctuary = (courseName: string) => {
    // Navigate to Sanctuary and pre-fill course context if possible
    router.push('/dashboard?tab=sanctuary'); // Assuming simple tab navigation or custom event
    // We can dispatch an event to open Sanctuary with this course context
    window.dispatchEvent(new CustomEvent('open-sanctuary', { detail: { courseName } }));
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
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-fouzar-text-secondary animate-pulse">Checking resources...</span>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Folder className="w-8 h-8 text-fouzar-border-strong mb-3" />
            <p className="text-[10px] font-mono text-fouzar-text-secondary uppercase">No courses found</p>
            <p className="text-[8px] font-mono text-fouzar-text-tertiary mt-1">Connect your university to sync courses.</p>
          </div>
        ) : (
          courses.map(course => {
            const resources = resourcesByCourse[course.id] || [];
            const recentResources = resources.slice(0, 3); // Show top 3 recent
            
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#12121a] border border-fouzar-border-strong/50 rounded-[6px] p-4 flex flex-col gap-3 group hover:border-[#7c5cfc]/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-bold text-fouzar-text-primary">{course.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-mono text-[#00d4ff] bg-[#00d4ff]/10 px-2 py-0.5 rounded-full">
                      {resources.length} RESOURCES
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mt-2">
                  {recentResources.map(res => (
                    <div key={res.id} className="flex items-center gap-2 text-[10px] text-fouzar-text-secondary">
                      <div className="w-1 h-1 rounded-full bg-[#7c5cfc]" />
                      <span className="truncate">{res.name}</span>
                      <span className="text-[8px] font-mono text-fouzar-text-tertiary uppercase ml-auto">{res.type}</span>
                    </div>
                  ))}
                  {resources.length > 3 && (
                    <div className="text-[9px] text-fouzar-text-tertiary italic pl-3 pt-1">
                      + {resources.length - 3} more resources available
                    </div>
                  )}
                  {resources.length === 0 && (
                    <div className="text-[9px] text-fouzar-text-tertiary italic pl-3 pt-1">
                      No resources available yet.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-fouzar-border-strong/30">
                  <button className="flex items-center gap-1.5 text-[9px] font-mono text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors">
                    <CheckCircle2 className="w-3 h-3 text-[#00d4ff]" />
                    <span>AVAILABLE OFFLINE</span>
                  </button>
                  
                  <button
                    onClick={() => handleOpenSanctuary(course.name)}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#7c5cfc] hover:text-[#9b82ff] transition-colors"
                  >
                    Open in Sanctuary <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
