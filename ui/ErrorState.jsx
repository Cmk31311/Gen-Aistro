'use client';
import { AlertIcon } from './Icons';

export default function ErrorState({ message, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="bg-surface-1 rounded-xl border border-red-500/15 p-8 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 text-red-400 mb-4">
        <AlertIcon size={20} />
      </div>
      <h3 className="text-content-1 text-base font-medium mb-2">{title}</h3>
      <p className="text-content-3 text-sm mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-surface-2 text-content-2 rounded-lg border border-border hover:border-border-hover hover:text-content-1 transition-colors text-sm active:scale-[0.98]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
