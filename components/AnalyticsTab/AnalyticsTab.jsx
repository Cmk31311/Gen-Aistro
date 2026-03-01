'use client';
import React, { useState, useMemo } from 'react';
import { usePapers } from '../../context/PapersContext';
import { extractOrganismStats, filterPublicationsByTerm } from '../../lib/paperUtils';
import { AnalyticsSkeleton } from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';

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
      yearStats,
      organismStats,
      total: publications.length,
      withLinks,
      linkCoverage: Math.round((withLinks / publications.length) * 100)
    };
  }, [publications]);

  // Get real topic data from stats.json top_keywords
  const topicData = useMemo(() => {
    if (!stats?.top_keywords) return [];
    const colors = [
      'from-red-500 to-pink-500', 'from-yellow-500 to-orange-500',
      'from-green-500 to-teal-500', 'from-blue-500 to-purple-500',
      'from-emerald-500 to-green-500', 'from-indigo-500 to-blue-500',
      'from-purple-500 to-pink-500', 'from-cyan-500 to-blue-500',
      'from-rose-500 to-red-500', 'from-teal-500 to-cyan-500',
      'from-amber-500 to-yellow-500', 'from-violet-500 to-purple-500'
    ];
    return stats.top_keywords.slice(0, 12).map((kw, i) => ({
      topic: kw.term.charAt(0).toUpperCase() + kw.term.slice(1),
      score: kw.score,
      percentage: (kw.score * 100).toFixed(1),
      color: colors[i % colors.length]
    }));
  }, [stats]);

  // Filtered publications for interactive analytics
  const filteredPubs = useMemo(() => {
    if (!analyticsFilter) return [];
    return filterPublicationsByTerm(publications, analyticsFilter.value);
  }, [publications, analyticsFilter]);

  if (loading) return <AnalyticsSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!computedStats) return null;

  return (
    <div className="space-y-6">
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{'\uD83D\uDCCA'} Research Analytics</h2>
          <div className="flex space-x-2 flex-wrap">
            {[
              { key: 'timeline', label: 'Timeline', icon: '\uD83D\uDCC8' },
              { key: 'organisms', label: 'Organisms', icon: '\uD83E\uDDEC' },
              { key: 'topics', label: 'Topics', icon: '\uD83D\uDD2C' },
              { key: 'links', label: 'Links', icon: '\uD83D\uDD17' }
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => { setSelectedChart(key); setAnalyticsFilter(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChart === key
                    ? 'bg-purple-500/30 text-purple-200'
                    : 'bg-black/30 text-blue-200/70 hover:bg-black/40'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Badge */}
        {analyticsFilter && (
          <div className="mb-4 flex items-center space-x-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <span className="text-sm text-purple-200">
              Filtered by <span className="font-semibold">{analyticsFilter.label}</span>: {filteredPubs.length} publications found
            </span>
            <button
              onClick={() => setAnalyticsFilter(null)}
              className="text-red-300 hover:text-red-200 text-sm ml-2"
            >
              {'\u2715'} Clear
            </button>
          </div>
        )}

        <div className="space-y-6">
          {/* Timeline */}
          {selectedChart === 'timeline' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">{'\uD83D\uDCC8'} Publications Timeline</h3>
              <div className="space-y-4">
                {Object.entries(computedStats.yearStats)
                  .sort(([a], [b]) => String(a).localeCompare(String(b)))
                  .map(([year, count]) => (
                    <div
                      key={year}
                      className="flex items-center space-x-4 cursor-pointer hover:bg-white/5 rounded-lg p-1 transition-colors"
                      onClick={() => setAnalyticsFilter({ type: 'year', value: year, label: `Year ${year}` })}
                    >
                      <div className="w-20 text-sm text-blue-200 font-medium">{year}</div>
                      <div className="flex-1 bg-black/40 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${(count / Math.max(...Object.values(computedStats.yearStats))) * 100}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                          {count}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Organisms */}
          {selectedChart === 'organisms' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">{'\uD83E\uDDEC'} Research Organisms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(computedStats.organismStats)
                  .sort(([, a], [, b]) => b - a)
                  .map(([organism, count]) => (
                    <div
                      key={organism}
                      className="bg-black/40 rounded-lg p-4 border border-white/10 cursor-pointer hover:bg-black/50 transition-colors"
                      onClick={() => setAnalyticsFilter({ type: 'organism', value: organism, label: organism })}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{organism}</span>
                        <span className="text-purple-300 text-lg font-bold">{count}</span>
                      </div>
                      <div className="mt-2 bg-black/60 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${(count / Math.max(...Object.values(computedStats.organismStats))) * 100}%` }}
                        ></div>
                      </div>
                      <div className="mt-1 text-xs text-blue-200/50">
                        {((count / computedStats.total) * 100).toFixed(1)}% of publications
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Topics - FIXED: real data from stats.json */}
          {selectedChart === 'topics' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-2">{'\uD83D\uDD2C'} Research Topics</h3>
              <p className="text-blue-200/50 text-sm mb-4">Based on TF-IDF analysis of all publications</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {topicData.map(({ topic, score, percentage, color }) => (
                  <div
                    key={topic}
                    className="bg-black/40 rounded-lg p-4 border border-white/10 text-center cursor-pointer hover:bg-black/50 transition-colors"
                    onClick={() => setAnalyticsFilter({ type: 'topic', value: topic.toLowerCase(), label: topic })}
                  >
                    <div className={`w-14 h-14 mx-auto mb-2 bg-gradient-to-r ${color} rounded-full flex items-center justify-center text-white font-bold text-sm`}>
                      {percentage}%
                    </div>
                    <div className="text-white text-sm font-medium">{topic}</div>
                    <div className="text-blue-200/50 text-xs mt-1">TF-IDF score</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {selectedChart === 'links' && (
            <div className="bg-black/30 backdrop-blur-sm rounded-lg p-6 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-4">{'\uD83D\uDD17'} Publication Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/40 rounded-lg p-6 border border-white/10 text-center">
                  <div className="text-4xl mb-2">{'\uD83D\uDCC4'}</div>
                  <div className="text-3xl font-bold text-white mb-1">{computedStats.total}</div>
                  <div className="text-blue-200/70">Total Publications</div>
                </div>
                <div className="bg-black/40 rounded-lg p-6 border border-white/10 text-center">
                  <div className="text-4xl mb-2">{'\uD83D\uDD17'}</div>
                  <div className="text-3xl font-bold text-green-300 mb-1">{computedStats.withLinks}</div>
                  <div className="text-blue-200/70">With Links</div>
                </div>
                <div className="bg-black/40 rounded-lg p-6 border border-white/10 text-center">
                  <div className="text-4xl mb-2">{'\uD83D\uDCCA'}</div>
                  <div className="text-3xl font-bold text-purple-300 mb-1">{computedStats.linkCoverage}%</div>
                  <div className="text-blue-200/70">Link Coverage</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filtered Publications List */}
        {analyticsFilter && filteredPubs.length > 0 && (
          <div className="mt-6 bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <h4 className="text-white font-semibold mb-3">
              Matching Publications ({filteredPubs.length})
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredPubs.slice(0, 20).map(pub => (
                <div
                  key={pub.id}
                  className="flex items-center justify-between p-2 bg-black/30 rounded-lg hover:bg-black/40 transition-colors"
                >
                  <span className="text-blue-200 text-sm line-clamp-1 flex-1 mr-2">{pub.title}</span>
                  {pub.url && (
                    <a
                      href={pub.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-300 text-xs hover:text-green-200 flex-shrink-0"
                    >
                      {'\uD83D\uDD17'} Open
                    </a>
                  )}
                </div>
              ))}
              {filteredPubs.length > 20 && (
                <p className="text-blue-200/50 text-sm text-center pt-2">
                  ... and {filteredPubs.length - 20} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
