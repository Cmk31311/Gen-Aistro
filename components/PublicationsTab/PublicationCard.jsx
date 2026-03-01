'use client';
import { useBookmarks } from '../../context/BookmarkContext';
import { StarIcon, StarFilledIcon, ExternalLinkIcon } from '../../ui/Icons';

export default function PublicationCard({ publication, onSelect, compareMode, isCompareSelected, onToggleCompare }) {
  const { isPaperBookmarked, togglePaperBookmark } = useBookmarks();
  const bookmarked = isPaperBookmarked(publication.id);

  return (
    <div
      className={`bg-surface-1 rounded-xl border p-5 cursor-pointer group transition-all duration-300 ease-out ${
        isCompareSelected
          ? 'border-accent/40 ring-1 ring-accent/15'
          : 'border-border hover:border-border-hover hover:bg-surface-2 hover:-translate-y-[2px] hover:shadow-card-hover'
      }`}
      onClick={() => {
        if (compareMode) onToggleCompare?.(publication);
        else if (publication.url) window.open(publication.url, '_blank', 'noopener,noreferrer');
        else onSelect?.(publication);
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-content-1 font-medium text-sm line-clamp-2 group-hover:text-content-1 transition-colors flex-1">
          {publication.title}
        </h4>
        <button
          onClick={(e) => { e.stopPropagation(); togglePaperBookmark(publication); }}
          className={`p-1 rounded transition-colors flex-shrink-0 ${bookmarked ? 'text-accent' : 'text-content-3 hover:text-accent'}`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {bookmarked ? <StarFilledIcon size={14} /> : <StarIcon size={14} />}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-content-3 mt-3">
        <div className="flex items-center space-x-2">
          {publication.year && <span>{publication.year}</span>}
          {publication.chunks?.length > 0 && <span>{publication.chunks.length} chunks</span>}
        </div>
        <div className="flex items-center space-x-2">
          {publication.url && <span className="inline-flex items-center"><ExternalLinkIcon size={12} className="mr-0.5" /> Link</span>}
          {compareMode && (
            <span className={`px-2 py-0.5 rounded text-xs ${isCompareSelected ? 'bg-accent-muted text-accent' : 'bg-surface-2 text-content-3'}`}>
              {isCompareSelected ? 'Selected' : 'Select'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
