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
      <div className="bg-surface-1 rounded-xl border border-border p-6">
        <Skeleton className="h-5 w-24 mb-4" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}

export function PublicationGridSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-surface-1 rounded-xl border border-border p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-10 w-full mb-6" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-surface-1 rounded-xl border border-border p-5">
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
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface-1 rounded-xl border border-border p-5">
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="bg-surface-1 rounded-xl border border-border p-6">
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
    <div className="space-y-6 animate-fade-in">
      <div className="bg-surface-1 rounded-xl border border-border p-6">
        <Skeleton className="h-6 w-32 mb-2" />
        <Skeleton className="h-4 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-bg rounded-xl border border-border p-5">
              <Skeleton className="h-3 w-16 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-3 w-2/3 mb-4" />
              <Skeleton className="h-1 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
