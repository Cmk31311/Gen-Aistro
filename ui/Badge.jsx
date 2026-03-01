'use client';

const VARIANTS = {
  default: 'bg-surface-2 text-content-2 border-border',
  accent: 'bg-accent-muted text-accent border-accent/25',
  success: 'bg-green-500/10 text-green-400 border-green-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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
          className="ml-1.5 hover:text-content-1 transition-colors"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
    </span>
  );
}
