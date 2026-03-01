'use client';
import { useBookmarks } from '../../context/BookmarkContext';

export default function SourceCard({ source, index }) {
  const { isPaperBookmarked, togglePaperBookmark } = useBookmarks();
  const bookmarked = isPaperBookmarked(source.doc_id);

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 p-4 hover:bg-black/40 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-semibold text-sm line-clamp-2 flex-1 mr-2">
          {source.doc_title || 'Untitled'}
        </h4>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => togglePaperBookmark({ id: source.doc_id, title: source.doc_title, url: source.url })}
            className={`text-lg transition-colors ${bookmarked ? 'text-yellow-400' : 'text-blue-200/40 hover:text-yellow-400'}`}
            aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            {bookmarked ? '\u2605' : '\u2606'}
          </button>
          <span className="text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full text-xs">
            Score: {(source.score * 100).toFixed(1)}%
          </span>
          {source.year && (
            <span className="text-blue-300 bg-blue-500/20 px-2 py-1 rounded-full text-xs">
              {source.year}
            </span>
          )}
        </div>
      </div>
      <p className="text-blue-200/80 text-sm leading-relaxed line-clamp-3">
        {source.text}
      </p>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center mt-2 text-green-300 hover:text-green-200 text-sm font-medium transition-colors"
        >
          \uD83D\uDD17 View Source
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </div>
  );
}
