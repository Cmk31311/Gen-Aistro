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

export default function PublicationsTab() {
  const { publications, loading, error, reload } = usePapers();
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'graph'
  const [graphFilter, setGraphFilter] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  const filteredPublications = useMemo(() => {
    let pubs = publications;
    if (graphFilter) {
      pubs = filterPublicationsByTerm(pubs, graphFilter);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      pubs = pubs.filter(p =>
        p.title.toLowerCase().includes(lower) || p.id.toLowerCase().includes(lower)
      );
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
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent flex items-center">
              <span className="mr-3 text-4xl">{'\uD83D\uDCDA'}</span>
              NASA Publications Network
            </h2>
            <p className="text-blue-200/70 mt-2 text-lg">
              Interactive visualization of {publications.length} NASA Space Biology publications
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-purple-300">{filteredPublications.length}</div>
            <div className="text-sm text-blue-200/70 font-medium">Publications</div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title or ID..."
            className="flex-1 px-3 py-2 bg-black/30 backdrop-blur-sm border border-white/20 rounded-lg text-sm text-white placeholder-blue-200/60 focus:outline-none focus:ring-2 focus:ring-purple-500"
            aria-label="Search publications"
          />
          <div className="flex gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-purple-500/30 text-purple-200' : 'bg-black/30 text-blue-200/70 hover:bg-black/40'}`}
                aria-label="List view"
              >
                {'\u2630'} List
              </button>
              <button
                onClick={() => setViewMode('graph')}
                className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'graph' ? 'bg-purple-500/30 text-purple-200' : 'bg-black/30 text-blue-200/70 hover:bg-black/40'}`}
                aria-label="Graph view"
              >
                {'\uD83C\uDF10'} Graph
              </button>
            </div>

            {/* Compare Toggle */}
            <button
              onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); setShowComparison(false); }}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${compareMode ? 'bg-purple-500/30 text-purple-200' : 'bg-black/30 text-blue-200/70 hover:bg-black/40 border border-white/10'}`}
            >
              {'\u2696\uFE0F'} Compare
            </button>

            {/* Export */}
            <div className="relative group">
              <button className="px-3 py-2 bg-black/30 text-blue-200/70 border border-white/10 rounded-lg text-sm font-medium hover:bg-black/40 transition-colors">
                {'\uD83D\uDCE5'} Export
              </button>
              <div className="absolute right-0 top-full mt-1 bg-slate-900/95 backdrop-blur-md rounded-lg border border-white/20 shadow-xl hidden group-hover:block z-20">
                <button
                  onClick={() => exportToCSV(filteredPublications)}
                  className="block w-full px-4 py-2 text-left text-sm text-blue-200 hover:bg-white/10 transition-colors"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => exportToBibTeX(filteredPublications)}
                  className="block w-full px-4 py-2 text-left text-sm text-blue-200 hover:bg-white/10 transition-colors"
                >
                  Export as BibTeX
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Graph Filter Badge */}
        {graphFilter && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-sm text-blue-200">Filtered by:</span>
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">{graphFilter}</span>
            <button
              onClick={() => setGraphFilter('')}
              className="text-red-300 hover:text-red-200 text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Compare Bar */}
      {compareMode && compareSelection.length > 0 && (
        <div className="bg-purple-500/10 backdrop-blur-md rounded-xl border border-purple-500/20 p-4 flex items-center justify-between sticky bottom-4 z-10">
          <div className="text-purple-200">
            <span className="font-medium">{compareSelection.length} papers selected</span>
            <span className="text-purple-200/70 ml-2">(select 2-3 to compare)</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setCompareSelection([]); }}
              className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
            >
              Clear
            </button>
            <button
              onClick={() => setShowComparison(true)}
              disabled={compareSelection.length < 2}
              className="px-4 py-1.5 bg-purple-500/30 text-purple-200 rounded-lg text-sm font-medium hover:bg-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Compare Now
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
        <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <KnowledgeGraph onNodeClick={(term) => { setGraphFilter(term); setViewMode('list'); }} />
        </div>
      ) : (
        <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
          {filteredPublications.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-blue-300 text-6xl mb-4">{'\uD83D\uDCDA'}</div>
                <p className="text-blue-200 text-lg">No publications found</p>
                <p className="text-blue-200/70 text-sm mt-2">Try adjusting your search terms</p>
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
                  <PublicationCard
                    key={publication.id}
                    publication={publication}
                    index={index}
                    onSelect={setSelectedPublication}
                    compareMode={compareMode}
                    isCompareSelected={compareSelection.some(p => p.id === publication.id)}
                    onToggleCompare={handleToggleCompare}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Publication Details */}
      {selectedPublication && (
        <PublicationDetail
          publication={selectedPublication}
          onClose={() => setSelectedPublication(null)}
        />
      )}

      {/* Statistics */}
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
          <span className="mr-3">{'\uD83D\uDCCA'}</span>
          Publication Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-purple-300 mb-2">{publications.length}</div>
            <div className="text-blue-200 font-medium">Total Publications</div>
          </div>
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-blue-300 mb-2">{filteredPublications.length}</div>
            <div className="text-blue-200 font-medium">Showing</div>
          </div>
          <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 text-center">
            <div className="text-3xl font-bold text-green-300 mb-2">{publications.filter(p => p.url).length}</div>
            <div className="text-blue-200 font-medium">With Links</div>
          </div>
        </div>
      </div>
    </div>
  );
}
