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

  return (
    <div className="space-y-6">
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">{'\uD83D\uDCA1'} Data-Driven Research Insights</h2>
          <p className="text-blue-200/70">Insights computed from {publications.length} NASA Space Biology publications</p>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              onClick={() => setSelectedInsight(insight)}
              className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:bg-black/40 hover:border-white/20 transition-all duration-200 cursor-pointer group"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedInsight(insight)}
              aria-label={`View insight: ${insight.title}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  insight.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                  insight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-green-500/20 text-green-300'
                }`}>
                  {insight.impact.toUpperCase()} IMPACT
                </div>
                <div className="text-xs text-blue-200/70">
                  {Math.round(insight.confidence * 100)}% confidence
                </div>
              </div>

              <h3 className="text-white font-semibold mb-2 group-hover:text-blue-200 transition-colors">
                {insight.title}
              </h3>

              <p className="text-blue-200/70 text-sm mb-3 line-clamp-3">
                {insight.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">
                  {insight.type}
                </span>
                <span className="text-xs text-blue-200/50">Click for details</span>
              </div>
            </div>
          ))}
        </div>

        {/* Insight Detail Modal */}
        <Modal
          isOpen={!!selectedInsight}
          onClose={() => setSelectedInsight(null)}
          title={selectedInsight?.title || ''}
        >
          {selectedInsight && (
            <div className="space-y-4">
              <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                <h4 className="text-lg font-semibold text-white mb-2">Insight Details</h4>
                <p className="text-blue-200/80">{selectedInsight.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                  <h4 className="text-sm font-semibold text-blue-200 mb-2">Impact Level</h4>
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedInsight.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                    selectedInsight.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-green-500/20 text-green-300'
                  }`}>
                    {selectedInsight.impact.toUpperCase()}
                  </div>
                </div>

                <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                  <h4 className="text-sm font-semibold text-blue-200 mb-2">Confidence</h4>
                  <div className="text-2xl font-bold text-purple-300">
                    {Math.round(selectedInsight.confidence * 100)}%
                  </div>
                </div>
              </div>

              <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                <h4 className="text-sm font-semibold text-blue-200 mb-2">Supporting Data</h4>
                <div className="space-y-1">
                  {Object.entries(selectedInsight.data).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-blue-200/70 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-white font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}
