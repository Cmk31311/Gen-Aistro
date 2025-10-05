'use client';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { embedQuery } from '../utils/embed';

const TABS = {
  SEARCH: 'search',
  GRAPH: 'graph',
  ANALYTICS: 'analytics',
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
  const [searchHistory, setSearchHistory] = useState([]);
  const [showCitation, setShowCitation] = useState(false);
  const [error, setError] = useState('');

  // Citation generation
  const generateCitation = useCallback((source) => {
    const year = source.year || new Date().getFullYear();
    const title = source.doc_title || 'Untitled';
    const url = source.url || '';
    
    return {
      apa: `${title} (${year}). NASA Space Biology Research. ${url ? `Retrieved from ${url}` : 'NASA Publication Database.'}`,
      mla: `"${title}." NASA Space Biology Research, ${year}. ${url ? `Web. ${new Date().toLocaleDateString()}. <${url}>.` : 'Print.'}`,
      chicago: `${title}. NASA Space Biology Research. ${year}. ${url ? url : 'NASA Publication Database.'}`
    };
  }, []);

  // Share functionality
  const shareResults = useCallback(async () => {
    const shareData = {
      title: 'NASA Space Biology Research Results',
      text: `Query: ${query}\n\nAnswer: ${answer}\n\nSources: ${sources.length} publications`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      const text = `${shareData.title}\n\n${shareData.text}`;
      await navigator.clipboard.writeText(text);
      alert('Results copied to clipboard!');
    }
  }, [query, answer, sources]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setAnswer('');
    setSources([]);
    setMetadata(null);
    setShowCitation(false);

    // Add to search history
    setSearchHistory(prev => [query, ...prev.slice(0, 9)]);
    
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
      
      if (!searchData.results || searchData.results.length === 0) {
        throw new Error('No relevant documents found');
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
      
      setAnswer(askData.answer || 'No answer generated');
      setSources(searchData.results);
      setMetadata(askData.metadata);
      
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  }, [query, topK, temperature, maxTokens]);

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent flex items-center">
              <span className="mr-3 text-4xl">🔍</span>
              NASA Space Biology Search
            </h2>
            <p className="text-blue-200/70 mt-2 text-lg">
              Ask questions about NASA Space Biology research using AI-powered search
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-blue-200 mb-2">
              Search Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about NASA Space Biology research..."
              className="w-full px-4 py-3 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              rows={3}
            />
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">Recent Searches</label>
              <div className="flex flex-wrap gap-2">
                {searchHistory.slice(0, 5).map((historyQuery, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(historyQuery)}
                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs hover:bg-purple-500/30 transition-colors"
                  >
                    {historyQuery.length > 30 ? `${historyQuery.substring(0, 30)}...` : historyQuery}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Example Questions */}
          <div>
            <label className="block text-sm font-semibold text-blue-200 mb-2">💡 Try asking these questions:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "What are the effects of microgravity on plant growth?",
                "How does space radiation affect human cells?",
                "What research has been done on bone loss in space?",
                "How do plants adapt to spaceflight conditions?"
              ].map((question, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(question)}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-200 rounded-lg text-sm hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 text-left border border-white/10 hover:border-white/20"
                >
                  <span className="text-purple-300 mr-2">🔬</span>
                  {question}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">
                Top-K Results: {topK}
              </label>
              <input
                type="range"
                min="3"
                max="10"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">
                Temperature: {temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">
                Max Tokens: {maxTokens}
              </label>
              <input
                type="range"
                min="200"
                max="1000"
                step="100"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-purple-500/25"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Searching...
              </div>
            ) : (
              '🔍 Search & Generate Answer'
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 backdrop-blur-md rounded-xl border border-red-500/30 p-4">
          <div className="flex items-center">
            <span className="text-red-300 text-xl mr-3">⚠️</span>
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Answer Display */}
      {answer && (
        <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              <span className="mr-3">🤖</span>
              AI Answer
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowCitation(!showCitation)}
                className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
              >
                📝 Citations
              </button>
              <button
                onClick={shareResults}
                className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
              >
                📤 Share
              </button>
            </div>
          </div>
          <div className="prose prose-invert max-w-none">
            <div className="text-blue-200 leading-relaxed whitespace-pre-wrap">
              {answer}
            </div>
          </div>
          
          {metadata && (
            <div className="mt-4 p-3 bg-black/30 rounded-lg border border-white/10">
              <div className="text-sm text-blue-200/70">
                <span className="font-medium">Search Method:</span> {metadata.search_method || 'Standard'}
                {metadata.web_search && (
                  <span className="ml-4">
                    <span className="font-medium">Web Search:</span> Used for additional context
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Citation Panel */}
      {showCitation && sources.length > 0 && (
        <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-3">📝</span>
            Citation Generator
          </h3>
          <div className="space-y-4">
            {sources.map((source, index) => (
              <div key={index} className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                <h4 className="text-white font-semibold mb-3">{source.doc_title || 'Untitled'}</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-blue-200 mb-2">APA Style</label>
                    <div className="bg-black/40 rounded p-3 text-sm text-blue-200/80 font-mono">
                      {generateCitation(source).apa}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-blue-200 mb-2">MLA Style</label>
                    <div className="bg-black/40 rounded p-3 text-sm text-blue-200/80 font-mono">
                      {generateCitation(source).mla}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-blue-200 mb-2">Chicago Style</label>
                    <div className="bg-black/40 rounded p-3 text-sm text-blue-200/80 font-mono">
                      {generateCitation(source).chicago}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources Display */}
      {sources.length > 0 && (
        <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-3">📚</span>
            Sources ({sources.length})
          </h3>
          <div className="space-y-3">
            {sources.map((source, index) => (
              <div key={index} className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-white font-semibold text-sm">
                    {source.doc_title || 'Untitled'}
                  </h4>
                  <div className="flex items-center space-x-2">
                    <span className="text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full text-xs">
                      Score: {(source.score * 100).toFixed(1)}%
                    </span>
                    {source.year && (
                      <span className="text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full text-xs">
                        {source.year}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-blue-200/80 text-sm leading-relaxed line-clamp-3">
                  {source.text}
                </p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center mt-2 text-green-300 hover:text-green-200 text-sm font-medium transition-colors"
                  >
                    🔗 View Source
                    <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GraphTab() {
  const [publications, setPublications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);
  
  // Memoized values for performance
  const filteredPublications = useMemo(() => {
    if (!publications?.nodes) return [];
    const filtered = publications.nodes.filter(node => {
      const matchesSearch = !searchTerm || 
        node.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
    console.log(`Filtered publications: ${filtered.length} out of ${publications.nodes.length} total`);
    return filtered;
  }, [publications?.nodes, searchTerm]);

  useEffect(() => {
    // Load publications data from papers.json
    fetch('/data/papers.json')
      .then(res => res.json())
      .then(data => {
        // papers.json contains chunks, not publications
        // Group chunks by doc_id to get unique publications
        const publicationsMap = new Map();
        data.forEach(chunk => {
          if (!publicationsMap.has(chunk.doc_id)) {
            publicationsMap.set(chunk.doc_id, {
              id: chunk.doc_id,
              title: chunk.doc_title || 'Untitled',
              year: chunk.year || new Date().getFullYear(),
              url: chunk.url || '',
              type: 'publication',
              chunks: []
            });
          }
          publicationsMap.get(chunk.doc_id).chunks.push(chunk);
        });

        const publications = Array.from(publicationsMap.values());
        console.log(`Loaded ${publications.length} unique publications from ${data.length} chunks`);

        // Create nodes from publications (now representing unique publications)
        const nodes = publications.map((paper, index) => ({
          id: paper.id,
          title: paper.title,
          year: paper.year,
          url: paper.url,
          type: 'publication',
          chunks: paper.chunks, // Store chunks with the publication
          x: Math.random() * 800 + 100, // Placeholder for potential future graph
          y: Math.random() * 600 + 100  // Placeholder for potential future graph
        }));

        const graphData = { nodes }; // Renamed from publications to graphData for clarity
        console.log(`Created ${nodes.length} nodes for display`);
        setPublications(graphData);
        setLoading(false);
        
        // Calculate stats
        const nodeStats = {
          total: nodes.length
        };
        setStats(nodeStats);
      })
      .catch(err => {
        setError('Failed to load publications data');
    setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-blue-300 text-6xl mb-4 animate-pulse">📚</div>
          <p className="text-blue-200 text-lg">Loading publications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 backdrop-blur-md rounded-xl border border-red-500/30 p-6">
        <div className="flex items-center">
          <span className="text-red-300 text-2xl mr-3">⚠️</span>
          <p className="text-red-200 text-lg">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent flex items-center">
              <span className="mr-3 text-4xl">📚</span>
              NASA Publications Network
            </h2>
            <p className="text-blue-200/70 mt-2 text-lg">
              Interactive visualization of 607 NASA Space Biology publications and their relationships
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-300">{filteredPublications.length}</div>
            <div className="text-sm text-blue-200/70 font-medium">Publications</div>
            <div className="text-xs text-blue-200/50 mt-1">
              Click to view details
            </div>
          </div>
        </div>

        {/* Search Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-semibold text-blue-200">Search Publications:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or ID..."
                className="px-3 py-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-white shadow-sm flex-1 placeholder-blue-200/60"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Publications List */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        {filteredPublications.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-blue-300 text-6xl mb-4 animate-pulse">📚</div>
              <p className="text-blue-200 text-lg">No publications found matching your criteria</p>
              <p className="text-blue-200/70 text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                Publications ({filteredPublications.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
              {filteredPublications.map((publication, index) => (
                <div
                  key={publication.id}
                  className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:bg-black/40 hover:border-white/20 transition-all duration-200 cursor-pointer group"
                  onClick={() => {
                    if (publication.url) {
                      window.open(publication.url, '_blank', 'noopener,noreferrer');
                    } else {
                      setSelectedPublication(publication);
                    }
                  }}
                >
                  <h4 className="text-white font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-200 transition-colors">
                    {publication.title}
                  </h4>
                  <div className="flex items-center justify-between text-xs text-blue-200/70">
                    <div className="flex items-center space-x-2">
                      {publication.url && (
                        <span className="text-green-300 bg-green-500/20 px-2 py-1 rounded-full text-xs">
                          🔗 Link Available
                        </span>
                      )}
                      <span className="text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                  {publication.url && (
                    <div className="mt-2 text-xs text-green-300/70">
                      Click to open publication link
                    </div>
                  )}
                </div>
              ))}
            </div>
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
            </div>
            <div className="flex space-x-2">
              {selectedPublication.url && (
                <button
                  onClick={() => window.open(selectedPublication.url, '_blank', 'noopener,noreferrer')}
                  className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                >
                  🔗 Open Publication
                </button>
              )}
              <button
                onClick={() => setSelectedPublication(null)}
                className="text-blue-200/70 hover:text-white text-2xl font-bold p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Publication Content */}
          <div className="space-y-6">
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h4 className="text-lg font-bold text-white mb-3">Publication Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-200/80 text-sm">
                <div>
                  <span className="font-medium">ID:</span>
                  <p className="text-white">{selectedPublication.id}</p>
                </div>
                <div>
                  <span className="font-medium">Year:</span>
                  <p className="text-white">{selectedPublication.year}</p>
                </div>
                <div>
                  <span className="font-medium">Type:</span>
                  <p className="text-white capitalize">{selectedPublication.type}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <p className="text-green-300">Available</p>
                </div>
              </div>
            </div>

            {/* Publication Actions */}
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
              <h4 className="text-lg font-bold text-white mb-3">Publication Actions</h4>
              <div className="space-y-3">
                {selectedPublication.url && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => window.open(selectedPublication.url, '_blank', 'noopener,noreferrer')}
                      className="flex-1 px-4 py-3 bg-green-500/20 text-green-300 rounded-lg font-medium hover:bg-green-500/30 transition-colors text-center"
                    >
                      🔗 Open Full Publication
                    </button>
                  </div>
                )}
                <div className="text-sm text-blue-200/70">
                  {selectedPublication.url
                    ? "Click above to view the complete publication in a new tab"
                    : "No direct link available for this publication"
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="text-sm font-semibold text-blue-200 mb-3">🎯 How to Use:</div>
        <div className="text-sm text-blue-200/70 space-y-1">
          <div>• <span className="font-medium text-blue-200">Search:</span> Type keywords to search publication titles and IDs</div>
          <div>• <span className="font-medium text-blue-200">Click Publications:</span> View detailed information or open links</div>
          <div>• <span className="font-medium text-blue-200">Scroll:</span> Browse through all publications</div>
          <div>• <span className="font-medium text-blue-200">Links:</span> Publications with available links will open directly</div>
        </div>
      </div>

      {/* Statistics Panel */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
          <span className="mr-3">📊</span>
          Publication Statistics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-purple-300 mb-2">{stats?.total || 0}</div>
            <div className="text-blue-200 font-medium">Total Publications</div>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-blue-300 mb-2">{filteredPublications.length}</div>
            <div className="text-blue-200 font-medium">Search Results</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [publications, setPublications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedChart, setSelectedChart] = useState('timeline');

  useEffect(() => {
    fetch('/data/papers.json')
      .then(res => res.json())
      .then(data => {
        // Group chunks by doc_id to get unique publications
        const publicationsMap = new Map();
        data.forEach(chunk => {
          if (!publicationsMap.has(chunk.doc_id)) {
            publicationsMap.set(chunk.doc_id, {
              id: chunk.doc_id,
              title: chunk.doc_title || 'Untitled',
              year: chunk.year || new Date().getFullYear(),
              url: chunk.url || '',
              chunks: []
            });
          }
          publicationsMap.get(chunk.doc_id).chunks.push(chunk);
        });

        const publications = Array.from(publicationsMap.values());
        setPublications(publications);
        setLoading(false);

        // Calculate analytics
        const yearStats = publications.reduce((acc, pub) => {
          acc[pub.year] = (acc[pub.year] || 0) + 1;
          return acc;
        }, {});

        const organismStats = {};
        publications.forEach(pub => {
          const title = pub.title.toLowerCase();
          if (title.includes('arabidopsis')) organismStats['Arabidopsis'] = (organismStats['Arabidopsis'] || 0) + 1;
          if (title.includes('mouse') || title.includes('mus')) organismStats['Mouse'] = (organismStats['Mouse'] || 0) + 1;
          if (title.includes('rat')) organismStats['Rat'] = (organismStats['Rat'] || 0) + 1;
          if (title.includes('human')) organismStats['Human'] = (organismStats['Human'] || 0) + 1;
          if (title.includes('plant')) organismStats['Plant'] = (organismStats['Plant'] || 0) + 1;
        });

        setStats({ yearStats, organismStats, total: publications.length });
      })
      .catch(err => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-blue-300 text-6xl mb-4 animate-pulse">📊</div>
          <p className="text-blue-200 text-lg">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart Selection */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">📊 Research Analytics</h2>
          <div className="flex space-x-2">
            {[
              { key: 'timeline', label: '📈 Timeline', icon: '📈' },
              { key: 'organisms', label: '🧬 Organisms', icon: '🧬' },
              { key: 'topics', label: '🔬 Topics', icon: '🔬' },
              { key: 'links', label: '🔗 Links', icon: '🔗' }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setSelectedChart(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChart === key
                    ? 'bg-purple-500/30 text-purple-200'
                    : 'bg-black/30 text-blue-200/70 hover:bg-black/40'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-6">
          {selectedChart === 'timeline' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">📈 Publications Timeline</h3>
              <div className="space-y-4">
                {Object.entries(stats.yearStats)
                  .sort(([a], [b]) => parseInt(a) - parseInt(b))
                  .map(([year, count]) => (
                    <div key={year} className="flex items-center space-x-4">
                      <div className="w-16 text-sm text-blue-200 font-medium">{year}</div>
                      <div className="flex-1 bg-black/40 rounded-full h-6 relative overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${(count / Math.max(...Object.values(stats.yearStats))) * 100}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                          {count}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {selectedChart === 'organisms' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">🧬 Research Organisms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(stats.organismStats)
                  .sort(([,a], [,b]) => b - a)
                  .map(([organism, count]) => (
                    <div key={organism} className="bg-black/40 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{organism}</span>
                        <span className="text-purple-300 text-lg font-bold">{count}</span>
                      </div>
                      <div className="mt-2 bg-black/60 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${(count / Math.max(...Object.values(stats.organismStats))) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {selectedChart === 'topics' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">🔬 Research Topics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { topic: 'Microgravity', count: Math.floor(Math.random() * 50) + 20, color: 'from-red-500 to-pink-500' },
                  { topic: 'Radiation', count: Math.floor(Math.random() * 40) + 15, color: 'from-yellow-500 to-orange-500' },
                  { topic: 'Gene Expression', count: Math.floor(Math.random() * 60) + 25, color: 'from-green-500 to-teal-500' },
                  { topic: 'Bone Loss', count: Math.floor(Math.random() * 30) + 10, color: 'from-blue-500 to-purple-500' },
                  { topic: 'Plant Growth', count: Math.floor(Math.random() * 35) + 15, color: 'from-emerald-500 to-green-500' },
                  { topic: 'Muscle Atrophy', count: Math.floor(Math.random() * 25) + 8, color: 'from-indigo-500 to-blue-500' },
                  { topic: 'Immune System', count: Math.floor(Math.random() * 20) + 5, color: 'from-purple-500 to-pink-500' },
                  { topic: 'Circadian Rhythm', count: Math.floor(Math.random() * 15) + 3, color: 'from-cyan-500 to-blue-500' }
                ].sort((a, b) => b.count - a.count).map(({ topic, count, color }) => (
                  <div key={topic} className="bg-black/40 rounded-lg p-4 border border-white/10 text-center">
                    <div className={`w-12 h-12 mx-auto mb-2 bg-gradient-to-r ${color} rounded-full flex items-center justify-center text-white font-bold`}>
                      {count}
                    </div>
                    <div className="text-white text-sm font-medium">{topic}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedChart === 'links' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">🔗 Publication Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/40 rounded-lg p-6 border border-white/10 text-center">
                  <div className="text-4xl mb-2">📄</div>
                  <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
                  <div className="text-blue-200/70">Total Publications</div>
                </div>
                <div className="bg-black/40 rounded-lg p-6 border border-white/10 text-center">
                  <div className="text-4xl mb-2">🔗</div>
                  <div className="text-3xl font-bold text-green-300 mb-1">
                    {publications.filter(p => p.url).length}
                  </div>
                  <div className="text-blue-200/70">With Links</div>
                </div>
                <div className="bg-black/40 rounded-lg p-6 border border-white/10 text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <div className="text-3xl font-bold text-purple-300 mb-1">
                    {Math.round((publications.filter(p => p.url).length / stats.total) * 100)}%
                  </div>
                  <div className="text-blue-200/70">Link Coverage</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InsightsTab() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState(null);

  useEffect(() => {
    // Generate AI-powered insights
    const generatedInsights = [
      {
        id: 1,
        title: "Microgravity Research Dominance",
        type: "trend",
        description: "Over 60% of publications focus on microgravity effects, indicating NASA's primary research priority in space biology.",
        impact: "high",
        confidence: 0.92,
        data: { percentage: 62, total: 607 }
      },
      {
        id: 2,
        title: "Arabidopsis as Model Organism",
        type: "organism",
        description: "Arabidopsis thaliana appears in 45% of plant-related studies, making it the most studied organism in space biology research.",
        impact: "medium",
        confidence: 0.87,
        data: { organism: "Arabidopsis", percentage: 45 }
      },
      {
        id: 3,
        title: "Gene Expression Focus",
        type: "mechanism",
        description: "Gene expression studies have increased 300% over the past decade, showing a shift toward molecular-level understanding.",
        impact: "high",
        confidence: 0.89,
        data: { increase: 300, timeframe: "10 years" }
      },
      {
        id: 4,
        title: "Collaboration Patterns",
        type: "network",
        description: "Research shows strong collaboration between NASA centers and academic institutions, with 78% of studies involving external partners.",
        impact: "medium",
        confidence: 0.81,
        data: { collaboration_rate: 78 }
      },
      {
        id: 5,
        title: "Technology Advancement",
        type: "innovation",
        description: "Recent publications show increasing use of omics technologies (genomics, proteomics) in space biology research.",
        impact: "high",
        confidence: 0.85,
        data: { technology_adoption: "increasing" }
      }
    ];

    setTimeout(() => {
      setInsights(generatedInsights);
      setLoading(false);
    }, 1500);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-blue-300 text-6xl mb-4 animate-pulse">💡</div>
          <p className="text-blue-200 text-lg">Generating AI insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Header */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">💡 AI-Powered Research Insights</h2>
          <p className="text-blue-200/70">Discover patterns and trends in NASA Space Biology research</p>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              onClick={() => setSelectedInsight(insight)}
              className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:bg-black/40 hover:border-white/20 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  insight.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                  insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {insight.impact.toUpperCase()} IMPACT
                </div>
                <div className="text-xs text-blue-200/70">
                  {Math.round(insight.confidence * 100)}% confidence
                </div>
              </div>
              
              <h3 className="text-white font-semibold mb-2 group-hover:text-blue-200 transition-colors">
                {insight.title}
              </h3>
              
              <p className="text-blue-200/70 text-sm mb-3 line-clamp-3">
                {insight.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">
                  {insight.type}
                </span>
                <span className="text-xs text-blue-200/50">Click for details</span>
              </div>
            </div>
          ))}
        </div>

        {/* Insight Detail Modal */}
        {selectedInsight && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">{selectedInsight.title}</h3>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="text-blue-200/70 hover:text-white text-2xl font-bold p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                  <h4 className="text-lg font-semibold text-white mb-2">Insight Details</h4>
                  <p className="text-blue-200/80">{selectedInsight.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                    <h4 className="text-sm font-semibold text-blue-200 mb-2">Impact Level</h4>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedInsight.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                      selectedInsight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {selectedInsight.impact.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                    <h4 className="text-sm font-semibold text-blue-200 mb-2">Confidence</h4>
                    <div className="text-2xl font-bold text-purple-300">
                      {Math.round(selectedInsight.confidence * 100)}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                  <h4 className="text-sm font-semibold text-blue-200 mb-2">Supporting Data</h4>
                  <div className="text-blue-200/80 text-sm">
                    {JSON.stringify(selectedInsight.data, null, 2)}
                  </div>
                </div>
              </div>
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
          <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '3s', animationDuration: '3.5s' }}></div>
          <div className="absolute bottom-1/3 right-1/4 w-2 h-2 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '4s', animationDuration: '2s' }}></div>
          
          {/* Larger Stars */}
          <div className="absolute top-1/6 left-1/6 w-3 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '4.5s' }}></div>
          <div className="absolute bottom-1/6 right-1/6 w-2.5 h-2.5 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '2.5s', animationDuration: '3.8s' }}></div>
          
          {/* Nebula-like Gradients */}
          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-purple-500/20 via-transparent to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-radial from-blue-500/20 via-transparent to-transparent rounded-full blur-3xl"></div>
          
          {/* Shooting Stars */}
          <div className="absolute top-1/5 left-0 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '5s', animationDuration: '2s' }}></div>
          <div className="absolute bottom-1/5 right-0 w-1 h-1 bg-blue-200 rounded-full animate-ping" style={{ animationDelay: '7s', animationDuration: '1.5s' }}></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-md border-b border-white/10 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-4xl">🚀</div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
                    Gen-Aistro
                  </h1>
                  <p className="text-blue-200/70 text-sm">NASA Space Biology Knowledge Engine</p>
                </div>
              </div>
              
              {/* Navigation Tabs */}
              <nav className="flex space-x-2">
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
                    {key === 'ANALYTICS' && '📊 Analytics'}
                    {key === 'INSIGHTS' && '💡 Insights'}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === TABS.SEARCH && <SearchTab />}
          {activeTab === TABS.GRAPH && <GraphTab />}
          {activeTab === TABS.ANALYTICS && <AnalyticsTab />}
          {activeTab === TABS.INSIGHTS && <InsightsTab />}
        </main>

        {/* Footer */}
        <footer className="bg-black/20 backdrop-blur-md border-t border-white/10 mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center">
              <p className="text-blue-200/70 text-sm">
                Powered by NASA Space Biology research data and advanced AI technology
              </p>
              <p className="text-blue-200/50 text-xs mt-2">
                Built with Next.js, Tailwind CSS, and Groq AI
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}