'use client';
import { useState } from 'react';
import Badge from '../../ui/Badge';
import { ORGANISMS } from '../../lib/constants';

export default function SearchFilters({ filters, onFiltersChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState('');
  const [excludeInput, setExcludeInput] = useState('');

  const handleAddKeyword = (e) => {
    if (e.key === 'Enter' && keywordInput.trim()) {
      e.preventDefault();
      const term = keywordInput.trim().toLowerCase();
      if (!filters.includeKeywords.includes(term)) {
        onFiltersChange({
          ...filters,
          includeKeywords: [...filters.includeKeywords, term]
        });
      }
      setKeywordInput('');
    }
  };

  const handleAddExclude = (e) => {
    if (e.key === 'Enter' && excludeInput.trim()) {
      e.preventDefault();
      const term = excludeInput.trim().toLowerCase();
      if (!filters.excludeKeywords.includes(term)) {
        onFiltersChange({
          ...filters,
          excludeKeywords: [...filters.excludeKeywords, term]
        });
      }
      setExcludeInput('');
    }
  };

  const toggleOrganism = (org) => {
    const lower = org.toLowerCase();
    const current = filters.includeKeywords;
    if (current.includes(lower)) {
      onFiltersChange({
        ...filters,
        includeKeywords: current.filter(k => k !== lower)
      });
    } else {
      onFiltersChange({
        ...filters,
        includeKeywords: [...current, lower]
      });
    }
  };

  const clearAll = () => {
    onFiltersChange({ includeKeywords: [], excludeKeywords: [] });
  };

  const hasFilters = filters.includeKeywords.length > 0 || filters.excludeKeywords.length > 0;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-sm font-semibold text-blue-200 hover:text-white transition-colors"
        aria-expanded={isOpen}
      >
        <span className={`transform transition-transform ${isOpen ? 'rotate-90' : ''}`}>&#9654;</span>
        <span>Advanced Filters</span>
        {hasFilters && (
          <Badge variant="purple">{filters.includeKeywords.length + filters.excludeKeywords.length} active</Badge>
        )}
      </button>

      {isOpen && (
        <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 space-y-4 animate-fade-in">
          {/* Include Keywords */}
          <div>
            <label className="block text-sm font-semibold text-blue-200 mb-2">Include Keywords</label>
            <input
              type="text"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleAddKeyword}
              placeholder="Type keyword and press Enter..."
              className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-sm text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {filters.includeKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.includeKeywords.map(kw => (
                  <Badge key={kw} variant="green" removable onRemove={() =>
                    onFiltersChange({ ...filters, includeKeywords: filters.includeKeywords.filter(k => k !== kw) })
                  }>
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Exclude Keywords */}
          <div>
            <label className="block text-sm font-semibold text-blue-200 mb-2">Exclude Keywords</label>
            <input
              type="text"
              value={excludeInput}
              onChange={(e) => setExcludeInput(e.target.value)}
              onKeyDown={handleAddExclude}
              placeholder="Type keyword to exclude and press Enter..."
              className="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-lg text-sm text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {filters.excludeKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filters.excludeKeywords.map(kw => (
                  <Badge key={kw} variant="red" removable onRemove={() =>
                    onFiltersChange({ ...filters, excludeKeywords: filters.excludeKeywords.filter(k => k !== kw) })
                  }>
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Organism Filter */}
          <div>
            <label className="block text-sm font-semibold text-blue-200 mb-2">Filter by Organism</label>
            <div className="flex flex-wrap gap-2">
              {ORGANISMS.map(org => {
                const isActive = filters.includeKeywords.includes(org.toLowerCase());
                return (
                  <button
                    key={org}
                    onClick={() => toggleOrganism(org)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-green-500/30 text-green-300 border border-green-500/30'
                        : 'bg-black/30 text-blue-200/70 border border-white/10 hover:bg-black/40'
                    }`}
                  >
                    {org}
                  </button>
                );
              })}
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-sm text-red-300 hover:text-red-200 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
