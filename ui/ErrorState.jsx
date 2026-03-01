'use client';

export default function ErrorState({ message, onRetry, title = 'Something went wrong' }) {
  return (
    <div className="bg-red-500/10 backdrop-blur-md rounded-xl border border-red-500/20 p-8 text-center">
      <div className="text-red-300 text-5xl mb-4">!</div>
      <h3 className="text-red-200 text-lg font-semibold mb-2">{title}</h3>
      <p className="text-red-200/70 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors font-medium"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
