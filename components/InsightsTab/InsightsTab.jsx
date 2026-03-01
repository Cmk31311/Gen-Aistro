'use client';
import React, { useState, useMemo } from 'react';
import { usePapers } from '../../context/PapersContext';
import { generateInsights } from '../../lib/insightEngine';
import { InsightsSkeleton } from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import Modal from '../../ui/Modal';

export default function InsightsTab() {
  const { publications, stats, graphData, loading, error, reload } = usePapers();
  const [selectedInsight, setSelectedInsight] = useState(null);

  const insights = useMemo(() => {
    if (!publications.length) return [];
    return generateInsights(publications, stats, graphData);
  }, [publications, stats, graphData]);

  if (loading) return <InsightsSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const impactDot = (impact) => {
    const colors = { high: 'bg-red-500', medium: 'bg-yellow-500', low: 'bg-green-500' };
    return colors[impact] || 'bg-zinc-500';
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-6">
        <h2 className="text-xl font-medium text-zinc-100 mb-1">Insights</h2>
        <p className="text-zinc-500 text-sm mb-6">Data-driven findings from {publications.length} publications</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              onClick={() => setSelectedInsight(insight)}
              className="bg-[#0a0a0f] rounded-xl border border-[#222230] p-5 hover:border-[#2a2a3a] hover:bg-[#12121a] transition-all duration-200 cursor-pointer group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedInsight(insight)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs bg-[#1a1a25] text-zinc-400 rounded-full px-2 py-0.5 border border-[#2a2a3a]">
                  {insight.type}
                </span>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${impactDot(insight.impact)}`} />
                  <span className="text-xs text-zinc-500">{insight.impact}</span>
                </div>
              </div>

              <h3 className="text-zinc-200 font-medium text-sm mb-2 group-hover:text-zinc-100 transition-colors">
                {insight.title}
              </h3>

              <p className="text-zinc-500 text-sm mb-4 line-clamp-3 leading-relaxed">
                {insight.description}
              </p>

              {/* Confidence bar */}
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-600 mb-1">
                  <span>Confidence</span>
                  <span>{Math.round(insight.confidence * 100)}%</span>
                </div>
                <div className="h-1 bg-[#1a1a25] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500/60 rounded-full transition-all duration-500"
                    style={{ width: `${insight.confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insight Detail Modal */}
      <Modal
        isOpen={!!selectedInsight}
        onClose={() => setSelectedInsight(null)}
        title={selectedInsight?.title || ''}
      >
        {selectedInsight && (
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm leading-relaxed">{selectedInsight.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0a0a0f] rounded-lg border border-[#222230] p-4">
                <div className="text-xs text-zinc-500 mb-1">Impact</div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${impactDot(selectedInsight.impact)}`} />
                  <span className="text-sm text-zinc-300 capitalize">{selectedInsight.impact}</span>
                </div>
              </div>
              <div className="bg-[#0a0a0f] rounded-lg border border-[#222230] p-4">
                <div className="text-xs text-zinc-500 mb-1">Confidence</div>
                <div className="text-xl font-light text-zinc-200">{Math.round(selectedInsight.confidence * 100)}%</div>
              </div>
            </div>

            <div className="bg-[#0a0a0f] rounded-lg border border-[#222230] p-4">
              <div className="text-xs text-zinc-500 mb-3">Supporting Data</div>
              <div className="space-y-2">
                {Object.entries(selectedInsight.data).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-500 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-zinc-300">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
