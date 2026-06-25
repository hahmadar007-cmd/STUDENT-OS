const fs = require('fs');

try {
  let raw = fs.readFileSync('frontend/components/focus/workspace/SanctuaryCanvas.tsx', 'utf-8');
  let code = raw.replace(/\r\n/g, '\n');
  
  // Replace canvasView with activeSplitTabs
  code = code.replace(
    /const \[canvasView, setCanvasView\] = useState<CanvasView>\('split'\);/,
    `const [activeSplitTabs, setActiveSplitTabs] = useState<{ left: string; right: string | null }>({ left: 'material', right: 'media' });`
  );

  // Update isFlowActive effect
  code = code.replace(
    /if \(isFlowActive\) setCanvasView\('material'\);/,
    `if (isFlowActive) setActiveSplitTabs({ left: 'material', right: null });`
  );

  // Ensure ResizablePanel is imported
  if (!code.includes('import { ResizablePanel }')) {
    code = code.replace(
      `import { FolderSelector } from '../../ui/FolderSelector';`,
      `import { FolderSelector } from '../../ui/FolderSelector';\nimport { ResizablePanel } from '../../ui/ResizablePanel';`
    );
  }

  // Rewrite the toolbar
  const toolbarRegex = /<div className="flex items-center gap-1">[\s\S]*?<\/div>/;
  
  const newToolbar = `<div className="flex items-center gap-1">
          {[
            { id: 'material', icon: BookOpen, label: 'Materials' },
            { id: 'media', icon: Play, label: 'Media' },
            { id: 'web', icon: Globe, label: 'Web Hub' },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveSplitTabs(prev => ({ ...prev, left: v.id }))}
                disabled={isFlowActive && v.id !== 'material'}
                className={\`px-2.5 py-1 flex items-center gap-1 font-mono text-[7px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] transition-colors \${
                  activeSplitTabs.left === v.id
                    ? 'bg-fouzar-accent/15 text-fouzar-accent'
                    : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
                } disabled:opacity-30\`}
              >
                <Icon className="w-3 h-3" />
                {v.label}
              </button>
            );
          })}
          <div className="w-[1px] h-4 bg-fouzar-border mx-1" />
          <button
            onClick={() => setActiveSplitTabs(prev => ({ ...prev, right: prev.right ? null : (prev.left === 'media' ? 'material' : 'media') }))}
            disabled={isFlowActive}
            className={\`px-2.5 py-1 flex items-center gap-1 font-mono text-[7px] uppercase tracking-wider rounded-[var(--fouzar-radius-sm)] transition-colors \${
              activeSplitTabs.right
                ? 'bg-indigo-500/20 text-indigo-400'
                : 'text-fouzar-text-secondary hover:text-fouzar-text-primary'
            } disabled:opacity-30\`}
          >
            <MonitorPlay className="w-3 h-3" />
            Split
          </button>
          {activeSplitTabs.right && !isFlowActive && (
            <select
              value={activeSplitTabs.right}
              onChange={(e) => setActiveSplitTabs(prev => ({ ...prev, right: e.target.value }))}
              className="bg-transparent border border-fouzar-border rounded-[var(--fouzar-radius-sm)] text-[7px] font-mono p-1 outline-none text-fouzar-text-primary uppercase cursor-pointer"
            >
              <option value="material">Materials</option>
              <option value="media">Media</option>
              <option value="web">Web Hub</option>
            </select>
          )}
        </div>`;
        
  code = code.replace(toolbarRegex, newToolbar);

  const materialStart = code.indexOf('{/* Material Hub */}');
  const materialEndStr = `</motion.section>\n          )}\n        </AnimatePresence>`;
  const materialEnd = code.indexOf(materialEndStr, materialStart) + materialEndStr.length;
  
  let materialBlock = code.substring(materialStart, materialEnd);
  materialBlock = materialBlock.replace(/<AnimatePresence mode="popLayout">[\s\S]*?<motion\.section[\s\S]*?className={`[^`]+`}/, '<div className="flex-1 flex flex-col overflow-hidden w-full h-full"');
  materialBlock = materialBlock.replace(/<\/motion\.section>[\s\S]*?<\/AnimatePresence>/, '</div>');

  const mediaStart = code.indexOf('{/* Embedded Media Sandbox */}');
  const mediaEnd = code.indexOf(materialEndStr, mediaStart) + materialEndStr.length;
  let mediaBlock = code.substring(mediaStart, mediaEnd);
  mediaBlock = mediaBlock.replace(/<AnimatePresence mode="popLayout">[\s\S]*?<motion\.section[\s\S]*?className={`[^`]+`}/, '<div className="flex-1 flex flex-col overflow-hidden w-full h-full"');
  mediaBlock = mediaBlock.replace(/<\/motion\.section>[\s\S]*?<\/AnimatePresence>/, '</div>');

  const webStart = code.indexOf('{/* Web & Free AI Hub */}');
  const webEnd = code.indexOf(materialEndStr, webStart) + materialEndStr.length;
  let webBlock = code.substring(webStart, webEnd);
  webBlock = webBlock.replace(/<AnimatePresence mode="popLayout">[\s\S]*?<motion\.section[\s\S]*?className="[^"]+"/, '<div className="flex-1 flex flex-col overflow-hidden w-full h-full bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-4"');
  webBlock = webBlock.replace(/<\/motion\.section>[\s\S]*?<\/AnimatePresence>/, '</div>');

  materialBlock = materialBlock.replace(/\{\(canvasView === 'material' \|\| canvasView === 'split'\) && \(/g, '{true && (');
  mediaBlock = mediaBlock.replace(/\{\(canvasView === 'media' \|\| canvasView === 'split'\) && \(/g, '{true && (');
  webBlock = webBlock.replace(/\{canvasView === 'web' && \(/g, '{true && (');

  const renderCanvasViewStr = `  const renderCanvasView = (viewId: string) => {
    switch(viewId) {
      case 'material':
        return (
          <>
          ${materialBlock}
          </>
        );
      case 'media':
        return (
          <>
          ${mediaBlock}
          </>
        );
      case 'web':
        return (
          <>
          ${webBlock}
          </>
        );
      default:
        return null;
    }
  };`;

  const mainGridStart = code.indexOf('{/* Main canvas grid */}');
  
  const replacementGrid = `
      {/* Main canvas grid */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10 w-full h-full">
        {activeSplitTabs.right ? (
          <ResizablePanel direction="horizontal" initialSize={typeof window !== 'undefined' ? window.innerWidth / 2 : 500} minSize={300}>
            <div className="w-full h-full flex flex-col p-1">{renderCanvasView(activeSplitTabs.left)}</div>
            <div className="w-full h-full flex flex-col p-1">{renderCanvasView(activeSplitTabs.right)}</div>
          </ResizablePanel>
        ) : (
          <div className="w-full h-full flex flex-col p-2">{renderCanvasView(activeSplitTabs.left)}</div>
        )}
      </div>
  `;

  const componentStart = code.indexOf('return (');
  code = code.substring(0, componentStart) + renderCanvasViewStr + '\n\n  ' + code.substring(componentStart);
  
  const newMainGridStart = code.indexOf('{/* Main canvas grid */}');
  const newWebStart = code.indexOf('{/* Web & Free AI Hub */}');
  const newWebEnd = code.indexOf(materialEndStr, newWebStart) + materialEndStr.length;
  
  code = code.substring(0, newMainGridStart) + replacementGrid.trim() + '\n' + code.substring(newWebEnd);

  fs.writeFileSync('frontend/components/focus/workspace/SanctuaryCanvas.tsx', code, 'utf-8');
  console.log('SanctuaryCanvas updated safely!');

} catch (e) {
  console.error(e);
}
