'use client';
import { useEffect, useCallback } from 'react';
import { CloseIcon } from './Icons';

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
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`bg-surface-1 border border-border border-t-accent/25 rounded-2xl shadow-[0_24px_80px_rgba(240,192,90,0.06),0_8px_24px_rgba(0,0,0,0.5)] ${maxWidth} w-full max-h-[85vh] flex flex-col animate-modal-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-content-1 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-content-3 hover:text-content-1 p-1.5 hover:bg-surface-2 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon size={16} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
