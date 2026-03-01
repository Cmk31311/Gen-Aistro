'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import useDebounce from '../../hooks/useDebounce';

export default function SearchAutocomplete({ value, onChange, inputRef, onSubmit }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [terms, setTerms] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedValue = useDebounce(value, 200);
  const wrapperRef = useRef(null);

  // Load suggestion terms from stats and graph
  useEffect(() => {
    Promise.all([
      fetch('/data/stats.json').then(r => r.json()).catch(() => null),
      fetch('/api/graph').then(r => r.json()).catch(() => null)
    ]).then(([stats, graph]) => {
      const allTerms = new Set();
      if (stats?.top_keywords) {
        stats.top_keywords.forEach(k => allTerms.add(k.term));
      }
      if (graph?.nodes) {
        graph.nodes.forEach(n => allTerms.add(n.id));
      }
      setTerms(Array.from(allTerms));
    });
  }, []);

  // Filter suggestions
  const filtered = useMemo(() => {
    if (!debouncedValue || debouncedValue.length < 2) return [];
    const lower = debouncedValue.toLowerCase();
    return terms.filter(t => t.toLowerCase().includes(lower)).slice(0, 8);
  }, [debouncedValue, terms]);

  useEffect(() => {
    setSuggestions(filtered);
    setSelectedIndex(-1);
  }, [filtered]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const words = value.split(' ');
      words[words.length - 1] = suggestions[selectedIndex];
      onChange(words.join(' '));
      setShowSuggestions(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about NASA Space Biology research..."
        className="w-full px-4 py-3 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        rows={3}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-slate-900/95 backdrop-blur-md rounded-lg border border-white/20 shadow-xl overflow-hidden">
          {suggestions.map((term, i) => (
            <button
              key={term}
              className={`w-full px-4 py-2 text-left text-sm transition-colors ${
                i === selectedIndex ? 'bg-purple-500/30 text-white' : 'text-blue-200 hover:bg-white/10'
              }`}
              onClick={() => {
                const words = value.split(' ');
                words[words.length - 1] = term;
                onChange(words.join(' '));
                setShowSuggestions(false);
              }}
            >
              <span className="text-purple-300 mr-2">{'\uD83D\uDD0D'}</span>
              {term}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
