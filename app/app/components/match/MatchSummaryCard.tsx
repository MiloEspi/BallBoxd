'use client';

import { useRouter } from 'next/navigation';

import type { RatingWithMatch } from '@/app/lib/types';

type MatchSummaryCardProps = {
  rating: RatingWithMatch;
};

// Formats date strings for match metadata.
const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Maps minutes watched codes to UI labels.
const formatMinutes = (value: string) => {
  switch (value) {
    case 'LT_30':
      return 'Less than 30';
    case 'ONE_HALF':
      return 'One half';
    case 'ALMOST_ALL':
      return 'Almost all';
    case 'FULL':
      return 'Full match';
    default:
      return value;
  }
};

// Compact, clickable match summary card for profile activity/highlights.
export default function MatchSummaryCard({ rating }: MatchSummaryCardProps) {
  const router = useRouter();
  const match = rating.match;

  return (
    <article
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-600 hover:shadow-[0_24px_55px_rgba(0,0,0,0.38)]"
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

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-white">
            {match.home_team.name} vs {match.away_team.name}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {match.tournament.name} - {formatDate(match.date_time)}
          </p>
        </div>
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-xl font-semibold text-white shadow-[0_0_18px_rgba(15,23,42,0.55)]">
          <span className="pointer-events-none absolute -inset-6 rounded-full bg-[conic-gradient(from_90deg,_rgba(56,189,248,0.5),_rgba(16,185,129,0.45),_rgba(251,191,36,0.4),_rgba(236,72,153,0.35),_rgba(56,189,248,0.5))] opacity-70 blur-2xl" />
          <span className="relative">{rating.score}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <span className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-[0.2em] text-slate-400">
          {formatMinutes(rating.minutes_watched)}
        </span>
        <span>{formatDate(rating.created_at)}</span>
      </div>

      {rating.review && (
        <p className="mt-3 text-sm text-slate-300">{rating.review}</p>
      )}
    </article>
  );
}
