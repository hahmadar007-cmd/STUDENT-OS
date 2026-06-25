import re

path = "frontend/app/groups/[id]/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Imports
code = code.replace(
    "import { \n  ChevronLeft, \n  ChevronRight, \n  Users, \n  Flame,\n  MessageSquare,\n  Moon,\n  Leaf,\n  ArrowLeft\n} from 'lucide-react';",
    "import { \n  ChevronLeft, \n  ChevronRight, \n  Users, \n  Flame,\n  MessageSquare,\n  Moon,\n  Leaf,\n  ArrowLeft,\n  Search,\n  MonitorPlay\n} from 'lucide-react';\nimport { ResizablePanel } from '../../../components/ui/ResizablePanel';"
)

# 2. State
code = code.replace(
    "const [centerTab, setCenterTab] = useState<'slides' | 'notepad' | 'watch'>('slides');",
    """const [activeSplitTabs, setActiveSplitTabs] = useState<{ left: string | null, right: string | null }>({ left: 'slides', right: null });
  const [videoInput, setVideoInput] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');"""
)

# 3. Handle Video Submit function
handle_video_fn = """  const handleSetVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;
    const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|\\&v=)([^#&?]*).*/;
    const match = videoInput.match(regExp);
    if (match && match[2].length === 11) {
      setEmbedUrl(`https://www.youtube.com/embed/${match[2]}?rel=0&modestbranding=1&iv_load_policy=3&enablejsapi=1`);
    } else {
      const separator = videoInput.includes('?') ? '&' : '?';
      setEmbedUrl(`${videoInput}${videoInput.includes('enablejsapi=1') ? '' : `${separator}enablejsapi=1`}`);
    }
    setVideoInput('');
  };
"""

# 4. renderTabContent function
render_fn = """  const renderTabContent = (tab: string | null) => {
    if (!tab) return null;

    if (tab === 'slides') {
      return (
        <div className="flex flex-col flex-1 justify-between h-full w-full">
          {/* Slide Header */}
          <div className="flex justify-between items-start text-[8px] font-mono border-b border-transparent pb-3">
            <span className="text-fouzar-accent uppercase tracking-widest">{activeSlide.topic}</span>
            <span className="text-fouzar-text-secondary uppercase">PAGE {currentSlideIndex + 1} OF {slides.length}</span>
          </div>

          {/* Slide Body */}
          <div className="my-auto py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-6 max-w-xl mx-auto"
              >
                <h2 className="font-sans text-2xl font-light text-fouzar-text-primary tracking-wide leading-snug text-glow-accent">
                  {activeSlide.title}
                </h2>
                <ul className="space-y-4">
                  {activeSlide.bullets.map((bullet, idx) => (
                    <li key={idx} className="text-fouzar-text-secondary text-[11px] flex items-start gap-3 leading-relaxed">
                      <span className="w-1 h-1 bg-fouzar-accent shrink-0 mt-2 rounded-full" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide navigations */}
          <div className="flex items-center justify-between border-t border-fouzar-border/30 pt-4 mt-auto">
            <button
              disabled={currentSlideIndex === 0}
              onClick={() => handleSlideChange('prev')}
              className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </button>

            <div className="flex gap-1.5">
              {slides.map((_, idx) => (
                <span 
                  key={idx}
                  className={`block h-1 rounded-full transition-all duration-300 ${
                    idx === currentSlideIndex ? 'w-4 bg-fouzar-accent' : 'w-1.5 bg-fouzar-border'
                  }`}
                />
              ))}
            </div>

            <button
              disabled={currentSlideIndex === slides.length - 1}
              onClick={() => handleSlideChange('next')}
              className="flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-fouzar-text-secondary hover:text-fouzar-text-primary disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    if (tab === 'watch') {
      return (
        <div className="flex-1 flex flex-col h-full min-h-[300px] w-full">
          <GroupWatchParty groupId={groupId as string} />
        </div>
      );
    }

    if (tab === 'notepad') {
      return (
        <div className="flex-1 flex flex-col h-full min-h-[300px] w-full">
          <textarea
            value={notes}
            onChange={handleNotesChange}
            placeholder={`Collaborative Group Scratchpad for ${groupId}...`}
            className="flex-1 bg-transparent text-fouzar-text-primary font-mono text-[11px] leading-relaxed resize-none focus:outline-none placeholder:text-fouzar-text-tertiary"
          />
        </div>
      );
    }

    if (tab === 'youtube') {
      return (
        <section className={`flex flex-col overflow-hidden flex-1 h-full w-full`}>
          <div className="flex-1 bg-black/50 relative border border-fouzar-border/30 rounded-t-xl overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title="YouTube Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full absolute inset-0"
              />
            ) : (
              <div className="flex items-center justify-center h-full opacity-30 text-xs font-mono uppercase tracking-widest text-white">
                <MonitorPlay className="w-6 h-6 mb-2 text-white/50" />
                No Video Loaded
              </div>
            )}
          </div>
          <div className="bg-black/60 border-t border-fouzar-border/30 p-3 rounded-b-xl backdrop-blur-md z-10 shrink-0 shadow-lg">
            <form onSubmit={handleSetVideo} className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-secondary" />
                <input
                  type="text"
                  placeholder="Paste YouTube URL or 'watch?v=...' ID"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-fouzar-surface/40 border border-fouzar-border/50 rounded-lg text-xs font-mono text-fouzar-text-primary placeholder:text-fouzar-text-tertiary focus:outline-none focus:border-fouzar-accent focus:ring-1 focus:ring-fouzar-accent transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!videoInput.trim()}
                className="px-4 py-2 bg-fouzar-accent/20 hover:bg-fouzar-accent text-fouzar-accent hover:text-black border border-fouzar-accent/30 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fouzar-accent"
              >
                Load
              </button>
            </form>
          </div>
        </section>
      );
    }
    
    return null;
  };
"""

