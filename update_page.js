const fs = require('fs');

let code = fs.readFileSync('frontend/app/sanctuary/page.tsx', 'utf-8');

// 1. Add states
const stateInjection = `
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isAiPanelMinimized, setIsAiPanelMinimized] = useState(false);
  const [activeSplitTabs, setActiveSplitTabs] = useState<{ left: string; right: string | null }>({ left: 'notes', right: null });
`;

if (!code.includes('isSidebarMinimized')) {
  code = code.replace(
    /const \[semester, setSemester\] = useState\('Spring 2026'\);/,
    stateInjection.trim() + '\n  const [semester, setSemester] = useState(\'Spring 2026\');'
  );
}

// Ensure Minus, ChevronRight, PanelLeft, PanelRight are imported from lucide-react
if (!code.includes('Minus,')) {
  code = code.replace(/ArrowLeft,/, 'ArrowLeft,\n  Minus,\n  ChevronRight,\n  PanelLeft,\n  PanelRight,');
}

// 2. Remove my old state variables
code = code.replace(/const \[centerTab, setCenterTab\] = useState<string>\('notes'\);\r?\n/, '');
code = code.replace(/const \[isSplitMode, setIsSplitMode\] = useState\(false\);\r?\n/, '');
code = code.replace(/const \[splitLeftTab, setSplitLeftTab\] = useState<string>\('youtube'\);\r?\n/, '');
code = code.replace(/const \[splitRightTab, setSplitRightTab\] = useState<string>\('notes'\);\r?\n/, '');

// Replace centerTab accesses with activeSplitTabs.left for backward compatibility where not explicitly split
// Wait, the prompt says "Clicking a tab button sets activeSplitTabs.left (or .right if user is assigning the second pane)."
// It's easier to just replace all `setCenterTab(X)` with `setActiveSplitTabs(prev => ({ ...prev, left: X }))`.
code = code.replace(/setCenterTab\(([^)]+)\)/g, 'setActiveSplitTabs(prev => ({ ...prev, left: $1 }))');
code = code.replace(/centerTab === /g, 'activeSplitTabs.left === ');
code = code.replace(/centerTab/g, 'activeSplitTabs.left'); // be careful!

// The button for Split View:
const splitToggleUI = `
                  <div className="w-[1px] h-6 bg-fouzar-border/40 mx-2 self-center" />
                  <button
                    onClick={() => setActiveSplitTabs(prev => ({ ...prev, right: prev.right ? null : 'youtube' }))}
                    className={\`px-4 py-2 rounded-[var(--fouzar-radius-md)] text-[9px] font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-2 \${
                      activeSplitTabs.right
                        ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]'
                        : 'text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30'
                    }\`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    {activeSplitTabs.right ? 'Exit Split' : 'Split View'}
                  </button>
                  {activeSplitTabs.right && (
                    <div className="flex items-center gap-2 ml-2 bg-fouzar-elevated/20 p-1 rounded-[var(--fouzar-radius-md)] border border-fouzar-border/50">
                      <select
                        value={activeSplitTabs.left}
                        onChange={(e) => setActiveSplitTabs(prev => ({ ...prev, left: e.target.value }))}
                        className="bg-transparent text-[9px] font-mono p-1 outline-none text-fouzar-text-primary uppercase cursor-pointer"
                      >
                        <option value="notes">Notebook</option>
                        <option value="slides">Slides</option>
                        <option value="youtube">YT Search</option>
                        <option value="web">Web Hub</option>
                        <option value="media">Media</option>
                        {openDocs.map(d => <option key={d.id} value={d.id} className="text-fouzar-bg">{d.fileName}</option>)}
                      </select>
                      <span className="text-fouzar-text-tertiary">|</span>
                      <select
                        value={activeSplitTabs.right}
                        onChange={(e) => setActiveSplitTabs(prev => ({ ...prev, right: e.target.value }))}
                        className="bg-transparent text-[9px] font-mono p-1 outline-none text-fouzar-text-primary uppercase cursor-pointer"
                      >
                        <option value="notes">Notebook</option>
                        <option value="slides">Slides</option>
                        <option value="youtube">YT Search</option>
                        <option value="web">Web Hub</option>
                        <option value="media">Media</option>
                        {openDocs.map(d => <option key={d.id} value={d.id} className="text-fouzar-bg">{d.fileName}</option>)}
                      </select>
                    </div>
                  )}
`;

// Replace my previous split logic
const oldSplitToggleStart = code.indexOf('<div className="w-[1px] h-6 bg-fouzar-border/40 mx-2 self-center" />');
if (oldSplitToggleStart !== -1) {
    const oldSplitToggleEndStr = `</div>\n                  )}`;
    const oldSplitToggleEnd = code.indexOf(oldSplitToggleEndStr, oldSplitToggleStart);
    if (oldSplitToggleEnd !== -1) {
        code = code.substring(0, oldSplitToggleStart) + splitToggleUI.trim() + code.substring(oldSplitToggleEnd + oldSplitToggleEndStr.length);
    }
}

// Render logic:
const newRenderLogic = `
              {activeSplitTabs.right ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 flex flex-col overflow-hidden relative">
                  <ResizablePanel direction="horizontal" initialSize={500} minSize={300}>
                    <div className="h-full w-full flex flex-col p-1 overflow-y-auto">{renderTabContent(activeSplitTabs.left)}</div>
                    <div className="h-full w-full flex flex-col p-1 overflow-y-auto">{renderTabContent(activeSplitTabs.right)}</div>
                  </ResizablePanel>
                </div>
              ) : (
                renderTabContent(activeSplitTabs.left)
              )}
`;

