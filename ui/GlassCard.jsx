'use client';

const variants = {
  surface: 'bg-surface-1 border-border shadow-card',
  elevated: 'bg-surface-1 border-border shadow-card hover:border-accent/20 hover:shadow-card-hover hover:-translate-y-[2px] cursor-pointer transition-all duration-300 ease-out',
  inset: 'bg-bg border-border',
  accent: 'border-accent/15 bg-gradient-to-b from-accent/[0.04] to-transparent shadow-card',
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
