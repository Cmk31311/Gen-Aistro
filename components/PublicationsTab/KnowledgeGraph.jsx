'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePapers } from '../../context/PapersContext';
import { SearchIcon, CloseIcon } from '../../ui/Icons';

const NODE_COLORS = {
  organism: '#4ADE80',
  condition: '#F0C05A',
  outcome: '#F5D280',
  other: '#87837E'
};

// Force-directed layout — clusters spaced apart with clear center
function forceSimulation(nodes, links, width, height) {
  const cx = width / 2;
  const cy = height / 2;

  // Group by type — place each group in its own zone
  const groups = {};
  nodes.forEach(n => {
    if (!groups[n.type]) groups[n.type] = [];
    groups[n.type].push(n);
  });
  const typeKeys = Object.keys(groups);
  const clusterRadius = Math.min(width, height) * 0.32;

  // Store group centers for cluster gravity
  const groupCenters = {};
  typeKeys.forEach((type, gi) => {
    const angle = (2 * Math.PI * gi) / typeKeys.length - Math.PI / 2;
    const gcx = cx + clusterRadius * Math.cos(angle);
    const gcy = cy + clusterRadius * Math.sin(angle);
    groupCenters[type] = { x: gcx, y: gcy };
    const count = groups[type].length;
    groups[type].forEach((n, i) => {
      const a = (2 * Math.PI * i) / count;
      const r = 30 + Math.random() * 50;
      n.x = gcx + r * Math.cos(a);
      n.y = gcy + r * Math.sin(a);
      n.vx = 0;
      n.vy = 0;
    });
  });

  const nodeMap = {};
  nodes.forEach(n => { nodeMap[n.id] = n; });

  for (let iter = 0; iter < 350; iter++) {
    const alpha = 1 - iter / 350;
    const decay = alpha * 0.4;

    // Repulsion between all nodes — stronger to push apart
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        // Extra repulsion between different-type nodes to keep clusters separate
        const crossType = nodes[i].type !== nodes[j].type ? 2.5 : 1;
        const force = (600 * crossType * decay) / (dist * dist);
        const fx = dx / dist * force;
        const fy = dy / dist * force;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along links — weaker so clusters don't collapse
    links.forEach(l => {
      const source = nodeMap[l.source];
      const target = nodeMap[l.target];
      if (!source || !target) return;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const crossType = source.type !== target.type;
      const ideal = crossType ? 200 : 80;
      const strength = crossType ? 0.002 : 0.005;
      const force = (dist - ideal) * strength * decay;
      const fx = dx / dist * force;
      const fy = dy / dist * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    });

    // Cluster gravity — each node pulled toward its group center
    nodes.forEach(n => {
      const gc = groupCenters[n.type];
      if (!gc) return;
      n.vx += (gc.x - n.x) * 0.005 * decay;
      n.vy += (gc.y - n.y) * 0.005 * decay;
    });

    // Very soft global center gravity so nothing drifts off-screen
    nodes.forEach(n => {
      n.vx += (cx - n.x) * 0.0003 * decay;
      n.vy += (cy - n.y) * 0.0003 * decay;
    });

    // Center repulsion — push nodes away from the center to keep it clear
    nodes.forEach(n => {
      const dx = n.x - cx;
      const dy = n.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      if (dist < 100) {
        const push = (100 - dist) * 0.02 * decay;
        n.vx += (dx / dist) * push;
        n.vy += (dy / dist) * push;
      }
    });

    nodes.forEach(n => {
      n.vx *= 0.5;
      n.vy *= 0.5;
      n.x += n.vx;
      n.y += n.vy;
      n.x = Math.max(60, Math.min(width - 60, n.x));
      n.y = Math.max(60, Math.min(height - 60, n.y));
    });
  }

  return { nodes, links, nodeMap };
}

