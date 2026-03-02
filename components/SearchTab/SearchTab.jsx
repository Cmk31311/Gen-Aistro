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
import ChatPanel from './ChatPanel';
import ErrorState from '../../ui/ErrorState';
import { SearchIcon, StarIcon, CopyIcon, ShareIcon, ExportIcon, ChevronDownIcon, ChevronUpIcon, SettingsIcon, SparklesIcon, ChatIcon } from '../../ui/Icons';

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
  const [showChat, setShowChat] = useState(false);
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
    setShowChat(false);
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
      <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card">
        <div className="flex items-center space-x-2 mb-1">
          <SparklesIcon size={20} className="text-accent" />
          <h2 className="text-xl font-bold text-gradient-gold tracking-tight">Search</h2>
        </div>
        <p className="text-content-3 text-sm mb-6">Ask questions about NASA Space Biology research</p>

        <div className="space-y-5">
          <SearchAutocomplete value={query} onChange={setQuery} inputRef={searchInputRef} onSubmit={handleSearch} />

          {/* Recent searches */}
          {searchHistory.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 5).map((h, i) => (
                <button key={i} onClick={() => setQuery(h)} className="px-3 py-1.5 bg-surface-2 text-content-3 rounded-lg text-xs hover:text-content-1 hover:bg-surface-3 transition-all border border-border hover:border-border-hover">
                  {h.length > 35 ? `${h.substring(0, 35)}...` : h}
                </button>
              ))}
            </div>
          )}

          {/* Example questions — card grid */}
          {!answer && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Try these</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXAMPLE_QUESTIONS.map((q, i) => (
                  <button key={i} onClick={() => setQuery(q)} className="text-left px-4 py-3 bg-surface-2 rounded-lg text-sm text-content-2 hover:text-accent hover:bg-surface-3 hover:border-accent/20 transition-all border border-border">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Advanced toggle */}
          <div>
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center space-x-1.5 text-xs text-content-3 hover:text-accent transition-colors font-medium">
              <SettingsIcon size={14} />
              <span>Advanced Settings</span>
              {showAdvanced ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
            </button>

            {showAdvanced && (
              <div className="mt-4 p-5 bg-surface-2/50 rounded-xl border border-border space-y-5">
                <SearchFilters filters={filters} onFiltersChange={setFilters} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.1em] text-content-3 mb-2 font-medium">Results: <span className="text-accent">{topK}</span></label>
                    <input type="range" min="3" max="10" value={topK} onChange={(e) => setTopK(parseInt(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.1em] text-content-3 mb-2 font-medium">Temperature: <span className="text-accent">{temperature}</span></label>
                    <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))} className="w-full" />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.1em] text-content-3 mb-2 font-medium">Max tokens: <span className="text-accent">{maxTokens}</span></label>
                    <input type="range" min="200" max="1000" step="100" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="w-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="w-full px-5 py-3.5 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm active:scale-[0.98] shadow-[0_2px_12px_rgba(240,192,90,0.2)] hover:shadow-[0_4px_20px_rgba(240,192,90,0.3)]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-black/20 border-t-black mr-2" />
                Searching...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <SearchIcon size={16} className="mr-2" />
                Search Research Database
              </span>
            )}
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={handleSearch} />}

      {/* Answer */}
      {answer && (
        <div className="bg-surface-1 rounded-xl border border-border border-l-4 border-l-accent/50 p-7 animate-slide-up shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_24px_rgba(240,192,90,0.1)]">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-content-1 tracking-tight">Answer</h3>
            <div className="flex items-center space-x-1">
              <button onClick={() => addSearchBookmark(query, answer)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Save">
                <StarIcon size={16} />
              </button>
              <button onClick={() => setShowCitation(!showCitation)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Citations">
                <CopyIcon size={16} />
              </button>
              <button onClick={shareResults} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Share">
                <ShareIcon size={16} />
              </button>
              <button onClick={() => exportSearchResults(query, answer, sources)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Export">
                <ExportIcon size={16} />
              </button>
              <button onClick={() => setShowChat(true)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Follow-up Chat">
                <ChatIcon size={16} />
              </button>
            </div>
          </div>
          <div className="text-content-2 text-sm leading-relaxed whitespace-pre-wrap">{answer}</div>

          {metadata && (
            <div className="mt-5 pt-4 border-t border-border flex flex-wrap gap-2">
              <span className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-md text-xs border border-border font-medium">{metadata.model}</span>
              <span className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-md text-xs border border-border font-medium">{metadata.chunks_used} sources</span>
              <span className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-md text-xs border border-border font-medium">{metadata.used_web_search ? 'Web-augmented' : 'Corpus only'}</span>
            </div>
          )}
        </div>
      )}

      {showCitation && sources.length > 0 && <CitationPanel sources={sources} />}

      {/* Sources */}
      {sources.length > 0 && (
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-4 font-medium">Sources ({sources.length})</h3>
          <div className="space-y-3">
            {sources.map((source, index) => (
              <SourceCard key={index} source={source} index={index} />
            ))}
          </div>
        </div>
      )}

      <ChatPanel
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        initialQuery={query}
        initialAnswer={answer}
        chunks={sources}
      />
    </div>
  );
}
