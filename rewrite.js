const fs = require('fs');
let code = fs.readFileSync('frontend/app/sanctuary/page.tsx', 'utf-8');

if (!code.includes('Columns,')) {
    code = code.replace('ArrowLeft,', 'ArrowLeft,\n  Columns,');
}

if (!code.includes('const [isSplitMode, setIsSplitMode] = useState(false);')) {
    code = code.replace(
        `const [centerTab, setCenterTab] = useState<string>('notes');`,
        `const [centerTab, setCenterTab] = useState<string>('notes');\n  const [isSplitMode, setIsSplitMode] = useState(false);\n  const [splitLeftTab, setSplitLeftTab] = useState<string>('youtube');\n  const [splitRightTab, setSplitRightTab] = useState<string>('notes');`
    );
}

const btnInjection = `
                  <div className="w-[1px] h-6 bg-fouzar-border/40 mx-2 self-center" />
                  <button
                    onClick={() => setIsSplitMode(!isSplitMode)}
                    className={\`px-3 py-1 rounded-[var(--fouzar-radius-md)] text-[9px] font-mono uppercase tracking-wider font-bold transition-all flex items-center gap-1.5 \${
                      isSplitMode
                        ? 'bg-fouzar-accent text-fouzar-text-inverse shadow-[0_0_12px_var(--fouzar-accent-glow)]'
                        : 'text-fouzar-text-tertiary hover:text-fouzar-text-primary bg-fouzar-elevated/30 border border-fouzar-border'
                    }\`}
                  >
                    <Columns className="w-3.5 h-3.5" />
                    Split
                  </button>
                  {isSplitMode && (
                    <div className="flex items-center gap-2 ml-2 bg-fouzar-elevated/20 p-1 rounded-[var(--fouzar-radius-md)] border border-fouzar-border/50">
                      <select
                        value={splitLeftTab}
                        onChange={(e) => setSplitLeftTab(e.target.value)}
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
                        value={splitRightTab}
                        onChange={(e) => setSplitRightTab(e.target.value)}
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

if (!code.includes('Columns className="w-3.5 h-3.5"')) {
    code = code.replace(
        `>\n                    YT Search\n                  </button>`,
        `>\n                    YT Search\n                  </button>` + btnInjection
    );
}

const targetStr = `              {centerTab === 'notes' ? (
                <>
                  <textarea`;

if (!code.includes('const renderTabContent')) {
    const startIdx = code.indexOf(targetStr);
    if (startIdx !== -1) {
        // Find the matching end tag `) : null}`
        const blockStart = code.indexOf(`{centerTab === 'notes' ? (`, startIdx);
        const endStr = `              ) : null}`;
        const endIdx = code.indexOf(endStr, startIdx);
        
        if (endIdx !== -1) {
            let ternaryBlock = code.substring(blockStart + 1, endIdx + endStr.length - 1);
            // Replace centerTab with tabId ONLY inside the ternary block!
            ternaryBlock = ternaryBlock.replace(/centerTab === ('?\\w+'?)/g, 'tabId === $1');
            ternaryBlock = ternaryBlock.replace(/d\.id === centerTab/g, 'd.id === tabId');
            
            const funcDef = `  const renderTabContent = (tabId: string) => {
    return (
      <React.Fragment>
        ${`{` + ternaryBlock + `}`}
      </React.Fragment>
    );
  };
`;
            
            const insertIdx = code.indexOf('if (loading) {');
            code = code.substring(0, insertIdx) + funcDef + '\n  ' + code.substring(insertIdx);
            
            const renderInvocation = `{isSplitMode ? (
                <div className="flex-1 min-h-[280px] lg:min-h-0 flex flex-col overflow-hidden relative">
                  <ResizablePanel direction="horizontal" initialSize={500} minSize={300}>
                    <div className="h-full w-full flex flex-col p-1 overflow-y-auto">{renderTabContent(splitLeftTab)}</div>
                    <div className="h-full w-full flex flex-col p-1 overflow-y-auto">{renderTabContent(splitRightTab)}</div>
                  </ResizablePanel>
                </div>
              ) : (
                renderTabContent(centerTab)
              )}`;
                  
            const newStartIdx = code.indexOf(targetStr);
            // Re-find endIdx since code shifted due to funcDef insertion!
            const newEndIdx = code.indexOf(endStr, newStartIdx) + endStr.length;
            code = code.substring(0, newStartIdx) + `              ` + renderInvocation + code.substring(newEndIdx);
        }
    }
}

// Also fix the span ternary that uses centerTab
const badSpanTernary = `{centerTab === 'notes' ? (isSaving ? 'Saving...' : 'Saved locally') : centerTab === 'slides' ? 'Click a file to open' : centerTab === 'media' ? 'YouTube Theater' : 'Quick launch links'}`;
const goodSpanTernary = `{isSplitMode ? 'Split View Active' : centerTab === 'notes' ? (isSaving ? 'Saving...' : 'Saved locally') : centerTab === 'slides' ? 'Click a file to open' : centerTab === 'media' ? 'YouTube Theater' : 'Quick launch links'}`;
if (code.includes(badSpanTernary)) {
    code = code.replace(badSpanTernary, goodSpanTernary);
}

fs.writeFileSync('frontend/app/sanctuary/page.tsx', code, 'utf-8');
console.log('Refactoring done properly.');
