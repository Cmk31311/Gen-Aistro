'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import useDebounce from '../../hooks/useDebounce';
import { SearchIcon } from '../../ui/Icons';

export default function SearchAutocomplete({ value, onChange, inputRef, onSubmit }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [terms, setTerms] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debouncedValue = useDebounce(value, 200);
  const wrapperRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/stats.json').then(r => r.json()).catch(() => null),
      fetch('/api/graph').then(r => r.json()).catch(() => null)
    ]).then(([stats, graph]) => {
      const allTerms = new Set();
      if (stats?.top_keywords) stats.top_keywords.forEach(k => allTerms.add(k.term));
      if (graph?.nodes) graph.nodes.forEach(n => allTerms.add(n.id));
      setTerms(Array.from(allTerms));
    });
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedValue || debouncedValue.length < 2) return [];
    const lower = debouncedValue.toLowerCase();
    return terms.filter(t => t.toLowerCase().includes(lower)).slice(0, 8);
  }, [debouncedValue, terms]);

  useEffect(() => {
    setSuggestions(filtered);
    setSelectedIndex(-1);
  }, [filtered]);

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
      <div className="relative">
        <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => { onChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about NASA Space Biology research..."
          className="w-full pl-10 pr-4 py-3.5 bg-[#0a0a0f] border border-[#2a2a3a] rounded-xl text-zinc-200 text-base placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none transition-colors"
          rows={2}
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-30 w-full mt-1 bg-[#12121a] rounded-lg border border-[#2a2a3a] shadow-xl shadow-black/40 overflow-hidden">
          {suggestions.map((term, i) => (
            <button
              key={term}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                i === selectedIndex ? 'bg-[#1a1a25] text-zinc-100' : 'text-zinc-400 hover:bg-[#1a1a25] hover:text-zinc-200'
              }`}
              onClick={() => {
                const words = value.split(' ');
                words[words.length - 1] = term;
                onChange(words.join(' '));
                setShowSuggestions(false);
              }}
            >
              {term}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
