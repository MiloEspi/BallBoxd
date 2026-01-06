'use client';

// Skeleton placeholder for match cards.
export default function SkeletonMatchCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-5 w-10 rounded bg-slate-800/70" />
          <div className="h-4 w-32 rounded bg-slate-800/70" />
          <div className="h-4 w-16 rounded bg-slate-800/70" />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-8">
        <div className="flex flex-wrap items-center gap-6">
          <div className="h-24 w-24 rounded-full bg-slate-800/70" />
          <div className="space-y-2">
            <div className="h-4 w-24 rounded bg-slate-800/70" />
            <div className="h-4 w-16 rounded bg-slate-800/70" />
          </div>
        </div>
        <div className="space-y-3 text-right">
          <div className="h-5 w-40 rounded bg-slate-800/70" />
          <div className="h-4 w-24 rounded bg-slate-800/70" />
          <div className="h-5 w-32 rounded bg-slate-800/70" />
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="h-9 w-32 rounded-full bg-slate-800/70" />
        <div className="h-9 w-32 rounded-full bg-slate-800/70" />
      </div>
    </div>
  );
}
