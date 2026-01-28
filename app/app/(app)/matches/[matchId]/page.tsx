'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import ReviewItem from '@/app/components/reviews/ReviewItem';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import MatchMemoryPanel from '@/app/components/match/MatchMemoryPanel';
import TeamLogo from '@/app/components/ui/TeamLogo';
import { ApiError, fetchMatchDetail } from '@/app/lib/api';
import { formatKickoff, getStatusMeta } from '@/app/lib/match-ui';
import { getLocale } from '@/app/lib/i18n';
import type { MatchDetailResponse } from '@/app/lib/types';

type MatchPageProps = {
  params: Promise<{ matchId: string }>;
};

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

// Match detail page with stats and reviews.
export default function Page({ params }: MatchPageProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const locale = getLocale(language);
  const { matchId: matchIdParam } = use(params);
  const [data, setData] = useState<MatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const matchId = Number(matchIdParam);

  // Loads match detail data and handles validation/errors.
  const loadMatch = async () => {
    if (Number.isNaN(matchId)) {
      setError({
        message: t('common.loadError'),
        action: 'retry',
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetchMatchDetail(matchId);
      setData(response);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError({
          message: t('common.sessionExpired'),
          action: 'login',
        });
      } else {
        setError({
          message: t('common.loadError'),
          action: 'retry',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-slate-800/70 animate-pulse" />
          <div className="h-7 w-72 rounded bg-slate-800/70 animate-pulse" />
          <div className="h-4 w-40 rounded bg-slate-800/70 animate-pulse" />
        </div>
        <SkeletonBlock className="h-28" />
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonBlock className="h-48" />
          <SkeletonBlock className="h-48" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <StateError
          message={error.message}
          actionLabel={error.action === 'login' ? t('nav.login') : t('common.retry')}
          onAction={
            error.action === 'login'
              ? () => router.push('/login')
              : loadMatch
          }
        />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          {t('search.page.empty')}
        </div>
      </section>
    );
  }

  const { match, avg_score, rating_count, full_watched_pct, my_rating } = data;
  const ratingCount = rating_count ?? 0;
  const hasRatings = ratingCount > 0;
  const avgDisplay = hasRatings
    ? Math.round(avg_score) === avg_score
      ? String(avg_score)
      : avg_score.toFixed(1)
    : '-';
  const ringPercent = Math.min(100, Math.max(0, avg_score));
  const { fullLabel, timeLabel } = formatKickoff(match.date_time, locale);
  const statusMeta = getStatusMeta(match.status, match.date_time);
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
  const watchabilityConfidenceLabel = match.watchability_confidence
    ? ({
        Low: t('match.confidence.low'),
        Medium: t('match.confidence.medium'),
        High: t('match.confidence.high'),
      }[match.watchability_confidence] ?? match.watchability_confidence)
    : null;
  const watchabilityValue =
    match.watchability_score !== null && match.watchability_score !== undefined
      ? `${match.watchability_score}${
          watchabilityConfidenceLabel ? ` (${watchabilityConfidenceLabel})` : ''
        }`
      : '-';

  const openRateModal = (origin?: { x: number; y: number }) => {
    setModalOrigin(origin ?? null);
    setShowModal(true);
  };

  return (
    <section className="space-y-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            {match.tournament.name}
            {match.tournament.country ? ` - ${match.tournament.country}` : ''}
          </p>
          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${statusClass}`}
          >
            {statusLabel}
          </span>
        </div>
        <h1 className="text-3xl font-semibold text-white">
          <Link
            href={`/teams/${match.home_team.id}`}
            className="hover:text-white"
          >
            {match.home_team.name}
          </Link>{' '}
          vs{' '}
          <Link
            href={`/teams/${match.away_team.id}`}
            className="hover:text-white"
          >
            {match.away_team.name}
          </Link>
        </h1>
        <div className="text-base text-slate-300">
          {fullLabel} - {timeLabel}
        </div>
        {match.venue && (
          <p className="text-sm text-slate-400">
            {t('matchDetail.venue')}: {match.venue}
          </p>
        )}
      </header>

      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 p-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              {t('matchDetail.score')}
            </p>
            <div className="space-y-4">
              {[
                { team: match.home_team, score: match.home_score },
                { team: match.away_team, score: match.away_score },
              ].map(({ team, score }) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/50 px-4 py-3"
                >
                  <Link
                    href={`/teams/${team.id}`}
                    className="flex items-center gap-3 text-left text-slate-100 transition hover:text-white"
                  >
                    <TeamLogo name={team.name} logoUrl={team.logo_url} size="lg" />
                    <span className="text-lg font-semibold">{team.name}</span>
                  </Link>
                  <span className="text-3xl font-semibold text-white">
                    {score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {t('matchDetail.avgRating')}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative">
                  <div className="pointer-events-none absolute -inset-6 rounded-full bg-white/15 blur-2xl" />
                  <div
                    className="relative flex h-20 w-20 items-center justify-center rounded-full p-[4px] shadow-[0_0_28px_rgba(255,255,255,0.35)]"
                    style={{
                      background: hasRatings
                        ? `conic-gradient(rgba(255,255,255,0.95) ${ringPercent}%, rgba(255,255,255,0.1) ${ringPercent}% 100%)`
                        : 'conic-gradient(rgba(255,255,255,0.15) 0 100%)',
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-slate-950 text-2xl font-semibold text-white">
                      {avgDisplay}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {hasRatings
                      ? t('match.ratings', { count: ratingCount })
                      : t('matchDetail.noRatings')}
                  </div>
                  {!hasRatings && (
                    <div className="mt-1 text-xs text-slate-500">
                      {t('matchDetail.noRatingsHint')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {my_rating && (
                <div className="text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {t('match.yourRating')}
                  </p>
                  <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-sky-300 text-sm font-semibold text-slate-900">
                    {my_rating.score}
                  </div>
                </div>
              )}
              <button
                className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_12px_25px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 active:scale-[0.98]"
                type="button"
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  openRateModal({
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2,
                  });
                }}
              >
                {my_rating ? t('common.update') : t('common.rate')}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/60 px-3 py-2">
              <MatchMemoryPanel
                matchId={match.id}
                rating={my_rating}
                onRequireRating={() => openRateModal()}
                onUpdated={loadMatch}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: t('profile.stats.totalRatings'),
            value: hasRatings ? String(ratingCount) : '-',
          },
          {
            label: t('matchDetail.fullWatched'),
            value: hasRatings ? `${full_watched_pct}%` : '-',
          },
          {
            label: t('matchDetail.watchability'),
            value: watchabilityValue,
          },
          {
            label: t('matchDetail.kickoffStatus'),
            value: statusLabel,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[inset_0_0_35px_rgba(255,255,255,0.04)]"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {t('matchDetail.highlightedReviews')}
          </h2>
          {data.featured_reviews.length === 0 ? (
            <StateEmpty
              title={t('matchDetail.reviews.empty')}
              actionLabel={t('common.rate')}
              onAction={() => openRateModal()}
            />
          ) : (
            <div className="space-y-3">
              {data.featured_reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            {t('matchDetail.friendsOpinions')}
          </h2>
          {data.followed_ratings.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
              {t('matchDetail.friends.empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {data.followed_ratings.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <RateMatchModal
          matchId={match.id}
          initialScore={my_rating?.score}
          initialMinutesWatched={my_rating?.minutes_watched}
          initialReview={my_rating?.review}
          origin={modalOrigin}
          onClose={() => {
            setShowModal(false);
            setModalOrigin(null);
          }}
          onSaved={loadMatch}
        />
      )}
    </section>
  );
}