# Insert these functions right before the `  return (` statement of `StudyGroupRoom`
split_marker = "  return (\n    <div className=\"min-h-screen"
if split_marker in code:
    code = code.replace(split_marker, handle_video_fn + "\n" + render_fn + "\n" + split_marker)
else:
    print("Could not find main return marker")

# 5. Replace the rendering block inside the left canvas (the entire flex-1 flex flex-col p-8 ... block)
# from `{/* Tabs */}` all the way down to `)}` ending the `centerTab === 'notepad'`

target_tabs_block = """            {/* Tabs */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-fouzar-border/30">
              <div className="flex gap-2">
                <button
                  onClick={() => setCenterTab('slides')}
                  className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider rounded-[4px] transition-colors ${
                    centerTab === 'slides' ? 'bg-fouzar-accent text-white' : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-fouzar-accent/10'
                  }`}
                >
                  Slides
                </button>
                <button
                  onClick={() => setCenterTab('notepad')}
                  className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider rounded-[4px] transition-colors ${
                    centerTab === 'notepad' ? 'bg-fouzar-accent text-white' : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-fouzar-accent/10'
                  }`}
                >
                  Notepad
                </button>
                <button
                  onClick={() => setCenterTab('watch')}
                  className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider rounded-[4px] transition-colors ${
                    centerTab === 'watch' ? 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-fouzar-text-secondary hover:text-white hover:bg-red-500/10'
                  }`}
                >
                  Watch Party
                </button>
              </div>
              {centerTab === 'notepad' && (
                <span className="text-[8px] font-mono text-fouzar-text-tertiary uppercase">
                  {isSaving ? 'Saving...' : 'Saved to local storage'}
                </span>
              )}
            </div>"""

