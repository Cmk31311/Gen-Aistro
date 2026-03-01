'use client';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePapers } from '../../context/PapersContext';

const ForceGraph2D = dynamic(
  () => import('react-force-graph').then(mod => mod.ForceGraph2D),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="text-content-3 text-sm">Loading graph...</div>
    </div>
  )}
);

const NODE_COLORS = {
  organism: '#4ADE80',
  condition: '#F0C05A',
  outcome: '#F5D280',
  other: '#87837E'
};

export default function KnowledgeGraph({ onNodeClick }) {
  const { graphData } = usePapers();
  const [hoveredNode, setHoveredNode] = useState(null);
  const graphRef = useRef(null);

  const processedData = useMemo(() => {
    if (!graphData?.nodes) return { nodes: [], links: [] };
    const nodes = graphData.nodes.map(n => ({
      ...n,
      color: NODE_COLORS[n.type] || NODE_COLORS.other,
      val: Math.max(n.size || 10, 5)
    }));
    const nodeIds = new Set(nodes.map(n => n.id));
    const links = (graphData.links || [])
      .filter(l => nodeIds.has(l.source) && nodeIds.has(l.target))
      .map(l => ({ ...l, color: 'rgba(255,255,255,0.05)' }));
    return { nodes, links };
  }, [graphData]);

  const connectedNodes = useMemo(() => {
    if (!hoveredNode) return new Set();
    const connected = new Set([hoveredNode.id]);
    processedData.links.forEach(l => {
      const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
      const targetId = typeof l.target === 'object' ? l.target.id : l.target;
      if (sourceId === hoveredNode.id) connected.add(targetId);
      if (targetId === hoveredNode.id) connected.add(sourceId);
    });
    return connected;
  }, [hoveredNode, processedData.links]);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isHighlighted = !hoveredNode || connectedNodes.has(node.id);
    const radius = Math.sqrt(node.val) * 1.5;
    const fontSize = Math.max(10 / globalScale, 2);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = isHighlighted ? node.color : node.color + '33';
    ctx.fill();
    if (isHighlighted && globalScale > 0.5) {
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
    }
    if (globalScale > 0.8 || (hoveredNode && node.id === hoveredNode.id)) {
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isHighlighted ? '#FAFAF9' : '#87837E';
      ctx.fillText(node.id, node.x, node.y + radius + 2);
    }
  }, [hoveredNode, connectedNodes]);

  const linkColor = useCallback((link) => {
    if (!hoveredNode) return 'rgba(255,255,255,0.05)';
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    if (connectedNodes.has(sourceId) && connectedNodes.has(targetId)) return 'rgba(240,192,90,0.45)';
    return 'rgba(255,255,255,0.02)';
  }, [hoveredNode, connectedNodes]);

  if (!graphData?.nodes?.length) {
    return <div className="flex items-center justify-center h-64 text-content-3 text-sm">No knowledge graph data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-5 px-1">
        {Object.entries(NODE_COLORS).filter(([k]) => k !== 'other').map(([type, color]) => (
          <div key={type} className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full shadow-[0_0_6px_rgba(0,0,0,0.3)]" style={{ backgroundColor: color }} />
            <span className="text-xs text-content-2 capitalize font-medium">{type}s</span>
          </div>
        ))}
        <span className="text-xs text-content-3 ml-auto font-medium">{processedData.nodes.length} entities &middot; {processedData.links.length} relationships</span>
      </div>

      <div className="bg-bg rounded-xl border border-border overflow-hidden shadow-inner-glow" style={{ height: '500px' }}>
        <ForceGraph2D
          ref={graphRef} graphData={processedData} nodeCanvasObject={nodeCanvasObject} linkColor={linkColor}
          linkWidth={link => Math.min(Math.log((link.weight || 1) + 1) * 0.5, 3)}
          onNodeHover={setHoveredNode} onNodeClick={(node) => onNodeClick?.(node.id)}
          backgroundColor="transparent" width={undefined} height={500}
          d3AlphaDecay={0.02} d3VelocityDecay={0.3} cooldownTime={3000}
          enableZoomInteraction={true} enablePanInteraction={true}
        />
      </div>

      {hoveredNode && (
        <div className="flex items-center space-x-3 text-xs px-1 animate-fade-in">
          <span className="text-accent font-semibold">{hoveredNode.id}</span>
          <span className="text-content-2 capitalize">{hoveredNode.type}</span>
          <span className="text-content-3">{connectedNodes.size - 1} connections</span>
          <span className="text-accent/60 font-medium">Click to filter</span>
        </div>
      )}
    </div>
  );
}
