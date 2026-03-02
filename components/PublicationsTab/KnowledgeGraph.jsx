'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePapers } from '../../context/PapersContext';

const NODE_COLORS = {
  organism: '#4ADE80',
  condition: '#F0C05A',
  outcome: '#F5D280',
  other: '#87837E'
};

// Simple force simulation
function forceSimulation(nodes, links, width, height) {
  // Initialize positions in a circle
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.35;
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    n.x = cx + radius * Math.cos(angle) + (Math.random() - 0.5) * 40;
    n.y = cy + radius * Math.sin(angle) + (Math.random() - 0.5) * 40;
    n.vx = 0;
    n.vy = 0;
  });

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  // Run simulation iterations
  for (let iter = 0; iter < 200; iter++) {
    const alpha = 1 - iter / 200;
    const decay = alpha * 0.3;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (300 * decay) / (dist * dist);
        const fx = dx / dist * force;
        const fy = dy / dist * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along links
    links.forEach(l => {
      const source = nodeMap[l.source];
      const target = nodeMap[l.target];
      if (!source || !target) return;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 80) * 0.005 * decay;
      const fx = dx / dist * force;
      const fy = dy / dist * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    // Center gravity
    nodes.forEach(n => {
      n.vx += (cx - n.x) * 0.002 * decay;
      n.vy += (cy - n.y) * 0.002 * decay;
    });

    // Apply velocities with damping
    nodes.forEach(n => {
      n.vx *= 0.6;
      n.vy *= 0.6;
      n.x += n.vx;
      n.y += n.vy;
      // Keep in bounds
      n.x = Math.max(40, Math.min(width - 40, n.x));
      n.y = Math.max(40, Math.min(height - 40, n.y));
    });
  }

  return { nodes, links, nodeMap };
}

