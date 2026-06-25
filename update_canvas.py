import os

path = "frontend/components/focus/workspace/SanctuaryCanvas.tsx"

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# I need to refactor from:
#       {/* Main canvas grid */}
#       <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10">
# ... to end of component

main_canvas_grid_start = code.find('{/* Main canvas grid */}')

render_fn = """
  const renderTabContent = (tab: string | null) => {
    if (!tab) return null;
    
    if (tab === 'material') {
      return (
        <section className={`flex flex-col overflow-hidden border-fouzar-border flex-1 h-full w-full ${isGreenhouse ? 'fouzar-glass m-2 rounded-[var(--fouzar-radius-lg)]' : ''}`}>
          {openDocs && openDocs.length > 0 ? (
            <div className="flex-1 flex flex-col overflow-hidden relative p-4 h-full">
              <div className="flex gap-1 overflow-x-auto scrollbar-none mb-2">
                {openDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center shrink-0">
                    <button
                      onClick={() => setActiveDoc(doc)}
                      className={`pl-4 pr-2 py-2 rounded-l-[var(--fouzar-radius-md)] text-[9px] font-mono uppercase tracking-wider font-bold transition-all whitespace-nowrap max-w-[150px] truncate ${
                        activeDoc?.id === doc.id
                          ? 'bg-fouzar-accent text-fouzar-text-inverse shadow-[0_0_12px_var(--fouzar-accent-glow)]'
                          : 'bg-fouzar-elevated/50 text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-fouzar-elevated'
                      }`}
                    >
                      {doc.fileName}
                    </button>
                    <button
                      onClick={() => closeDoc(doc.id)}
                      className={`pr-3 pl-1 py-2 rounded-r-[var(--fouzar-radius-md)] transition-all ${
                        activeDoc?.id === doc.id
                          ? 'bg-fouzar-accent text-fouzar-text-inverse shadow-[0_0_12px_var(--fouzar-accent-glow)]'
                          : 'bg-fouzar-elevated/50 text-fouzar-text-tertiary hover:text-fouzar-text-primary hover:bg-fouzar-elevated'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {activeDoc && (
                <div className="flex-1 overflow-hidden rounded-[var(--fouzar-radius-lg)] border border-fouzar-border bg-fouzar-elevated relative">
                  <DocumentViewer
                    document={activeDoc}
                    onClose={() => closeDoc(activeDoc.id)}
                    isInline={true}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden p-6 relative">
              <div className="mb-4">
                <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-fouzar-text-primary">
                  Sanctuary Materials
                </h3>
                <p className="text-[9.5px] text-fouzar-text-secondary mt-1">
                  Select a study document, textbook, or lecture slides from your repository below, or upload a new one to start studying.
                </p>
              </div>
              <div className="flex-1 overflow-hidden border border-fouzar-border bg-fouzar-elevated/10 rounded-[var(--fouzar-radius-lg)] p-4 flex flex-col">
                <FileExplorer
                  isCompact={false}
                  onOpenFile={(doc) => setActiveDoc(doc)}
                />
              </div>
              {!isFlowActive && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Sanctuary notebook — capture formulas, definitions, insights..."
                  className="mt-4 h-14 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)] p-2 font-mono text-[9px] resize-none focus:outline-none focus:shadow-[var(--fouzar-focus-ring)] shrink-0"
                />
              )}
            </div>
          )}
        </section>
      );
    }
    
    if (tab === 'media') {
      return (
        <section className={`flex flex-col overflow-hidden flex-1 h-full w-full`}>
          <div className="flex-1 bg-black/50 relative">
            <iframe
              src={embedUrl}
              title="Fouzar lecture sandbox"
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {!isFlowActive && (
            <form onSubmit={handleSetVideo} className="p-3 border-t border-fouzar-border flex gap-2 bg-fouzar-surface">
              <input
                value={videoInput}
                onChange={(e) => setVideoInput(e.target.value)}
                placeholder="Paste YouTube lecture URL..."
                className="flex-1 bg-fouzar-elevated border border-fouzar-border px-3 py-1.5 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-fouzar-accent/10 border border-fouzar-accent/30 text-fouzar-accent font-mono text-[8px] uppercase rounded-[var(--fouzar-radius-md)]"
              >
                Load
              </button>
            </form>
          )}
        </section>
      );
    }
    
    if (tab === 'web') {
      return (
        <section className="flex-1 flex flex-col overflow-hidden p-6 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] m-2 h-full w-full">
          <div className="flex flex-col h-full overflow-y-auto scrollbar-none space-y-6">
            <div className="text-center max-w-xl mx-auto space-y-2 mt-4">
              <Sparkles className="w-8 h-8 text-fouzar-accent mx-auto mb-2 animate-pulse" />
              <h3 className="font-serif text-sm font-bold uppercase tracking-wider">
                Web & Free AI Hub
              </h3>
              <p className="text-[10px] text-fouzar-text-secondary leading-relaxed">
                Access free AI models and study tools directly using your personal accounts. 
                No API keys, credits, or subscriptions required.
              </p>
            </div>

            {/* Quick AI & Study Launches */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto w-full px-4">
              {[
                {
                  name: 'DeepSeek Chat',
                  desc: 'Free conversational AI by DeepSeek. High quality reasoning models.',
                  url: 'https://chat.deepseek.com',
                  color: 'border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5',
                  textColor: 'text-blue-400',
                },
                {
                  name: 'ChatGPT',
                  desc: 'Free access to GPT-4o mini and standard chat by OpenAI.',
                  url: 'https://chatgpt.com',
                  color: 'border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/5',
                  textColor: 'text-emerald-400',
                },
                {
                  name: 'Claude AI',
                  desc: 'Free access to Claude 3.5 Sonnet conversational model by Anthropic.',
                  url: 'https://claude.ai',
                  color: 'border-amber-500/20 hover:border-amber-500/40 bg-amber-500/5',
                  textColor: 'text-amber-400',
                },
              ].map((preset) => (
                <a
                  key={preset.name}
                  href={preset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-4 rounded-[var(--fouzar-radius-md)] border text-left flex flex-col justify-between transition-all hover:scale-[1.02] cursor-pointer shadow-[var(--fouzar-shadow-sm)] ${preset.color}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-serif text-[11px] font-bold uppercase ${preset.textColor}`}>
                        {preset.name}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-fouzar-text-secondary" />
                    </div>
                    <p className="text-[9px] text-fouzar-text-secondary leading-relaxed mb-3">
                      {preset.desc}
                    </p>
                  </div>
                  <span className="font-mono text-[7px] text-fouzar-text-primary uppercase tracking-widest border border-fouzar-border/30 px-2 py-0.5 rounded-[var(--fouzar-radius-sm)] inline-block w-fit">
                    Launch Free AI ↗
                  </span>
                </a>
              ))}
            </div>
            <div className="max-w-2xl mx-auto w-full space-y-4 pt-4 border-t border-fouzar-border/20 px-4 pb-4">
              <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-fouzar-text-secondary block text-center">
                Integrated Web Search Engine
              </span>
              <form
                onSubmit={handleWebSearchSubmit}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fouzar-text-tertiary" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search the web (e.g. neural networks, photosynthesis)..."
                    className="w-full pl-9 pr-4 py-2.5 bg-fouzar-elevated/40 border border-fouzar-border rounded-[var(--fouzar-radius-md)] text-[10px] font-mono focus:outline-none focus:shadow-[var(--fouzar-focus-ring)]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-4 py-2.5 bg-fouzar-accent text-fouzar-text-inverse font-mono text-[9px] uppercase tracking-wider font-bold rounded-[var(--fouzar-radius-md)] hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </form>

              {isSearching && (
                <p className="font-mono text-[8px] text-fouzar-accent animate-pulse text-center">
                  Querying index & scraping search results...
                </p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto scrollbar-none pr-1 mt-2">
                  {searchResults.map((res, index) => {
                    const isFed = !!fedUrls[res.link];
                    return (
                      <div
                        key={index}
                        className="p-3 bg-fouzar-elevated/30 border border-fouzar-border rounded-[var(--fouzar-radius-md)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all hover:bg-fouzar-elevated/40"
                      >
                        <div className="min-w-0 flex-1 text-left">
                          <a
                            href={res.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-serif text-[10px] font-bold text-fouzar-accent hover:underline flex items-center gap-1.5"
                          >
                            {res.title} <ExternalLink className="w-3 h-3 text-fouzar-text-secondary" />
                          </a>
                          <p className="text-[9px] text-fouzar-text-secondary leading-relaxed mt-1">
                            {res.snippet}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                             setActiveDocText(`[Web Search context]\\nSource Title: ${res.title}\\nSource Link: ${res.link}\\nContent:\\n${res.snippet}`);
                             setAiTriggerQuery({
                               text: `Please analyze this search result context:\\n\\nTitle: ${res.title}\\nLink: ${res.link}\\nSnippet: ${res.snippet}`,
                               id: Date.now().toString()
                             });
                             setFedUrls((prev) => ({ ...prev, [res.link]: true }));
                             setTimeout(() => {
                               setFedUrls((prev) => ({ ...prev, [res.link]: false }));
                             }, 2000);
                          }}
                          className={`px-3 py-1.5 font-mono text-[7.5px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] border cursor-pointer shrink-0 transition-all ${
                            isFed
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                              : 'bg-fouzar-elevated hover:bg-fouzar-accent/15 border-fouzar-border hover:border-fouzar-accent/30 text-fouzar-text-primary'
                          }`}
                        >
                          {isFed ? 'Context Sent!' : 'Send to AI'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      );
    }
    
    return null;
  };
"""

grid_code = """      {/* Main canvas grid */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {activeSplitTabs.right ? (
          <ResizablePanel direction="horizontal" initialSize={500} minSize={300}>
            <div className="h-full w-full flex flex-col p-1 overflow-hidden">
              {renderTabContent(activeSplitTabs.left)}
            </div>
            <div className="h-full w-full flex flex-col p-1 overflow-hidden">
              {renderTabContent(activeSplitTabs.right)}
            </div>
          </ResizablePanel>
        ) : (
          renderTabContent(activeSplitTabs.left)
        )}
      </div>
    </div>
  );
}
"""

if main_canvas_grid_start != -1:
    new_code = code[:main_canvas_grid_start] + render_fn + grid_code
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_code)
    print("Replaced!")
else:
    print("Could not find Main canvas grid")
