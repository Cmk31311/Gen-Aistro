
'use client';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { embedQuery } from '../utils/embed';

const TABS = {
  SEARCH: 'search',
  GRAPH: 'graph', 
  INSIGHTS: 'insights'
};

function SearchTab() {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(800);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setAnswer('');
    setSources([]);
    setMetadata(null);
    
    try {
      // Step 1: Generate query embedding
      const queryEmbedding = await embedQuery(query);
      
      // Step 2: Search for relevant chunks
      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queryEmbedding,
          topK,
          filter: {} // Can be enhanced with filters
        })
      });
      
      if (!searchResponse.ok) {
        throw new Error('Search failed');
      }
      
      const searchData = await searchResponse.json();
      
      if (searchData.error) {
        throw new Error(searchData.error);
      }
      
      // Step 3: Generate answer using retrieved chunks
      const askResponse = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          chunks: searchData.results,
          temperature,
          max_tokens: maxTokens
        })
      });
      
      if (!askResponse.ok) {
        throw new Error('Answer generation failed');
      }
      
      const askData = await askResponse.json();
      
      if (askData.error) {
        throw new Error(askData.error);
      }
      
      setAnswer(askData.answer);
      setSources(searchData.results);
      setMetadata(askData.metadata);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [query, topK, temperature, maxTokens]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Controls */}
      <div className="space-y-6">
        <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-3">
                Ask a Question
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="e.g., How does microgravity affect plant growth?"
                className="w-full p-4 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-white placeholder-blue-200/60"
                rows={4}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-blue-200 mb-2">
                  Top-K Results: <span className="text-purple-300">{topK}</span>
                </label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value))}
                  className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-blue-200 mb-2">
                  Temperature: <span className="text-purple-300">{temperature}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-blue-200 mb-2">
                  Max Tokens: <span className="text-purple-300">{maxTokens}</span>
                </label>
                <input
                  type="range"
                  min="200"
                  max="1000"
                  step="100"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full h-2 bg-black/30 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  disabled={loading}
                />
              </div>
            </div>
            
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 px-6 rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-200 shadow-lg shadow-purple-500/25"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Searching...</span>
                </div>
              ) : (
                '🚀 Ask Question'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Results */}
      <div className="space-y-6">
        {error && (
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-300">Error</h3>
                <p className="text-sm text-red-200 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {answer && (
          <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-8">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <span className="mr-2">💡</span>
              Answer
              {metadata?.used_web_search && (
                <span className="ml-3 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                  🌐 Enhanced with web search
                </span>
              )}
            </h3>
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-blue-200 leading-relaxed">
                {answer}
              </div>
            </div>
          </div>
        )}
        
        {sources.length > 0 && (
          <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <span className="mr-2">📚</span>
              Sources ({sources.length})
            </h3>
            <div className="space-y-4">
              {sources.map((source, index) => (
                <div key={source.chunk_id} className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-lg p-5 hover:bg-black/40 hover:border-white/20 transition-all duration-200">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-purple-300 text-sm leading-tight">
                      {source.doc_title}
                      {source.year && <span className="text-blue-200/70 ml-2">({source.year})</span>}
                    </h4>
                    <span className="text-xs text-purple-200 bg-purple-500/20 px-2 py-1 rounded-md">
                      Score: {source.score?.toFixed(3)}
                    </span>
                  </div>
                  {source.url && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-300 hover:text-purple-200 text-sm font-medium inline-flex items-center mb-3 transition-colors"
                    >
                      <span className="mr-1">🔗</span>
                      View Publication
                    </a>
                  )}
                  <p className="text-blue-200/80 text-sm leading-relaxed line-clamp-3">
                    {source.text.substring(0, 300)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!answer && !sources.length && !error && !loading && (
          <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-12 text-center">
            <div className="text-blue-300 text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold text-white mb-2">Ready to explore NASA research</h3>
            <p className="text-blue-200/70">Ask a question to see AI-powered insights from NASA Space Biology publications</p>
          </div>
        )}
      </div>
    </div>
  );
}

function GraphTab() {
  const [publications, setPublications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [hoveredPublication, setHoveredPublication] = useState(null);
  const [filterYear, setFilterYear] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showLabels, setShowLabels] = useState(true);
  const [layoutType, setLayoutType] = useState('circular');
  const [stats, setStats] = useState(null);
  
  // Memoized values for performance
  const filteredPublications = useMemo(() => {
    if (!publications?.nodes) return [];
    return publications.nodes.filter(node => {
      const matchesYear = filterYear === 'all' || node.year === parseInt(filterYear);
      const matchesSearch = !searchTerm || 
        node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesYear && matchesSearch;
    });
  }, [publications?.nodes, filterYear, searchTerm]);

  const filteredLinks = useMemo(() => {
    if (!publications?.links || !filteredPublications.length) return [];
    return publications.links.filter(link => {
      const sourceExists = filteredPublications.some(node => node.id === link.source);
      const targetExists = filteredPublications.some(node => node.id === link.target);
      return sourceExists && targetExists;
    });
  }, [publications?.links, filteredPublications]);

  useEffect(() => {
    // Load publications data from papers.json
    fetch('/data/papers.json')
      .then(res => res.json())
      .then(data => {
        // Transform papers data into graph format
        const publications = data.slice(0, 100); // Limit to 100 for performance
        
        // Create nodes from publications
        const nodes = publications.map((paper, index) => ({
          id: paper.doc_id || `paper_${index}`,
          title: paper.doc_title || 'Untitled',
          year: paper.year || new Date().getFullYear(),
          url: paper.url || '',
          type: 'publication',
          x: Math.random() * 800 + 100,
          y: Math.random() * 600 + 100
        }));

        // Create links based on year proximity and similar titles
        const links = [];
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const node1 = nodes[i];
            const node2 = nodes[j];
            
            // Create links based on year proximity (within 2 years)
            const yearDiff = Math.abs(node1.year - node2.year);
            if (yearDiff <= 2) {
              links.push({
                source: node1.id,
                target: node2.id,
                weight: Math.max(1, 3 - yearDiff)
              });
            }
          }
        }

        const graphData = { nodes, links };
        setPublications(graphData);
        setLoading(false);
        
        // Calculate stats
        const nodeStats = {
          total: nodes.length,
          years: [...new Set(nodes.map(n => n.year))].sort(),
          topYears: nodes.reduce((acc, node) => {
            acc[node.year] = (acc[node.year] || 0) + 1;
            return acc;
          }, {}),
          recentPublications: nodes.filter(n => n.year >= 2020).length
        };
        setStats(nodeStats);
      })
      .catch(err => {
        setError('Failed to load publications data');
        setLoading(false);
      });
  }, []);


  // Memoized utility functions for performance
  const getNodeColor = useCallback((year) => {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    
    if (age <= 5) return '#10B981'; // Green for recent
    if (age <= 10) return '#3B82F6'; // Blue for moderate
    if (age <= 20) return '#F59E0B'; // Orange for older
    return '#EF4444'; // Red for very old
  }, []);

  const getNodeSize = useCallback((year) => {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    
    // Recent publications are larger
    if (age <= 5) return 16;
    if (age <= 10) return 14;
    if (age <= 20) return 12;
    return 10;
  }, []);

  const getNodePosition = useCallback((node, index, total) => {
    if (layoutType === 'circular') {
      const angle = (index / total) * 2 * Math.PI;
      return {
        x: 600 + 250 * Math.cos(angle) * zoomLevel + panOffset.x,
        y: 350 + 250 * Math.sin(angle) * zoomLevel + panOffset.y
      };
    } else if (layoutType === 'hierarchical') {
      const row = Math.floor(index / 8);
      const col = index % 8;
      return {
        x: 200 + col * 100 * zoomLevel + panOffset.x,
        y: 100 + row * 80 * zoomLevel + panOffset.y
      };
    }
    // Use stored position or random
    return {
      x: (node.x || Math.random() * 800 + 100) * zoomLevel + panOffset.x,
      y: (node.y || Math.random() * 600 + 100) * zoomLevel + panOffset.y
    };
  }, [layoutType, zoomLevel, panOffset]);

  // Optimized event handlers with throttling
  const handleMouseDown = useCallback((e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  }, [panOffset]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.max(0.5, Math.min(3, prev * delta)));
  }, []);

  // Memoized node and link components for performance
  const NodeComponent = useCallback(({ node, index, total }) => {
    const position = getNodePosition(node, index, total);
    const isSelected = selectedPublication?.id === node.id;
    const isHovered = hoveredPublication?.id === node.id;
    const nodeSize = getNodeSize(node.year);
    const nodeColor = getNodeColor(node.year);

    return (
      <g key={node.id}>
        {/* Node shadow */}
        <circle
          cx={position.x + 2}
          cy={position.y + 2}
          r={nodeSize + 2}
          fill="rgba(0,0,0,0.1)"
          className="pointer-events-none"
        />
        
        {/* Main node */}
        <circle
          cx={position.x}
          cy={position.y}
          r={nodeSize}
          fill={nodeColor}
          stroke={isSelected ? "#1F2937" : "white"}
          strokeWidth={isSelected ? 4 : 2}
          opacity={isHovered ? 0.9 : 1}
          className="cursor-pointer transition-all duration-200 hover:scale-105"
          onClick={() => setSelectedPublication(node)}
          onMouseEnter={() => setHoveredPublication(node)}
          onMouseLeave={() => setHoveredPublication(null)}
        />
        
        {/* Node label */}
        {showLabels && (
          <text
            x={position.x}
            y={position.y + nodeSize + 15}
            textAnchor="middle"
            fontSize="10"
            fill="#374151"
            fontWeight="600"
            className="pointer-events-none"
          >
            {node.year}
          </text>
        )}
        
        {/* Year badge */}
        <circle
          cx={position.x + nodeSize - 4}
          cy={position.y - nodeSize + 4}
          r="8"
          fill="white"
          stroke={nodeColor}
          strokeWidth="2"
          className="pointer-events-none"
        />
        <text
          x={position.x + nodeSize - 4}
          y={position.y - nodeSize + 7}
          textAnchor="middle"
          fontSize="7"
          fill={nodeColor}
          fontWeight="bold"
          className="pointer-events-none"
        >
          {node.year.toString().slice(-2)}
        </text>
      </g>
    );
  }, [getNodePosition, getNodeSize, getNodeColor, selectedPublication, hoveredPublication, showLabels]);

  const LinkComponent = useCallback(({ link, sourcePos, targetPos }) => {
    const isHighlighted = selectedPublication && 
      (selectedPublication.id === link.source || selectedPublication.id === link.target);

    return (
      <line
        key={`${link.source}-${link.target}`}
        x1={sourcePos.x}
        y1={sourcePos.y}
        x2={targetPos.x}
        y2={targetPos.y}
        stroke={isHighlighted ? "#3B82F6" : "#D1D5DB"}
        strokeWidth={isHighlighted ? 3 : Math.max(1, link.weight * 0.3)}
        opacity={isHighlighted ? 0.8 : 0.4}
        className="transition-all duration-200"
      />
    );
  }, [selectedPublication]);

  if (loading) {
    return (
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-blue-200 font-medium">Loading publications network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="text-red-400 text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-300">Error</h3>
            <p className="text-sm text-red-200 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Advanced Header and Controls */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent flex items-center">
              <span className="mr-3 text-4xl">📚</span>
              NASA Publications Network
            </h2>
            <p className="text-blue-200/70 mt-2 text-lg">
              Interactive visualization of 608 NASA Space Biology publications and their relationships
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-300">{filteredPublications.length}</div>
            <div className="text-sm text-blue-200/70 font-medium">Publications</div>
            <div className="text-xs text-blue-200/50 mt-1">
              Zoom: {(zoomLevel * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Advanced Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Filter Controls */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-blue-200">Year Filter:</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-3 py-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-white shadow-sm"
              >
                <option value="all">All Years</option>
                {stats?.years?.slice(-10).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-blue-200">Search:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search publications..."
                className="px-3 py-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-white shadow-sm flex-1 placeholder-blue-200/60"
              />
            </div>
          </div>

          {/* Layout Controls */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-slate-700">Layout:</label>
              <select
                value={layoutType}
                onChange={(e) => setLayoutType(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              >
                <option value="circular">Circular</option>
                <option value="hierarchical">Hierarchical</option>
                <option value="force">Force-Directed</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setZoomLevel(1)}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 transition-colors"
              >
                Reset Zoom
              </button>
              <button
                onClick={() => setPanOffset({ x: 0, y: 0 })}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
              >
                Center
              </button>
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded"
                />
                <span>Show Labels</span>
              </label>
            </div>
          </div>

          {/* Legend */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-blue-200">Publication Years:</div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-medium text-green-200">Recent (≤5 years)</span>
              </div>
              <div className="flex items-center space-x-2 bg-blue-500/20 px-3 py-1 rounded-full">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="font-medium text-blue-200">Moderate (6-10 years)</span>
              </div>
              <div className="flex items-center space-x-2 bg-orange-500/20 px-3 py-1 rounded-full">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="font-medium text-orange-200">Older (11-20 years)</span>
              </div>
              <div className="flex items-center space-x-2 bg-red-500/20 px-3 py-1 rounded-full">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="font-medium text-red-200">Legacy (&gt;20 years)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Publications Network Visualization */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div 
          className="h-[700px] relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-900/50 via-purple-900/30 to-slate-900/50 cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          {filteredPublications.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-blue-300 text-6xl mb-4 animate-pulse">📚</div>
                <p className="text-blue-200 text-lg">No publications found matching your criteria</p>
                <p className="text-blue-200/70 text-sm mt-2">Try adjusting your filters or search terms</p>
              </div>
            </div>
          ) : (
            <div className="h-full w-full relative">
              {/* Optimized SVG-based graph visualization */}
              <svg className="w-full h-full" viewBox="0 0 1200 700">
                {/* Simplified Background */}
                <rect width="100%" height="100%" fill="transparent" />
                
                {/* Render links first (behind nodes) */}
                {filteredLinks.map((link, index) => {
                  const sourceIndex = filteredPublications.findIndex(n => n.id === link.source);
                  const targetIndex = filteredPublications.findIndex(n => n.id === link.target);
                  if (sourceIndex === -1 || targetIndex === -1) return null;
                  
                  const sourcePos = getNodePosition(filteredPublications[sourceIndex], sourceIndex, filteredPublications.length);
                  const targetPos = getNodePosition(filteredPublications[targetIndex], targetIndex, filteredPublications.length);

                  return (
                    <LinkComponent
                      key={`${link.source}-${link.target}`}
                      link={link}
                      sourcePos={sourcePos}
                      targetPos={targetPos}
                    />
                  );
                })}

                {/* Render nodes */}
                {filteredPublications.map((node, index) => (
                  <NodeComponent
                    key={node.id}
                    node={node}
                    index={index}
                    total={filteredPublications.length}
                  />
                ))}
                
                {/* Center title */}
                <g>
                  <text
                    x="600"
                    y="350"
                    textAnchor="middle"
                    fontSize="20"
                    fill="#FFFFFF"
                    fontWeight="600"
                  >
                    NASA Publications Network
                  </text>
                  <text
                    x="600"
                    y="375"
                    textAnchor="middle"
                    fontSize="14"
                    fill="#A5B4FC"
                    fontWeight="500"
                  >
                    Space Biology Research Timeline
                  </text>
                  <text
                    x="600"
                    y="395"
                    textAnchor="middle"
                    fontSize="12"
                    fill="#94A3B8"
                  >
                    {filteredPublications.length} publications • {filteredLinks.length} connections
                  </text>
                </g>
              </svg>
            </div>
          )}
        </div>

        {/* Publication Details Panel */}
        {selectedPublication && (
          <div className="mt-6 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <span className="mr-3">📄</span>
                  {selectedPublication.title}
                </h3>
                <p className="text-blue-200/70 text-lg">Publication ID: {selectedPublication.id}</p>
                <p className="text-purple-300 text-lg">Year: {selectedPublication.year}</p>
              </div>
              <button
                onClick={() => setSelectedPublication(null)}
                className="text-blue-200/70 hover:text-white text-2xl font-bold p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Publication Content */}
            <div className="space-y-6">
              <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <h4 className="text-lg font-bold text-white mb-3">Publication Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-blue-200 font-medium">Document ID:</span>
                    <p className="text-white">{selectedPublication.id}</p>
                  </div>
                  <div>
                    <span className="text-blue-200 font-medium">Publication Year:</span>
                    <p className="text-white">{selectedPublication.year}</p>
                  </div>
                  <div>
                    <span className="text-blue-200 font-medium">Type:</span>
                    <p className="text-white capitalize">{selectedPublication.type}</p>
                  </div>
                  <div>
                    <span className="text-blue-200 font-medium">Status:</span>
                    <p className="text-green-300">Available</p>
                  </div>
                </div>
              </div>

              {/* Related Publications */}
              <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                <h4 className="text-lg font-bold text-white mb-3">Related Publications</h4>
                <div className="space-y-2">
                  {filteredLinks
                    .filter(link => link.source === selectedPublication.id || link.target === selectedPublication.id)
                    .slice(0, 5)
                    .map((link, index) => {
                      const relatedId = link.source === selectedPublication.id ? link.target : link.source;
                      const relatedPub = filteredPublications.find(p => p.id === relatedId);
                      if (!relatedPub) return null;

                      return (
                        <div
                          key={index}
                          className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={() => setSelectedPublication(relatedPub)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-white font-medium">{relatedPub.title}</span>
                              <span className="text-blue-200/70 text-sm ml-2">({relatedPub.year})</span>
                            </div>
                            <span className="text-purple-300 text-sm bg-purple-500/20 px-2 py-1 rounded-full">
                              Weight: {link.weight}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                {selectedPublication.url && (
                  <a
                    href={selectedPublication.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-purple-500/25"
                  >
                    🔗 View Publication
                  </a>
                )}
                <button
                  onClick={() => {
                    // Simulate search for this publication
                    setSearchTerm(selectedPublication.title);
                  }}
                  className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors border border-blue-500/30"
                >
                  🔍 Search Related
                </button>
                <button
                  onClick={() => setSelectedPublication(null)}
                  className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-500/30 transition-colors border border-gray-500/30"
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-blue-200">🎯 Interactive Controls:</div>
            <div className="text-sm text-blue-200/70 space-y-1">
              <div>• <span className="font-medium text-blue-200">Click & Drag:</span> Pan around the network</div>
              <div>• <span className="font-medium text-blue-200">Mouse Wheel:</span> Zoom in/out</div>
              <div>• <span className="font-medium text-blue-200">Click Publications:</span> View details below</div>
              <div>• <span className="font-medium text-blue-200">Hover:</span> Highlight connections</div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold text-blue-200">⚡ Quick Actions:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setLayoutType('circular')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  layoutType === 'circular' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Circular
              </button>
              <button
                onClick={() => setLayoutType('hierarchical')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  layoutType === 'hierarchical' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Hierarchical
              </button>
              <button
                onClick={() => setLayoutType('force')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  layoutType === 'force' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Force-Directed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Panel */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
          <span className="mr-3">📊</span>
          Publication Statistics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-purple-300 mb-2">{stats?.total || 0}</div>
            <div className="text-blue-200 font-medium">Total Publications</div>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-green-300 mb-2">{stats?.recentPublications || 0}</div>
            <div className="text-blue-200 font-medium">Recent (2020+)</div>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-blue-300 mb-2">{filteredLinks.length}</div>
            <div className="text-blue-200 font-medium">Connections</div>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-orange-300 mb-2">{stats?.years?.length || 0}</div>
            <div className="text-blue-200 font-medium">Years Covered</div>
          </div>
        </div>

        {/* Year Distribution */}
        {stats?.topYears && Object.keys(stats.topYears).length > 0 && (
          <div className="mt-6 bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4">
            <h4 className="text-lg font-bold text-white mb-3">Publications by Year</h4>
            <div className="space-y-2">
              {Object.entries(stats.topYears)
                .sort(([a], [b]) => parseInt(b) - parseInt(a))
                .slice(0, 10)
                .map(([year, count]) => (
                  <div key={year} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                    <span className="text-white font-medium">{year}</span>
                    <span className="text-purple-300 font-bold">{count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/data/stats.json')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load insights');
    setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-blue-200 font-medium">Loading insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-12">
        <div className="text-center">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <p className="text-red-300 text-lg font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-12">
        <div className="text-center">
          <div className="text-blue-300 text-6xl mb-4">📊</div>
          <p className="text-blue-200 text-lg font-medium">No insights available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-8">
        <h2 className="text-2xl font-bold text-white mb-8 flex items-center">
          <span className="mr-3">📊</span>
          Dataset Insights
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-6 text-center">
            <div className="text-4xl font-bold text-purple-300 mb-2">{stats.total_docs || 0}</div>
            <div className="text-blue-200 font-medium">Documents</div>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-6 text-center">
            <div className="text-4xl font-bold text-green-300 mb-2">{stats.total_chunks || 0}</div>
            <div className="text-blue-200 font-medium">Text Chunks</div>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-6 text-center">
            <div className="text-4xl font-bold text-blue-300 mb-2">{stats.year_range?.min || 'N/A'} - {stats.year_range?.max || 'N/A'}</div>
            <div className="text-blue-200 font-medium">Year Range</div>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-6 text-center">
            <div className="text-4xl font-bold text-orange-300 mb-2">{stats.avg_chunk_size || 0}</div>
            <div className="text-blue-200 font-medium">Avg Chunk Size</div>
          </div>
        </div>

        {stats.top_keywords && stats.top_keywords.length > 0 && (
          <div className="mt-8 bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Top Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {stats.top_keywords.slice(0, 20).map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  const [activeTab, setActiveTab] = useState(TABS.SEARCH);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Space Galaxy Background */}
      <div className="fixed inset-0 z-0">
        {/* Base Galaxy Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {/* Animated Stars */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
          <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '2.5s' }}></div>
          <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}></div>
          <div className="absolute bottom-1/3 right-1/2 w-2 h-2 bg-blue-100 rounded-full animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '2s' }}></div>
          <div className="absolute top-3/4 left-1/2 w-1 h-1 bg-purple-100 rounded-full animate-pulse" style={{ animationDelay: '2.5s', animationDuration: '4.5s' }}></div>
          <div className="absolute top-1/6 right-1/6 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '3s', animationDuration: '3s' }}></div>
          <div className="absolute bottom-1/6 left-1/6 w-1 h-1 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '2.8s' }}></div>
        </div>
        
        {/* Nebula Effects */}
        <div className="absolute inset-0 opacity-25">
          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-purple-500/30 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-blue-500/30 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-gradient-radial from-indigo-500/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        {/* Shooting Stars */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-0 w-1 h-1 bg-white rounded-full animate-ping opacity-60" style={{ animationDelay: '5s', animationDuration: '1s' }}></div>
          <div className="absolute top-1/3 right-0 w-1 h-1 bg-blue-200 rounded-full animate-ping opacity-40" style={{ animationDelay: '8s', animationDuration: '1.5s' }}></div>
          <div className="absolute bottom-1/4 left-0 w-1 h-1 bg-purple-200 rounded-full animate-ping opacity-50" style={{ animationDelay: '12s', animationDuration: '2s' }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-8">
              <div className="mb-6 sm:mb-0">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-2">
                  🚀 Gen-Aistro
                </h1>
                <p className="text-lg bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                  NASA Space Biology Knowledge Engine
                </p>
              </div>
              
              {/* Tabs */}
              <div className="flex space-x-1 bg-black/30 backdrop-blur-sm rounded-lg p-1 border border-white/10">
                {Object.entries(TABS).map(([key, value]) => (
                  <button
                    key={value}
                    onClick={() => setActiveTab(value)}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                      activeTab === value
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25'
                        : 'text-blue-200/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {key === 'SEARCH' && '🔍 Search'}
                    {key === 'GRAPH' && '📚 Publications'}
                    {key === 'INSIGHTS' && '📊 Insights'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === TABS.SEARCH && <SearchTab />}
            {activeTab === TABS.GRAPH && <GraphTab />}
            {activeTab === TABS.INSIGHTS && <InsightsTab />}
          </div>
    </main>

        {/* Footer */}
        <footer className="bg-black/20 backdrop-blur-md border-t border-white/10 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-blue-200/70 text-sm">
              <p className="bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                Powered by Groq Llama3-8B • Built with Next.js • NASA Space Biology Research
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
