'use client';
import React, { useState, useCallback, useRef } from 'react';
import { embedQuery } from '../../utils/embed';
import { EXAMPLE_QUESTIONS } from '../../lib/constants';
import { exportSearchResults, exportAsMarkdown, exportSourcesAsCSV } from '../../lib/exportUtils';
import { useBookmarks } from '../../context/BookmarkContext';
import SearchFilters from './SearchFilters';
import SourceCard from './SourceCard';
import CitationPanel from './CitationPanel';
import SearchAutocomplete from './SearchAutocomplete';
import ChatPanel from './ChatPanel';
import SessionsPanel from '../SessionsPanel';
import ErrorState from '../../ui/ErrorState';
import { useSession } from '../../context/SessionContext';
import { SearchIcon, StarIcon, CopyIcon, ShareIcon, ExportIcon, ChevronDownIcon, ChevronUpIcon, SettingsIcon, SparklesIcon, ChatIcon, ThumbsUpIcon, ThumbsDownIcon } from '../../ui/Icons';

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
  const [showSessions, setShowSessions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null); // 1, -1, or null
  const searchInputRef = useRef(null);
  const { addSearchBookmark } = useBookmarks();
  const { saveSession } = useSession();

  const handleSaveSession = useCallback(async () => {
    const name = query.length > 50 ? query.substring(0, 50) + '...' : query;
    const messages = [
      { role: 'user', content: query },
      { role: 'assistant', content: answer },
    ];
    const id = await saveSession(name, messages, null, sessionId);
    if (id) setSessionId(id);
  }, [query, answer, sessionId, saveSession]);

  const handleLoadSession = useCallback((session) => {
    const msgs = session.messages || [];
    const firstUser = msgs.find(m => m.role === 'user');
    const firstAssistant = msgs.find(m => m.role === 'assistant');
    if (firstUser) setQuery(firstUser.content);
    if (firstAssistant) setAnswer(firstAssistant.content);
    setSessionId(session.id);
  }, []);

  const submitFeedback = useCallback(async (rating) => {
    if (feedbackGiven !== null || !answer) return;
    setFeedbackGiven(rating);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, answer, sources, rating, context: 'nasa' }),
      });
    } catch {}
  }, [query, answer, sources, feedbackGiven]);

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
    setFeedbackGiven(null);
    setSessionId(null);
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

      setSources(searchData.results);

      // Consume SSE stream, rendering tokens as they arrive
      const reader = askResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullAnswer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          try {
            const event = JSON.parse(raw);
            if (event.token) {
              fullAnswer += event.token;
              setAnswer(fullAnswer);
            } else if (event.done) {
              setMetadata(event.metadata);
            }
          } catch {}
        }
      }
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
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <SparklesIcon size={20} className="text-accent" />
            <h2 className="text-xl font-bold text-gradient-gold tracking-tight">Search</h2>
          </div>
          <button
            onClick={() => setShowSessions(true)}
            className="text-xs text-content-3 hover:text-accent transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-2 border border-transparent hover:border-border"
          >
            <StarIcon size={13} /> Sessions
          </button>
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
          <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
            <h3 className="text-base font-bold text-content-1 tracking-tight pt-1">Answer</h3>
            <div className="flex flex-wrap items-center gap-1">
              <button onClick={() => addSearchBookmark(query, answer)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Bookmark">
                <StarIcon size={16} />
              </button>
              <button onClick={handleSaveSession} className={`p-2 rounded-lg transition-all text-xs font-medium ${sessionId ? 'text-accent bg-accent/10' : 'text-content-3 hover:text-accent hover:bg-surface-2'}`} title={sessionId ? 'Session saved' : 'Save session'}>
                {sessionId ? '✓ Saved' : 'Save'}
              </button>
              <button onClick={() => setShowCitation(!showCitation)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Citations">
                <CopyIcon size={16} />
              </button>
              <button onClick={shareResults} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Share">
                <ShareIcon size={16} />
              </button>
              <div className="relative">
                <button onClick={() => setShowExportMenu(v => !v)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Export">
                  <ExportIcon size={16} />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-1.5 bg-surface-1 rounded-xl border border-border shadow-xl shadow-black/50 z-20 min-w-[150px] overflow-hidden">
                    <button onClick={() => { exportSearchResults(query, answer, sources); setShowExportMenu(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-content-2 hover:bg-accent-muted hover:text-accent transition-all font-medium">TXT</button>
                    <button onClick={() => { exportAsMarkdown(query, answer, sources); setShowExportMenu(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-content-2 hover:bg-accent-muted hover:text-accent transition-all font-medium">Markdown</button>
                    <button onClick={() => { exportSourcesAsCSV(sources); setShowExportMenu(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-content-2 hover:bg-accent-muted hover:text-accent transition-all font-medium">CSV (sources)</button>
                  </div>
                )}
              </div>
              <button onClick={() => setShowChat(true)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Follow-up Chat">
                <ChatIcon size={16} />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={() => submitFeedback(1)}
                disabled={feedbackGiven !== null}
                className={`p-2 rounded-lg transition-all ${feedbackGiven === 1 ? 'text-green-400 bg-green-400/10' : 'text-content-3 hover:text-green-400 hover:bg-surface-2'} disabled:cursor-default`}
                title="Good answer"
              >
                <ThumbsUpIcon size={15} />
              </button>
              <button
                onClick={() => submitFeedback(-1)}
                disabled={feedbackGiven !== null}
                className={`p-2 rounded-lg transition-all ${feedbackGiven === -1 ? 'text-red-400 bg-red-400/10' : 'text-content-3 hover:text-red-400 hover:bg-surface-2'} disabled:cursor-default`}
                title="Poor answer"
              >
                <ThumbsDownIcon size={15} />
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

      <SessionsPanel
        isOpen={showSessions}
        onClose={() => setShowSessions(false)}
        onLoadSession={handleLoadSession}
      />
    </div>
  );
}
