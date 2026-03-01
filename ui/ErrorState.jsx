'use client';
import { AlertIcon } from './Icons';

export default function ErrorState({ message, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="bg-surface-1 rounded-xl border border-red-500/20 p-8 text-center shadow-card">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 mb-4 animate-fade-in">
        <AlertIcon size={22} />
      </div>
      <h3 className="text-content-1 text-base font-semibold mb-2">{title}</h3>
      <p className="text-content-3 text-sm mb-6 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2.5 bg-surface-2 text-content-1 rounded-lg border border-border hover:border-border-hover hover:shadow-glow transition-all text-sm font-medium active:scale-[0.98]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
