'use client';

import { useEffect, useMemo, useState } from 'react';

import MatchCard from '@/app/components/match/MatchCard';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import { fetchMatches } from '@/app/lib/api';
import type { Match } from '@/app/lib/types';
import SegmentedControl from '@/app/ui/segmented-control';

// Formats the date label for the calendar pill.
const formatDateLabel = (date: Date) => {
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
};

// Checks if two dates fall on the same calendar day.
const isSameDay = (left: Date, right: Date) => {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

// Extracts a sorted list of unique league names.
const getLeagueOptions = (matches: Match[]) => {
  const unique = Array.from(
    new Set(matches.map((match) => match.tournament.name)),
  );
  unique.sort((a, b) => a.localeCompare(b));
  return ['ALL', ...unique];
};

// Picks the most recent match date to seed the calendar.
const getLatestMatchDate = (matches: Match[]) => {
  const dates = matches.map((match) => new Date(match.date_time));
  return dates.sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date();
};

// Matches listing page with date + league filters.
export default function Page() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Loads the full matches catalog.
  const loadMatches = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMatches();
      setMatches(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    if (!selectedDate && matches.length > 0) {
      setSelectedDate(getLatestMatchDate(matches));
    }
  }, [matches, selectedDate]);

  const leagueOptions = useMemo(
    () =>
      getLeagueOptions(matches).map((value) => ({
        value,
        label: value === 'ALL' ? 'Todas' : value,
      })),
    [matches],
  );

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const byLeague =
        selectedLeague === 'ALL' ||
        match.tournament.name === selectedLeague;
      const byDate =
        !selectedDate ||
        isSameDay(new Date(match.date_time), selectedDate);
      return byLeague && byDate;
    });
  }, [matches, selectedLeague, selectedDate]);

  const today = new Date();
  const calendarLabel = selectedDate
    ? isSameDay(selectedDate, today)
      ? 'Hoy'
      : formatDateLabel(selectedDate)
    : 'Todas';

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Partidos</h1>
        <p className="text-sm text-slate-400">
          Filtra por fecha y liga para explorar partidos cargados.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2 shadow-[inset_0_0_25px_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10 active:scale-95"
            onClick={() => {
              if (!selectedDate) {
                setSelectedDate(today);
                return;
              }
              const prev = new Date(selectedDate);
              prev.setDate(prev.getDate() - 1);
              setSelectedDate(prev);
            }}
          >
            {'<'}
          </button>
          <div className="min-w-[90px] text-center text-sm font-semibold text-slate-100">
            {calendarLabel}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg text-slate-200 transition hover:bg-white/10 active:scale-95"
            onClick={() => {
              if (!selectedDate) {
                setSelectedDate(today);
                return;
              }
              const next = new Date(selectedDate);
              next.setDate(next.getDate() + 1);
              setSelectedDate(next);
            }}
          >
            {'>'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <SegmentedControl
            options={leagueOptions}
            value={selectedLeague}
            onChange={setSelectedLeague}
            ariaLabel="Seleccionar liga"
          />
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
            onClick={() => {
              setSelectedDate(null);
              setSelectedLeague('ALL');
            }}
          >
            Ver todas
          </button>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          Loading matches...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          <p>{error}</p>
          <button
            className="mt-3 rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100"
            type="button"
            onClick={loadMatches}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filteredMatches.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          No hay partidos para esta seleccion.
        </div>
      )}

      {!loading && !error && filteredMatches.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {filteredMatches.map((match) => (
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
          onSaved={loadMatches}
        />
      )}
    </section>
  );
}
