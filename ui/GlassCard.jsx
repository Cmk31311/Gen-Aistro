'use client';

export default function GlassCard({ children, className = '', hover = false, onClick }) {
  return (
    <div
      className={`bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6 ${
        hover ? 'hover:bg-black/30 hover:border-white/20 transition-all duration-200 cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
