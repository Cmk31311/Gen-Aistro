'use client';

const variants = {
  surface: 'bg-surface-1 border-border',
  elevated: 'bg-surface-1 border-border hover:border-border-hover hover:bg-surface-2 hover:shadow-card-hover hover:-translate-y-[2px] cursor-pointer transition-all duration-300 ease-out',
  inset: 'bg-bg border-border',
};

export default function GlassCard({ children, className = '', hover = false, onClick, variant = 'surface' }) {
  return (
    <div
      className={`rounded-xl border ${variants[variant]} ${
        hover && variant !== 'elevated' ? 'transition-all duration-200 cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
