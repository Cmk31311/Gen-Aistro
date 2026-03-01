'use client';
import { AlertIcon } from './Icons';

export default function ErrorState({ message, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="bg-[#12121a] rounded-xl border border-red-500/20 p-8 text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10 text-red-400 mb-4">
        <AlertIcon size={20} />
      </div>
      <h3 className="text-zinc-200 text-base font-medium mb-2">{title}</h3>
      <p className="text-zinc-500 text-sm mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-[#1a1a25] text-zinc-300 rounded-lg border border-[#2a2a3a] hover:border-[#3a3a4a] transition-colors text-sm font-medium"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
