import os

path = "frontend/components/focus/workspace/SanctuaryCanvas.tsx"

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Extract renderTabContent
start_str = "    const renderTabContent = (tab: string | null) => {"
start_idx = code.find(start_str)

if start_idx != -1:
    # Find the end of renderTabContent block. It ends right before "  return (" in this file because there's nothing else before the return. Wait, let's find the closing brace of renderTabContent.
    end_str = "  };\n\n  return ("
    # Actually, the original renderTabContent ended with `  };` followed by `  return (`
    end_idx = code.find(end_str, start_idx)
    
    if end_idx != -1:
        # Include `  };\n` in the extraction
        render_fn_code = code[start_idx:end_idx + 5] 
        
        # 2. Fix the original location (useEffect)
        # Restore the missing return statement from useEffect
        replacement_in_useeffect = "    return () => window.removeEventListener('message', handleYoutubeMessage);\n  }, [setActiveVideoTimestamp]);\n"
        
        # The new code: 
        # up to start_idx -> replacement_in_useeffect -> everything after end_idx + 5
        
        # BUT wait, does `code` have the `  return (` right after? Yes, `end_idx` is the start of `  };\n\n  return (`
        
        # Let's just place render_fn_code right before `  return (`
        
        code = code[:start_idx] + replacement_in_useeffect + "\n" + render_fn_code + "\n" + code[end_idx + 6:]
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(code)
        print("Successfully fixed renderTabContent.")
    else:
        print("Could not find end of renderTabContent.")
else:
    print("Could not find renderTabContent.")
