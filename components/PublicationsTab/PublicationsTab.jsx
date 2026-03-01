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
      <div className="bg-surface-1 rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold text-content-1 tracking-tight">Publications</h2>
            <p className="text-content-3 text-sm mt-0.5">{publications.length} NASA Space Biology publications</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-light text-content-1 tracking-tight">{filteredPublications.length}</div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-content-3">Showing</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or ID..."
              className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-lg text-sm text-content-1 placeholder-content-3 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15"
              aria-label="Search publications"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-lg overflow-hidden border border-border">
              <button onClick={() => setViewMode('list')} className={`px-3 py-2 text-sm transition-colors flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-surface-2 text-content-1' : 'text-content-3 hover:text-content-2'}`}>
                <ListIcon size={14} /> List
              </button>
              <button onClick={() => setViewMode('graph')} className={`px-3 py-2 text-sm transition-colors flex items-center gap-1.5 ${viewMode === 'graph' ? 'bg-surface-2 text-content-1' : 'text-content-3 hover:text-content-2'}`}>
                <NetworkIcon size={14} /> Graph
              </button>
            </div>

            <button
              onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); setShowComparison(false); }}
              className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-1.5 border ${
                compareMode ? 'bg-accent-muted text-accent border-accent/25' : 'text-content-3 border-border hover:text-content-2 hover:border-border-hover'
              }`}
            >
              <CompareIcon size={14} /> Compare
            </button>

            <div className="relative">
              <button onClick={() => setShowExport(!showExport)} className="px-3 py-2 text-content-3 border border-border rounded-lg text-sm hover:text-content-2 hover:border-border-hover transition-colors flex items-center gap-1.5">
                <ExportIcon size={14} /> Export
              </button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1 bg-surface-1 rounded-lg border border-border shadow-xl shadow-black/50 z-20 min-w-[140px]">
                  <button onClick={() => { exportToCSV(filteredPublications); setShowExport(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-content-2 hover:bg-surface-2 hover:text-content-1 transition-colors">CSV</button>
                  <button onClick={() => { exportToBibTeX(filteredPublications); setShowExport(false); }} className="block w-full px-4 py-2.5 text-left text-sm text-content-2 hover:bg-surface-2 hover:text-content-1 transition-colors">BibTeX</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {graphFilter && (
          <div className="mt-3 flex items-center space-x-2">
            <span className="text-[11px] uppercase tracking-[0.08em] text-content-3">Filtered by</span>
            <span className="px-2.5 py-0.5 bg-surface-2 text-content-2 rounded-md text-xs border border-border">{graphFilter}</span>
            <button onClick={() => setGraphFilter('')} className="text-content-3 hover:text-content-1 transition-colors"><CloseIcon size={12} /></button>
          </div>
        )}
      </div>

      {compareMode && compareSelection.length > 0 && (
        <div className="bg-surface-1 rounded-xl border border-accent/20 p-4 flex items-center justify-between sticky bottom-4 z-10">
          <span className="text-sm text-content-2"><span className="font-medium">{compareSelection.length} selected</span> <span className="text-content-3">(2-3 to compare)</span></span>
          <div className="flex gap-2">
            <button onClick={() => setCompareSelection([])} className="px-3 py-1.5 text-content-3 rounded-lg text-sm border border-border hover:text-content-2 transition-colors">Clear</button>
            <button onClick={() => setShowComparison(true)} disabled={compareSelection.length < 2} className="px-4 py-1.5 bg-accent text-black rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-40 transition-colors active:scale-[0.98]">Compare</button>
          </div>
        </div>
      )}

      {showComparison && compareSelection.length >= 2 && (
        <ComparisonView papers={compareSelection} onClose={() => { setShowComparison(false); setCompareMode(false); setCompareSelection([]); }} />
      )}

      {viewMode === 'graph' ? (
        <div className="bg-surface-1 rounded-xl border border-border p-6">
          <KnowledgeGraph onNodeClick={(term) => { setGraphFilter(term); setViewMode('list'); }} />
        </div>
      ) : (
        <div>
          {filteredPublications.length === 0 ? (
            <div className="bg-surface-1 rounded-xl border border-border flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-content-2 text-sm">No publications found</p>
                <p className="text-content-3 text-xs mt-1">Try adjusting your search</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPublications.map((publication) => (
                <PublicationCard key={publication.id} publication={publication} onSelect={setSelectedPublication} compareMode={compareMode} isCompareSelected={compareSelection.some(p => p.id === publication.id)} onToggleCompare={handleToggleCompare} />
              ))}
            </div>
          )}
        </div>
      )}

      {selectedPublication && <PublicationDetail publication={selectedPublication} onClose={() => setSelectedPublication(null)} />}

      <div className="grid grid-cols-3 gap-4">
        {[
          { value: publications.length, label: 'Total' },
          { value: filteredPublications.length, label: 'Filtered' },
          { value: publications.filter(p => p.url).length, label: 'With Links' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-surface-1 rounded-xl border border-border p-5 text-center">
            <div className="text-2xl font-light text-content-1 tracking-tight mb-1">{value}</div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-content-3">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
