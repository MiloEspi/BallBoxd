'use client';

import Link from 'next/link';

import { formatKickoff, getStatusMeta } from '@/app/lib/match-ui';
import type { Match } from '@/app/lib/types';

type FeedMatchCardProps = {
  match: Match;
};

const getTeamInitials = (name: string) => {
  return name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 3)
    .join('')
    .toUpperCase();
};

export default function FeedMatchCard({ match }: FeedMatchCardProps) {
  const statusMeta = getStatusMeta(match.status, match.date_time);
  const { dateLabel, timeLabel } = formatKickoff(match.date_time);
  const hasRatings = (match.rating_count ?? 0) > 0;
  const avgScore = Number.isFinite(match.avg_score)
    ? (match.avg_score as number)
    : 0;
  const avgDisplay = hasRatings
    ? Math.round(avgScore) === avgScore
      ? String(avgScore)
      : avgScore.toFixed(1)
    : '-';

  const statusToneStyles: Record<typeof statusMeta.tone, string> = {
    live: 'border-rose-400/40 bg-rose-500/15 text-rose-200',
    finished: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200',
    pending: 'border-amber-300/40 bg-amber-400/15 text-amber-200',
    paused: 'border-sky-300/40 bg-sky-400/15 text-sky-200',
    warning: 'border-orange-300/40 bg-orange-500/15 text-orange-200',
    neutral: 'border-slate-500/40 bg-slate-600/20 text-slate-200',
  };
  const statusClass = statusToneStyles[statusMeta.tone] ?? statusToneStyles.neutral;
  const statusLabelMap: Record<string, string> = {
    LIVE: 'Live',
    FINISHED: 'Finished',
    PENDING: 'Upcoming',
    PAUSED: 'Paused',
    POSTPONED: 'Postponed',
    SUSPENDED: 'Suspended',
    CANCELLED: 'Cancelled',
  };
  const statusLabel = statusLabelMap[statusMeta.label] ?? statusMeta.label;

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10"
    >
      <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">
        <span className="truncate">{match.tournament.name}</span>
        <span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <div className="mt-2 text-xs text-slate-400">
        {dateLabel} · {timeLabel}
      </div>
      <div className="mt-3 space-y-2">
        {[
          { team: match.home_team, score: match.home_score },
          { team: match.away_team, score: match.away_score },
        ].map(({ team, score }) => (
          <div
            key={team.id}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-900 text-[10px] font-semibold uppercase text-slate-200">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="h-4 w-4 object-contain"
                    loading="lazy"
                  />
                ) : (
                  getTeamInitials(team.name)
                )}
              </span>
              <span className="truncate text-sm font-semibold text-white">
                {team.name}
              </span>
            </div>
            <span className="text-lg font-semibold text-white">{score}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span className="uppercase tracking-[0.2em]">Avg</span>
        <span className="text-sm font-semibold text-slate-100">
          {avgDisplay}
        </span>
      </div>
    </Link>
  );
}
