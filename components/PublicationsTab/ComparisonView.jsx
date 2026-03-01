'use client';
import { getPublicationAbstract, extractKeyTerms } from '../../lib/paperUtils';
import { CloseIcon } from '../../ui/Icons';

export default function ComparisonView({ papers, onClose }) {
  if (papers.length < 2) return null;

  const paperData = papers.map(p => ({
    ...p,
    abstract: getPublicationAbstract(p),
    terms: extractKeyTerms(p.title + ' ' + getPublicationAbstract(p))
  }));

  const allTermSets = paperData.map(p => new Set(p.terms));
  const commonTerms = paperData[0].terms.filter(t => allTermSets.every(s => s.has(t)));

  return (
    <div className="bg-surface-1 rounded-xl border border-accent/15 p-6 animate-slide-up">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-content-1 tracking-tight">Comparison</h3>
        <button onClick={onClose} className="p-2 rounded-lg text-content-3 hover:text-content-1 hover:bg-surface-2 transition-colors">
          <CloseIcon size={16} />
        </button>
      </div>

      <div className={`grid gap-4 ${papers.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {paperData.map((paper) => (
          <div key={paper.id} className="bg-bg rounded-lg border border-border p-4 space-y-3">
            <h4 className="text-content-1 font-medium text-sm">{paper.title}</h4>
            <div className="text-xs space-y-1">
              {[
                { label: 'Year', value: paper.year || 'N/A' },
                { label: 'Chunks', value: paper.chunks?.length || 0 },
                { label: 'Link', value: paper.url ? 'Available' : 'N/A' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-content-3">
                  <span>{label}</span>
                  <span className="text-content-2">{value}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-1.5">Key Terms</div>
              <div className="flex flex-wrap gap-1">
                {paper.terms.map(term => (
                  <span key={term} className={`px-2 py-0.5 rounded text-xs ${commonTerms.includes(term) ? 'bg-green-500/10 text-green-400 border border-green-500/15' : 'bg-surface-2 text-content-2 border border-border'}`}>{term}</span>
                ))}
                {paper.terms.length === 0 && <span className="text-content-3 text-xs">No terms detected</span>}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-1.5">Preview</div>
              <p className="text-content-3 text-xs leading-relaxed line-clamp-6">{paper.abstract || 'No text available'}</p>
            </div>
          </div>
        ))}
      </div>

      {commonTerms.length > 0 && (
        <div className="mt-4 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
          <span className="text-[11px] uppercase tracking-[0.08em] text-content-3">Common themes: </span>
          <span className="text-xs text-content-2">{commonTerms.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
