import React, { useState } from 'react';
import { ToolComponentProps } from '../../../lib/workspace/registry';
import { useFouzar } from '../../../lib/FouzarContext';
import { useWorkspace } from '../../../lib/workspace/WorkspaceContext';
import { Search, ExternalLink } from 'lucide-react';

export const BrowserTool: React.FC<ToolComponentProps> = ({ isActive }) => {
  const { setActiveDocText, setAiTriggerQuery } = useFouzar();
  const { openTool } = useWorkspace();
  
  const [searchResults, setSearchResults] = useState<{ title: string; link: string; snippet: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fedUrls, setFedUrls] = useState<Record<string, boolean>>({});

  const handleWebSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try { 
      const { webSearch } = await import('../../../lib/api'); 
      const results = await webSearch(searchQuery);
      setSearchResults(results || []); 
    }
    catch { 
      setSearchResults([]); 
    }
    finally { 
      setIsSearching(false); 
    }
  };

  const sendToAi = (res: any) => {
    setActiveDocText(`[Web]\nTitle: ${res.title}\n${res.snippet}`); 
    setAiTriggerQuery({ text: `Analyze: ${res.title}\n${res.snippet}`, id: Date.now().toString() }); 
    setFedUrls(p => ({ ...p, [res.link]: true })); 
    openTool('ai');
    setTimeout(() => setFedUrls(p => ({ ...p, [res.link]: false })), 2000);
  };

  return (
    <div className={`w-full h-full p-5 flex flex-col ${isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'} transition-opacity duration-300`}>
      <form onSubmit={handleWebSearch} className="flex gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search the web for anything..."
            className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl text-sm text-white/70 placeholder:text-white/25 focus:outline-none focus:border-[#4cd964]/40 transition-colors" 
          />
        </div>
        <button type="submit" disabled={isSearching}
          className="px-5 py-2.5 bg-[#4cd964] text-black font-mono text-[9px] uppercase tracking-wider font-bold rounded-xl hover:opacity-90 cursor-pointer disabled:opacity-40 transition-opacity">
          {isSearching ? 'Searching...' : 'Go'}
        </button>
      </form>
      
      {isSearching && <p className="text-[10px] font-mono text-[#4cd964] animate-pulse mt-4">Searching the web...</p>}
      
      <div className="flex-1 overflow-y-auto space-y-2 mt-4 scrollbar-none pb-4">
        {searchResults.map((res, i) => (
          <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] transition-all">
            <a href={res.link} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[#4cd964] hover:underline flex items-center gap-1.5">
              {res.title} <ExternalLink className="w-3 h-3 text-white/30" />
            </a>
            <p className="text-[10px] text-white/40 mt-1 leading-relaxed">{res.snippet}</p>
            <button 
              onClick={() => sendToAi(res)}
              className={`mt-2 text-[9px] font-mono px-2 py-1 rounded-lg border transition-all ${fedUrls[res.link] ? 'border-[#4cd964]/30 text-[#4cd964] bg-[#4cd964]/5' : 'border-white/[0.07] text-white/30 hover:text-white/60 cursor-pointer'}`}
            >
              {fedUrls[res.link] ? '✓ Sent to AI' : '+ Send to AI'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
