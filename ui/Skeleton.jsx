'use client';

export function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'skeleton-shimmer rounded bg-surface-2';
  const variants = {
    rect: '',
    circle: '!rounded-full',
    text: 'h-4 rounded-sm',
  };
  return <div className={`${base} ${variants[variant]} ${className}`} />;
}

export function SearchSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card">
        <Skeleton className="h-6 w-28 mb-2" />
        <Skeleton className="h-4 w-48 mb-5" />
        <Skeleton className="h-14 w-full mb-5 rounded-xl" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function PublicationGridSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card">
        <Skeleton className="h-7 w-44 mb-4" />
        <Skeleton className="h-11 w-full mb-6 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-surface-1 rounded-xl border border-border p-5 shadow-card">
            <Skeleton className="h-5 w-full mb-3" />
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
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-1 rounded-xl border border-border p-6 shadow-card">
            <Skeleton className="h-9 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 mb-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 flex-1 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-surface-1 rounded-xl border border-border p-7 shadow-card">
        <Skeleton className="h-7 w-36 mb-2" />
        <Skeleton className="h-4 w-56 mb-7" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg rounded-xl border border-border p-5">
              <Skeleton className="h-3 w-16 mb-3" />
              <Skeleton className="h-5 w-full mb-3" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-2/3 mb-5" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
