'use client';

const VARIANTS = {
  purple: 'bg-purple-500/20 text-purple-300',
  blue: 'bg-blue-500/20 text-blue-300',
  green: 'bg-green-500/20 text-green-300',
  red: 'bg-red-500/20 text-red-300',
  yellow: 'bg-yellow-500/20 text-yellow-300',
  cyan: 'bg-cyan-500/20 text-cyan-300',
};

export default function Badge({ children, variant = 'purple', className = '', onClick, removable, onRemove }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${VARIANTS[variant]} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
      {removable && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="ml-1 hover:text-white transition-colors"
          aria-label="Remove"
        >
          \u00d7
        </button>
      )}
    </span>
  );
}
