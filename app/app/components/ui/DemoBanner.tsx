'use client';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Shows a banner when running in demo mode.
export default function DemoBanner() {
  if (!DEMO_MODE) {
    return null;
  }

  return (
    <div className="w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
      Demo mode - data may reset when server restarts.
    </div>
  );
}
