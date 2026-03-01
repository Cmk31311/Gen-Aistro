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
    <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-6">
      <h3 className="text-base font-medium text-zinc-200 mb-4">Citations</h3>
      <div className="space-y-5">
        {sources.map((source, index) => {
          const citations = generateCitation(source);
          return (
            <div key={index} className="space-y-3">
              <h4 className="text-sm font-medium text-zinc-300">{source.doc_title || 'Untitled'}</h4>
              {FORMATS.map(({ label, key }) => {
                const copyKey = `${index}-${key}`;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-500">{label}</span>
                      <button
                        onClick={() => copyToClipboard(citations[key], copyKey)}
                        className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
                        aria-label={`Copy ${label} citation`}
                      >
                        {copiedKey === copyKey ? (
                          <span className="text-xs text-green-500">Copied</span>
                        ) : (
                          <CopyIcon size={12} />
                        )}
                      </button>
                    </div>
                    <div className="bg-[#0a0a0f] border border-[#2a2a3a] rounded-lg p-3 text-sm text-zinc-400 font-mono break-all leading-relaxed">
                      {citations[key]}
                    </div>
                  </div>
                );
              })}
              {index < sources.length - 1 && <div className="border-t border-[#2a2a3a] pt-2" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
