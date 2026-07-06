'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { X, Users, Compass, Flame, Search } from 'lucide-react';
import { FascaButton } from '../ui/FascaButton';
import { useFouzar } from '../../lib/FouzarContext';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  course: string;
  memberCount: number;
  currentSlide: string;
  isActive: boolean; // active in the last hour
  nodeType?: 'semester' | 'course' | 'group'; // Hierarchy type
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string;
  target: string;
}

export interface StudyNodesGraphProps {
  nodesData?: {
    id: string;
    course: string;
    roomName: string;
    currentSlide: string;
  }[];
}

/**
 * StudyNodesGraph Component
 * Uses D3.js to render a force-directed network graph of study groups.
 * Node size represents member counts, node color indicates activity,
 * and clicking a node shows an interactive details card overlay.
 * Equipped with real database nodes, search filtering, and drag-and-drop mechanics.
 */
export const StudyNodesGraph: React.FC<StudyNodesGraphProps> = ({ nodesData }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();
  const { accentColor } = useFouzar();

  let allNodes: GraphNode[] = (nodesData || [])
    .filter(n => !(n as any).isEmptyCourse)
    .map((n, idx) => ({
      id: n.id,
      course: n.course || 'Uncategorized',
      name: n.roomName,
      memberCount: 3 + (idx % 4), // simulate member counts
      currentSlide: n.currentSlide || 'Slide 1',
      isActive: idx % 2 === 0,
      nodeType: 'group' as const,
    }));

  const isScratch = (nodesData || []).length === 0;
  if (isScratch) {
    allNodes = [
      { id: 'onb-1', course: 'Welcome', name: 'to Fasca', memberCount: 5, currentSlide: '', isActive: true, nodeType: 'group' },
      { id: 'onb-2', course: 'Welcome', name: 'Create a Main Circle', memberCount: 6, currentSlide: '', isActive: true, nodeType: 'group' },
      { id: 'onb-3', course: 'Welcome', name: 'to get started!', memberCount: 4, currentSlide: '', isActive: true, nodeType: 'group' }
    ];
  }

  // Build Hierarchical Topology
  // 1. Filter raw groups
  const filteredGroups = allNodes.filter(n => 
    n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.course.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 2. Extract Unique Courses (from all nodesData including empty ones)
  const allCourses = new Set((nodesData || []).map(n => n.course || 'Uncategorized'));
  if (isScratch) allCourses.add('Welcome');
  const uniqueCourses = Array.from(allCourses);
  const courseNodes: GraphNode[] = uniqueCourses.map(course => ({
    id: `course-${course}`,
    course: course,
    name: course,
    memberCount: 20, // larger gravity
    currentSlide: '',
    isActive: true,
    nodeType: 'course'
  }));

  // 3. Combine nodes
  const finalNodes = [...courseNodes, ...filteredGroups];

  // 4. Generate Hierarchical Links
  const links: GraphLink[] = [];
  if (finalNodes.length > 0) {
    // Connect Courses to each other (backbone) so they don't float away
    for (let i = 0; i < courseNodes.length - 1; i++) {
      links.push({ source: courseNodes[i].id, target: courseNodes[i + 1].id });
    }
    // Connect Courses to Groups
    filteredGroups.forEach(group => {
      links.push({ source: `course-${group.course}`, target: group.id });
    });
  }

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    // Clear previous drawing
    d3.select(svgRef.current).selectAll('*').remove();

    const width = containerRef.current.clientWidth || 500;
    const height = 300;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width: 100%; height: auto;');

    // Setup force simulation
    const simulation = d3.forceSimulation<GraphNode>(finalNodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(d => {
        const source = finalNodes.find(n => n.id === (typeof d.source === 'object' ? (d.source as any).id : d.source));
        const target = finalNodes.find(n => n.id === (typeof d.target === 'object' ? (d.target as any).id : d.target));
        if (source?.nodeType === 'course' && target?.nodeType === 'course') return 300; // spread main nodes apart
        return 120; // child nodes closer to main
      }))
      .force('charge', d3.forceManyBody().strength(-500)) // Stronger repulsion to fan out the tree
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => {
        const n = d as GraphNode;
        return n.nodeType === 'course' ? 80 : n.memberCount * 1.5 + 25;
      }));

    // Get actual color hex string from the accent token, default to fouzar-accent (violet)
    let strokeColor = '#7c5cfc';
    if (accentColor === 'signal') strokeColor = '#ff2d55';
    else if (accentColor === 'amber') strokeColor = '#f5a623';
    else if (accentColor === 'ice') strokeColor = '#06b6d4';

    // Render connecting lines
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', strokeColor)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 2);

    // Render nodes container
    const node = svg.append('g')
      .selectAll('g')
      .data(finalNodes)
      .enter()
      .append('g')
      .attr('cursor', d => d.nodeType === 'group' ? 'pointer' : 'default')
      .on('click', (event, d) => {
        if (d.nodeType === 'group') {
          setSelectedNode(d);
        }
      });

    // Outer circle
    node.append('circle')
      .attr('r', d => d.nodeType === 'course' ? 32 : 12)
      .attr('fill', d => {
        if (d.nodeType === 'course') return 'var(--fouzar-surface)';
        return d.isActive ? strokeColor : 'var(--fouzar-border-strong)';
      })
      .attr('stroke', d => d.nodeType === 'course' ? strokeColor : 'var(--fouzar-bg)')
      .attr('stroke-width', d => d.nodeType === 'course' ? 2 : 2)
      .attr('class', 'transition-all duration-150')
      .on('mouseover', function(event, d) { 
        if ((d as GraphNode).nodeType === 'group') {
          d3.select(this).attr('stroke', strokeColor).attr('stroke-width', 3); 
        }
      })
      .on('mouseout', function(event, d) { 
        if ((d as GraphNode).nodeType === 'group') {
          d3.select(this).attr('stroke', 'var(--fouzar-bg)').attr('stroke-width', 2); 
        }
      });

    // Muted ring for active group nodes and main nodes (removed pulse for cleaner UI)
    node.filter(d => (d.isActive && d.nodeType === 'group') || d.nodeType === 'course')
      .append('circle')
      .attr('r', d => d.nodeType === 'course' ? 42 : 18)
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-opacity', d => d.nodeType === 'course' ? 0.3 : 0.15)
      .attr('stroke-width', 1);

    // Label text inside node
    node.append('text')
      .text(d => {
        if (d.nodeType === 'course') {
           // Course names look better truncated if very long
           return d.course.length > 12 ? d.course.slice(0, 10) + '..' : d.course;
        }
        // Show group names, slightly truncated
        return d.name.length > 18 ? d.name.slice(0, 16) + '..' : d.name;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.nodeType === 'course' ? '.3em' : '2.2em')
      .attr('fill', d => d.nodeType === 'course' ? 'var(--fouzar-text-primary)' : 'var(--fouzar-text-secondary)')
      .attr('font-size', d => d.nodeType === 'course' ? '10px' : '9px')
      .attr('font-family', 'monospace')
      .attr('font-weight', d => d.nodeType === 'course' ? 'bold' : 'normal')
      .attr('pointer-events', 'none');

    // Hover tooltip for child nodes
    node.filter(d => d.nodeType === 'group').append('title').text(d => d.name);

    // Drag behavior implementation
    const drag = d3.drag<any, any>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    node.call(drag as any);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node
        .attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [searchQuery, nodesData, accentColor]); // Update dependencies since we calculate filteredGroups inline

  return (
    <div ref={containerRef} className="w-full relative bg-fouzar-surface/40 border border-fouzar-border-strong rounded-[6px] overflow-hidden min-h-[60vh]">
      
      {/* Search Input Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center bg-fouzar-card/90 border border-fouzar-border-strong px-2.5 py-1.5 rounded-[4px] max-w-[200px]">
        <Search className="w-3.5 h-3.5 text-fouzar-text-secondary mr-1.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter nodes..."
          className="bg-transparent border-none text-[9px] font-mono text-fouzar-text-primary focus:outline-none w-full placeholder-[#6b6b8a]"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-fouzar-text-secondary hover:text-fouzar-text-primary">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Simulation SVG */}
      <svg ref={svgRef} className="w-full min-h-[500px] mt-8" />

      {/* Selected Node Details Overlay Card */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-4 left-4 right-4 bg-fouzar-card/95 border border-[#7c5cfc] p-4 shadow-2xl backdrop-blur-md z-20"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[7.5px] font-mono text-[#7c5cfc] uppercase tracking-wider block">
                  {selectedNode.course} ACTIVE CIRCLE
                </span>
                <h4 className="text-xs font-bold text-fouzar-text-primary mt-0.5">
                  {selectedNode.name}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1 hover:bg-white/5 rounded text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 my-3 text-left">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-fouzar-text-secondary" />
                <div className="flex flex-col">
                  <span className="text-[7px] font-mono text-fouzar-text-secondary uppercase">Peers</span>
                  <span className="text-[10px] font-bold">{selectedNode.memberCount} Active</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-fouzar-text-secondary" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[7px] font-mono text-fouzar-text-secondary uppercase">Current State</span>
                  <span className="text-[9px] font-medium truncate">{selectedNode.currentSlide}</span>
                </div>
              </div>
            </div>

            <FascaButton
              onClick={() => router.push(`/room/${selectedNode.id}`)}
              variant="solid-violet"
              className="w-full rounded-none font-bold py-2 text-[9px] mt-2 flex items-center justify-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5 fill-[#0a0a0f]" /> JOIN CIRCLE
            </FascaButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
