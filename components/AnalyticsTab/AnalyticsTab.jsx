'use client';
import React, { useState, useMemo } from 'react';
import { usePapers } from '../../context/PapersContext';
import { extractOrganismStats, filterPublicationsByTerm } from '../../lib/paperUtils';
import { AnalyticsSkeleton } from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import { ExternalLinkIcon, CloseIcon, TrendingUpIcon, ChartIcon } from '../../ui/Icons';

export default function AnalyticsTab() {
  const { publications, stats, loading, error, reload } = usePapers();
  const [selectedChart, setSelectedChart] = useState('timeline');
  const [analyticsFilter, setAnalyticsFilter] = useState(null);

  const computedStats = useMemo(() => {
    if (!publications.length) return null;
    const yearStats = {};
    publications.forEach(pub => {
      const year = pub.year || 'Unknown';
      yearStats[year] = (yearStats[year] || 0) + 1;
    });
    const organismStats = extractOrganismStats(publications);
    const withLinks = publications.filter(p => p.url).length;
    return { yearStats, organismStats, total: publications.length, withLinks, linkCoverage: Math.round((withLinks / publications.length) * 100) };
  }, [publications]);

  const topicData = useMemo(() => {
    if (!stats?.top_keywords) return [];
    return stats.top_keywords.slice(0, 12).map((kw) => ({
      topic: kw.term.charAt(0).toUpperCase() + kw.term.slice(1),
      score: kw.score,
      percentage: (kw.score * 100).toFixed(1),
    }));
  }, [stats]);

  const filteredPubs = useMemo(() => {
    if (!analyticsFilter) return [];
    return filterPublicationsByTerm(publications, analyticsFilter.value);
  }, [publications, analyticsFilter]);

  if (loading) return <AnalyticsSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!computedStats) return null;

  const tabs = [
    { key: 'timeline', label: 'Timeline', icon: ChartIcon },
    { key: 'organisms', label: 'Organisms' },
    { key: 'topics', label: 'Topics' },
    { key: 'links', label: 'Coverage' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: computedStats.total, label: 'Publications' },
          { value: computedStats.withLinks, label: 'With Links' },
          { value: `${computedStats.linkCoverage}%`, label: 'Coverage' },
          { value: Object.keys(computedStats.organismStats).length, label: 'Organisms' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-surface-1 rounded-xl border border-border p-6 hover:border-accent/20 hover:shadow-glow transition-all duration-300 shadow-card hover:-translate-y-[1px]">
            <div className="text-3xl font-light text-gradient-gold tracking-tight mb-1">{value}</div>
            <div className="text-[11px] uppercase tracking-[0.1em] text-content-3 font-medium">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart Area */}
      <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card">
        {/* Tab bar */}
        <div className="flex items-center space-x-1 mb-7 border-b border-border pb-3">
          <TrendingUpIcon size={16} className="text-accent mr-2" />
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setSelectedChart(key); setAnalyticsFilter(null); }}
              className={`relative px-4 py-2 text-sm transition-all font-medium ${
                selectedChart === key ? 'text-accent' : 'text-content-3 hover:text-content-2'
              }`}
            >
              {label}
              {selectedChart === key && <span className="absolute -bottom-[13px] left-1 right-1 h-[2.5px] bg-accent rounded-full shadow-[0_1px_8px_rgba(240,192,90,0.3)]" />}
            </button>
          ))}
        </div>

        {analyticsFilter && (
          <div className="mb-6 flex items-center space-x-2 text-sm">
            <span className="text-content-3">Filtered by</span>
            <span className="px-3 py-1 bg-accent-muted text-accent rounded-lg text-xs border border-accent/20 font-medium">{analyticsFilter.label}</span>
            <span className="text-content-3">{filteredPubs.length} results</span>
            <button onClick={() => setAnalyticsFilter(null)} className="text-content-3 hover:text-accent transition-colors"><CloseIcon size={13} /></button>
          </div>
        )}

        {/* Timeline */}
        {selectedChart === 'timeline' && (
          <div className="space-y-2.5">
            {Object.entries(computedStats.yearStats).sort(([a], [b]) => String(a).localeCompare(String(b))).map(([year, count]) => {
              const maxCount = Math.max(...Object.values(computedStats.yearStats));
              return (
                <div key={year} className="flex items-center space-x-4 cursor-pointer hover:bg-surface-2 rounded-xl px-3 py-2.5 transition-all" onClick={() => setAnalyticsFilter({ type: 'year', value: year, label: `Year ${year}` })}>
                  <div className="w-16 text-sm text-content-1 font-mono font-medium">{year}</div>
                  <div className="flex-1 bg-bg rounded-full h-6 overflow-hidden">
                    <div className="bg-gradient-to-r from-accent to-accent/40 h-full rounded-full animate-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <div className="w-10 text-right text-xs text-content-2 font-medium">{count}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Organisms */}
        {selectedChart === 'organisms' && (
          <div className="space-y-2.5">
            {Object.entries(computedStats.organismStats).sort(([, a], [, b]) => b - a).map(([organism, count]) => {
              const maxCount = Math.max(...Object.values(computedStats.organismStats));
              return (
                <div key={organism} className="flex items-center space-x-4 cursor-pointer hover:bg-surface-2 rounded-xl px-3 py-2.5 transition-all" onClick={() => setAnalyticsFilter({ type: 'organism', value: organism, label: organism })}>
                  <div className="w-36 text-sm text-content-1 truncate font-medium">{organism}</div>
                  <div className="flex-1 bg-bg rounded-full h-5 overflow-hidden">
                    <div className="bg-gradient-to-r from-accent/80 to-accent/30 h-full rounded-full animate-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                  </div>
                  <div className="w-16 text-right text-xs text-content-2 font-medium">{count} ({((count / computedStats.total) * 100).toFixed(0)}%)</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Topics */}
        {selectedChart === 'topics' && (
          <div>
            <p className="text-xs text-content-3 mb-5 font-medium">Based on TF-IDF analysis of all publications</p>
            <div className="space-y-2.5">
              {topicData.map(({ topic, percentage }) => (
                <div key={topic} className="flex items-center space-x-4 cursor-pointer hover:bg-surface-2 rounded-xl px-3 py-2.5 transition-all" onClick={() => setAnalyticsFilter({ type: 'topic', value: topic.toLowerCase(), label: topic })}>
                  <div className="w-36 text-sm text-content-1 truncate font-medium">{topic}</div>
                  <div className="flex-1 bg-bg rounded-full h-5 overflow-hidden">
                    <div className="bg-gradient-to-r from-accent/60 to-accent/25 h-full rounded-full animate-bar-fill" style={{ width: `${percentage}%` }} />
                  </div>
                  <div className="w-14 text-right text-xs text-content-2 font-medium">{percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coverage */}
        {selectedChart === 'links' && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: computedStats.total, label: 'Total', sub: 'Publications' },
              { value: computedStats.withLinks, label: 'Linked', sub: 'With URLs' },
              { value: `${computedStats.linkCoverage}%`, label: 'Coverage', sub: 'Link ratio' },
            ].map(({ value, label, sub }) => (
              <div key={label} className="bg-bg rounded-xl border border-border p-7 text-center">
                <div className="text-4xl font-light text-gradient-gold tracking-tight mb-1">{value}</div>
                <div className="text-sm text-content-1 font-medium">{label}</div>
                <div className="text-xs text-content-3 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        )}

        {analyticsFilter && filteredPubs.length > 0 && (
          <div className="mt-7 pt-6 border-t border-border">
            <h4 className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Matching Publications ({filteredPubs.length})</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredPubs.slice(0, 20).map(pub => (
                <div key={pub.id} className="flex items-center justify-between p-3 bg-bg rounded-xl border border-border hover:border-accent/20 transition-all">
                  <span className="text-content-2 text-sm line-clamp-1 flex-1 mr-2">{pub.title}</span>
                  {pub.url && (
                    <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-content-3 hover:text-accent flex-shrink-0 transition-colors">
                      <ExternalLinkIcon size={14} />
                    </a>
                  )}
                </div>
              ))}
              {filteredPubs.length > 20 && <p className="text-content-3 text-xs text-center pt-2 font-medium">and {filteredPubs.length - 20} more</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
