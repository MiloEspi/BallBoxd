'use client';

import { useRouter } from 'next/navigation';

import type { MatchResult } from '@/app/lib/types';

type MatchResultCardProps = {
  match: MatchResult;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Search match card for grouped results and team pages.
export default function MatchResultCard({ match }: MatchResultCardProps) {
  const router = useRouter();
  const hasAvg = match.avg_rating > 0;
  const avgDisplay = hasAvg
    ? Math.round(match.avg_rating) === match.avg_rating
      ? String(match.avg_rating)
      : match.avg_rating.toFixed(1)
    : '-';

  return (
    <article
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-[0_24px_55px_rgba(0,0,0,0.38)]"
      onClick={() => router.push(`/matches/${match.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(`/matches/${match.id}`);
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100">
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-16 -right-16 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200">
            {match.league.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="uppercase tracking-[0.2em]">{match.league.name}</span>
          <span>-</span>
          <span className="text-sm font-semibold text-slate-200">
            {formatDate(match.kickoff_at)}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="text-sm font-semibold text-white">
            {match.home.name} vs {match.away.name}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <span className="uppercase tracking-[0.2em]">Avg</span>
            <span className="text-slate-200">{avgDisplay}</span>
            {match.my_rating !== null && (
              <>
                <span className="text-slate-600">|</span>
                <span className="uppercase tracking-[0.2em]">My</span>
                <span className="text-slate-200">{match.my_rating}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end gap-4">
            <span className="text-lg font-semibold text-slate-100">
              {match.home.name}
            </span>
            <span className="text-2xl font-semibold text-white">
              {match.score.home ?? '-'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-end gap-3 text-slate-500">
            <span className="text-xs uppercase tracking-[0.2em]">vs</span>
            <span className="h-px w-8 bg-slate-700" />
          </div>
          <div className="mt-2 flex items-baseline justify-end gap-4">
            <span className="text-lg font-semibold text-slate-100">
              {match.away.name}
            </span>
            <span className="text-2xl font-semibold text-white">
              {match.score.away ?? '-'}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
