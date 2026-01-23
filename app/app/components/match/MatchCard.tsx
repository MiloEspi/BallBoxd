'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { formatKickoff, getStatusMeta } from '@/app/lib/match-ui';
import type { Match } from '@/app/lib/types';

type MatchCardProps = {
  match: Match;
  onRate?: (match: Match, origin?: { x: number; y: number }) => void;
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

const getTeamInitials = (name: string) => {
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();
};

// Renders a single match card with average rating and CTA buttons.
export default function MatchCard({ match, onRate }: MatchCardProps) {
  const router = useRouter();
  const ratingCount = match.rating_count ?? 0;
  const hasRatings = ratingCount > 0;
  const avgScore = Number.isFinite(match.avg_score)
    ? (match.avg_score as number)
    : 0;
  const avgDisplay = hasRatings
    ? Math.round(avgScore) === avgScore
      ? String(avgScore)
      : avgScore.toFixed(1)
    : '-';
  const hasMyRating = match.my_rating?.score !== undefined;
  const myScore = hasMyRating ? match.my_rating!.score : null;
  const myDisplay =
    myScore !== null && Number.isInteger(myScore)
      ? String(myScore)
      : myScore !== null
        ? myScore.toFixed(1)
        : '';
  const ratingLabel = 'Avg rating';
  const ratingCountLabel = `${ratingCount} ratings`;
  const statusMeta = getStatusMeta(match.status, match.date_time);
  const { dateLabel, timeLabel } = formatKickoff(match.date_time);
  const statusToneStyles: Record<typeof statusMeta.tone, string> = {
    live: 'bg-rose-500/15 text-rose-200 border-rose-400/40 shadow-[0_0_20px_rgba(244,63,94,0.35)]',
    finished:
      'bg-emerald-500/15 text-emerald-200 border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    pending:
      'bg-amber-400/15 text-amber-200 border-amber-300/40 shadow-[0_0_18px_rgba(251,191,36,0.3)]',
    paused:
      'bg-sky-400/15 text-sky-200 border-sky-300/40 shadow-[0_0_18px_rgba(56,189,248,0.3)]',
    warning:
      'bg-orange-500/15 text-orange-200 border-orange-300/40 shadow-[0_0_18px_rgba(249,115,22,0.3)]',
    neutral:
      'bg-slate-600/20 text-slate-200 border-slate-500/40 shadow-[0_0_18px_rgba(148,163,184,0.2)]',
  };
  const statusClass = statusToneStyles[statusMeta.tone] ?? statusToneStyles.neutral;
  const ringPercent = Math.min(100, Math.max(0, avgScore));
  const hasWatchability =
    match.watchability_score !== null && match.watchability_score !== undefined;
  const watchabilityLabel = hasWatchability
    ? `W ${match.watchability_score}`
    : null;
  const watchabilityConfidence =
    hasWatchability && match.watchability_confidence
      ? match.watchability_confidence
      : null;

  return (
    <article
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] transition duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] hover:border-slate-500 hover:shadow-[0_28px_70px_rgba(0,0,0,0.45)]"
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
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-28 -top-24 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.12),_transparent_55%)]" />
      </div>

      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-slate-700/80 bg-slate-900/60 px-2 py-1 text-[10px] font-semibold text-slate-100">
              {match.tournament.code ?? getTournamentAbbr(match.tournament.name)}
            </span>
            <span className="uppercase tracking-[0.25em] text-slate-400">
              {match.tournament.name}
            </span>
          </div>
          <div className="mt-2 text-xl font-semibold text-white">
            {dateLabel}
            <span className="text-slate-400"> - {timeLabel}</span>
          </div>
          {match.venue && (
            <p className="mt-1 text-xs text-slate-400">{match.venue}</p>
          )}
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${statusClass}`}
        >
          {statusMeta.label}
        </span>
      </header>

      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          {[{ team: match.home_team, score: match.home_score }, { team: match.away_team, score: match.away_score }].map(
            ({ team, score }) => (
              <div
                key={team.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/50 px-4 py-2"
              >
                <Link
                  href={`/teams/${team.id}`}
                  className="flex min-w-0 items-center gap-3 text-left text-slate-100 transition hover:text-white"
                  onClick={(event) => event.stopPropagation()}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-800 text-xs font-semibold uppercase text-slate-200">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      getTeamInitials(team.name)
                    )}
                  </span>
                  <span className="truncate text-sm font-semibold">
                    {team.name}
                  </span>
                </Link>
                <span className="text-2xl font-semibold text-white">{score}</span>
              </div>
            ),
          )}
        </div>

        <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 px-4 py-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                <div className="pointer-events-none absolute -inset-5 rounded-full bg-emerald-400/20 blur-2xl" />
                <div
                  className="relative flex h-14 w-14 items-center justify-center rounded-full p-[3px] shadow-[0_0_22px_rgba(255,255,255,0.2)]"
                  style={{
                    background: hasRatings
                      ? `conic-gradient(rgba(255,255,255,0.95) ${ringPercent}%, rgba(255,255,255,0.08) ${ringPercent}% 100%)`
                      : 'conic-gradient(rgba(255,255,255,0.15) 0 100%)',
                  }}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-slate-950 text-lg font-semibold text-white">
                    {avgDisplay}
                  </div>
                </div>
              </div>
              {hasRatings && (
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  {ratingLabel} | {ratingCountLabel}
                </div>
              )}
            </div>
            {hasMyRating && (
              <div className="flex items-center gap-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  Your rating
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-300 text-xs font-semibold text-slate-900">
                  {myDisplay}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_10px_25px_rgba(255,255,255,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 active:scale-[0.98]"
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
        {hasWatchability && (
          <span className="rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-200">
            {watchabilityLabel}
            {watchabilityConfidence ? ` | ${watchabilityConfidence}` : ''}
          </span>
        )}
      </div>
    </article>
  );
}
