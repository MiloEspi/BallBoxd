'use client';

type SkeletonBlockProps = {
  className?: string;
};

// Simple skeleton block for loading states.
export default function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      className={`animate-pulse rounded-2xl border border-slate-800/60 bg-slate-900/60 ${className ?? ''}`}
    />
  );
}
