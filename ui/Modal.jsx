'use client';
import { useEffect, useCallback } from 'react';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`bg-slate-900/95 backdrop-blur-md rounded-xl border border-white/10 p-6 ${maxWidth} w-full max-h-[80vh] overflow-y-auto animate-modal-in`}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-2xl font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-blue-200/70 hover:text-white text-2xl font-bold p-2 hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close modal"
          >
            \u2715
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
