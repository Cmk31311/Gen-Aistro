'use client';
import { useBookmarks } from '../../context/BookmarkContext';
import { StarIcon, StarFilledIcon, ExternalLinkIcon } from '../../ui/Icons';

export default function SourceCard({ source, index }) {
  const { isPaperBookmarked, togglePaperBookmark } = useBookmarks();
  const bookmarked = isPaperBookmarked(source.doc_id);

  return (
    <div className="bg-surface-1 rounded-xl border border-border border-l-2 border-l-accent/30 p-5 hover:border-border-hover hover:-translate-y-[2px] hover:shadow-card-hover transition-all duration-300 ease-out">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h4 className="text-content-1 font-medium text-base line-clamp-2 flex-1">
          {source.doc_title || 'Untitled'}
        </h4>
        <button
          onClick={() => togglePaperBookmark({ id: source.doc_id, title: source.doc_title, url: source.url })}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            bookmarked ? 'text-accent' : 'text-content-3 hover:text-accent hover:bg-surface-2'
          }`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {bookmarked ? <StarFilledIcon size={16} /> : <StarIcon size={16} />}
        </button>
      </div>

      <p className="text-content-2 text-sm leading-relaxed line-clamp-3 mb-3">
        {source.text}
      </p>

      <div className="flex items-center justify-between text-xs text-content-3">
        <div className="flex items-center space-x-3">
          <span>Relevance {(source.score * 100).toFixed(0)}%</span>
          {source.year && <span>{source.year}</span>}
        </div>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-content-3 hover:text-accent transition-colors"
          >
            View source
            <ExternalLinkIcon size={12} className="ml-1" />
          </a>
        )}
      </div>
    </div>
  );
}
