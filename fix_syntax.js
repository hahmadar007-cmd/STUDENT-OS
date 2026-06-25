const fs = require('fs');

// Fix page.tsx
let pageCode = fs.readFileSync('frontend/app/sanctuary/page.tsx', 'utf-8');
pageCode = pageCode.replace(
  `<Sparkles className="w-4 h-4 text-fouzar-accent" />
                <h2 className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
                  AI Study Partner
                </h2>
              </div>`,
  ``
);
pageCode = pageCode.replace(
  `          </ResizablePanel>
          </ResizablePanel>
        </ResizablePanel>
      </div>`,
  `          </ResizablePanel>
        </ResizablePanel>
      </div>`
);
fs.writeFileSync('frontend/app/sanctuary/page.tsx', pageCode);

// Fix SanctuaryCanvas.tsx
let canvasCode = fs.readFileSync('frontend/components/focus/workspace/SanctuaryCanvas.tsx', 'utf-8');
canvasCode = canvasCode.replace(
  `case 'material':
        return (
          {/* Material Hub */}`,
  `case 'material':
        return (
          <>{/* Material Hub */}`
);
canvasCode = canvasCode.replace(
  `case 'media':
        return (
          {/* Embedded Media Sandbox */}`,
  `case 'media':
        return (
          <>{/* Embedded Media Sandbox */}`
);
canvasCode = canvasCode.replace(
  `case 'web':
        return (
          {/* Web & Free AI Hub */}`,
  `case 'web':
        return (
          <>{/* Web & Free AI Hub */}`
);

// close the fragments
canvasCode = canvasCode.replace(
  `</motion.section>
          )}
        </AnimatePresence>
        );`,
  `</motion.section>
          )}
        </AnimatePresence></>
        );`
);

// wait, the block extraction actually extracted the contents and replaced AnimatePresence.
// let's just search for what we actually wrote:
canvasCode = canvasCode.replace(
  `        return (
          {/* Material Hub */}
        <div className="flex-1 flex flex-col overflow-hidden w-full h-full"`,
  `        return (
          <>
          {/* Material Hub */}
        <div className="flex-1 flex flex-col overflow-hidden w-full h-full"`
);
canvasCode = canvasCode.replace(
  `        return (
          {/* Embedded Media Sandbox */}
        <div className="flex-1 flex flex-col overflow-hidden w-full h-full"`,
  `        return (
          <>
          {/* Embedded Media Sandbox */}
        <div className="flex-1 flex flex-col overflow-hidden w-full h-full"`
);
canvasCode = canvasCode.replace(
  `        return (
          {/* Web & Free AI Hub */}
        <div className="flex-1 flex flex-col overflow-hidden w-full h-full bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-4"`,
  `        return (
          <>
          {/* Web & Free AI Hub */}
        <div className="flex-1 flex flex-col overflow-hidden w-full h-full bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-4"`
);

// and close fragments for each
canvasCode = canvasCode.replace(
  `</div>
        );
      case 'media':`,
  `</div></>
        );
      case 'media':`
);
canvasCode = canvasCode.replace(
  `</div>
        );
      case 'web':`,
  `</div></>
        );
      case 'web':`
);
canvasCode = canvasCode.replace(
  `</div>
        );
      default:`,
  `</div></>
        );
      default:`
);

fs.writeFileSync('frontend/components/focus/workspace/SanctuaryCanvas.tsx', canvasCode);
console.log('Fixed syntax errors');
