'use client';
import React, { useState, useCallback, useRef } from 'react';
import { embedQuery } from '../../utils/embed';
import { EXAMPLE_QUESTIONS } from '../../lib/constants';
import { exportSearchResults } from '../../lib/exportUtils';
import { useBookmarks } from '../../context/BookmarkContext';
import SearchFilters from './SearchFilters';
import SourceCard from './SourceCard';
import CitationPanel from './CitationPanel';
import SearchAutocomplete from './SearchAutocomplete';
import ErrorState from '../../ui/ErrorState';

export default function SearchTab() {
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
  const [filters, setFilters] = useState({ includeKeywords: [], excludeKeywords: [] });
  const searchInputRef = useRef(null);
  const { addSearchBookmark } = useBookmarks();

  const shareResults = useCallback(async () => {
    const shareData = {
      title: 'NASA Space Biology Research Results',
      text: `Query: ${query}\n\nAnswer: ${answer}\n\nSources: ${sources.length} publications`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Share cancelled
      }
    } else {
      const text = `${shareData.title}\n\n${shareData.text}`;
      await navigator.clipboard.writeText(text);
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

    setSearchHistory(prev => [query, ...prev.filter(q => q !== query).slice(0, 9)]);

    try {
      const queryEmbedding = await embedQuery(query);

      const filter = {};
      if (filters.includeKeywords.length > 0) {
        filter.keywords = { ...filter.keywords, include: filters.includeKeywords };
      }
      if (filters.excludeKeywords.length > 0) {
        filter.keywords = { ...filter.keywords, exclude: filters.excludeKeywords };
      }

      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryEmbedding, topK, filter })
      });

      if (!searchResponse.ok) throw new Error('Search failed');
      const searchData = await searchResponse.json();

      if (!searchData.results || searchData.results.length === 0) {
        throw new Error('No relevant documents found');
      }

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

      if (!askResponse.ok) throw new Error('Answer generation failed');
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
  }, [query, topK, temperature, maxTokens, filters]);

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent flex items-center">
              <span className="mr-3 text-4xl">{'\uD83D\uDD0D'}</span>
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
            <SearchAutocomplete
              value={query}
              onChange={setQuery}
              inputRef={searchInputRef}
              onSubmit={handleSearch}
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
            <label className="block text-sm font-semibold text-blue-200 mb-2">{'\uD83D\uDCA1'} Try asking these questions:</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXAMPLE_QUESTIONS.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setQuery(question)}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-200 rounded-lg text-sm hover:from-blue-500/30 hover:to-purple-500/30 transition-all duration-200 text-left border border-white/10 hover:border-white/20"
                >
                  <span className="text-purple-300 mr-2">{'\uD83D\uDD2C'}</span>
                  {question}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Filters */}
          <SearchFilters filters={filters} onFiltersChange={setFilters} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">
                Top-K Results: {topK}
              </label>
              <input
                type="range" min="3" max="10" value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">
                Temperature: {temperature}
              </label>
              <input
                type="range" min="0" max="1" step="0.1" value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">
                Max Tokens: {maxTokens}
              </label>
              <input
                type="range" min="200" max="1000" step="100" value={maxTokens}
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
              '\uD83D\uDD0D Search & Generate Answer'
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <ErrorState message={error} onRetry={handleSearch} />
      )}

      {/* Answer Display */}
      {answer && (
        <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center">
              <span className="mr-3">{'\uD83E\uDD16'}</span>
              AI Answer
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => addSearchBookmark(query, answer)}
                className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-lg text-sm font-medium hover:bg-yellow-500/30 transition-colors"
                aria-label="Save search"
              >
                {'\u2606'} Save
              </button>
              <button
                onClick={() => setShowCitation(!showCitation)}
                className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
              >
                {'\uD83D\uDCDD'} Citations
              </button>
              <button
                onClick={shareResults}
                className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
              >
                {'\uD83D\uDCE4'} Share
              </button>
              <button
                onClick={() => exportSearchResults(query, answer, sources)}
                className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors"
              >
                {'\uD83D\uDCE5'} Export
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
        <CitationPanel sources={sources} />
      )}

      {/* Sources Display */}
      {sources.length > 0 && (
        <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <span className="mr-3">{'\uD83D\uDCDA'}</span>
            Sources ({sources.length})
          </h3>
          <div className="space-y-3">
            {sources.map((source, index) => (
              <SourceCard key={index} source={source} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
