'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import MatchCard from '@/app/components/match/MatchCard';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import SkeletonMatchCard from '@/app/components/ui/SkeletonMatchCard';
import { ApiError, fetchFeed } from '@/app/lib/api';
import {
  getCenteredWindowDays,
  getDateKey,
  getRelativeDayLabel,
  isSameDay,
  startOfDay,
} from '@/app/lib/date-range';
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
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedRating, setSelectedRating] = useState('ALL');
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDay, setSelectedDay] = useState<Date>(() => today);
  const [transitionPhase, setTransitionPhase] =
    useState<TransitionPhase>('idle');
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

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
          message: 'Tu sesion expiro. Inicia sesion de nuevo.',
          action: 'login',
        });
      } else {
        setError({
          message: 'No pudimos cargar los datos.',
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
    { value: 'ALL', label: 'All' },
    { value: 'LIVE', label: 'Live' },
    { value: 'FINISHED', label: 'Finished' },
  ];
  const ratingOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'UNRATED', label: 'Unrated' },
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
        new Date(a.date_time).getTime() - new Date(b.date_time).getTime(),
    );
  }, [dayMatches]);

  const stripDays = useMemo(() => getCenteredWindowDays(today, 3), [today]);

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

  const selectedDayLabel = getRelativeDayLabel(selectedDay, today);
  const selectedDayFull = selectedDay.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const emptyTitle = useMemo(() => {
    if (selectedDayLabel === 'Today') {
      return 'No matches today.';
    }
    if (selectedDayLabel === 'Yesterday') {
      return 'No matches yesterday.';
    }
    if (selectedDayLabel === 'Tomorrow') {
      return 'No matches tomorrow.';
    }
    return `No matches on ${selectedDayFull}.`;
  }, [selectedDayFull, selectedDayLabel]);

  const matchCountLabel =
    sortedMatches.length === 1
      ? '1 match'
      : `${sortedMatches.length} matches`;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Feed</h1>
        <p className="text-sm text-slate-400">
          Matches that matter to you today and recently.
        </p>
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
          actionLabel={error.action === 'login' ? 'Iniciar sesion' : 'Reintentar'}
          onAction={
            error.action === 'login'
              ? () => router.push('/login')
              : loadFeed
          }
        />
      )}

      {!loading && !error && matches.length === 0 && (
        <StateEmpty
          title="Tu feed esta vacio. Segui equipos para ver partidos aca."
          actionLabel="Explorar partidos"
          onAction={() => router.push('/matches')}
        />
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                options={statusOptions}
                value={selectedStatus}
                onChange={setSelectedStatus}
                ariaLabel="Filtrar por estado"
                size="sm"
              />
              <SegmentedControl
                options={ratingOptions}
                value={selectedRating}
                onChange={setSelectedRating}
                ariaLabel="Filtrar por rating"
                size="sm"
              />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 overflow-x-auto pb-1">
              {stripDays.map((day) => {
                const key = getDateKey(day);
                const isSelected = isSameDay(day, selectedDay);
                const isToday = isSameDay(day, today);
                const count = stripCounts.get(key) ?? 0;
                const dayLabel = getRelativeDayLabel(day, today);
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isSelected}
                    className={`min-w-[68px] rounded-2xl border px-3 py-2 text-left text-xs transition-all duration-200 ${
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

          {sortedMatches.length === 0 ? (
            <StateEmpty
              title={emptyTitle}
              description="Try another day or clear filters."
              actionLabel="Reset filters"
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
                  <p className="text-lg font-semibold text-white">
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
    </section>
  );
}
