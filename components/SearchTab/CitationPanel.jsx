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
    <div className="bg-surface-1 rounded-xl border border-border p-7 animate-slide-up shadow-card">
      <h3 className="text-base font-bold text-content-1 tracking-tight mb-5">Citations</h3>
      <div className="space-y-6">
        {sources.map((source, index) => {
          const citations = generateCitation(source);
          return (
            <div key={index} className="space-y-3">
              <h4 className="text-sm font-semibold text-content-1">{source.doc_title || 'Untitled'}</h4>
              {FORMATS.map(({ label, key }) => {
                const copyKey = `${index}-${key}`;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] uppercase tracking-[0.1em] text-content-3 font-medium">{label}</span>
                      <button
                        onClick={() => copyToClipboard(citations[key], copyKey)}
                        className="p-1.5 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-all"
                        aria-label={`Copy ${label} citation`}
                      >
                        {copiedKey === copyKey ? (
                          <span className="text-xs text-green-400 font-medium">Copied</span>
                        ) : (
                          <CopyIcon size={13} />
                        )}
                      </button>
                    </div>
                    <div className="bg-bg border border-border border-l-[3px] border-l-accent/20 rounded-lg p-3.5 text-sm text-content-2 font-mono break-all leading-relaxed">
                      {citations[key]}
                    </div>
                  </div>
                );
              })}
              {index < sources.length - 1 && <div className="border-t border-border pt-3" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
