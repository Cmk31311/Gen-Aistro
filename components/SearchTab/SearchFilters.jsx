'use client';
import { useState } from 'react';
import { ORGANISMS } from '../../lib/constants';
import { CloseIcon } from '../../ui/Icons';

export default function SearchFilters({ filters, onFiltersChange }) {
  const [keywordInput, setKeywordInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');

  const handleAddKeyword = (e) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      const term = keywordInput.trim().toLowerCase();
      if (!filters.includeKeywords.includes(term)) {
        onFiltersChange({ ...filters, includeKeywords: [...filters.includeKeywords, term] });
      }
      setKeywordInput('');
    }
  };

  const handleAddExclude = (e) => {
    if (e.key === 'Enter' && excludeInput.trim()) {
      e.preventDefault();
      const term = excludeInput.trim().toLowerCase();
      if (!filters.excludeKeywords.includes(term)) {
        onFiltersChange({ ...filters, excludeKeywords: [...filters.excludeKeywords, term] });
      }
      setExcludeInput('');
    }
  };

  const toggleOrganism = (org) => {
    const lower = org.toLowerCase();
    const current = filters.includeKeywords;
    if (current.includes(lower)) {
      onFiltersChange({ ...filters, includeKeywords: current.filter(k => k !== lower) });
    } else {
      onFiltersChange({ ...filters, includeKeywords: [...current, lower] });
    }
  };

  const clearAll = () => {
    onFiltersChange({ includeKeywords: [], excludeKeywords: [] });
  };

  const hasFilters = filters.includeKeywords.length > 0 || filters.excludeKeywords.length > 0;

  const removeTag = (type, keyword) => {
    onFiltersChange({
      ...filters,
      [type]: filters[type].filter(k => k !== keyword)
    });
  };

  return (
    <div className="space-y-4">
      {/* Include Keywords */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Include keywords</label>
        <input
          type="text"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={handleAddKeyword}
          placeholder="Type and press Enter..."
          className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
        />
        {filters.includeKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {filters.includeKeywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1a1a25] text-zinc-300 rounded-md text-xs border border-[#2a2a3a]">
                {kw}
                <button onClick={() => removeTag('includeKeywords', kw)} className="text-zinc-500 hover:text-zinc-300">
                  <CloseIcon size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Exclude Keywords */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Exclude keywords</label>
        <input
          type="text"
          value={excludeInput}
          onChange={(e) => setExcludeInput(e.target.value)}
          onKeyDown={handleAddExclude}
          placeholder="Type and press Enter..."
          className="w-full px-3 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
        />
        {filters.excludeKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {filters.excludeKeywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md text-xs border border-red-500/20">
                {kw}
                <button onClick={() => removeTag('excludeKeywords', kw)} className="text-red-400/60 hover:text-red-300">
                  <CloseIcon size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Organism Filter */}
      <div>
        <label className="block text-xs text-zinc-500 mb-1.5">Organisms</label>
        <div className="flex flex-wrap gap-1.5">
          {ORGANISMS.map(org => {
            const isActive = filters.includeKeywords.includes(org.toLowerCase());
            return (
              <button
                key={org}
                onClick={() => toggleOrganism(org)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors border ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                    : 'bg-[#1a1a25] text-zinc-500 border-[#2a2a3a] hover:text-zinc-300 hover:border-[#3a3a4a]'
                }`}
              >
                {org}
              </button>
            );
          })}
        </div>
      </div>

      {hasFilters && (
        <button onClick={clearAll} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Clear all filters
        </button>
      )}
    </div>
  );
}
