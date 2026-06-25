import os

path = "frontend/components/focus/workspace/SanctuaryCanvas.tsx"

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Locate the renderTabContent function
start_marker = "    const renderTabContent = (tab: string | null) => {"
start_idx = code.find(start_marker)

if start_idx != -1:
    # Find the end of renderTabContent block
    # We know it ends with `    return null;\n  };`
    end_marker = "    return null;\n  };"
    end_idx = code.find(end_marker, start_idx)
    
    if end_idx != -1:
        end_idx += len(end_marker)
        
        # Extract the function
        render_fn_code = code[start_idx:end_idx]
        
        # Remove it from its current location
        # The remaining code will be:
        # window.addEventListener('message', handleYoutubeMessage);
        # \n\n
        # return () => window.removeEventListener('message', handleYoutubeMessage);
        
        new_code = code[:start_idx] + code[end_idx:]
        
        # Now find where to insert it: right before `  return (` (which is the main component return)
        main_return_marker = "  return (\n    <div className=\"fouzar-canvas"
        main_return_idx = new_code.find(main_return_marker)
        
        if main_return_idx != -1:
            final_code = new_code[:main_return_idx] + render_fn_code + "\n\n" + new_code[main_return_idx:]
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(final_code)
            print("Successfully extracted and moved renderTabContent.")
        else:
            print("Could not find main return statement.")
    else:
        print("Could not find end of renderTabContent.")
else:
    print("Could not find start of renderTabContent.")
