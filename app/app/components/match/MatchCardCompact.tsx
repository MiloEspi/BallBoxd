'use client';

import Link from 'next/link';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import TeamLogo from '@/app/components/ui/TeamLogo';
import { formatKickoff, getStatusMeta } from '@/app/lib/match-ui';
import { getLocale } from '@/app/lib/i18n';
import type { Match, MatchResult } from '@/app/lib/types';

type MatchCardCompactProps = {
  match: Match | MatchResult;
  footer?: React.ReactNode;
  className?: string;
};

const getTournamentAbbr = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

const isMatchResult = (match: Match | MatchResult): match is MatchResult =>
  'league' in match;

export default function MatchCardCompact({
  match,
  footer,
  className,
}: MatchCardCompactProps) {
  const { t, language } = useLanguage();
  const isResult = isMatchResult(match);
  const tournamentName = isResult ? match.league.name : match.tournament.name;
  const tournamentCode = isResult
    ? getTournamentAbbr(match.league.name)
    : match.tournament.code ?? getTournamentAbbr(match.tournament.name);
  const kickoff = isResult ? match.kickoff_at : match.date_time;
  const statusMeta = getStatusMeta(
    isResult ? match.status : match.status,
    kickoff,
  );
  const { dateLabel, timeLabel } = formatKickoff(
    kickoff,
    getLocale(language),
  );
  const hasAvg = isResult
    ? match.avg_rating > 0
    : (match.rating_count ?? 0) > 0;
  const avgScore = isResult ? match.avg_rating : match.avg_score ?? 0;
  const avgDisplay = hasAvg
    ? Math.round(avgScore) === avgScore
      ? String(avgScore)
      : avgScore.toFixed(1)
    : '-';
  const homeTeam = isResult ? match.home : match.home_team;
  const awayTeam = isResult ? match.away : match.away_team;
  const homeScore = isResult ? match.score.home : match.home_score;
  const awayScore = isResult ? match.score.away : match.away_score;
  const statusLabels: Record<string, string> = {
    LIVE: t('status.live'),
    FINISHED: t('status.finished'),
    PENDING: t('status.pending'),
    PAUSED: t('status.paused'),
    POSTPONED: t('status.postponed'),
    SUSPENDED: t('status.suspended'),
    CANCELLED: t('status.cancelled'),
  };
  const statusLabel = statusLabels[statusMeta.label] ?? statusMeta.label;

  return (
    <Link
      href={`/matches/${match.id}`}
      className={[
        'group block rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.28)] transition hover:border-white/20 hover:bg-white/10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold text-slate-200">
            {tournamentCode}
          </span>
          <span className="truncate">{tournamentName}</span>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-200">
          {statusLabel}
        </span>
      </div>
      <div className="mt-2 text-xs text-slate-400">
        {dateLabel} · {timeLabel}
      </div>
      <div className="mt-3 space-y-2">
        {[
          { team: homeTeam, score: homeScore },
          { team: awayTeam, score: awayScore },
        ].map(({ team, score }) => (
          <div key={team.id} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <TeamLogo name={team.name} logoUrl={team.logo_url} size="sm" />
              <span className="truncate text-sm font-semibold text-white">
                {team.name}
              </span>
            </div>
            <span className="text-lg font-semibold text-white">
              {score ?? '-'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span className="uppercase tracking-[0.2em]">
          {t('match.avgRating')}
        </span>
        <span className="text-sm font-semibold text-slate-100">
          {avgDisplay}
        </span>
      </div>
      {footer && <div className="mt-3">{footer}</div>}
    </Link>
  );
}
