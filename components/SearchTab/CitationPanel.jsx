'use client';
import { useState, useCallback } from 'react';
import { generateBibTeXCitation } from '../../lib/exportUtils';
import { CopyIcon } from '../../ui/Icons';

const FORMATS = [
  { label: 'APA', key: 'apa' },
  { label: 'MLA', key: 'mla' },
  { label: 'Chicago', key: 'chicago' },
  { label: 'BibTeX', key: 'bibtex' },
];

export default function CitationPanel({ sources }) {
  const [copiedKey, setCopiedKey] = useState(null);

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

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {}
  };

  return (
    <div className="bg-surface-1 rounded-xl border border-border p-6 animate-slide-up">
      <h3 className="text-base font-semibold text-content-1 tracking-tight mb-4">Citations</h3>
      <div className="space-y-5">
        {sources.map((source, index) => {
          const citations = generateCitation(source);
          return (
            <div key={index} className="space-y-3">
              <h4 className="text-sm font-medium text-content-2">{source.doc_title || 'Untitled'}</h4>
              {FORMATS.map(({ label, key }) => {
                const copyKey = `${index}-${key}`;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] uppercase tracking-[0.08em] text-content-3">{label}</span>
                      <button
                        onClick={() => copyToClipboard(citations[key], copyKey)}
                        className="p-1 rounded text-content-3 hover:text-content-1 transition-colors"
                        aria-label={`Copy ${label} citation`}
                      >
                        {copiedKey === copyKey ? (
                          <span className="text-xs text-green-400">Copied</span>
                        ) : (
                          <CopyIcon size={12} />
                        )}
                      </button>
                    </div>
                    <div className="bg-bg border border-border rounded-lg p-3 text-sm text-content-2 font-mono break-all leading-relaxed">
                      {citations[key]}
                    </div>
                  </div>
                );
              })}
              {index < sources.length - 1 && <div className="border-t border-border pt-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
