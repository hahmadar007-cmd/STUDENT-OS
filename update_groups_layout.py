import os

path = "frontend/app/groups/[id]/page.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Make sure Minus is imported from lucide-react
if "Minus" not in content[:1000]:
    content = content.replace("import {", "import {\n  Minus,", 1)

# Step 1: Replace outer container start
old_outer_start = """      {/* Main Study space body */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden z-10 max-h-[calc(100vh-56px)]">
        
        {/* Left slide canvas (grows if chat is closed) */}
        <div className={`flex flex-col justify-between h-full transition-all duration-500 ease-out ${
          isChatOpen ? 'w-[65%]' : 'w-full'
        } ${isFlowActive ? 'deep-flow-blur' : ''}`}>"""

new_outer_start = """      {/* Main Study space body */}
      <div className="flex-1 flex overflow-hidden z-10 max-h-[calc(100vh-56px)]">
        <ResizablePanel direction="horizontal" initialSize={700} minSize={400} collapsed={!isChatOpen}>
        
        {/* Left slide canvas (grows if chat is closed) */}
        <div className={`flex flex-col justify-between h-full w-full p-6 ${isFlowActive ? 'deep-flow-blur' : ''}`}>"""

content = content.replace(old_outer_start, new_outer_start)

# Step 2: Replace outer container end
old_outer_end = """          </div>
        </div>

        {/* Right chat panel (slides in conditionally) */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, x: 200, width: 0 }}
              animate={{ opacity: 1, x: 0, width: '35%' }}
              exit={{ opacity: 0, x: 200, width: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`h-full flex flex-col shrink-0 ${isFlowActive ? 'deep-flow-blur' : ''}`}
            >
              <ChatPanel groupId={groupId} currentSlideId={activeSlide.id} userId="user-1" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>"""

new_outer_end = """          </div>
        </div>

        {/* Right chat panel */}
        <aside className={`h-full flex flex-col pt-6 pb-6 pr-6 ${isFlowActive ? 'deep-flow-blur' : ''}`}>
          <div className="flex flex-col h-full bg-fouzar-surface/40 backdrop-blur-md border border-fouzar-border/60 rounded-[8px] overflow-hidden shadow-2xl relative">
            <div className="p-3 border-b border-fouzar-border/30 bg-fouzar-elevated/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-fouzar-accent" />
                <h3 className="font-serif text-sm font-bold uppercase tracking-wider text-fouzar-text-primary">
                  Group Logs
                </h3>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-white/10 rounded cursor-pointer"
              >
                <Minus className="w-4 h-4 text-fouzar-text-secondary" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatPanel groupId={groupId} currentSlideId={activeSlide.id} userId="user-1" />
            </div>
          </div>
        </aside>
        
        </ResizablePanel>
      </div>"""

content = content.replace(old_outer_end, new_outer_end)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Groups layout updated to ResizablePanel.")
