'use client';
import { useBookmarks } from '../../context/BookmarkContext';

export default function PublicationCard({ publication, index, onSelect, compareMode, isCompareSelected, onToggleCompare }) {
  const { isPaperBookmarked, togglePaperBookmark } = useBookmarks();
  const bookmarked = isPaperBookmarked(publication.id);

  return (
    <div
      className={`bg-black/30 backdrop-blur-sm rounded-lg border p-4 hover:bg-black/40 transition-all duration-200 cursor-pointer group ${
        isCompareSelected ? 'border-purple-500/50 ring-1 ring-purple-500/30' : 'border-white/10 hover:border-white/20'
      }`}
      onClick={() => {
        if (compareMode) {
          onToggleCompare?.(publication);
        } else if (publication.url) {
          window.open(publication.url, '_blank', 'noopener,noreferrer');
        } else {
          onSelect?.(publication);
        }
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-semibold text-sm line-clamp-2 group-hover:text-blue-200 transition-colors flex-1 mr-2">
          {publication.title}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePaperBookmark(publication);
          }}
          className={`text-lg transition-colors flex-shrink-0 ${bookmarked ? 'text-yellow-400' : 'text-blue-200/30 hover:text-yellow-400'}`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {bookmarked ? '\u2605' : '\u2606'}
        </button>
      </div>
      <div className="flex items-center justify-between text-xs text-blue-200/70">
        <div className="flex items-center space-x-2">
          {publication.url && (
            <span className="text-green-300 bg-green-500/20 px-2 py-1 rounded-full text-xs">
              {'\uD83D\uDD17'} Link
            </span>
          )}
          <span className="text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">
            #{index + 1}
          </span>
          {compareMode && (
            <span className={`px-2 py-1 rounded-full text-xs ${isCompareSelected ? 'bg-purple-500/30 text-purple-300' : 'bg-black/30 text-blue-200/50'}`}>
              {isCompareSelected ? 'Selected' : 'Select'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