const oldRenderLogicStart = code.indexOf('{isSplitMode ? (');
if (oldRenderLogicStart !== -1) {
    const oldRenderLogicEndStr = `renderTabContent(activeSplitTabs.left)\n              )}`;
    const oldRenderLogicEnd = code.indexOf(oldRenderLogicEndStr, oldRenderLogicStart);
    if (oldRenderLogicEnd !== -1) {
        code = code.substring(0, oldRenderLogicStart) + newRenderLogic.trim() + code.substring(oldRenderLogicEnd + oldRenderLogicEndStr.length);
    }
}

// Sidebar Minimization
code = code.replace(/<ResizablePanel \s*direction="horizontal" \s*initialSize=\{280\} \s*minSize=\{200\} \s*maxSize=\{400\} \s*collapsed=\{isShielded\}\s*>/, 
    '<ResizablePanel direction="horizontal" initialSize={280} minSize={200} maxSize={400} collapsed={isSidebarMinimized || isShielded}>'
);

// Inner Resizable Panel
const mainContentStart = code.indexOf('<main className="flex-1 flex flex-col min-w-0 p-4 md:p-6 overflow-hidden h-full">');
if (mainContentStart !== -1 && !code.includes('collapsed={isAiPanelMinimized}')) {
    code = code.substring(0, mainContentStart) + 
      '<ResizablePanel direction="horizontal" initialSize={700} minSize={400}>\n            ' + 
      code.substring(mainContentStart);
      
    // find end of main, start of aside
    const asideStart = code.indexOf('className="border-t lg:border-t-0 lg:border-l border-fouzar-border');
    if (asideStart !== -1) {
        // Find closing tag of aside
        const asideEnd = code.indexOf('</aside>', asideStart);
        if (asideEnd !== -1) {
            code = code.substring(0, asideEnd + 8) + '\n          </ResizablePanel>' + code.substring(asideEnd + 8);
        }
    }
}

// Add the minus buttons
const asideHeaderStart = code.indexOf('<div className="flex items-center gap-2 mb-3 shrink-0">');
if (asideHeaderStart !== -1 && !code.includes('setIsAiPanelMinimized(true)')) {
    code = code.replace(
        '<div className="flex items-center gap-2 mb-3 shrink-0">',
        `<div className="flex items-center justify-between w-full mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-fouzar-accent" />
                    <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                      AI Study Partner
                    </h2>
                  </div>
                  <button onClick={() => setIsAiPanelMinimized(true)} className="text-fouzar-text-tertiary hover:text-white">
                    <Minus className="w-4 h-4" />
                  </button>
                </div>`
    );
    // Remove the old one that was duplicated inside because of replace
    code = code.replace(
        `<Sparkles className="w-4 h-4 text-fouzar-accent" />
                <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                  AI Study Partner
                </h2>
              </div>`,
        ``
    );
}

const leftAsideHeaderStart = code.indexOf('<div className="flex items-center gap-2">');
if (leftAsideHeaderStart !== -1 && !code.includes('setIsSidebarMinimized(true)')) {
    // Actually look for <Layers className="w-4 h-4 text-fouzar-accent" />
    code = code.replace(
        `<div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-fouzar-accent" />
              <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                Spaces
              </h2>
            </div>`,
        `<div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-fouzar-accent" />
                <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                  Spaces
                </h2>
              </div>
              <button onClick={() => setIsSidebarMinimized(true)} className="text-fouzar-text-tertiary hover:text-white">
                <Minus className="w-4 h-4" />
              </button>
            </div>`
    );
}

// Add the floating buttons
const floatButtons = `
      {isSidebarMinimized && (
        <button
          onClick={() => setIsSidebarMinimized(false)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 p-2 bg-fouzar-elevated/80 border border-l-0 border-fouzar-border rounded-r-md hover:bg-fouzar-accent/20"
        >
          <PanelLeft className="w-5 h-5 text-fouzar-text-primary" />
        </button>
      )}
      {isAiPanelMinimized && (
        <button
          onClick={() => setIsAiPanelMinimized(false)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 p-2 bg-fouzar-elevated/80 border border-r-0 border-fouzar-border rounded-l-md hover:bg-fouzar-accent/20"
        >
          <PanelRight className="w-5 h-5 text-fouzar-text-primary" />
        </button>
      )}
`;

const wrapperEnd = code.lastIndexOf('</div>');
// better to inject it just before the last </div>
if (!code.includes('PanelRight className=')) {
    const mainWrapperClose = code.indexOf('{/* Mobile quick nav */}');
    if (mainWrapperClose !== -1) {
        code = code.substring(0, mainWrapperClose) + floatButtons + '\n      ' + code.substring(mainWrapperClose);
    }
}

// Let's remove comments as asked. "Omit all code comments in every change."
code = code.replace(/\/\*[\s\S]*?\*\//g, '');
code = code.replace(/\/\/.*/g, '');

fs.writeFileSync('frontend/app/sanctuary/page.tsx', code, 'utf-8');
console.log('Sanctuary Page updated!');
