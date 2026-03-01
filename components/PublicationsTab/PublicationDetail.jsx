'use client';
import { useMemo } from 'react';
import { useBookmarks } from '../../context/BookmarkContext';
import { usePapers } from '../../context/PapersContext';
import { extractKeyTerms, getPublicationAbstract } from '../../lib/paperUtils';
import { cosineSimilarity } from '../../utils/cosine';
import { StarIcon, StarFilledIcon, ExternalLinkIcon, CloseIcon } from '../../ui/Icons';

export default function PublicationDetail({ publication, onClose }) {
  const { isPaperBookmarked, togglePaperBookmark, bookmarks, addToReadingList } = useBookmarks();
  const { publications } = usePapers();
  const bookmarked = isPaperBookmarked(publication.id);
  const abstract = getPublicationAbstract(publication);
  const keyTerms = extractKeyTerms(publication.title + ' ' + abstract);

  const similarPapers = useMemo(() => {
    if (!publication.chunks?.[0]?.embedding || publications.length < 2) return [];
    const queryEmb = publication.chunks[0].embedding;
    return publications
      .filter(p => p.id !== publication.id && p.chunks?.[0]?.embedding)
      .map(p => ({ ...p, similarity: cosineSimilarity(queryEmb, p.chunks[0].embedding) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }, [publication, publications]);

  return (
    <div className="mt-6 bg-surface-1 rounded-xl border border-border p-6 animate-slide-up">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 mr-4">
          <h3 className="text-lg font-semibold text-content-1 tracking-tight">{publication.title}</h3>
          <p className="text-content-3 text-sm mt-1">ID: {publication.id}</p>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button onClick={() => togglePaperBookmark(publication)} className={`p-2 rounded-lg transition-colors ${bookmarked ? 'text-accent bg-accent-muted' : 'text-content-3 hover:text-accent hover:bg-surface-2'}`}>
            {bookmarked ? <StarFilledIcon size={16} /> : <StarIcon size={16} />}
          </button>
          {publication.url && (
            <button onClick={() => window.open(publication.url, '_blank', 'noopener,noreferrer')} className="p-2 rounded-lg text-content-3 hover:text-accent hover:bg-surface-2 transition-colors">
              <ExternalLinkIcon size={16} />
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-lg text-content-3 hover:text-content-1 hover:bg-surface-2 transition-colors">
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Year', value: publication.year || 'N/A' },
            { label: 'Chunks', value: `${publication.chunks?.length || 0} segments` },
            { label: 'Status', value: publication.url ? 'Online' : 'Metadata only' },
            { label: 'ID', value: publication.id },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-0.5">{label}</div>
              <div className="text-sm text-content-2">{value}</div>
            </div>
          ))}
        </div>

        {keyTerms.length > 0 && (
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-2">Key Terms</h4>
            <div className="flex flex-wrap gap-1.5">
              {keyTerms.map(term => (
                <span key={term} className="px-2.5 py-0.5 bg-surface-2 text-content-2 rounded-md text-xs border border-border">{term}</span>
              ))}
            </div>
          </div>
        )}

        {abstract && (
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-2">Text Preview</h4>
            <p className="text-content-2 text-sm leading-relaxed">{abstract}...</p>
          </div>
        )}

        {bookmarks.readingLists.length > 0 && (
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-2">Add to Reading List</h4>
            <div className="flex flex-wrap gap-2">
              {bookmarks.readingLists.map(list => (
                <button key={list.id} onClick={() => addToReadingList(list.id, publication)} className="px-3 py-1.5 bg-surface-2 text-content-2 rounded-lg text-xs hover:text-content-1 hover:bg-surface-3 border border-border transition-colors">
                  + {list.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {similarPapers.length > 0 && (
          <div>
            <h4 className="text-[11px] uppercase tracking-[0.08em] text-content-3 mb-2">Similar Papers</h4>
            <div className="space-y-1.5">
              {similarPapers.map(paper => (
                <div key={paper.id} className="flex items-center justify-between p-3 bg-bg rounded-lg border border-border hover:border-border-hover cursor-pointer transition-colors" onClick={() => paper.url && window.open(paper.url, '_blank', 'noopener,noreferrer')}>
                  <span className="text-content-2 text-sm line-clamp-1 flex-1 mr-3">{paper.title}</span>
                  <span className="text-xs text-content-3 flex-shrink-0">{(paper.similarity * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
