import os

path = "frontend/components/focus/workspace/SanctuaryCanvas.tsx"

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Find the start of the renderTabContent function
render_fn_start = code.find('    const renderTabContent = (tab: string | null) => {')

if render_fn_start != -1:
    # Find the end of the renderTabContent function
    render_fn_end = code.find('      {/* Main canvas grid */}', render_fn_start)
    if render_fn_end == -1:
      render_fn_end = code.find('  return (', render_fn_start)
    
    if render_fn_end != -1:
        # Extract the function
        render_fn_code = code[render_fn_start:render_fn_end]
        
        # Restore the missing return statement from useEffect
        # The line before render_fn_start should be: window.addEventListener('message', handleYoutubeMessage);
        # We need to add the return () => window.removeEventListener...
        
        # Remove the function from its current location
        code = code[:render_fn_start] + "return () => window.removeEventListener('message', handleYoutubeMessage);\n  }, [setActiveVideoTimestamp]);\n\n" + code[render_fn_end:]
        
        # Find the return ( of the main component to place it before
        # Wait, the main component return might be after the render_fn_end.
        # But wait, code[render_fn_end:] already contains the main return statement if we found '  return ('
        
        # Insert it before the main return statement
        main_return_start = code.find('  return (')
        if main_return_start != -1:
            code = code[:main_return_start] + render_fn_code + "\n" + code[main_return_start:]
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(code)
            print("Successfully moved renderTabContent.")
        else:
            print("Could not find 'return ('.")
    else:
        print("Could not find end of renderTabContent.")
else:
    print("Could not find renderTabContent.")
