'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { usePapers } from '../../context/PapersContext';
import { useBookmarks } from '../../context/BookmarkContext';
import { exportToCSV, exportToBibTeX } from '../../lib/exportUtils';
import { filterPublicationsByTerm } from '../../lib/paperUtils';
import { PublicationGridSkeleton } from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import PublicationCard from './PublicationCard';
import PublicationDetail from './PublicationDetail';
import KnowledgeGraph from './KnowledgeGraph';
import ComparisonView from './ComparisonView';
import { SearchIcon, ListIcon, NetworkIcon, CompareIcon, ExportIcon, CloseIcon } from '../../ui/Icons';

export default function PublicationsTab() {
  const { publications, loading, error, reload } = usePapers();
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [graphFilter, setGraphFilter] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const filteredPublications = useMemo(() => {
    let pubs = publications;
    if (graphFilter) pubs = filterPublicationsByTerm(pubs, graphFilter);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      pubs = pubs.filter(p => p.title.toLowerCase().includes(lower) || p.id.toLowerCase().includes(lower));
    }
    return pubs;
  }, [publications, searchTerm, graphFilter]);

  const handleToggleCompare = useCallback((pub) => {
    setCompareSelection(prev => {
      const exists = prev.some(p => p.id === pub.id);
      if (exists) return prev.filter(p => p.id !== pub.id);
      if (prev.length >= 3) return prev;
      return [...prev, pub];
    });
  }, []);

  if (loading) return <PublicationGridSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-medium text-zinc-100">Publications</h2>
            <p className="text-zinc-500 text-sm mt-0.5">{publications.length} NASA Space Biology publications</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-light text-zinc-100">{filteredPublications.length}</div>
            <div className="text-xs uppercase tracking-wider text-zinc-500">Showing</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or ID..."
              className="w-full pl-9 pr-3 py-2 bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
              aria-label="Search publications"
            />
          </div>
          <div className="flex gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg overflow-hidden border border-[#2a2a3a]">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm transition-colors flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-[#1a1a25] text-zinc-100' : 'bg-[#12121a] text-zinc-500 hover:text-zinc-300'}`}
              >
                <ListIcon size={14} /> List
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-2 text-sm transition-colors flex items-center gap-1.5 ${viewMode === 'graph' ? 'bg-[#1a1a25] text-zinc-100' : 'bg-[#12121a] text-zinc-500 hover:text-zinc-300'}`}
              >
                <NetworkIcon size={14} /> Graph
              </button>
            </div>

            <button
              onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); setShowComparison(false); }}
              className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-1.5 border ${
                compareMode ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' : 'bg-[#12121a] text-zinc-500 border-[#2a2a3a] hover:text-zinc-300 hover:border-[#3a3a4a]'
              }`}
            >
              <CompareIcon size={14} /> Compare
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExport(!showExport)}
                className="px-3 py-2 bg-[#12121a] text-zinc-500 border border-[#2a2a3a] rounded-lg text-sm hover:text-zinc-300 hover:border-[#3a3a4a] transition-colors flex items-center gap-1.5"
              >
                <ExportIcon size={14} /> Export
              </button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1 bg-[#12121a] rounded-lg border border-[#2a2a3a] shadow-xl shadow-black/40 z-20 min-w-[140px]">
                  <button onClick={() => { exportToCSV(filteredPublications); setShowExport(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:bg-[#1a1a25] hover:text-zinc-200 transition-colors">
                    Export as CSV
                  </button>
                  <button onClick={() => { exportToBibTeX(filteredPublications); setShowExport(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-zinc-400 hover:bg-[#1a1a25] hover:text-zinc-200 transition-colors">
                    Export as BibTeX
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Graph Filter Badge */}
        {graphFilter && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-xs text-zinc-500">Filtered by:</span>
            <span className="px-2.5 py-0.5 bg-[#1a1a25] text-zinc-300 rounded-md text-xs border border-[#2a2a3a]">{graphFilter}</span>
            <button onClick={() => setGraphFilter('')} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <CloseIcon size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Compare Bar */}
      {compareMode && compareSelection.length > 0 && (
        <div className="bg-[#12121a] rounded-xl border border-indigo-500/20 p-4 flex items-center justify-between sticky bottom-4 z-10">
          <div className="text-sm text-zinc-300">
            <span className="font-medium">{compareSelection.length} selected</span>
            <span className="text-zinc-500 ml-2">(select 2-3 to compare)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCompareSelection([])} className="px-3 py-1.5 text-zinc-500 rounded-lg text-sm hover:text-zinc-300 border border-[#2a2a3a] transition-colors">
              Clear
            </button>
            <button
              onClick={() => setShowComparison(true)}
              disabled={compareSelection.length < 2}
              className="px-4 py-1.5 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Compare
            </button>
          </div>
        </div>
      )}

      {/* Comparison View */}
      {showComparison && compareSelection.length >= 2 && (
        <ComparisonView papers={compareSelection} onClose={() => { setShowComparison(false); setCompareMode(false); setCompareSelection([]); }} />
      )}

      {/* Content */}
      {viewMode === 'graph' ? (
        <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-6">
          <KnowledgeGraph onNodeClick={(term) => { setGraphFilter(term); setViewMode('list'); }} />
        </div>
      ) : (
        <div>
          {filteredPublications.length === 0 ? (
            <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-zinc-400 text-sm">No publications found</p>
                <p className="text-zinc-600 text-xs mt-1">Try adjusting your search terms</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPublications.map((publication) => (
                <PublicationCard
                  key={publication.id}
                  publication={publication}
                  onSelect={setSelectedPublication}
                  compareMode={compareMode}
                  isCompareSelected={compareSelection.some(p => p.id === publication.id)}
                  onToggleCompare={handleToggleCompare}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Publication Details */}
      {selectedPublication && (
        <PublicationDetail publication={selectedPublication} onClose={() => setSelectedPublication(null)} />
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-5 text-center">
          <div className="text-2xl font-light text-zinc-100 mb-1">{publications.length}</div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Total</div>
        </div>
        <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-5 text-center">
          <div className="text-2xl font-light text-zinc-100 mb-1">{filteredPublications.length}</div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">Filtered</div>
        </div>
        <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-5 text-center">
          <div className="text-2xl font-light text-zinc-100 mb-1">{publications.filter(p => p.url).length}</div>
          <div className="text-xs uppercase tracking-wider text-zinc-500">With Links</div>
        </div>
      </div>
    </div>
  );
}
