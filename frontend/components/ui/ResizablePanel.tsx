'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ResizablePanelProps {
  direction: 'horizontal' | 'vertical';
  minSize?: number;
  maxSize?: number;
  initialSize?: number;
  children: [React.ReactNode, React.ReactNode];
  className?: string;
  collapsed?: boolean;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  direction,
  minSize = 200,
  maxSize = 800,
  initialSize = 300,
  children,
  className = '',
  collapsed = false,
}) => {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [lastSize, setLastSize] = useState(initialSize);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDrag = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current || collapsed) return;
    
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    
    frameRef.current = requestAnimationFrame(() => {
      const bounds = containerRef.current!.getBoundingClientRect();
      let newSize = direction === 'horizontal' 
        ? e.clientX - bounds.left 
        : e.clientY - bounds.top;
        
      if (newSize < minSize) newSize = minSize;
      if (maxSize && newSize > maxSize) newSize = maxSize;
      
      setSize(newSize);
    });
  }, [isDragging, direction, minSize, maxSize, collapsed]);

  const endDrag = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', endDrag);
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', endDrag);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', endDrag);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [isDragging, onDrag, endDrag, direction]);

  const handleDoubleClick = () => {
    if (collapsed) return;
    if (size > minSize) {
      setLastSize(size);
      setSize(minSize);
    } else {
      setSize(lastSize > minSize ? lastSize : initialSize);
    }
  };

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isHorizontal = direction === 'horizontal' && !isMobile;
  const currentSize = collapsed ? 0 : size;

  return (
    <div 
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} w-full h-full overflow-hidden ${className}`}
    >
      <div 
        style={isHorizontal ? { width: \`\${currentSize}px\`, opacity: collapsed ? 0 : 1, transition: 'width 0.5s ease, opacity 0.5s ease' } : { flex: 'none', display: collapsed ? 'none' : 'flex' }}
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
  );
};
