'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { X, Users, Compass, Flame } from 'lucide-react';
import { FascaButton } from '../ui/FascaButton';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  course: string;
  memberCount: number;
  currentSlide: string;
  isActive: boolean; // active in the last hour
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string;
  target: string;
}

/**
 * StudyNodesGraph Component
 * Uses D3.js to render a force-directed network graph of study groups.
 * Node size represents member counts, node color indicates activity,
 * and clicking a node shows an interactive details card overlay.
 */
export const StudyNodesGraph: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const router = useRouter();

  const nodes: GraphNode[] = [
    { id: 'group-1', course: 'CS-229', name: 'Neural Network Room', memberCount: 8, currentSlide: 'Slide 4: Backpropagation', isActive: true },
    { id: 'group-2', course: 'CS-109', name: 'Probability Study Desk', memberCount: 5, currentSlide: 'Slide 12: Normal Distributions', isActive: true },
    { id: 'group-3', course: 'PHY-201', name: 'Quantum Mechanics Lab', memberCount: 3, currentSlide: 'Slide 2: Schrödinger Wave Equation', isActive: false },
    { id: 'group-4', course: 'CS-101', name: 'Intro to Algorithms Group', memberCount: 12, currentSlide: 'Slide 9: Recursion Basics', isActive: false },
    { id: 'group-5', course: 'EE-140', name: 'Analog Circuits Lab', memberCount: 4, currentSlide: 'Slide 7: Op-Amp Feedback', isActive: true },
  ];

  const links: GraphLink[] = [
    { source: 'group-1', target: 'group-2' },
    { source: 'group-1', target: 'group-5' },
    { source: 'group-2', target: 'group-3' },
    { source: 'group-2', target: 'group-4' },
    { source: 'group-3', target: 'group-5' },
  ];

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
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links).id(d => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => (d as GraphNode).memberCount * 1.8 + 12));

    // Render connecting lines
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#2a2a3a')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5);

    // Render nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d);
      });

    // Outer circle
    node.append('circle')
      .attr('r', d => d.memberCount * 1.5 + 8)
      .attr('fill', d => d.isActive ? '#7c5cfc' : '#2a2a3a')
      .attr('stroke', '#0a0a0f')
      .attr('stroke-width', 2)
      .attr('class', 'transition-all duration-150 hover:stroke-[#7c5cfc] hover:stroke-3');

    // Muted pulse for active nodes
    node.filter(d => d.isActive)
      .append('circle')
      .attr('r', d => d.memberCount * 1.5 + 14)
      .attr('fill', 'none')
      .attr('stroke', '#7c5cfc')
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', 1)
      .attr('class', 'animate-pulse');

    // Label text inside node (Initials of course code)
    node.append('text')
      .text(d => d.course)
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('fill', '#f0f0ff')
      .attr('font-size', '8px')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('pointer-events', 'none');

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
  }, []);

  return (
    <div ref={containerRef} className="w-full relative bg-[#111118]/40 border border-[#2a2a3a] rounded-[6px] overflow-hidden min-h-[300px]">
      
      {/* Simulation SVG */}
      <svg ref={svgRef} className="w-full h-[300px]" />

      {/* Selected Node Details Overlay Card */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-4 left-4 right-4 bg-[#16161f]/95 border border-[#7c5cfc] p-4 shadow-2xl backdrop-blur-md z-20"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[7.5px] font-mono text-[#7c5cfc] uppercase tracking-wider block">
                  {selectedNode.course} ACTIVE CIRCLE
                </span>
                <h4 className="text-xs font-bold text-[#f0f0ff] mt-0.5">
                  {selectedNode.name}
                </h4>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1 hover:bg-white/5 rounded text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 my-3 text-left">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#6b6b8a]" />
                <div className="flex flex-col">
                  <span className="text-[7px] font-mono text-[#6b6b8a] uppercase">Peers</span>
                  <span className="text-[10px] font-bold">{selectedNode.memberCount} Active</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#6b6b8a]" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[7px] font-mono text-[#6b6b8a] uppercase">Current State</span>
                  <span className="text-[9px] font-medium truncate">{selectedNode.currentSlide}</span>
                </div>
              </div>
            </div>

            <FascaButton
              onClick={() => router.push(`/groups/${selectedNode.id}`)}
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