export default function KnowledgeGraph({ onNodeClick }) {
  const { graphData } = usePapers();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 700 });
  const simulationRef = useRef(null);
  const animFrameRef = useRef(null);
  const pulseRef = useRef(0);

  // Pan & zoom state
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef({ dragging: false, dragNode: null, panStart: null, lastMouse: { x: 0, y: 0 } });

  // Signal particles travelling along links
  const particlesRef = useRef([]);

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
      radius: Math.max(Math.sqrt(n.count || 1) * 5 + 6, 8),
      x: 0, y: 0, vx: 0, vy: 0
    }));
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = (graphData.links || []).filter(l => nodeIds.has(l.source) && nodeIds.has(l.target));
    return { nodes, links };
  }, [graphData]);

  // Run simulation
  useEffect(() => {
    if (!processedData || dimensions.width === 0) return;
    const sim = forceSimulation(
      processedData.nodes.map(n => ({ ...n })),
      processedData.links,
      dimensions.width,
      dimensions.height
    );
    simulationRef.current = sim;

    // Initialize signal particles
    const particles = [];
    sim.links.forEach((l, i) => {
      if (i % 3 === 0) {
        particles.push({
          linkIdx: i,
          t: Math.random(),
          speed: 0.002 + Math.random() * 0.003,
          source: l.source,
          target: l.target
        });
      }
    });
    particlesRef.current = particles;
  }, [processedData, dimensions]);

  // Connected nodes for highlight
  const connectedIds = useMemo(() => {
    const active = selectedNode || hoveredNode;
    if (!active || !simulationRef.current) return new Set();
    const connected = new Set([active.id]);
    simulationRef.current.links.forEach(l => {
      if (l.source === active.id) connected.add(l.target);
      if (l.target === active.id) connected.add(l.source);
    });
    return connected;
  }, [hoveredNode, selectedNode]);

  // Screen-to-world transform
  const screenToWorld = useCallback((sx, sy) => {
    return {
      x: (sx - dimensions.width / 2) / camera.zoom + dimensions.width / 2 - camera.x,
      y: (sy - dimensions.height / 2) / camera.zoom + dimensions.height / 2 - camera.y
    };
  }, [camera, dimensions]);

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
    const cameraRef = { current: camera };
    cameraRef.current = camera;

    const draw = () => {
      if (!running) return;
      pulseRef.current += 0.015;
      const pulse = Math.sin(pulseRef.current) * 0.3 + 0.7;
      const sim = simulationRef.current;
      if (!sim) return;

      const cam = cameraRef.current;
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Apply camera transform
      ctx.save();
      ctx.translate(dimensions.width / 2, dimensions.height / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-dimensions.width / 2 + cam.x, -dimensions.height / 2 + cam.y);

      const { nodes, links, nodeMap } = sim;
      const active = selectedNode || hoveredNode;
      const connected = connectedIds;
      const isActiveMode = !!active;

      // Draw links
      links.forEach(l => {
        const source = nodeMap[l.source];
        const target = nodeMap[l.target];
        if (!source || !target) return;

        const isHighlighted = isActiveMode && connected.has(l.source) && connected.has(l.target);
        const alpha = isHighlighted ? 0.55 : isActiveMode ? 0.025 : 0.1;
        const lineWidth = isHighlighted ? 2.5 : 0.6;

        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy + 1);
        const offset = Math.min(dist * 0.12, 25);
        const cpX = midX + (-dy / dist) * offset;
        const cpY = midY + (dx / dist) * offset;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.quadraticCurveTo(cpX, cpY, target.x, target.y);

        if (isHighlighted) {
          ctx.shadowColor = 'rgba(240, 192, 90, 0.5)';
          ctx.shadowBlur = 12;
          ctx.strokeStyle = `rgba(240, 192, 90, ${alpha * pulse})`;
          ctx.lineWidth = lineWidth + 2;
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

      // Draw signal particles
      particlesRef.current.forEach(p => {
        p.t += p.speed;
        if (p.t > 1) p.t -= 1;

        const source = nodeMap[p.source];
        const target = nodeMap[p.target];
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy + 1);
        const offset = Math.min(dist * 0.12, 25);
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const cpX = midX + (-dy / dist) * offset;
        const cpY = midY + (dx / dist) * offset;

        // Quadratic bezier point at t
        const t = p.t;
        const mt = 1 - t;
        const px = mt * mt * source.x + 2 * mt * t * cpX + t * t * target.x;
        const py = mt * mt * source.y + 2 * mt * t * cpY + t * t * target.y;

        const isLinkHighlighted = isActiveMode && connected.has(p.source) && connected.has(p.target);
        const particleAlpha = isActiveMode ? (isLinkHighlighted ? 0.8 : 0) : 0.4;
        if (particleAlpha === 0) return;

        ctx.beginPath();
        ctx.arc(px, py, isLinkHighlighted ? 2.5 : 1.5, 0, 2 * Math.PI);
        ctx.fillStyle = isLinkHighlighted
          ? `rgba(240, 192, 90, ${particleAlpha})`
          : `rgba(255, 255, 255, ${particleAlpha})`;
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach(node => {
        const isHighlighted = !isActiveMode || connected.has(node.id);
        const isThis = active && node.id === active.id;
        const r = node.radius;
        const drawR = isThis ? r * 1.2 : r;

        // Glow
        if (isThis) {
          const gradient = ctx.createRadialGradient(node.x, node.y, drawR, node.x, node.y, drawR * 4);
          gradient.addColorStop(0, node.color + '50');
          gradient.addColorStop(0.5, node.color + '15');
          gradient.addColorStop(1, node.color + '00');
          ctx.beginPath();
          ctx.arc(node.x, node.y, drawR * 4, 0, 2 * Math.PI);
          ctx.fillStyle = gradient;
          ctx.fill();
        } else if (isHighlighted && isActiveMode) {
          const gradient = ctx.createRadialGradient(node.x, node.y, drawR, node.x, node.y, drawR * 2.5);
          gradient.addColorStop(0, node.color + '25');
          gradient.addColorStop(1, node.color + '00');
          ctx.beginPath();
          ctx.arc(node.x, node.y, drawR * 2.5, 0, 2 * Math.PI);
          ctx.fillStyle = gradient;
          ctx.fill();
        } else if (!isActiveMode) {
          const gradient = ctx.createRadialGradient(node.x, node.y, drawR, node.x, node.y, drawR * 1.8);
          gradient.addColorStop(0, node.color + '10');
          gradient.addColorStop(1, node.color + '00');
          ctx.beginPath();
          ctx.arc(node.x, node.y, drawR * 1.8, 0, 2 * Math.PI);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, drawR, 0, 2 * Math.PI);
        ctx.fillStyle = isHighlighted ? node.color : node.color + '18';
        ctx.fill();

        // Ring
        if (isHighlighted) {
          ctx.strokeStyle = node.color + (isThis ? 'EE' : '55');
          ctx.lineWidth = isThis ? 3 : 1.2;
          if (isThis) {
            ctx.shadowColor = node.color;
            ctx.shadowBlur = 10;
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Inner synapse dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, drawR * 0.3, 0, 2 * Math.PI);
        ctx.fillStyle = isHighlighted ? '#FFFFFF' + (isThis ? 'EE' : '88') : '#FFFFFF10';
        ctx.fill();

        // Label
        const showLabel = isHighlighted || cam.zoom > 1.3;
        if (showLabel) {
          const fontSize = isThis ? 13 : 11;
          ctx.font = `${isThis ? '700' : '500'} ${fontSize}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';

          // Label background
          const label = node.id;
          const textW = ctx.measureText(label).width;
          const padX = 6;
          const padY = 2;
          const labelY = node.y + drawR + 6;

          if (isThis || (isActiveMode && isHighlighted)) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            const bx = node.x - textW / 2 - padX;
            const by = labelY - padY;
            const bw = textW + padX * 2;
            const bh = fontSize + padY * 2 + 2;
            const br = 4;
            ctx.moveTo(bx + br, by);
            ctx.lineTo(bx + bw - br, by);
            ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + br);
            ctx.lineTo(bx + bw, by + bh - br);
            ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - br, by + bh);
            ctx.lineTo(bx + br, by + bh);
            ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - br);
            ctx.lineTo(bx, by + br);
            ctx.quadraticCurveTo(bx, by, bx + br, by);
            ctx.fill();
          }

          ctx.fillStyle = isThis ? '#FAFAF9' : isActiveMode ? (isHighlighted ? node.color : '#87837E44') : '#FAFAF9BB';
          ctx.fillText(label, node.x, labelY);
        }
      });

      ctx.restore();

      // Zoom indicator
      if (cam.zoom !== 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '500 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.round(cam.zoom * 100)}%`, dimensions.width - 16, dimensions.height - 12);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [dimensions, hoveredNode, selectedNode, connectedIds, camera]);

  // Find node at screen position
  const findNodeAt = useCallback((sx, sy) => {
    if (!simulationRef.current) return null;
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    const { nodes } = simulationRef.current;
    for (const node of nodes) {
      const dx = node.x - wx;
      const dy = node.y - wy;
      const hitR = node.radius + 10;
      if (dx * dx + dy * dy < hitR * hitR) return node;
    }
    return null;
  }, [screenToWorld]);

  // Mouse handlers
  const handleMouseDown = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);

    if (node) {
      dragRef.current = { dragging: true, dragNode: node, panStart: null, lastMouse: { x: sx, y: sy } };
    } else {
      dragRef.current = { dragging: false, dragNode: null, panStart: { x: sx, y: sy, camX: camera.x, camY: camera.y }, lastMouse: { x: sx, y: sy } };
    }
  }, [findNodeAt, camera]);

  const handleMouseMove = useCallback((e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const drag = dragRef.current;

    if (drag.dragging && drag.dragNode) {
      // Drag node
      const dx = (sx - drag.lastMouse.x) / camera.zoom;
      const dy = (sy - drag.lastMouse.y) / camera.zoom;
      drag.dragNode.x += dx;
      drag.dragNode.y += dy;
      drag.lastMouse = { x: sx, y: sy };
      canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    if (drag.panStart) {
      // Pan
      const dx = (sx - drag.panStart.x) / camera.zoom;
      const dy = (sy - drag.panStart.y) / camera.zoom;
      setCamera(prev => ({ ...prev, x: drag.panStart.camX + dx, y: drag.panStart.camY + dy }));
      canvasRef.current.style.cursor = 'grabbing';
      return;
    }

    const node = findNodeAt(sx, sy);
    setHoveredNode(node);
    canvasRef.current.style.cursor = node ? 'pointer' : 'grab';
  }, [findNodeAt, camera]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = { dragging: false, dragNode: null, panStart: null, lastMouse: { x: 0, y: 0 } };
  }, []);

  const handleClick = useCallback((e) => {
    if (dragRef.current.dragging || dragRef.current.panStart) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    setSelectedNode(prev => prev?.id === node?.id ? null : node);
  }, [findNodeAt]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(prev => ({
      ...prev,
      zoom: Math.max(0.3, Math.min(4, prev.zoom * delta))
    }));
  }, []);

  // Attach wheel with passive: false
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const resetView = useCallback(() => {
    setCamera({ x: 0, y: 0, zoom: 1 });
    setSelectedNode(null);
    setHoveredNode(null);
  }, []);

  // Get neighbor info for selected node panel
  const selectedNeighbors = useMemo(() => {
    if (!selectedNode || !simulationRef.current) return [];
    const { links, nodeMap } = simulationRef.current;
    const neighbors = [];
    links.forEach(l => {
      if (l.source === selectedNode.id && nodeMap[l.target]) {
        neighbors.push({ node: nodeMap[l.target], weight: l.weight || 1 });
      } else if (l.target === selectedNode.id && nodeMap[l.source]) {
        neighbors.push({ node: nodeMap[l.source], weight: l.weight || 1 });
      }
    });
    neighbors.sort((a, b) => b.weight - a.weight);
    return neighbors;
  }, [selectedNode]);

  if (!graphData?.nodes?.length) {
    return <div className="flex items-center justify-center h-64 text-content-3 text-sm">No knowledge graph data available</div>;
  }

  const nodeCount = graphData.nodes.length;
  const linkCount = graphData.links?.length || 0;

  return (
    <div className="space-y-4">
      {/* Legend + controls */}
      <div className="flex flex-wrap items-center gap-5 px-1">
        {Object.entries(NODE_COLORS).filter(([k]) => k !== 'other').map(([type, color]) => (
          <div key={type} className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.3)]" style={{ backgroundColor: color }} />
            <span className="text-xs text-content-2 capitalize font-medium">{type}s</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-content-3 font-medium">{nodeCount} entities &middot; {linkCount} links</span>
          <button onClick={resetView} className="px-2.5 py-1 text-[11px] text-content-3 hover:text-accent border border-border hover:border-accent/30 rounded-lg transition-all font-medium">
            Reset View
          </button>
        </div>
      </div>

      <p className="text-[11px] text-content-3 px-1">Drag nodes to rearrange &middot; Scroll to zoom &middot; Drag background to pan &middot; Click a node for details</p>

      {/* Canvas + detail panel side by side */}
      <div className="flex gap-4">
        <div ref={containerRef} className="flex-1 bg-bg rounded-xl border border-border overflow-hidden shadow-inner-glow relative" style={{ height: '700px' }}>
          {dimensions.width > 0 && (
            <canvas
              ref={canvasRef}
              style={{ width: '100%', height: dimensions.height }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={() => { handleMouseUp(); setHoveredNode(null); }}
              onClick={handleClick}
            />
          )}

          {/* Hover tooltip */}
          {hoveredNode && !selectedNode && (
            <div className="absolute top-4 left-4 bg-surface-1/90 backdrop-blur border border-border rounded-xl px-4 py-3 pointer-events-none animate-fade-in shadow-xl">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hoveredNode.color }} />
                <span className="text-sm font-semibold text-content-1">{hoveredNode.id}</span>
                <span className="text-[10px] text-content-3 capitalize px-1.5 py-0.5 bg-surface-2 rounded">{hoveredNode.type}</span>
              </div>
              <p className="text-[11px] text-content-3 mt-1">{connectedIds.size - 1} connections &middot; Click for details</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedNode && (
          <div className="w-72 flex-shrink-0 bg-surface-1 rounded-xl border border-border p-5 shadow-card animate-fade-in overflow-y-auto" style={{ maxHeight: '700px' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]" style={{ backgroundColor: selectedNode.color }} />
                <h4 className="text-sm font-bold text-content-1">{selectedNode.id}</h4>
              </div>
              <button onClick={() => setSelectedNode(null)} className="p-1.5 text-content-3 hover:text-content-1 hover:bg-surface-2 rounded-lg transition-all">
                <CloseIcon size={14} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-content-3 font-medium">Type</span>
                <p className="text-sm text-content-1 capitalize mt-0.5">{selectedNode.type}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider text-content-3 font-medium">Connections ({selectedNeighbors.length})</span>
                <div className="mt-2 space-y-1.5 max-h-[350px] overflow-y-auto">
                  {selectedNeighbors.map(({ node: n }, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedNode(n)}
                      className="w-full flex items-center space-x-2 px-3 py-2 bg-surface-2 hover:bg-surface-3 rounded-lg transition-all text-left group"
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: n.color }} />
                      <span className="text-xs text-content-2 group-hover:text-content-1 truncate flex-1">{n.id}</span>
                      <span className="text-[10px] text-content-3 capitalize">{n.type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onNodeClick?.(selectedNode.id)}
                className="w-full mt-2 px-4 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-xl text-xs transition-all active:scale-[0.97] shadow-[0_2px_8px_rgba(240,192,90,0.2)]"
              >
                <span className="flex items-center justify-center gap-1.5">
                  <SearchIcon size={13} />
                  Filter publications by "{selectedNode.id}"
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
