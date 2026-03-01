'use client';
import { getPublicationAbstract, extractKeyTerms } from '../../lib/paperUtils';

export default function ComparisonView({ papers, onClose }) {
  if (papers.length < 2) return null;

  const paperData = papers.map(p => ({
    ...p,
    abstract: getPublicationAbstract(p),
    terms: extractKeyTerms(p.title + ' ' + getPublicationAbstract(p))
  }));

  // Find common and unique terms
  const allTermSets = paperData.map(p => new Set(p.terms));
  const commonTerms = paperData[0].terms.filter(t => allTermSets.every(s => s.has(t)));

  return (
    <div className="bg-black/20 backdrop-blur-md rounded-xl border border-purple-500/20 p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white">
          {'\u2696\uFE0F'} Paper Comparison
        </h3>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors"
        >
          Close Comparison
        </button>
      </div>

      {/* Side by side */}
      <div className={`grid gap-4 ${papers.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {paperData.map((paper, i) => (
          <div key={paper.id} className="bg-black/30 rounded-lg border border-white/10 p-4 space-y-3">
            <h4 className="text-white font-semibold text-sm">{paper.title}</h4>

            <div className="text-xs space-y-1 text-blue-200/70">
              <div><span className="font-medium text-blue-200">ID:</span> {paper.id}</div>
              <div><span className="font-medium text-blue-200">Year:</span> {paper.year || 'N/A'}</div>
              <div><span className="font-medium text-blue-200">Chunks:</span> {paper.chunks?.length || 0}</div>
              <div><span className="font-medium text-blue-200">Link:</span> {paper.url ? 'Available' : 'N/A'}</div>
            </div>

            {/* Key Terms */}
            <div>
              <div className="text-xs font-semibold text-blue-200 mb-1">Key Terms</div>
              <div className="flex flex-wrap gap-1">
                {paper.terms.map(term => (
                  <span
                    key={term}
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      commonTerms.includes(term)
                        ? 'bg-green-500/20 text-green-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}
                  >
                    {term}
                  </span>
                ))}
                {paper.terms.length === 0 && <span className="text-blue-200/40 text-xs">No key terms detected</span>}
              </div>
            </div>

            {/* Abstract */}
            <div>
              <div className="text-xs font-semibold text-blue-200 mb-1">Text Preview</div>
              <p className="text-blue-200/70 text-xs leading-relaxed line-clamp-6">
                {paper.abstract || 'No text available'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Common terms */}
      {commonTerms.length > 0 && (
        <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <span className="text-sm font-medium text-green-300">Common themes: </span>
          <span className="text-sm text-green-200/80">{commonTerms.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
