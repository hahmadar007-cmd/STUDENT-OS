const fs = require('fs');

try {
  let raw = fs.readFileSync('frontend/app/sanctuary/page.tsx', 'utf-8');
  // Normalize line endings to \n
  let code = raw.replace(/\r\n/g, '\n');
  
  const targetStr = `              {centerTab === 'notes' ? (\n                <>\n                  <textarea`;
  const startIdx = code.indexOf(targetStr);
  
  if (startIdx === -1) {
    console.error("Could not find targetStr");
  } else {
    const blockStart = code.indexOf(`{centerTab === 'notes' ? (`, startIdx);
    const endStr = `              ) : null}`;
    const endIdx = code.indexOf(endStr, startIdx);
    
    if (endIdx !== -1) {
      let ternaryBlock = code.substring(blockStart + 1, endIdx + endStr.length - 1);
      
      // Replace centerTab with tabId ONLY inside the ternary block!
      ternaryBlock = ternaryBlock.replace(/centerTab === ('?\w+'?)/g, 'tabId === $1');
      ternaryBlock = ternaryBlock.replace(/d\.id === centerTab/g, 'd.id === tabId');
      
      const funcDef = `  const renderTabContent = (tabId: string) => {
    return (
      <React.Fragment>
        ${`{` + ternaryBlock + `}`}
      </React.Fragment>
    );
  };
`;
      
      const insertIdx = code.indexOf('  if (loading) {');
      if (insertIdx !== -1) {
        code = code.substring(0, insertIdx) + funcDef + '\n' + code.substring(insertIdx);
        
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
        
        // After inserting funcDef, indices have shifted!
        const newStartIdx = code.indexOf(targetStr);
        const newEndIdx = code.indexOf(endStr, newStartIdx) + endStr.length;
        
        code = code.substring(0, newStartIdx) + `              ` + renderInvocation + code.substring(newEndIdx);
        
        fs.writeFileSync('frontend/app/sanctuary/page.tsx', code, 'utf-8');
        console.log('Refactoring successful!');
      } else {
        console.error("Could not find insertIdx");
      }
    } else {
      console.error("Could not find endIdx");
    }
  }
} catch (e) {
  console.error(e);
}
