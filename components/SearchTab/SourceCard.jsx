'use client';
import { motion } from 'framer-motion';
import { useBookmarks } from '../../context/BookmarkContext';
import { StarIcon, StarFilledIcon, ExternalLinkIcon } from '../../ui/Icons';

export default function SourceCard({ source, index }) {
  const { isPaperBookmarked, togglePaperBookmark } = useBookmarks();
  const bookmarked = isPaperBookmarked(source.doc_id);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }}
      className="glass-panel rounded-2xl border-l-[3px] border-l-accent p-6 transition-all duration-300 shadow-xl group cursor-default"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-4 flex-1">
          <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-accent/15 text-accent text-xs font-bold flex items-center justify-center border border-accent/20 shadow-[0_0_10px_rgba(229,169,61,0.1)]">
            0{index + 1}
          </span>
          <h4 className="text-content-1 font-semibold text-[16px] line-clamp-2 flex-1 leading-snug tracking-tight">
            {source.doc_title || 'Untitled Protocol'}
          </h4>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => togglePaperBookmark({ id: source.doc_id, title: source.doc_title, url: source.url })}
          className={`p-2 rounded-xl transition-all flex-shrink-0 ${
            bookmarked ? 'text-accent bg-accent/10 border-accent/20' : 'text-content-3 hover:text-accent glass-panel border-white/5'
          }`}
          aria-label={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
          {bookmarked ? <StarFilledIcon size={16} /> : <StarIcon size={16} />}
        </motion.button>
      </div>

      <p className="text-content-2 text-[14px] leading-relaxed line-clamp-3 mb-5 pl-12">
        {source.text}
      </p>

      <div className="flex items-center justify-between text-xs text-content-3 pl-12 border-t border-white/5 pt-4">
        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 bg-accent/10 text-accent border border-accent/20 rounded-md font-bold tracking-widest uppercase text-[10px]">{(source.score * 100).toFixed(0)}% MATCH</span>
          {source.year && <span className="text-content-3 font-medium uppercase tracking-widest">{source.year}</span>}
        </div>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-content-3 hover:text-accent transition-colors font-semibold uppercase tracking-wider text-[10px]"
          >
            View Source
            <ExternalLinkIcon size={12} className="ml-1.5" />
          </a>
        )}
      </div>
    </motion.div>
  );
}
