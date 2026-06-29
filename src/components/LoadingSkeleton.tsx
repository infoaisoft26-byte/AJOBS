import { Search, Loader2 } from "lucide-react";

export function SkeletonPulse() {
  return <div className="animate-pulse bg-gray-800 rounded" />;
}

export function DashboardSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-800/80 rounded animate-pulse" />
        </div>
        <div className="h-10 w-28 bg-gray-800 rounded animate-pulse" />
      </div>

      {/* KPI Bento Grid Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 bg-gray-900/60 border border-gray-850 rounded-xl space-y-3">
            <div className="h-4 w-24 bg-gray-800 rounded animate-pulse" />
            <div className="h-8 w-16 bg-gray-800 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Primary Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 bg-gray-900/40 border border-gray-800/60 rounded-2xl space-y-4">
          <div className="h-6 w-36 bg-gray-800 rounded animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-800/40">
                <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-1/4 bg-gray-800/60 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-900/40 border border-gray-800/60 rounded-2xl space-y-4">
          <div className="h-6 w-36 bg-gray-800 rounded animate-pulse" />
          <div className="space-y-3">
            <div className="h-24 bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-24 bg-gray-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="p-6 bg-gray-950 border border-gray-800/60 rounded-xl space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded bg-gray-850" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 bg-gray-850 rounded" />
          <div className="h-3.5 w-32 bg-gray-850/80 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3.5 w-full bg-gray-850 rounded" />
        <div className="h-3.5 w-5/6 bg-gray-850 rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-gray-850 rounded" />
        <div className="h-6 w-20 bg-gray-850 rounded" />
      </div>
    </div>
  );
}

export function GeneralLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400 font-mono gap-3">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="text-sm tracking-wide animate-pulse">Synchronizing Interface Matrix...</span>
    </div>
  );
}
