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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`bg-[#12121a] border border-[#2a2a3a] rounded-2xl shadow-2xl shadow-black/50 ${maxWidth} w-full max-h-[80vh] overflow-y-auto animate-modal-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a3a]">
          <h3 className="text-lg font-medium text-zinc-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 p-1.5 hover:bg-[#1a1a25] rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
