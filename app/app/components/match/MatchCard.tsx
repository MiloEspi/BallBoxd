'use client';

import { useRouter } from 'next/navigation';

import type { Match } from '@/app/lib/types';

type MatchCardProps = {
  match: Match;
  onRate?: (match: Match, origin?: { x: number; y: number }) => void;
};

// Formats match date for the card header.
const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// Generates a compact tournament badge label.
const getTournamentAbbr = (name: string) => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
};

// Renders a single match card with average rating and CTA buttons.
export default function MatchCard({ match, onRate }: MatchCardProps) {
  const router = useRouter();
  const avgScore = Number.isFinite(match.avg_score)
    ? (match.avg_score as number)
    : 0;
  const avgDisplay =
    Math.round(avgScore) === avgScore
      ? String(avgScore)
      : avgScore.toFixed(1);
  const hasMyRating = match.my_rating?.score !== undefined;
  const myScore = hasMyRating ? match.my_rating!.score : null;
  const myDisplay =
    myScore !== null && Number.isInteger(myScore)
      ? String(myScore)
      : myScore !== null
        ? myScore.toFixed(1)
        : '';
  const ratingLabel = 'Avg rating';
  const ratingCount =
    match.rating_count !== undefined ? `${match.rating_count} ratings` : '';

  return (
    <article
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.25)] transition duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-slate-600 hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)]"
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
        <div className="absolute -left-24 -top-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-200">
            {getTournamentAbbr(match.tournament.name)}
          </span>
          <span className="uppercase tracking-[0.2em]">
            {match.tournament.name}
          </span>
          <span>-</span>
          <span className="text-sm font-semibold text-slate-200">
            {formatDate(match.date_time)}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-8">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-4xl font-semibold text-white shadow-[0_0_22px_rgba(15,23,42,0.6)]">
              {avgDisplay}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              <span className="uppercase tracking-[0.2em]">{ratingLabel}</span>
              {ratingCount && (
                <span className="ml-2 text-slate-500">{ratingCount}</span>
              )}
            </div>
          </div>

          <div className="min-w-[120px]">
            {hasMyRating ? (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-300 text-sm font-semibold text-slate-900">
                  {myDisplay}
                </div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Your rating
                </div>
              </div>
            ) : (
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Haven&apos;t rated
              </div>
            )}
          </div>
        </div>

        <div className="min-w-[220px] text-right">
          <div className="flex items-baseline justify-end gap-4">
            <span className="text-lg font-semibold text-slate-100">
              {match.home_team.name}
            </span>
            <span className="text-2xl font-semibold text-white">
              {match.home_score}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-end gap-3 text-slate-500">
            <span className="text-xs uppercase tracking-[0.2em]">vs</span>
            <span className="h-px w-8 bg-slate-700" />
          </div>
          <div className="mt-2 flex items-baseline justify-end gap-4">
            <span className="text-lg font-semibold text-slate-100">
              {match.away_team.name}
            </span>
            <span className="text-2xl font-semibold text-white">
              {match.away_score}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_10px_25px_rgba(255,255,255,0.15)] transition hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 active:scale-[0.98]"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            const rect = event.currentTarget.getBoundingClientRect();
            onRate?.(match, {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            });
          }}
        >
          {match.my_rating ? 'Update rating' : 'Rate match'}
        </button>
        <div className="rounded-full border border-slate-700 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition group-hover:border-slate-500">
          Toca para detalles
        </div>
      </div>
    </article>
  );
}
