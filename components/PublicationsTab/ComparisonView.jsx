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
    <div className="bg-[#12121a] rounded-xl border border-indigo-500/20 p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-medium text-zinc-200">Comparison</h3>
        <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a25] transition-colors">
          <CloseIcon size={16} />
        </button>
      </div>

      <div className={`grid gap-4 ${papers.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {paperData.map((paper) => (
          <div key={paper.id} className="bg-[#0a0a0f] rounded-lg border border-[#222230] p-4 space-y-3">
            <h4 className="text-zinc-200 font-medium text-sm">{paper.title}</h4>

            <div className="text-xs space-y-1">
              {[
                { label: 'Year', value: paper.year || 'N/A' },
                { label: 'Chunks', value: paper.chunks?.length || 0 },
                { label: 'Link', value: paper.url ? 'Available' : 'N/A' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-zinc-500">
                  <span>{label}</span>
                  <span className="text-zinc-400">{value}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs text-zinc-500 mb-1.5">Key Terms</div>
              <div className="flex flex-wrap gap-1">
                {paper.terms.map(term => (
                  <span
                    key={term}
                    className={`px-2 py-0.5 rounded text-xs ${
                      commonTerms.includes(term)
                        ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                        : 'bg-[#1a1a25] text-zinc-400 border border-[#2a2a3a]'
                    }`}
                  >
                    {term}
                  </span>
                ))}
                {paper.terms.length === 0 && <span className="text-zinc-600 text-xs">No terms detected</span>}
              </div>
            </div>

            <div>
              <div className="text-xs text-zinc-500 mb-1.5">Preview</div>
              <p className="text-zinc-500 text-xs leading-relaxed line-clamp-6">
                {paper.abstract || 'No text available'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {commonTerms.length > 0 && (
        <div className="mt-4 p-3 bg-green-500/5 rounded-lg border border-green-500/10">
          <span className="text-xs text-zinc-500">Common themes: </span>
          <span className="text-xs text-zinc-400">{commonTerms.join(', ')}</span>
        </div>
      )}
    </div>
  );
}
