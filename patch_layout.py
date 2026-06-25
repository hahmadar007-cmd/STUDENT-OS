import os
import re

# 1. Update SocialColumn.tsx
path_sc = "frontend/components/focus/workspace/SocialColumn.tsx"
with open(path_sc, "r", encoding="utf-8") as f:
    content_sc = f.read()

if "onMinimize?:" not in content_sc:
    content_sc = content_sc.replace("onPresentFile?: (fileId: string, fileName: string) => void;", "onPresentFile?: (fileId: string, fileName: string) => void;\n  onMinimize?: () => void;")
    content_sc = content_sc.replace("onPresentFile,", "onPresentFile,\n  onMinimize,")
    
    # Add minus button to the header
    header_start = content_sc.find("<div className=\"px-4 py-3 border-b border-fouzar-border shrink-0\">")
    if header_start != -1:
        # We need to change the div to a flex container that can hold the button on the right
        header_end = content_sc.find("</div>", header_start) + 6
        header_content = content_sc[header_start:header_end]
        new_header = header_content.replace(
            "<div className=\"px-4 py-3 border-b border-fouzar-border shrink-0\">", 
            "<div className=\"px-4 py-3 border-b border-fouzar-border shrink-0 flex items-center justify-between\">"
        )
        new_header = new_header.replace(
            "</div>", 
            "</div>\n        {onMinimize && (\n          <button onClick={onMinimize} className=\"text-fouzar-text-tertiary hover:text-white cursor-pointer p-1\">\n            <Minus className=\"w-4 h-4\" />\n          </button>\n        )}\n      </div>"
        )
        # Wait, the above logic is flawed because `new_header.replace("</div>"` will replace ALL closing divs inside it, or just the first one which is the closing tag of the inner `div.flex.items-center.gap-3`!!
        
        # A safer way using regex:
        pass

# Safer way for SocialColumn
with open(path_sc, "r", encoding="utf-8") as f:
    content_sc = f.read()

if "onMinimize?:" not in content_sc:
    content_sc = content_sc.replace("onPresentFile?: (fileId: string, fileName: string) => void;", "onPresentFile?: (fileId: string, fileName: string) => void;\n  onMinimize?: () => void;")
    content_sc = content_sc.replace("onPresentFile,", "onPresentFile,\n  onMinimize,")
    content_sc = content_sc.replace(
        "<div className=\"px-4 py-3 border-b border-fouzar-border shrink-0\">",
        "<div className=\"px-4 py-3 border-b border-fouzar-border shrink-0 flex items-center justify-between\">"
    )
    content_sc = content_sc.replace(
        """          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold truncate">{user?.name ?? 'Guest Scholar'}</p>
            <p className="font-mono text-[8px] text-fouzar-text-secondary uppercase tracking-wider">
              {user?.fouzarId ?? 'FOUZAR-XXXX'}
            </p>
          </div>
        </div>
      </div>""",
        """          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold truncate">{user?.name ?? 'Guest Scholar'}</p>
            <p className="font-mono text-[8px] text-fouzar-text-secondary uppercase tracking-wider">
              {user?.fouzarId ?? 'FOUZAR-XXXX'}
            </p>
          </div>
        </div>
        {onMinimize && (
          <button onClick={onMinimize} className="text-fouzar-text-tertiary hover:text-white cursor-pointer p-1" title="Minimize Panel">
            <Minus className="w-4 h-4" />
          </button>
        )}
      </div>"""
    )
    with open(path_sc, "w", encoding="utf-8") as f:
        f.write(content_sc)


# 2. Update WorkspaceLayout.tsx
path_wl = "frontend/components/focus/WorkspaceLayout.tsx"
with open(path_wl, "r", encoding="utf-8") as f:
    content_wl = f.read()

if "isSocialMinimized" not in content_wl:
    content_wl = content_wl.replace("import { SanctuaryCanvas }", "import { ResizablePanel } from '../../ui/ResizablePanel';\nimport { SanctuaryCanvas }")
    
    state_anchor = "const [mobilePanel, setMobilePanel] = useState"
    content_wl = content_wl.replace(state_anchor, "const [isSocialMinimized, setIsSocialMinimized] = useState(false);\n  " + state_anchor)
    
    # We replace from Column 2 to the end of Column 3
    pattern = r"\{/\* Column 2 — Unified sanctuary canvas \*/\}.*?</motion\.div>"
    match = re.search(pattern, content_wl, re.DOTALL)
    if match:
        old_cols = match.group(0)
        
        new_col2 = old_cols.replace(
            "className={`flex-1 min-w-0 flex flex-col`}", 
            "className=\"h-full w-full flex flex-col\""
        )
        new_col2 = new_col2.replace(
            "slides={slides}", 
            "slides={slides}\n          onMinimize={() => setIsSocialMinimized(true)}"
        )
        new_col2 = re.sub(
            r"className={`fouzar-chrome shrink-0 overflow-hidden.*?`}",
            "className=\"fouzar-chrome h-full w-full flex flex-col\"",
            new_col2,
            flags=re.DOTALL
        )
        
        wrapper = f"""      <div className="flex-1 flex overflow-hidden">
        <ResizablePanel direction="horizontal" initialSize={{700}} minSize={{400}} collapsed={{isSocialMinimized}}>
{new_col2}
        </ResizablePanel>
      </div>"""
      
        content_wl = content_wl.replace(old_cols, wrapper)

    with open(path_wl, "w", encoding="utf-8") as f:
        f.write(content_wl)

print("SocialColumn and WorkspaceLayout updated successfully!")
