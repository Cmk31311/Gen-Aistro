'use client';
import React, { useState, useCallback } from 'react';
import { FlaskIcon, SparklesIcon, SearchIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, ExportIcon, StarIcon } from '../ui/Icons';
import { exportResearchReport } from '../lib/exportUtils';
import { useBookmarks } from '../context/BookmarkContext';

const EXAMPLE_RESEARCH = [
  "Compare the effects of microgravity on bone density across different organisms and identify contradictions in the literature",
  "What are the combined effects of space radiation and microgravity on plant growth regulation mechanisms?",
  "Analyze methodological differences in studies examining immune system changes during spaceflight",
];

const STEPS = [
  { key: 'decompose', label: 'Analyzing Question', description: 'Breaking down into focused sub-queries...' },
  { key: 'search', label: 'Searching Corpus', description: 'Searching across multiple dimensions...' },
  { key: 'synthesize', label: 'Synthesizing Report', description: 'Cross-referencing and analyzing findings...' },
];

export default function DeepResearchTab() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [subQueries, setSubQueries] = useState([]);
  const [searchMeta, setSearchMeta] = useState(null);
  const [report, setReport] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState('');
  const [expandedFindings, setExpandedFindings] = useState({});
  const { addSearchBookmark } = useBookmarks();

  const runResearch = useCallback(async () => {
    if (!question.trim() || loading) return;
    setLoading(true);
    setError('');
    setSubQueries([]);
    setSearchMeta(null);
    setReport(null);
    setMetadata(null);
    setCurrentStep(0);

    try {
      // Step 1: Decompose
      const decomposeRes = await fetch('/api/research/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      if (!decomposeRes.ok) throw new Error('Failed to analyze question');
      const decomposeData = await decomposeRes.json();
      setSubQueries(decomposeData.sub_queries);
      setCurrentStep(1);

      // Step 2: Search
      const searchRes = await fetch('/api/research/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sub_queries: decomposeData.sub_queries })
      });
      if (!searchRes.ok) throw new Error('Search across corpus failed');
      const searchData = await searchRes.json();
      setSearchMeta({
        totalChunks: searchData.total_chunks,
        uniquePapers: searchData.total_unique_papers,
        resultsByQuery: searchData.results_by_query
      });
      setCurrentStep(2);

      // Step 3: Synthesize
      const synthRes = await fetch('/api/research/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          chunks: searchData.merged_chunks,
          sub_queries: decomposeData.sub_queries
        })
      });
      if (!synthRes.ok) throw new Error('Report synthesis failed');
      const synthData = await synthRes.json();
      setReport(synthData.report);
      setMetadata(synthData.metadata);
      setCurrentStep(3);

    } catch (err) {
      console.error('Research error:', err);
      setError(err.message || 'Research failed');
    } finally {
      setLoading(false);
    }
  }, [question, loading]);

  const toggleFinding = (index) => {
    setExpandedFindings(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const copyReport = useCallback(() => {
    if (!report) return;
    const text = [
      `Research Question: ${question}`,
      '',
      `Overview: ${report.overview}`,
      '',
      'Key Findings:',
      ...(report.findings || []).map((f, i) => `${i + 1}. [${f.theme}] ${f.content}`),
      '',
      `Contradictions: ${report.contradictions}`,
      '',
      `Research Gaps: ${report.gaps}`,
    ].join('\n');
    navigator.clipboard.writeText(text);
  }, [report, question]);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card">
        <div className="flex items-center space-x-2 mb-1">
          <FlaskIcon size={20} className="text-accent" />
          <h2 className="text-xl font-bold text-gradient-gold tracking-tight">Deep Research</h2>
        </div>
        <p className="text-content-3 text-sm mb-6">Ask complex, multi-faceted research questions. The AI will autonomously decompose, search, and synthesize a structured analysis.</p>

        <div className="space-y-5">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Compare the effects of microgravity on bone density across different organisms and identify contradictions in the literature..."
            rows={3}
            className="w-full bg-bg border border-border hover:border-border-hover rounded-xl px-4 py-3 text-sm text-content-1 placeholder-content-3/70 resize-none focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all"
            disabled={loading}
          />

          {/* Example prompts */}
          {!report && !loading && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Try these complex questions</p>
              <div className="space-y-2">
                {EXAMPLE_RESEARCH.map((q, i) => (
                  <button key={i} onClick={() => setQuestion(q)} className="w-full text-left px-4 py-3 bg-surface-2 rounded-lg text-sm text-content-2 hover:text-accent hover:bg-surface-3 hover:border-accent/20 transition-all border border-border">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={runResearch}
            disabled={loading || !question.trim()}
            className="w-full px-5 py-3.5 bg-gradient-to-r from-accent to-accent-hover text-black font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm active:scale-[0.98] shadow-[0_2px_12px_rgba(240,192,90,0.2)] hover:shadow-[0_4px_20px_rgba(240,192,90,0.3)]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-black/20 border-t-black mr-2" />
                Researching...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <FlaskIcon size={16} className="mr-2" />
                Start Deep Research
              </span>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Progress Section */}
      {(loading || currentStep >= 0) && currentStep < 3 && (
        <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card animate-slide-up">
          <h3 className="text-sm font-bold text-content-1 mb-5">Research Progress</h3>
          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const isActive = currentStep === i;
              const isDone = currentStep > i;
              return (
                <div key={step.key} className={`flex items-start space-x-3 ${i > currentStep ? 'opacity-30' : ''}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border transition-all ${
                    isDone ? 'bg-accent/15 border-accent/30 text-accent' :
                    isActive ? 'bg-accent/10 border-accent/20 text-accent animate-pulse' :
                    'bg-surface-2 border-border text-content-3'
                  }`}>
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isDone || isActive ? 'text-content-1' : 'text-content-3'}`}>
                      {step.label}
                    </p>
                    {isActive && (
                      <p className="text-xs text-content-3 mt-0.5">{step.description}</p>
                    )}
                    {/* Show sub-queries after decompose */}
                    {step.key === 'decompose' && isDone && subQueries.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {subQueries.map((q, qi) => (
                          <span key={qi} className="px-2.5 py-1 bg-accent/10 text-accent rounded-lg text-[11px] border border-accent/15 font-medium">
                            {q.length > 50 ? `${q.substring(0, 50)}...` : q}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Show search stats after search */}
                    {step.key === 'search' && isDone && searchMeta && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className="px-2.5 py-1 bg-surface-2 text-content-2 rounded-md text-[11px] border border-border font-medium">
                          {searchMeta.totalChunks} chunks found
                        </span>
                        <span className="px-2.5 py-1 bg-surface-2 text-content-2 rounded-md text-[11px] border border-border font-medium">
                          {searchMeta.uniquePapers} unique papers
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Section */}
      {report && (
        <div className="space-y-4 animate-slide-up">
          {/* Overview */}
          <div className="bg-surface-1 rounded-xl border border-border border-l-4 border-l-accent/50 p-7 shadow-[0_1px_3px_rgba(0,0,0,0.3),0_0_24px_rgba(240,192,90,0.1)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <SparklesIcon size={16} className="text-accent" />
                <h3 className="text-base font-bold text-content-1">Research Overview</h3>
              </div>
              <div className="flex items-center space-x-1">
                <button onClick={() => addSearchBookmark(question, report.overview)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Bookmark">
                  <StarIcon size={16} />
                </button>
                <button onClick={copyReport} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Copy">
                  <CopyIcon size={16} />
                </button>
                <button onClick={() => exportResearchReport(question, report)} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all" title="Export as Markdown">
                  <ExportIcon size={16} />
                </button>
              </div>
            </div>
            <p className="text-content-2 text-sm leading-relaxed">{report.overview}</p>

            {metadata && (
              <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">
                <span className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-md text-xs border border-border font-medium">{metadata.model}</span>
                <span className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-md text-xs border border-border font-medium">{metadata.total_papers_analyzed} sources analyzed</span>
                <span className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-md text-xs border border-border font-medium">{metadata.unique_papers} unique papers</span>
                <span className="px-2.5 py-1 bg-surface-2 text-content-3 rounded-md text-xs border border-border font-medium">{metadata.sub_queries_count} sub-queries</span>
              </div>
            )}
          </div>

          {/* Key Findings */}
          {report.findings && report.findings.length > 0 && (
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Key Findings</h3>
              <div className="space-y-2">
                {report.findings.map((finding, i) => (
                  <div key={i} className="bg-surface-1 rounded-xl border border-border overflow-hidden transition-all">
                    <button
                      onClick={() => toggleFinding(i)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-surface-2/50 transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="w-6 h-6 rounded-md bg-accent/10 border border-accent/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-accent">{i + 1}</span>
                        </span>
                        <span className="text-sm font-medium text-content-1 truncate">{finding.theme}</span>
                      </div>
                      {expandedFindings[i] ? <ChevronUpIcon size={16} className="text-content-3 flex-shrink-0" /> : <ChevronDownIcon size={16} className="text-content-3 flex-shrink-0" />}
                    </button>
                    {expandedFindings[i] && (
                      <div className="px-5 pb-4 pt-0 border-t border-border/50 animate-fade-in">
                        <p className="text-content-2 text-sm leading-relaxed mt-3">{finding.content}</p>
                        {finding.source_indices && finding.source_indices.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {finding.source_indices.map(idx => {
                              const source = report.sources_used?.find(s => s.index === idx);
                              return (
                                <span key={idx} className="px-2 py-0.5 bg-accent/10 text-accent rounded text-[10px] border border-accent/15 font-medium">
                                  [{idx}] {source?.title ? (source.title.length > 30 ? `${source.title.substring(0, 30)}...` : source.title) : `Source ${idx}`}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contradictions & Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.contradictions && (
              <div className="bg-surface-1 rounded-xl border border-border p-5">
                <h4 className="text-xs font-bold text-content-1 mb-2 uppercase tracking-wider">Contradictions</h4>
                <p className="text-content-2 text-sm leading-relaxed">{report.contradictions}</p>
              </div>
            )}
            {report.gaps && (
              <div className="bg-surface-1 rounded-xl border border-border p-5">
                <h4 className="text-xs font-bold text-content-1 mb-2 uppercase tracking-wider">Research Gaps</h4>
                <p className="text-content-2 text-sm leading-relaxed">{report.gaps}</p>
              </div>
            )}
          </div>

          {/* Sources Used */}
          {report.sources_used && report.sources_used.length > 0 && (
            <div>
              <h3 className="text-[11px] uppercase tracking-[0.1em] text-content-3 mb-3 font-medium">Sources ({report.sources_used.length})</h3>
              <div className="bg-surface-1 rounded-xl border border-border divide-y divide-border">
                {report.sources_used.map((source, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-xs font-bold text-accent w-6 text-center flex-shrink-0">[{source.index}]</span>
                      <div className="min-w-0">
                        <p className="text-sm text-content-1 truncate">{source.title}</p>
                        {source.year && <p className="text-[11px] text-content-3">{source.year}</p>}
                      </div>
                    </div>
                    {source.relevance && (
                      <span className="text-[11px] text-content-3 flex-shrink-0 ml-3">{source.relevance}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
