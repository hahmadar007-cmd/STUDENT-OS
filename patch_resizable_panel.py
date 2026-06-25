import re
with open('frontend/components/ui/ResizablePanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add fixedPanel to props
content = content.replace("collapsed?: boolean;", "collapsed?: boolean;\n  fixedPanel?: 0 | 1;")
content = content.replace("collapsed = false,", "collapsed = false,\n  fixedPanel = 0,")

# Add fixedPanel to dependencies array of onDrag
content = content.replace("  }, [isDragging, direction, minSize, maxSize, collapsed]);", "  }, [isDragging, direction, minSize, maxSize, collapsed, fixedPanel]);")

# We need to change the render logic
old_render = """  return (
    <div 
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} w-full h-full overflow-hidden ${className}`}
    >
      <div 
        style={isHorizontal ? { width: `${currentSize}px`, opacity: collapsed ? 0 : 1, transition: 'width 0.5s ease, opacity 0.5s ease' } : { flex: 'none', display: collapsed ? 'none' : 'flex' }}
        className="shrink-0 flex flex-col min-h-0 min-w-0"
      >
        {children[0]}
      </div>
      
      {!collapsed && (
        isHorizontal ? (
          <div
            onMouseDown={startDrag}
            onDoubleClick={handleDoubleClick}
            className={`group shrink-0 relative z-50 flex items-center justify-center transition-colors
              ${isHorizontal ? 'w-1 cursor-col-resize h-full mx-[1px]' : 'h-1 cursor-row-resize w-full my-[1px]'}
            `}
          >
            <div 
              className={`absolute inset-0 transition-colors duration-200 w-1
                bg-transparent group-hover:bg-indigo-500/40 
                ${isDragging ? '!bg-indigo-500/60' : ''}
              `}
            />
          </div>
        ) : (
          <div className="h-px w-full bg-fouzar-border shrink-0 my-4 lg:hidden" />
        )
      )}

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {children[1]}
      </div>
    </div>
  );"""

new_render = """  const renderPanel = (index: 0 | 1) => {
    const isFixed = index === fixedPanel;
    if (isFixed) {
      return (
        <div 
          style={isHorizontal ? { width: `${currentSize}px`, opacity: collapsed ? 0 : 1, transition: 'width 0.5s ease, opacity 0.5s ease' } : { flex: 'none', display: collapsed ? 'none' : 'flex' }}
          className="shrink-0 flex flex-col min-h-0 min-w-0"
        >
          {children[index]}
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {children[index]}
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} w-full h-full overflow-hidden ${className}`}
    >
      {renderPanel(0)}
      
      {!collapsed && (
        isHorizontal ? (
          <div
            onMouseDown={startDrag}
            onDoubleClick={handleDoubleClick}
            className={`group shrink-0 relative z-50 flex items-center justify-center transition-colors
              ${isHorizontal ? 'w-1 cursor-col-resize h-full mx-[1px]' : 'h-1 cursor-row-resize w-full my-[1px]'}
            `}
          >
            <div 
              className={`absolute inset-0 transition-colors duration-200 w-1
                bg-transparent group-hover:bg-indigo-500/40 
                ${isDragging ? '!bg-indigo-500/60' : ''}
              `}
            />
          </div>
        ) : (
          <div className="h-px w-full bg-fouzar-border shrink-0 my-4 lg:hidden" />
        )
      )}

      {renderPanel(1)}
    </div>
  );"""

content = content.replace(old_render, new_render)

old_drag = """      let newSize = direction === 'horizontal' 
        ? e.clientX - bounds.left 
        : e.clientY - bounds.top;"""
        
new_drag = """      let newSize;
      if (direction === 'horizontal') {
        newSize = fixedPanel === 0 
          ? e.clientX - bounds.left 
          : bounds.width - (e.clientX - bounds.left);
      } else {
        newSize = fixedPanel === 0 
          ? e.clientY - bounds.top 
          : bounds.height - (e.clientY - bounds.top);
      }"""

content = content.replace(old_drag, new_drag)

with open('frontend/components/ui/ResizablePanel.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
