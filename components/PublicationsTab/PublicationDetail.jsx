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
    <div className="mt-6 bg-[#12121a] rounded-xl border border-[#2a2a3a] p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 mr-4">
          <h3 className="text-lg font-medium text-zinc-100">{publication.title}</h3>
          <p className="text-zinc-500 text-sm mt-1">ID: {publication.id}</p>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={() => togglePaperBookmark(publication)}
            className={`p-2 rounded-lg transition-colors ${bookmarked ? 'text-indigo-400 bg-indigo-500/10' : 'text-zinc-500 hover:text-indigo-400 hover:bg-[#1a1a25]'}`}
          >
            {bookmarked ? <StarFilledIcon size={16} /> : <StarIcon size={16} />}
          </button>
          {publication.url && (
            <button
              onClick={() => window.open(publication.url, '_blank', 'noopener,noreferrer')}
              className="p-2 rounded-lg text-zinc-500 hover:text-indigo-400 hover:bg-[#1a1a25] transition-colors"
            >
              <ExternalLinkIcon size={16} />
            </button>
          )}
          <button onClick={onClose} className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1a25] transition-colors">
            <CloseIcon size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Year', value: publication.year || 'N/A' },
            { label: 'Chunks', value: `${publication.chunks?.length || 0} segments` },
            { label: 'Status', value: publication.url ? 'Online' : 'Metadata only' },
            { label: 'ID', value: publication.id },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-xs text-zinc-500 mb-0.5">{label}</div>
              <div className="text-sm text-zinc-300">{value}</div>
            </div>
          ))}
        </div>

        {/* Key Terms */}
        {keyTerms.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Key Terms</h4>
            <div className="flex flex-wrap gap-1.5">
              {keyTerms.map(term => (
                <span key={term} className="px-2.5 py-0.5 bg-[#1a1a25] text-zinc-400 rounded-md text-xs border border-[#2a2a3a]">
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Abstract */}
        {abstract && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Text Preview</h4>
            <p className="text-zinc-400 text-sm leading-relaxed">{abstract}...</p>
          </div>
        )}

        {/* Reading Lists */}
        {bookmarks.readingLists.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Add to Reading List</h4>
            <div className="flex flex-wrap gap-2">
              {bookmarks.readingLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => addToReadingList(list.id, publication)}
                  className="px-3 py-1.5 bg-[#1a1a25] text-zinc-400 rounded-lg text-xs hover:text-zinc-200 hover:bg-[#22222e] border border-[#2a2a3a] transition-colors"
                >
                  + {list.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Similar Papers */}
        {similarPapers.length > 0 && (
          <div>
            <h4 className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Similar Papers</h4>
            <div className="space-y-1.5">
              {similarPapers.map(paper => (
                <div
                  key={paper.id}
                  className="flex items-center justify-between p-3 bg-[#0a0a0f] rounded-lg border border-[#222230] hover:border-[#2a2a3a] cursor-pointer transition-colors"
                  onClick={() => paper.url && window.open(paper.url, '_blank', 'noopener,noreferrer')}
                >
                  <span className="text-zinc-400 text-sm line-clamp-1 flex-1 mr-3">{paper.title}</span>
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {(paper.similarity * 100).toFixed(0)}% match
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