new_tabs_block = """            {/* Toolbar Tabs / Split Controls */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-fouzar-border/30">
              <div className="flex gap-2">
                {[
                  { id: 'slides', label: 'Slides' },
                  { id: 'notepad', label: 'Notepad' },
                  { id: 'watch', label: 'Watch Party' },
                  { id: 'youtube', label: 'YouTube' }
                ].map((v) => {
                  const isActive = activeSplitTabs.left === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setActiveSplitTabs(prev => ({ ...prev, left: v.id }))}
                      disabled={isFlowActive}
                      className={`px-3 py-1 text-[9px] font-mono uppercase tracking-wider rounded-[4px] transition-colors ${
                        isActive 
                          ? (v.id === 'watch' || v.id === 'youtube' ? 'bg-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-fouzar-accent text-white')
                          : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-white/5'
                      } disabled:opacity-30`}
                    >
                      {v.label}
                    </button>
                  );
                })}
                
                <div className="w-[1px] h-4 bg-fouzar-border/30 mx-1 self-center" />
                <button
                  onClick={() => setActiveSplitTabs(prev => ({ ...prev, right: prev.right ? null : 'youtube' }))}
                  disabled={isFlowActive}
                  className={`px-2.5 py-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider rounded-[4px] transition-colors ${
                    activeSplitTabs.right
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'text-fouzar-text-secondary hover:text-fouzar-text-primary hover:bg-white/5'
                  } disabled:opacity-30`}
                >
                  <MonitorPlay className="w-3 h-3" />
                  Split
                </button>
                
                {activeSplitTabs.right && !isFlowActive && (
                  <select
                    value={activeSplitTabs.right}
                    onChange={(e) => setActiveSplitTabs(prev => ({ ...prev, right: e.target.value }))}
                    className="bg-transparent border border-fouzar-border/30 rounded-[4px] text-[9px] font-mono uppercase tracking-wider text-fouzar-text-primary px-2 py-1 outline-none"
                  >
                    <option value="slides">Slides</option>
                    <option value="notepad">Notepad</option>
                    <option value="watch">Watch Party</option>
                    <option value="youtube">YouTube</option>
                  </select>
                )}
              </div>
              
              {activeSplitTabs.left === 'notepad' && (
                <span className="text-[8px] font-mono text-fouzar-text-tertiary uppercase">
                  {isSaving ? 'Saving...' : 'Saved to local storage'}
                </span>
              )}
            </div>"""

if target_tabs_block in code:
    code = code.replace(target_tabs_block, new_tabs_block)
else:
    print("Could not find tabs block")

# 6. Replace the main content rendering area
main_content_old_start = "            {centerTab === 'slides' ? ("
main_content_old_end = """            )}
          </div>
        </div>

        {/* Right chat panel (slides in conditionally) */}"""

if main_content_old_start in code:
    idx_start = code.find(main_content_old_start)
    idx_end = code.find(main_content_old_end, idx_start)
    if idx_end != -1:
        # replace everything from idx_start to idx_end
        new_main_content = """            {/* Main Canvas Grid */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {activeSplitTabs.right ? (
                <ResizablePanel direction="horizontal" initialSize={500} minSize={300}>
                  <div className="h-full w-full flex flex-col pr-3 overflow-hidden">
                    {renderTabContent(activeSplitTabs.left)}
                  </div>
                  <div className="h-full w-full flex flex-col pl-3 border-l border-fouzar-border/30 overflow-hidden">
                    {renderTabContent(activeSplitTabs.right)}
                  </div>
                </ResizablePanel>
              ) : (
                <div className="h-full w-full flex flex-col overflow-hidden">
                  {renderTabContent(activeSplitTabs.left)}
                </div>
              )}
            </div>\n"""
        
        code = code[:idx_start] + new_main_content + code[idx_end:]
    else:
        print("Could not find end of main content")
else:
    print("Could not find start of main content")

# write file
with open(path, "w", encoding="utf-8") as f:
    f.write(code)
print("done")
