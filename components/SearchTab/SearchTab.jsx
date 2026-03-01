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
import { SearchIcon, StarIcon, CopyIcon, ShareIcon, ExportIcon, ChevronDownIcon, ChevronUpIcon, SettingsIcon } from '../../ui/Icons';

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
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.text}`);
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
      if (filters.includeKeywords.length > 0) filter.keywords = { ...filter.keywords, include: filters.includeKeywords };
      if (filters.excludeKeywords.length > 0) filter.keywords = { ...filter.keywords, exclude: filters.excludeKeywords };

      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryEmbedding, topK, filter })
      });
      if (!searchResponse.ok) throw new Error('Search failed');
      const searchData = await searchResponse.json();
      if (!searchData.results || searchData.results.length === 0) throw new Error('No relevant documents found');

      const askResponse = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query, chunks: searchData.results, temperature, max_tokens: maxTokens })
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
      {/* Search Input */}
      <div className="bg-surface-1 rounded-xl border border-border p-6">
        <h2 className="text-xl font-semibold text-content-1 tracking-tight mb-1">Search</h2>
        <p className="text-content-3 text-sm mb-5">Ask questions about NASA Space Biology research</p>

        <div className="space-y-4">
          <SearchAutocomplete value={query} onChange={setQuery} inputRef={searchInputRef} onSubmit={handleSearch} />

          {/* Recent searches */}
          {searchHistory.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 5).map((h, i) => (
                <button key={i} onClick={() => setQuery(h)} className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-md text-xs hover:text-content-2 hover:bg-surface-3 transition-colors border border-border">
                  {h.length > 35 ? `${h.substring(0, 35)}...` : h}
                </button>
              ))}
            </div>
          )}

          {/* Example questions */}
          {!answer && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-2">Try these</p>
              <div className="flex flex-wrap gap-x-1 gap-y-1">
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => setQuery(q)} className="text-sm text-content-3 hover:text-accent transition-colors">
                    {q}{i < EXAMPLE_QUESTIONS.length - 1 ? <span className="text-border-hover mx-1.5">&middot;</span> : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced toggle */}
          <div>
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center space-x-1.5 text-xs text-content-3 hover:text-content-2 transition-colors">
              <SettingsIcon size={14} />
              <span>Advanced</span>
              {showAdvanced ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 pt-4 border-t border-border">
                <SearchFilters filters={filters} onFiltersChange={setFilters} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.08em] text-content-3 mb-1.5">Results: {topK}</label>
                    <input type="range" min="3" max="10" value={topK} onChange={(e) => setTopK(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.08em] text-content-3 mb-1.5">Temperature: {temperature}</label>
                    <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.08em] text-content-3 mb-1.5">Max tokens: {maxTokens}</label>
                    <input type="range" min="200" max="1000" step="100" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="w-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="w-full px-5 py-3 bg-accent hover:bg-accent-hover text-black font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-black/20 border-t-black mr-2" />
                Searching...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <SearchIcon size={16} className="mr-2" />
                Search
              </span>
            )}
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={handleSearch} />}

      {/* Answer */}
      {answer && (
        <div className="bg-surface-1 rounded-xl border border-border p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-content-1 tracking-tight">Answer</h3>
            <div className="flex items-center space-x-1">
              <button onClick={() => addSearchBookmark(query, answer)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-colors" title="Save">
                <StarIcon size={16} />
              </button>
              <button onClick={() => setShowCitation(!showCitation)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-colors" title="Citations">
                <CopyIcon size={16} />
              </button>
              <button onClick={shareResults} className="p-2 rounded-lg text-content-3 hover:text-content-1 hover:bg-surface-2 transition-colors" title="Share">
                <ShareIcon size={16} />
              </button>
              <button onClick={() => exportSearchResults(query, answer, sources)} className="p-2 rounded-lg text-content-3 hover:text-content-1 hover:bg-surface-2 transition-colors" title="Export">
                <ExportIcon size={16} />
              </button>
            </div>
          </div>
          <div className="text-content-2 text-sm leading-relaxed whitespace-pre-wrap">{answer}</div>

          {metadata && (
            <div className="mt-4 pt-3 border-t border-border">
              <span className="text-xs text-content-3">
                {metadata.model} &middot; {metadata.chunks_used} sources &middot; {metadata.used_web_search ? 'Web-augmented' : 'Corpus only'}
              </span>
            </div>
          )}
        </div>
      )}

      {showCitation && sources.length > 0 && <CitationPanel sources={sources} />}

      {/* Sources */}
      {sources.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-3">Sources ({sources.length})</h3>
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
