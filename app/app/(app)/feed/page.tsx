'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import MatchCard from '@/app/components/match/MatchCard';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import SkeletonMatchCard from '@/app/components/ui/SkeletonMatchCard';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import { ApiError, fetchFeed } from '@/app/lib/api';
import { getStatusMeta } from '@/app/lib/match-ui';
import type { Match } from '@/app/lib/types';
import SegmentedControl from '@/app/ui/segmented-control';

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

// Feed page showing recent matches from followed teams.
export default function Page() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedInteraction, setSelectedInteraction] = useState('ALL');
  const [selectedRange, setSelectedRange] = useState('7');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
    setPage(1);
  }, [selectedStatus, selectedInteraction, selectedRange, selectedDate, matches]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 640px)');
    const updateSize = () => setPageSize(media.matches ? 12 : 20);
    updateSize();
    media.addEventListener('change', updateSize);
    return () => media.removeEventListener('change', updateSize);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const statusOptions = [
    { value: 'ALL', label: 'Todo' },
    { value: 'LIVE', label: 'Live' },
    { value: 'UPCOMING', label: 'Upcoming' },
    { value: 'FINISHED', label: 'Finished' },
  ];
  const interactionOptions = [
    { value: 'ALL', label: 'All' },
    { value: 'UNRATED', label: 'Unrated' },
    { value: 'RATED', label: 'Rated' },
  ];
  const rangeOptions = [
    { value: 'today', label: 'Today' },
    { value: '7', label: '7 days' },
    { value: '30', label: '30 days' },
  ];

  const now = useMemo(() => new Date(), []);
  const rangeDays = selectedRange === 'today' ? 1 : Number(selectedRange);

  const baseMatches = useMemo(() => {
    const base = matches.filter((match) => {
      const meta = getStatusMeta(match.status, match.date_time);
      if (selectedStatus !== 'ALL') {
        const expected =
          selectedStatus === 'UPCOMING' ? 'PENDING' : selectedStatus;
        if (meta.label !== expected) {
          return false;
        }
      }
      if (selectedInteraction === 'RATED' && !match.my_rating) {
        return false;
      }
      if (selectedInteraction === 'UNRATED' && match.my_rating) {
        return false;
      }
      const date = new Date(match.date_time);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (rangeDays - 1));
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      if (selectedStatus === 'UPCOMING') {
        const upcomingStart = new Date(now);
        upcomingStart.setHours(0, 0, 0, 0);
        const upcomingEnd = new Date(now);
        upcomingEnd.setHours(23, 59, 59, 999);
        upcomingEnd.setDate(upcomingEnd.getDate() + (rangeDays - 1));
        return date >= upcomingStart && date <= upcomingEnd;
      }
      if (selectedStatus === 'ALL') {
        const futureEnd = new Date(end);
        futureEnd.setDate(futureEnd.getDate() + (rangeDays - 1));
        return date >= start && date <= futureEnd;
      }
      return date >= start && date <= end;
    });
    return base;
  }, [
    matches,
    now,
    rangeDays,
    selectedInteraction,
    selectedStatus,
  ]);

  const filteredMatches = useMemo(() => {
    if (!selectedDate) {
      return baseMatches;
    }
    const key = getDateKey(selectedDate);
    return baseMatches.filter(
      (match) => getDateKey(new Date(match.date_time)) === key,
    );
  }, [baseMatches, selectedDate]);

  const visibleCount = Math.min(filteredMatches.length, page * pageSize);
  const visibleMatches = filteredMatches.slice(0, visibleCount);

  const groupedMatches = useMemo(() => {
    const groups = new Map<string, Match[]>();
    visibleMatches.forEach((match) => {
      const date = new Date(match.date_time);
      const key = getDateKey(date);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(match);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: formatDayLabel(key, now),
      items,
    }));
  }, [visibleMatches, now]);

  const stripDays = useMemo(() => {
    const days = [];
    const base = new Date(now);
    base.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(base);
      day.setDate(day.getDate() - i);
      days.push(day);
    }
    return days;
  }, [now]);

  const stripCounts = useMemo(() => {
    const counts = new Map<string, number>();
    baseMatches.forEach((match) => {
      const key = getDateKey(new Date(match.date_time));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return counts;
  }, [baseMatches]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Feed</h1>
        <p className="mt-2 text-sm text-slate-400">
          Recent matches from teams you follow.
        </p>
      </header>

      {loading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_0_30px_rgba(255,255,255,0.05)]">
            <div className="flex flex-wrap items-center gap-4">
              <SegmentedControl
                options={statusOptions}
                value={selectedStatus}
                onChange={setSelectedStatus}
                ariaLabel="Filtrar por estado"
                size="sm"
              />
              <SegmentedControl
                options={interactionOptions}
                value={selectedInteraction}
                onChange={setSelectedInteraction}
                ariaLabel="Filtrar por interaccion"
                size="sm"
              />
              <SegmentedControl
                options={rangeOptions}
                value={selectedRange}
                onChange={(value) => {
                  setSelectedRange(value);
                  setSelectedDate(null);
                }}
                ariaLabel="Rango rapido"
                size="sm"
              />
              {selectedDate && (
                <button
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                  onClick={() => setSelectedDate(null)}
                >
                  Clear day
                </button>
              )}
            </div>
            <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
              {stripDays.map((day) => {
                const key = getDateKey(day);
                const isActive = selectedDate
                  ? getDateKey(selectedDate) === key
                  : false;
                const count = stripCounts.get(key) ?? 0;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`min-w-[72px] rounded-full border px-3 py-2 text-left text-xs uppercase tracking-[0.2em] transition ${
                      isActive
                        ? 'border-white/30 bg-white/10 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                    onClick={() => {
                      setSelectedDate(
                        isActive ? null : new Date(day.getTime()),
                      );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      {count > 0 && (
                        <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                      )}
                    </div>
                    <div className="mt-1 text-base font-semibold text-white">
                      {day.getDate()}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {filteredMatches.length === 0 ? (
            <StateEmpty
              title="No matches for these filters yet."
              actionLabel="Clear filters"
              onAction={() => {
                setSelectedStatus('ALL');
                setSelectedInteraction('ALL');
                setSelectedRange('7');
                setSelectedDate(null);
              }}
            />
          ) : (
            <div className="space-y-8">
              {groupedMatches.map((group) => (
                <section key={group.key} className="space-y-4">
                  <div className="sticky top-16 z-10 rounded-full border border-white/10 bg-slate-950/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-300 shadow-[inset_0_0_25px_rgba(255,255,255,0.05)] backdrop-blur">
                    {group.label}
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {group.items.map((match) => (
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
                </section>
              ))}
              {visibleCount < filteredMatches.length && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Load more
                  </button>
                </div>
              )}
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

const getDateKey = (value: Date) => {
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  return value.toISOString().slice(0, 10);
};

const formatDayLabel = (dateKey: string, now: Date) => {
  const date = new Date(dateKey);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }
  const todayKey = getDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);
  if (dateKey === todayKey) {
    return 'Today';
  }
  if (dateKey === yesterdayKey) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
