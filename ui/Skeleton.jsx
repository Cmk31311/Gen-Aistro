'use client';

export function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'skeleton-shimmer rounded bg-[#1a1a25]';
  const variants = {
    rect: '',
    circle: '!rounded-full',
    text: 'h-4 rounded-sm',
  };
  return <div className={`${base} ${variants[variant]} ${className}`} />;
}

export function SearchSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Skeleton className="h-14 w-full mb-4" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export function PublicationGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-6">
        <Skeleton className="h-8 w-72 mb-4" />
        <Skeleton className="h-10 w-full mb-6" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-5">
            <Skeleton className="h-5 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-5">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[#12121a] rounded-xl border border-[#2a2a3a] p-5">
          <Skeleton className="h-4 w-20 mb-3" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4 mb-4" />
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}
