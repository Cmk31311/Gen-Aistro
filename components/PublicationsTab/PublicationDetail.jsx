'use client';
import { useMemo } from 'react';
import { useBookmarks } from '../../context/BookmarkContext';
import { usePapers } from '../../context/PapersContext';
import { extractKeyTerms, getPublicationAbstract } from '../../lib/paperUtils';
import { cosineSimilarity } from '../../utils/cosine';

export default function PublicationDetail({ publication, onClose, onAddToList }) {
  const { isPaperBookmarked, togglePaperBookmark, bookmarks, addToReadingList } = useBookmarks();
  const { publications } = usePapers();
  const bookmarked = isPaperBookmarked(publication.id);
  const abstract = getPublicationAbstract(publication);
  const keyTerms = extractKeyTerms(publication.title + ' ' + abstract);

  // Similar papers based on embedding similarity
  const similarPapers = useMemo(() => {
    if (!publication.chunks?.[0]?.embedding || publications.length < 2) return [];
    const queryEmb = publication.chunks[0].embedding;
    const scores = publications
      .filter(p => p.id !== publication.id && p.chunks?.[0]?.embedding)
      .map(p => ({
        ...p,
        similarity: cosineSimilarity(queryEmb, p.chunks[0].embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
    return scores;
  }, [publication, publications]);

  return (
    <div className="mt-6 bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6 animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 mr-4">
          <h3 className="text-2xl font-bold text-white flex items-center">
            <span className="mr-3">{'\uD83D\uDCC4'}</span>
            {publication.title}
          </h3>
          <p className="text-blue-200/70 text-lg">Publication ID: {publication.id}</p>
        </div>
        <div className="flex space-x-2 flex-shrink-0">
          <button
            onClick={() => togglePaperBookmark(publication)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              bookmarked ? 'bg-yellow-500/20 text-yellow-300' : 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
            }`}
          >
            {bookmarked ? '\u2605 Bookmarked' : '\u2606 Bookmark'}
          </button>
          {publication.url && (
            <button
              onClick={() => window.open(publication.url, '_blank', 'noopener,noreferrer')}
              className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
            >
              {'\uD83D\uDD17'} Open Publication
            </button>
          )}
          <button
            onClick={onClose}
            className="text-blue-200/70 hover:text-white text-2xl font-bold p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close details"
          >
            {'\u2715'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Details Grid */}
        <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
          <h4 className="text-lg font-bold text-white mb-3">Publication Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-200/80 text-sm">
            <div>
              <span className="font-medium">ID:</span>
              <p className="text-white">{publication.id}</p>
            </div>
            <div>
              <span className="font-medium">Year:</span>
              <p className="text-white">{publication.year || 'N/A'}</p>
            </div>
            <div>
              <span className="font-medium">Chunks:</span>
              <p className="text-white">{publication.chunks?.length || 0} text segments</p>
            </div>
            <div>
              <span className="font-medium">Status:</span>
              <p className="text-green-300">{publication.url ? 'Available Online' : 'Metadata Only'}</p>
            </div>
          </div>
        </div>

        {/* Key Terms */}
        {keyTerms.length > 0 && (
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <h4 className="text-lg font-bold text-white mb-3">Key Terms</h4>
            <div className="flex flex-wrap gap-2">
              {keyTerms.map(term => (
                <span key={term} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                  {term}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Abstract/Preview */}
        {abstract && (
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <h4 className="text-lg font-bold text-white mb-3">Text Preview</h4>
            <p className="text-blue-200/80 text-sm leading-relaxed">{abstract}...</p>
          </div>
        )}

        {/* Reading Lists */}
        {bookmarks.readingLists.length > 0 && (
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <h4 className="text-lg font-bold text-white mb-3">Add to Reading List</h4>
            <div className="flex flex-wrap gap-2">
              {bookmarks.readingLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => addToReadingList(list.id, publication)}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
                >
                  + {list.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Similar Papers */}
        {similarPapers.length > 0 && (
          <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            <h4 className="text-lg font-bold text-white mb-3">{'\uD83D\uDD2C'} Similar Papers</h4>
            <div className="space-y-2">
              {similarPapers.map(paper => (
                <div
                  key={paper.id}
                  className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5 hover:bg-black/40 cursor-pointer transition-colors"
                  onClick={() => paper.url && window.open(paper.url, '_blank', 'noopener,noreferrer')}
                >
                  <span className="text-blue-200 text-sm line-clamp-1 flex-1 mr-3">{paper.title}</span>
                  <span className="text-purple-300 text-xs bg-purple-500/20 px-2 py-1 rounded-full flex-shrink-0">
                    {(paper.similarity * 100).toFixed(1)}% match
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
