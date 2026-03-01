'use client';

export function Skeleton({ className = '', variant = 'rect' }) {
  const base = 'skeleton-shimmer rounded bg-white/10';
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
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-96 mb-6" />
        <Skeleton className="h-20 w-full mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export function PublicationGridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <Skeleton className="h-8 w-72 mb-4" />
        <Skeleton className="h-10 w-full mb-6" />
      </div>
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-black/30 rounded-lg border border-white/10 p-4">
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-3" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-20" variant="rect" />
                <Skeleton className="h-6 w-12" variant="rect" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48" />
          <div className="flex space-x-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
        </div>
        <div className="bg-black/30 rounded-lg p-6 border border-white/10">
          <Skeleton className="h-6 w-48 mb-4" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 mb-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-black/20 backdrop-blur-md rounded-xl border border-white/10 p-6">
        <div className="text-center mb-6">
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-black/30 rounded-lg border border-white/10 p-4">
              <div className="flex items-start justify-between mb-3">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-5 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4 mb-3" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
