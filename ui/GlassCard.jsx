'use client';

export default function GlassCard({ children, className = '', hover = false, onClick, variant = 'surface' }) {
  const variants = {
    surface: 'bg-[#12121a] border-[#2a2a3a]',
    elevated: 'bg-[#12121a] border-[#2a2a3a] hover:border-[#3a3a4a] hover:bg-[#1a1a25]',
    inset: 'bg-[#0a0a0f] border-[#222230]',
  };

  return (
    <div
      className={`rounded-xl border ${variants[variant]} ${
        hover || variant === 'elevated' ? 'transition-all duration-200 cursor-pointer' : ''
      } p-6 ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
