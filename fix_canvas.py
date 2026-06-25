import os

path = "frontend/components/focus/workspace/SanctuaryCanvas.tsx"

with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# Find the start of the renderTabContent function
render_fn_start = code.find('  const renderTabContent = (tab: string | null) => {')

if render_fn_start != -1:
    # Find the end of the renderTabContent function
    render_fn_end = code.find('      {/* Main canvas grid */}', render_fn_start)
    
    if render_fn_end != -1:
        # Extract the function
        render_fn_code = code[render_fn_start:render_fn_end]
        
        # Remove it from its current location
        code = code[:render_fn_start] + code[render_fn_end:]
        
        # Insert it before the return statement
        return_start = code.find('  return (')
        if return_start != -1:
            code = code[:return_start] + render_fn_code + "\n" + code[return_start:]
            
            with open(path, 'w', encoding='utf-8') as f:
                f.write(code)
            print("Successfully moved renderTabContent.")
        else:
            print("Could not find 'return ('.")
    else:
        print("Could not find end of renderTabContent.")
else:
    print("Could not find renderTabContent.")
