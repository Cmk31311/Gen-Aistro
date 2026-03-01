'use client';
import React, { useState, useMemo } from 'react';
import { usePapers } from '../../context/PapersContext';
import { extractOrganismStats, filterPublicationsByTerm } from '../../lib/paperUtils';
import { AnalyticsSkeleton } from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import { ExternalLinkIcon, CloseIcon } from '../../ui/Icons';

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
    return {
      yearStats, organismStats,
      total: publications.length, withLinks,
      linkCoverage: Math.round((withLinks / publications.length) * 100)
    };
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
    { key: 'timeline', label: 'Timeline' },
    { key: 'organisms', label: 'Organisms' },
    { key: 'topics', label: 'Topics' },
    { key: 'links', label: 'Coverage' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: computedStats.total, label: 'Publications' },
          { value: computedStats.withLinks, label: 'With Links' },
          { value: `${computedStats.linkCoverage}%`, label: 'Coverage' },
          { value: Object.keys(computedStats.organismStats).length, label: 'Organisms' },
        ].map(({ value, label }) => (
          <div key={label} className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-5">
            <div className="text-3xl font-light text-zinc-100 mb-1">{value}</div>
            <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart Area */}
      <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-6">
        {/* Tab Bar */}
        <div className="flex items-center space-x-1 mb-6">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setSelectedChart(key); setAnalyticsFilter(null); }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedChart === key
                  ? 'bg-[#1a1a25] text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter Badge */}
        {analyticsFilter && (
          <div className="mb-5 flex items-center space-x-2 text-sm">
            <span className="text-zinc-500">Filtered by</span>
            <span className="px-2.5 py-0.5 bg-[#1a1a25] text-zinc-300 rounded-md text-xs border border-[#2a2a3a]">{analyticsFilter.label}</span>
            <span className="text-zinc-500">{filteredPubs.length} results</span>
            <button onClick={() => setAnalyticsFilter(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <CloseIcon size={12} />
            </button>
          </div>
        )}

        {/* Timeline */}
        {selectedChart === 'timeline' && (
          <div className="space-y-2">
            {Object.entries(computedStats.yearStats)
              .sort(([a], [b]) => String(a).localeCompare(String(b)))
              .map(([year, count]) => {
                const maxCount = Math.max(...Object.values(computedStats.yearStats));
                return (
                  <div
                    key={year}
                    className="flex items-center space-x-4 cursor-pointer hover:bg-[#1a1a25] rounded-lg px-2 py-1.5 transition-colors"
                    onClick={() => setAnalyticsFilter({ type: 'year', value: year, label: `Year ${year}` })}
                  >
                    <div className="w-16 text-sm text-zinc-400 font-mono">{year}</div>
                    <div className="flex-1 bg-[#0a0a0f] rounded h-5 relative overflow-hidden">
                      <div
                        className="bg-indigo-500/60 h-full rounded transition-all duration-700"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <div className="w-8 text-right text-xs text-zinc-500">{count}</div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Organisms */}
        {selectedChart === 'organisms' && (
          <div className="space-y-2">
            {Object.entries(computedStats.organismStats)
              .sort(([, a], [, b]) => b - a)
              .map(([organism, count]) => {
                const maxCount = Math.max(...Object.values(computedStats.organismStats));
                return (
                  <div
                    key={organism}
                    className="flex items-center space-x-4 cursor-pointer hover:bg-[#1a1a25] rounded-lg px-2 py-2 transition-colors"
                    onClick={() => setAnalyticsFilter({ type: 'organism', value: organism, label: organism })}
                  >
                    <div className="w-36 text-sm text-zinc-300 truncate">{organism}</div>
                    <div className="flex-1 bg-[#0a0a0f] rounded h-4 relative overflow-hidden">
                      <div
                        className="bg-indigo-500/50 h-full rounded transition-all duration-700"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-xs text-zinc-500">{count} ({((count / computedStats.total) * 100).toFixed(0)}%)</div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Topics */}
        {selectedChart === 'topics' && (
          <div>
            <p className="text-xs text-zinc-600 mb-4">Based on TF-IDF analysis of all publications</p>
            <div className="space-y-2">
              {topicData.map(({ topic, percentage }) => (
                <div
                  key={topic}
                  className="flex items-center space-x-4 cursor-pointer hover:bg-[#1a1a25] rounded-lg px-2 py-2 transition-colors"
                  onClick={() => setAnalyticsFilter({ type: 'topic', value: topic.toLowerCase(), label: topic })}
                >
                  <div className="w-36 text-sm text-zinc-300 truncate">{topic}</div>
                  <div className="flex-1 bg-[#0a0a0f] rounded h-4 relative overflow-hidden">
                    <div
                      className="bg-indigo-500/40 h-full rounded transition-all duration-700"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-right text-xs text-zinc-500">{percentage}%</div>
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
              <div key={label} className="bg-[#0a0a0f] rounded-lg border border-[#222230] p-6 text-center">
                <div className="text-3xl font-light text-zinc-100 mb-1">{value}</div>
                <div className="text-sm text-zinc-400">{label}</div>
                <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filtered Publications */}
        {analyticsFilter && filteredPubs.length > 0 && (
          <div className="mt-6 pt-5 border-t border-[#2a2a3a]">
            <h4 className="text-sm font-medium text-zinc-300 mb-3">
              Matching Publications ({filteredPubs.length})
            </h4>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {filteredPubs.slice(0, 20).map(pub => (
                <div key={pub.id} className="flex items-center justify-between p-2.5 bg-[#0a0a0f] rounded-lg border border-[#222230] hover:border-[#2a2a3a] transition-colors">
                  <span className="text-zinc-400 text-sm line-clamp-1 flex-1 mr-2">{pub.title}</span>
                  {pub.url && (
                    <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-indigo-400 flex-shrink-0 transition-colors">
                      <ExternalLinkIcon size={14} />
                    </a>
                  )}
                </div>
              ))}
              {filteredPubs.length > 20 && (
                <p className="text-zinc-600 text-xs text-center pt-2">and {filteredPubs.length - 20} more</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