export default function KnowledgeGraph({ onNodeClick }) {
  const { graphData } = usePapers();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 500 });
  const simulationRef = useRef(null);
  const animFrameRef = useRef(null);
  const pulseRef = useRef(0);

  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      const w = containerRef.current?.clientWidth;
      if (w && w > 0) setDimensions(prev => ({ ...prev, width: w }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Process graph data
  const processedData = useMemo(() => {
    if (!graphData?.nodes) return null;
    const nodes = graphData.nodes.map(n => ({
      ...n,
      color: NODE_COLORS[n.type] || NODE_COLORS.other,
      radius: Math.max(Math.sqrt(n.count || 1) * 4 + 4, 6),
      x: 0, y: 0, vx: 0, vy: 0
    }));
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = (graphData.links || []).filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));
    return { nodes, links };
  }, [graphData]);

  // Run simulation when data or dimensions change
  useEffect(() => {
    if (!processedData || dimensions.width === 0) return;
    const sim = forceSimulation(
      processedData.nodes.map(n => ({ ...n })),
      processedData.links,
      dimensions.width,
      dimensions.height
    );
    simulationRef.current = sim;
  }, [processedData, dimensions]);

  // Get connected nodes for hover
  const connectedIds = useMemo(() => {
    if (!hoveredNode || !simulationRef.current) return new Set();
    const connected = new Set([hoveredNode.id]);
    simulationRef.current.links.forEach(l => {
      if (l.source === hoveredNode.id) connected.add(l.target);
      if (l.target === hoveredNode.id) connected.add(l.source);
    });
    return connected;
  }, [hoveredNode]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationRef.current) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    let running = true;

    const draw = () => {
      if (!running) return;
      pulseRef.current += 0.02;
      const pulse = Math.sin(pulseRef.current) * 0.3 + 0.7;
      const sim = simulationRef.current;
      if (!sim) return;

      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      const { nodes, links, nodeMap } = sim;
      const hovered = hoveredNode;
      const connected = connectedIds;

      // Draw links as neural connections
      links.forEach(l => {
        const source = nodeMap[l.source];
        const target = nodeMap[l.target];
        if (!source || !target) return;

        const isHighlighted = hovered && (connected.has(l.source) && connected.has(l.target));
        const isHoverActive = !!hovered;

        const alpha = isHighlighted ? 0.6 : isHoverActive ? 0.03 : 0.12;
        const lineWidth = isHighlighted ? 2 : 0.5;

        // Neural link: curved line with glow
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const offset = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.1, 20);
        const cpX = midX + (-dy / Math.sqrt(dx * dx + dy * dy + 1)) * offset;
        const cpY = midY + (dx / Math.sqrt(dx * dx + dy * dy + 1)) * offset;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(cpX, cpY, target.x, target.y);

        if (isHighlighted) {
          // Glowing gold link
          ctx.strokeStyle = `rgba(240, 192, 90, ${alpha * pulse})`;
          ctx.lineWidth = lineWidth + 2;
          ctx.shadowColor = 'rgba(240, 192, 90, 0.4)';
          ctx.shadowBlur = 8;
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = `rgba(240, 192, 90, ${alpha})`;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        const isHoverActive = !!hovered;
        const isHighlighted = !hovered || connected.has(node.id);
        const isThisHovered = hovered && node.id === hovered.id;
        const r = node.radius;

        // Outer glow
        if (isThisHovered) {
          const gradient = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r * 3);
          gradient.addColorStop(0, node.color + '40');
          gradient.addColorStop(1, node.color + '00');
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 3, 0, 2 * Math.PI);
          ctx.fillStyle = gradient;
          ctx.fill();
        } else if (isHighlighted && !isHoverActive) {
          // Subtle pulse glow for all nodes when nothing hovered
          const gradient = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r * 2);
          gradient.addColorStop(0, node.color + '15');
          gradient.addColorStop(1, node.color + '00');
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 2, 0, 2 * Math.PI);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Core node
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
        const nodeAlpha = isHighlighted ? 1 : 0.15;
        ctx.fillStyle = isHighlighted ? node.color : node.color + '26';
        ctx.fill();

        // Ring
        if (isHighlighted) {
          ctx.strokeStyle = node.color + (isThisHovered ? 'CC' : '60');
          ctx.lineWidth = isThisHovered ? 2.5 : 1;
          ctx.stroke();
        }

        // Inner bright dot (neural synapse look)
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 0.35, 0, 2 * Math.PI);
        ctx.fillStyle = isHighlighted ? '#FFFFFF' + (isThisHovered ? 'DD' : '80') : '#FFFFFF15';
        ctx.fill();

        // Label
        if (isHighlighted) {
          ctx.font = `${isThisHovered ? '600 12px' : '500 10px'} Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = isThisHovered ? '#FAFAF9' : isHoverActive ? node.color : '#FAFAF9CC';
          ctx.fillText(node.id, node.x, node.y + r + 5);
        }
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dimensions, hoveredNode, connectedIds]);

  // Mouse interaction
  const handleMouseMove = useCallback((e) => {
    if (!simulationRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { nodes } = simulationRef.current;
    let found = null;
    for (const node of nodes) {
      const dx = node.x - mx;
      const dy = node.y - my;
      if (dx * dx + dy * dy < (node.radius + 8) * (node.radius + 8)) {
        found = node;
        break;
      }
    }
    setHoveredNode(found);
    canvasRef.current.style.cursor = found ? 'pointer' : 'default';
  }, []);

  const handleClick = useCallback((e) => {
    if (!simulationRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const { nodes } = simulationRef.current;
    for (const node of nodes) {
      const dx = node.x - mx;
      const dy = node.y - my;
      if (dx * dx + dy * dy < (node.radius + 8) * (node.radius + 8)) {
        onNodeClick?.(node.id);
        break;
      }
    }
  }, [onNodeClick]);

  if (!graphData?.nodes?.length) {
    return <div className="flex items-center justify-center h-64 text-content-3 text-sm">No knowledge graph data available</div>;
  }

  const nodeCount = graphData.nodes.length;
  const linkCount = graphData.links?.length || 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-5 px-1">
        {Object.entries(NODE_COLORS).filter(([k]) => k !== 'other').map(([type, color]) => (
          <div key={type} className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.3)]" style={{ backgroundColor: color }} />
            <span className="text-xs text-content-2 capitalize font-medium">{type}s</span>
          </div>
        ))}
        <span className="text-xs text-content-3 ml-auto font-medium">{nodeCount} entities &middot; {linkCount} relationships</span>
      </div>

      <div ref={containerRef} className="bg-bg rounded-xl border border-border overflow-hidden shadow-inner-glow" style={{ height: '500px' }}>
        {dimensions.width > 0 && (
          <canvas
            ref={canvasRef}
            style={{ width: dimensions.width, height: dimensions.height }}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoveredNode(null)}
            onClick={handleClick}
          />
        )}
      </div>

      {hoveredNode && (
        <div className="flex items-center space-x-3 text-xs px-1 animate-fade-in">
          <span className="text-accent font-semibold">{hoveredNode.id}</span>
          <span className="text-content-2 capitalize">{hoveredNode.type}</span>
          <span className="text-content-3">{connectedIds.size - 1} connections</span>
          <span className="text-accent/60 font-medium">Click to filter</span>
        </div>
      )}
    </div>
  );
}
