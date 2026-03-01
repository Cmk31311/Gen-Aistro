'use client';
import { useBookmarks } from '../../context/BookmarkContext';
import { StarIcon, StarFilledIcon, ExternalLinkIcon } from '../../ui/Icons';

export default function PublicationCard({ publication, onSelect, compareMode, isCompareSelected, onToggleCompare }) {
  const { isPaperBookmarked, togglePaperBookmark } = useBookmarks();
  const bookmarked = isPaperBookmarked(publication.id);

  return (
    <div
      className={`bg-[#12121a] rounded-xl border p-5 transition-all duration-200 cursor-pointer group ${
        isCompareSelected
          ? 'border-indigo-500/50 ring-1 ring-indigo-500/20'
          : 'border-[#2a2a3a] hover:border-[#3a3a4a] hover:bg-[#1a1a25]'
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
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-zinc-200 font-medium text-sm line-clamp-2 group-hover:text-zinc-100 transition-colors flex-1">
          {publication.title}
        </h4>
        <button
          onClick={(e) => { e.stopPropagation(); togglePaperBookmark(publication); }}
          className={`p-1 rounded transition-colors flex-shrink-0 ${bookmarked ? 'text-indigo-400' : 'text-zinc-600 hover:text-indigo-400'}`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {bookmarked ? <StarFilledIcon size={14} /> : <StarIcon size={14} />}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 mt-3">
        <div className="flex items-center space-x-2">
          {publication.year && <span>{publication.year}</span>}
          {publication.chunks?.length > 0 && <span>{publication.chunks.length} chunks</span>}
        </div>
        <div className="flex items-center space-x-2">
          {publication.url && (
            <span className="inline-flex items-center text-zinc-500">
              <ExternalLinkIcon size={12} className="mr-0.5" /> Link
            </span>
          )}
          {compareMode && (
            <span className={`px-2 py-0.5 rounded text-xs ${isCompareSelected ? 'bg-indigo-500/15 text-indigo-400' : 'bg-[#1a1a25] text-zinc-500'}`}>
              {isCompareSelected ? 'Selected' : 'Select'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
