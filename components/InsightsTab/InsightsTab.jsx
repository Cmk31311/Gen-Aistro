'use client';
import React, { useState, useMemo } from 'react';
import { usePapers } from '../../context/PapersContext';
import { generateInsights } from '../../lib/insightEngine';
import { InsightsSkeleton } from '../../ui/Skeleton';
import ErrorState from '../../ui/ErrorState';
import Modal from '../../ui/Modal';
import { ZapIcon } from '../../ui/Icons';

export default function InsightsTab() {
  const { publications, stats, graphData, loading, error, reload } = usePapers();
  const [selectedInsight, setSelectedInsight] = useState(null);

  const insights = useMemo(() => {
    if (!publications.length) return [];
    return generateInsights(publications, stats, graphData);
  }, [publications, stats, graphData]);

  if (loading) return <InsightsSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const impactColor = (impact) => {
    const colors = { high: 'bg-red-400', medium: 'bg-amber-400', low: 'bg-green-400' };
    return colors[impact] || 'bg-content-3';
  };

  const impactBorder = (impact) => {
    const borders = { high: 'border-l-red-400/50', medium: 'border-l-amber-400/50', low: 'border-l-green-400/50' };
    return borders[impact] || 'border-l-content-3/50';
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card">
        <div className="flex items-center space-x-2 mb-1">
          <ZapIcon size={20} className="text-accent" />
          <h2 className="text-xl font-bold text-gradient-gold tracking-tight">Insights</h2>
        </div>
        <p className="text-content-3 text-sm mb-7">Data-driven findings from {publications.length} publications</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              onClick={() => setSelectedInsight(insight)}
              className={`bg-bg rounded-xl border border-border border-l-[3px] ${impactBorder(insight.impact)} p-5 hover:border-border-hover hover:bg-surface-1 hover:-translate-y-[2px] hover:shadow-card-hover transition-all duration-300 ease-out cursor-pointer group`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedInsight(insight)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs bg-accent-muted text-accent rounded-lg px-2.5 py-1 border border-accent/20 font-medium">{insight.type}</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${impactColor(insight.impact)} shadow-[0_0_6px_rgba(0,0,0,0.3)]`} />
                  <span className="text-xs text-content-3 font-medium capitalize">{insight.impact}</span>
                </div>
              </div>

              <h3 className="text-content-1 font-semibold text-sm mb-2 group-hover:text-content-1 transition-colors leading-snug">{insight.title}</h3>
              <p className="text-content-3 text-sm mb-5 line-clamp-3 leading-relaxed">{insight.description}</p>

              <div>
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.1em] text-content-3 mb-1.5 font-medium">
                  <span>Confidence</span>
                  <span className="text-accent">{Math.round(insight.confidence * 100)}%</span>
                </div>
                <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent to-accent/40 rounded-full animate-bar-fill" style={{ width: `${insight.confidence * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={!!selectedInsight} onClose={() => setSelectedInsight(null)} title={selectedInsight?.title || ''}>
        {selectedInsight && (
          <div className="space-y-5">
            <p className="text-content-2 text-sm leading-relaxed">{selectedInsight.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-bg rounded-xl border border-border p-5">
                <div className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-2 font-medium">Impact</div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${impactColor(selectedInsight.impact)} shadow-[0_0_6px_rgba(0,0,0,0.3)]`} />
                  <span className="text-sm text-content-1 capitalize font-medium">{selectedInsight.impact}</span>
                </div>
              </div>
              <div className="bg-bg rounded-xl border border-border p-5">
                <div className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-2 font-medium">Confidence</div>
                <div className="text-2xl font-light text-gradient-gold tracking-tight">{Math.round(selectedInsight.confidence * 100)}%</div>
              </div>
            </div>

            <div className="bg-bg rounded-xl border border-border p-5">
              <div className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Supporting Data</div>
              <div className="space-y-2.5">
                {Object.entries(selectedInsight.data).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                    <span className="text-content-3 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-content-1 font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
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
