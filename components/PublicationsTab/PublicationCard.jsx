'use client';
import { useBookmarks } from '../../context/BookmarkContext';
import { StarIcon, StarFilledIcon, ExternalLinkIcon } from '../../ui/Icons';

export default function PublicationCard({ publication, onSelect, compareMode, isCompareSelected, onToggleCompare }) {
  const { isPaperBookmarked, togglePaperBookmark } = useBookmarks();
  const bookmarked = isPaperBookmarked(publication.id);

  return (
    <div
      className={`bg-surface-1 rounded-xl border p-5 cursor-pointer group transition-all duration-300 ease-out shadow-card ${
        isCompareSelected
          ? 'border-accent/40 ring-1 ring-accent/20 shadow-glow'
          : 'border-border hover:border-accent/20 hover:bg-surface-2 hover:-translate-y-[2px] hover:shadow-card-hover'
      }`}
      onClick={() => {
        if (compareMode) onToggleCompare?.(publication);
        else if (publication.url) window.open(publication.url, '_blank', 'noopener,noreferrer');
        else onSelect?.(publication);
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="text-content-1 font-medium text-[15px] line-clamp-2 group-hover:text-content-1 transition-colors flex-1 leading-snug">
          {publication.title}
        </h4>
        <button
          onClick={(e) => { e.stopPropagation(); togglePaperBookmark(publication); }}
          className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${bookmarked ? 'text-accent' : 'text-content-3 hover:text-accent'}`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {bookmarked ? <StarFilledIcon size={14} /> : <StarIcon size={14} />}
        </button>
      </div>

      <div className="flex items-center justify-between text-xs text-content-3 mt-3">
        <div className="flex items-center space-x-2">
          {publication.year && <span className="px-2 py-0.5 bg-surface-2 rounded-md border border-border">{publication.year}</span>}
          {publication.chunkCount > 0 && <span>{publication.chunkCount} chunks</span>}
        </div>
        <div className="flex items-center space-x-2">
          {publication.url && (
            <span className="inline-flex items-center text-accent/60">
              <ExternalLinkIcon size={12} className="mr-0.5" />
            </span>
          )}
          {compareMode && (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${isCompareSelected ? 'bg-accent-muted text-accent border border-accent/20' : 'bg-surface-2 text-content-3 border border-border'}`}>
              {isCompareSelected ? 'Selected' : 'Select'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
