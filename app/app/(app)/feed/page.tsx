'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import MatchCard from '@/app/components/match/MatchCard';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import CalendarModal from '@/app/components/ui/CalendarModal';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import SkeletonMatchCard from '@/app/components/ui/SkeletonMatchCard';
import { ApiError, fetchFeed } from '@/app/lib/api';
import {
  addDays,
  getCenteredWindowDays,
  getDateKey,
  getRelativeDayLabel,
  isSameDay,
  startOfDay,
} from '@/app/lib/date-range';
import { getLocale } from '@/app/lib/i18n';
import { getStatusMeta } from '@/app/lib/match-ui';
import type { Match } from '@/app/lib/types';
import SegmentedControl from '@/app/ui/segmented-control';

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

type TransitionPhase = 'idle' | 'fadeOut' | 'fadeIn';

// Feed page showing recent matches from followed teams.
export default function Page() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const locale = getLocale(language);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedRating, setSelectedRating] = useState('ALL');
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDay, setSelectedDay] = useState<Date>(() => today);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>('idle');
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Loads the feed data from the API and updates UI state.
  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFeed();
      setMatches(data.results);
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
    loadFeed();
  }, []);

  useEffect(() => {
    setTransitionPhase('fadeOut');
    const fadeTimeout = window.setTimeout(() => {
      setTransitionPhase('fadeIn');
    }, 100);
    const doneTimeout = window.setTimeout(() => {
      setTransitionPhase('idle');
    }, 220);
    return () => {
      window.clearTimeout(fadeTimeout);
      window.clearTimeout(doneTimeout);
    };
  }, [selectedDay, selectedStatus, selectedRating]);

  const statusOptions = [
    { value: 'ALL', label: t('feed.status.all') },
    { value: 'LIVE', label: t('status.live') },
    { value: 'FINISHED', label: t('status.finished') },
  ];
  const ratingOptions = [
    { value: 'ALL', label: t('feed.status.all') },
    { value: 'RATED', label: t('feed.status.rated') },
    { value: 'UNRATED', label: t('feed.status.unrated') },
  ];

  const statusRatingMatches = useMemo(() => {
    return matches.filter((match) => {
      const meta = getStatusMeta(match.status, match.date_time);
      if (selectedStatus !== 'ALL' && meta.label !== selectedStatus) {
        return false;
      }
      if (selectedRating === 'UNRATED' && match.my_rating) {
        return false;
      }
      if (selectedRating === 'RATED' && !match.my_rating) {
        return false;
      }
      return true;
    });
  }, [matches, selectedRating, selectedStatus]);

  const selectedDayKey = useMemo(
    () => getDateKey(selectedDay),
    [selectedDay],
  );

  const dayMatches = useMemo(() => {
    return statusRatingMatches.filter(
      (match) => getDateKey(new Date(match.date_time)) === selectedDayKey,
    );
  }, [selectedDayKey, statusRatingMatches]);

  const sortedMatches = useMemo(() => {
    return [...dayMatches].sort(
      (a, b) =>
        new Date(b.date_time).getTime() - new Date(a.date_time).getTime(),
    );
  }, [dayMatches]);

  const stripDays = useMemo(
    () => getCenteredWindowDays(selectedDay, 3),
    [selectedDay],
  );

  const stripCounts = useMemo(() => {
    const counts = new Map<string, number>();
    statusRatingMatches.forEach((match) => {
      const key = getDateKey(new Date(match.date_time));
      if (!key) {
        return;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [statusRatingMatches]);

  const selectedDayLabel = getRelativeDayLabel(selectedDay, today, language);
  const selectedDayFull = selectedDay.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const emptyTitle = useMemo(() => {
    if (selectedDayLabel === t('date.today')) {
      return t('feed.day.empty.today');
    }
    if (selectedDayLabel === t('date.yesterday')) {
      return t('feed.day.empty.yesterday');
    }
    if (selectedDayLabel === t('date.tomorrow')) {
      return t('feed.day.empty.tomorrow');
    }
    return t('feed.day.empty.other', { date: selectedDayFull });
  }, [selectedDayFull, selectedDayLabel, t]);

  const matchCountLabel =
    sortedMatches.length === 1
      ? t('feed.count.single')
      : t('feed.count.multi', { count: sortedMatches.length });

  const statusLabel =
    selectedStatus === 'ALL'
      ? t('feed.status.all')
      : selectedStatus === 'LIVE'
        ? t('status.live')
        : t('status.finished');
  const ratingLabel =
    selectedRating === 'ALL'
      ? t('feed.status.all')
      : selectedRating === 'UNRATED'
        ? t('feed.status.unrated')
        : t('feed.status.rated');

  return (
    <section className="space-y-6">
      <header className="hidden space-y-2 md:block">
        <h1 className="text-2xl font-semibold">{t('feed.title')}</h1>
        <p className="text-sm text-slate-400">{t('feed.subtitle')}</p>
      </header>

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonMatchCard key={`feed-skeleton-${index}`} />
          ))}
        </div>
      )}

      {!loading && error && (
        <StateError
          message={error.message}
          actionLabel={error.action === 'login' ? t('nav.login') : t('common.retry')}
          onAction={
            error.action === 'login'
              ? () => router.push('/login')
              : loadFeed
          }
        />
      )}

      {!loading && !error && matches.length === 0 && (
        <StateEmpty
          title={t('feed.empty.followTitle')}
          actionLabel={t('feed.empty.cta')}
          onAction={() => router.push('/matches')}
        />
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <div className="hidden flex-wrap items-center gap-3 md:flex">
              <SegmentedControl
                options={statusOptions}
                value={selectedStatus}
                onChange={setSelectedStatus}
                ariaLabel={t('feed.filters.status')}
                size="sm"
              />
              <SegmentedControl
                options={ratingOptions}
                value={selectedRating}
                onChange={setSelectedRating}
                ariaLabel={t('feed.filters.rating')}
                size="sm"
              />
            </div>

            <div className="md:hidden">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                  {statusLabel} {ratingLabel}
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                  onClick={() => setFiltersExpanded((prev) => !prev)}
                  aria-expanded={filtersExpanded}
                >
                  {filtersExpanded ? t('feed.filters.less') : t('feed.filters.more')}
                </button>
              </div>

              {filtersExpanded && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SegmentedControl
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                    ariaLabel={t('feed.filters.status')}
                    size="sm"
                  />
                  <SegmentedControl
                    options={ratingOptions}
                    value={selectedRating}
                    onChange={setSelectedRating}
                    ariaLabel={t('feed.filters.rating')}
                    size="sm"
                  />
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                aria-label={t('date.yesterday')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10 active:scale-95"
                onClick={() => setSelectedDay(startOfDay(addDays(selectedDay, -1)))}
              >
                {'<'}
              </button>

              <div className="min-w-0 flex-1">
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {stripDays.map((day) => {
                    const key = getDateKey(day);
                    const isSelected = isSameDay(day, selectedDay);
                    const isToday = isSameDay(day, today);
                    const count = stripCounts.get(key) ?? 0;
                    const dayLabel = getRelativeDayLabel(day, today, language);
                    return (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={isSelected}
                        className={`w-full rounded-2xl border px-2 py-2 text-left text-xs transition-all duration-200 ${
                          isSelected
                            ? 'border-white/30 bg-white/15 text-white shadow-[0_10px_25px_rgba(0,0,0,0.2)]'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                        } ${isToday ? 'ring-1 ring-emerald-300/50' : ''}`}
                        onClick={() => setSelectedDay(startOfDay(day))}
                      >
                        <div
                          className={`flex items-center justify-between text-[11px] font-semibold ${
                            isSelected ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          <span>{dayLabel}</span>
                          {count > 0 && (
                            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.6)]" />
                          )}
                        </div>
                        <div
                          className={`mt-1 text-base font-semibold ${
                            isSelected ? 'text-white' : 'text-slate-100'
                          }`}
                        >
                          {day.getDate()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                aria-label={t('date.tomorrow')}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10 active:scale-95"
                onClick={() => setSelectedDay(startOfDay(addDays(selectedDay, 1)))}
              >
                {'>'}
              </button>

              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
                onClick={() => setCalendarOpen(true)}
                aria-label={t('matches.toolbar.today')}
              >
                <CalendarIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {sortedMatches.length === 0 ? (
            <StateEmpty
              title={emptyTitle}
              description={t('feed.day.empty.desc')}
              actionLabel={t('feed.day.empty.reset')}
              onAction={() => {
                setSelectedStatus('ALL');
                setSelectedRating('ALL');
                setSelectedDay(today);
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white sm:text-lg">
                    {selectedDayLabel}
                  </p>
                  <p className="text-xs text-slate-400">{selectedDayFull}</p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {matchCountLabel}
                </span>
              </div>
              <div
                className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 transition-opacity duration-200 ${
                  transitionPhase === 'fadeOut' ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {sortedMatches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onRate={(selected, origin) => {
                      setActiveMatch(selected);
                      setModalOrigin(origin ?? null);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeMatch && (
        <RateMatchModal
          matchId={activeMatch.id}
          initialScore={activeMatch.my_rating?.score}
          initialMinutesWatched={activeMatch.my_rating?.minutes_watched}
          initialReview={activeMatch.my_rating?.review}
          origin={modalOrigin}
          onClose={() => {
            setActiveMatch(null);
            setModalOrigin(null);
          }}
          onSaved={loadFeed}
        />
      )}

      <CalendarModal
        open={calendarOpen}
        selected={selectedDay}
        onSelect={(date) => {
          setSelectedDay(date);
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </section>
  );
}
