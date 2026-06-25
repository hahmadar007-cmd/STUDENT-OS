import re

path = "frontend/components/groups/GroupWatchParty.tsx"
with open(path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Search to imports
code = code.replace(
    'import { Play, Users, Radio } from "lucide-react";',
    'import { Play, Users, Radio, Search } from "lucide-react";'
)

# 2. Add videoInput state
code = code.replace(
    '  const [currentVideo, setCurrentVideo] = useState("");',
    '  const [currentVideo, setCurrentVideo] = useState("");\n  const [videoInput, setVideoInput] = useState("");'
)

# 3. Add handleSetVideo
handle_video_fn = """  const handleSetVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInput.trim()) return;
    const regExp = /^.*(youtu.be\\/|v\\/|u\\/\\w\\/|embed\\/|watch\\?v=|\\&v=)([^#&?]*).*/;
    const match = videoInput.match(regExp);
    let videoId = "";
    if (match && match[2].length === 11) {
      videoId = match[2];
    } else {
      videoId = videoInput; // fallback if it's just an ID
    }
    
    if (videoId) {
      setCurrentVideo(videoId);
      setVideoInput("");
      
      // Auto go-live if not live
      if (!isLive) {
        setIsLive(true);
      }
      
      const socket = getSocket();
      socket.emit("group_stream_broadcast", {
        groupId,
        videoId,
        action: "play",
        timestamp: 0,
      });
    }
  };

  const toggleLive = () => {"""

code = code.replace("  const toggleLive = () => {", handle_video_fn)

# 4. Add the input form
form_ui = """          <div className="flex flex-col items-center text-center space-y-6 w-full max-w-md mx-auto">
            <div className="flex flex-col items-center space-y-3 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
                <Play className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-400">No Active Stream</p>
                <p className="text-xs mt-1">Paste a YouTube link below to start a synced watch party.</p>
              </div>
            </div>
            
            <form onSubmit={handleSetVideo} className="flex items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Paste YouTube URL or ID"
                  value={videoInput}
                  onChange={(e) => setVideoInput(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!videoInput.trim()}
                className="px-5 py-2.5 bg-purple-500/20 hover:bg-purple-500 text-purple-400 hover:text-white border border-purple-500/30 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-30 disabled:hover:bg-purple-500/20 disabled:hover:text-purple-400"
              >
                Host
              </button>
            </form>
          </div>"""

# replace the empty state block
empty_state_old = """          <div className="flex flex-col items-center text-center space-y-3 text-slate-500">
            <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Play className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400">No Active Stream</p>
              <p className="text-xs mt-1">Start a watch party to sync videos with your group.</p>
            </div>
          </div>"""

code = code.replace(empty_state_old, form_ui)

with open(path, "w", encoding="utf-8") as f:
    f.write(code)

print("GroupWatchParty updated.")
