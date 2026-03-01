'use client';
import { useCallback } from 'react';
import { generateBibTeXCitation } from '../../lib/exportUtils';

export default function CitationPanel({ sources }) {
  const generateCitation = useCallback((source) => {
    const year = source.year || new Date().getFullYear();
    const title = source.doc_title || 'Untitled';
    const url = source.url || '';

    return {
      apa: `${title} (${year}). NASA Space Biology Research. ${url ? `Retrieved from ${url}` : 'NASA Publication Database.'}`,
      mla: `"${title}." NASA Space Biology Research, ${year}. ${url ? `Web. ${new Date().toLocaleDateString()}. <${url}>.` : 'Print.'}`,
      chicago: `${title}. NASA Space Biology Research. ${year}. ${url ? url : 'NASA Publication Database.'}`,
      bibtex: generateBibTeXCitation(source)
    };
  }, []);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
    }
  };

  return (
    <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <span className="mr-3">{'\uD83D\uDCDD'}</span>
        Citation Generator
      </h3>
      <div className="space-y-4">
        {sources.map((source, index) => {
          const citations = generateCitation(source);
          return (
            <div key={index} className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4">
              <h4 className="text-white font-semibold mb-3">{source.doc_title || 'Untitled'}</h4>
              <div className="space-y-3">
                {[
                  { label: 'APA Style', key: 'apa' },
                  { label: 'MLA Style', key: 'mla' },
                  { label: 'Chicago Style', key: 'chicago' },
                  { label: 'BibTeX', key: 'bibtex' }
                ].map(({ label, key }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-semibold text-blue-200">{label}</label>
                      <button
                        onClick={() => copyToClipboard(citations[key])}
                        className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
                        aria-label={`Copy ${label} citation`}
                      >
                        Copy
                      </button>
                    </div>
                    <div className="bg-black/40 rounded p-3 text-sm text-blue-200/80 font-mono break-all">
                      {citations[key]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
