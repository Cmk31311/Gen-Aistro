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
    const colors = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-green-400' };
    return colors[impact] || 'bg-content-3';
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-1 rounded-xl border border-border p-6">
        <h2 className="text-xl font-semibold text-content-1 tracking-tight mb-1">Insights</h2>
        <p className="text-content-3 text-sm mb-6">Data-driven findings from {publications.length} publications</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              onClick={() => setSelectedInsight(insight)}
              className="bg-bg rounded-xl border border-border p-5 hover:border-border-hover hover:bg-surface-1 hover:-translate-y-[2px] hover:shadow-card-hover transition-all duration-300 ease-out cursor-pointer group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedInsight(insight)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs bg-surface-2 text-content-2 rounded-full px-2 py-0.5 border border-border">{insight.type}</span>
                <div className="flex items-center space-x-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${impactDot(insight.impact)}`} />
                  <span className="text-xs text-content-3">{insight.impact}</span>
                </div>
              </div>

              <h3 className="text-content-1 font-medium text-sm mb-2 group-hover:text-content-1 transition-colors">{insight.title}</h3>
              <p className="text-content-3 text-sm mb-4 line-clamp-3 leading-relaxed">{insight.description}</p>

              <div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.08em] text-content-3 mb-1">
                  <span>Confidence</span>
                  <span>{Math.round(insight.confidence * 100)}%</span>
                </div>
                <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent/70 to-accent/30 rounded-full animate-bar-fill" style={{ width: `${insight.confidence * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={!!selectedInsight} onClose={() => setSelectedInsight(null)} title={selectedInsight?.title || ''}>
        {selectedInsight && (
          <div className="space-y-4">
            <p className="text-content-2 text-sm leading-relaxed">{selectedInsight.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg rounded-lg border border-border p-4">
                <div className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-1">Impact</div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${impactDot(selectedInsight.impact)}`} />
                  <span className="text-sm text-content-2 capitalize">{selectedInsight.impact}</span>
                </div>
              </div>
              <div className="bg-bg rounded-lg border border-border p-4">
                <div className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-1">Confidence</div>
                <div className="text-xl font-light text-content-1 tracking-tight">{Math.round(selectedInsight.confidence * 100)}%</div>
              </div>
            </div>

            <div className="bg-bg rounded-lg border border-border p-4">
              <div className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-3">Supporting Data</div>
              <div className="space-y-2">
                {Object.entries(selectedInsight.data).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-content-3 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-content-2">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
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
