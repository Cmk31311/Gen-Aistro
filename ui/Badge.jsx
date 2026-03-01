'use client';

const VARIANTS = {
  default: 'bg-[#1a1a25] text-zinc-400 border-[#2a2a3a]',
  accent: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export default function Badge({ children, variant = 'default', className = '', onClick, removable, onRemove }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${VARIANTS[variant]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="ml-1.5 hover:text-zinc-200 transition-colors"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
    </span>
  );
}
