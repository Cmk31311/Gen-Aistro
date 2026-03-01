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
import { SearchIcon, ListIcon, NetworkIcon, CompareIcon, ExportIcon, CloseIcon, DatabaseIcon } from '../../ui/Icons';

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
      <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <DatabaseIcon size={20} className="text-accent" />
              <h2 className="text-xl font-bold text-gradient-gold tracking-tight">Publications</h2>
            </div>
            <p className="text-content-3 text-sm">{publications.length} NASA Space Biology publications</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-light text-gradient-gold tracking-tight">{filteredPublications.length}</div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-content-3 font-medium">Showing</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-accent/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title or ID..."
              className="w-full pl-10 pr-3 py-2.5 bg-bg border border-border rounded-xl text-sm text-content-1 placeholder-content-3 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
              aria-label="Search publications"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-xl overflow-hidden border border-border">
              <button onClick={() => setViewMode('list')} className={`px-3.5 py-2.5 text-sm transition-all flex items-center gap-1.5 font-medium ${viewMode === 'list' ? 'bg-accent-muted text-accent' : 'text-content-3 hover:text-content-1'}`}>
                <ListIcon size={14} /> List
              </button>
              <button onClick={() => setViewMode('graph')} className={`px-3.5 py-2.5 text-sm transition-all flex items-center gap-1.5 font-medium ${viewMode === 'graph' ? 'bg-accent-muted text-accent' : 'text-content-3 hover:text-content-1'}`}>
                <NetworkIcon size={14} /> Graph
              </button>
            </div>

            <button
              onClick={() => { setCompareMode(!compareMode); setCompareSelection([]); setShowComparison(false); }}
              className={`px-3.5 py-2.5 text-sm rounded-xl transition-all flex items-center gap-1.5 border font-medium ${
                compareMode ? 'bg-accent-muted text-accent border-accent/30 shadow-[0_0_12px_rgba(240,192,90,0.15)]' : 'text-content-3 border-border hover:text-content-1 hover:border-border-hover'
              }`}
            >
              <CompareIcon size={14} /> Compare
            </button>

            <div className="relative">
              <button onClick={() => setShowExport(!showExport)} className="px-3.5 py-2.5 text-content-3 border border-border rounded-xl text-sm hover:text-content-1 hover:border-border-hover transition-all flex items-center gap-1.5 font-medium">
                <ExportIcon size={14} /> Export
              </button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1.5 bg-surface-1 rounded-xl border border-border shadow-xl shadow-black/50 z-20 min-w-[150px] overflow-hidden">
                  <button onClick={() => { exportToCSV(filteredPublications); setShowExport(false); }} className="block w-full px-4 py-3 text-left text-sm text-content-2 hover:bg-accent-muted hover:text-accent transition-all font-medium">CSV</button>
                  <button onClick={() => { exportToBibTeX(filteredPublications); setShowExport(false); }} className="block w-full px-4 py-3 text-left text-sm text-content-2 hover:bg-accent-muted hover:text-accent transition-all font-medium">BibTeX</button>
                </div>
              )}
            </div>
          </div>
        </div>

        {graphFilter && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-[11px] uppercase tracking-[0.1em] text-content-3 font-medium">Filtered by</span>
            <span className="px-3 py-1 bg-accent-muted text-accent rounded-lg text-xs border border-accent/20 font-medium">{graphFilter}</span>
            <button onClick={() => setGraphFilter('')} className="text-content-3 hover:text-accent transition-colors"><CloseIcon size={13} /></button>
          </div>
        )}
      </div>

      {compareMode && compareSelection.length > 0 && (
        <div className="bg-surface-1 rounded-xl border border-accent/25 p-5 flex items-center justify-between sticky bottom-4 z-10 shadow-glow">
          <span className="text-sm text-content-2"><span className="font-semibold text-content-1">{compareSelection.length} selected</span> <span className="text-content-3">(2-3 to compare)</span></span>
          <div className="flex gap-2">
            <button onClick={() => setCompareSelection([])} className="px-4 py-2 text-content-3 rounded-xl text-sm border border-border hover:text-content-1 transition-all font-medium">Clear</button>
            <button onClick={() => setShowComparison(true)} disabled={compareSelection.length < 2} className="px-5 py-2 bg-gradient-to-r from-accent to-accent-hover text-black rounded-xl text-sm font-semibold disabled:opacity-40 transition-all active:scale-[0.98]">Compare</button>
          </div>
        </div>
      )}

      {showComparison && compareSelection.length >= 2 && (
        <ComparisonView papers={compareSelection} onClose={() => { setShowComparison(false); setCompareMode(false); setCompareSelection([]); }} />
      )}

      {viewMode === 'graph' ? (
        <div className="bg-surface-1 rounded-xl border border-border p-6 shadow-card">
          <KnowledgeGraph onNodeClick={(term) => { setGraphFilter(term); setViewMode('list'); }} />
        </div>
      ) : (
        <div>
          {filteredPublications.length === 0 ? (
            <div className="bg-surface-1 rounded-xl border border-border flex items-center justify-center h-64 shadow-card">
              <div className="text-center">
                <p className="text-content-1 text-sm font-medium">No publications found</p>
                <p className="text-content-3 text-xs mt-1">Try adjusting your search</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div key={label} className="bg-surface-1 rounded-xl border border-border p-6 text-center shadow-card hover:shadow-glow hover:-translate-y-[1px] transition-all duration-300">
            <div className="text-3xl font-light text-gradient-gold tracking-tight mb-1">{value}</div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-content-3 font-medium">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
