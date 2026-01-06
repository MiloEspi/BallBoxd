'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import MatchCard from '@/app/components/match/MatchCard';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import LeagueSelect from '@/app/components/ui/LeagueSelect';
import PaginationControls from '@/app/components/ui/PaginationControls';
import SkeletonMatchCard from '@/app/components/ui/SkeletonMatchCard';
import StateEmpty from '@/app/components/ui/StateEmpty';
import { fetchMatches } from '@/app/lib/api';
import { readLeaguePreferences, saveLeaguePreferences } from '@/app/lib/league-preferences';
import { getStatusMeta } from '@/app/lib/match-ui';
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

// Extracts a sorted list of unique leagues by id.
const getLeagueOptions = (matches: Match[]) => {
  const map = new Map<number, { id: number; name: string; country?: string }>();
  matches.forEach((match) => {
    if (!map.has(match.tournament.id)) {
      map.set(match.tournament.id, {
        id: match.tournament.id,
        name: match.tournament.name,
        country: match.tournament.country,
      });
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
};

// Picks the most recent match date to seed the calendar.
const getLatestMatchDate = (matches: Match[]) => {
  const dates = matches.map((match) => new Date(match.date_time));
  return dates.sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date();
};

// Matches listing page with date + league filters.
export default function MatchesClient() {
  const searchParams = useSearchParams();
  const tournamentParam = searchParams.get('tournament');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [myLeagues, setMyLeagues] = useState<number[]>([]);
  const [showManageLeagues, setShowManageLeagues] = useState(false);
  const [transitionPhase, setTransitionPhase] = useState<
    'idle' | 'fadeOut' | 'skeleton' | 'fadeIn'
  >('idle');
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [hasStoredPrefs, setHasStoredPrefs] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const pageSize = 8;

  // Loads the full matches catalog.
  const loadMatches = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchMatches(
        tournamentParam ? { tournament: tournamentParam } : {},
      );
      setMatches(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [tournamentParam]);

  useEffect(() => {
    const stored = readLeaguePreferences();
    if (stored !== null) {
      setMyLeagues(stored);
      setHasStoredPrefs(true);
    }
    setPrefsLoaded(true);
  }, []);

  useEffect(() => {
    if (!tournamentParam || matches.length === 0) {
      return;
    }
    const tournamentId = Number(tournamentParam);
    if (!Number.isNaN(tournamentId)) {
      setSelectedLeague(String(tournamentId));
      setSelectedDate(null);
    }
  }, [matches, tournamentParam]);

  useEffect(() => {
    if (!selectedDate && matches.length > 0) {
      setSelectedDate(getLatestMatchDate(matches));
    }
  }, [matches, selectedDate]);

  useEffect(() => {
    setTransitionPhase('fadeOut');
    const fadeTimeout = window.setTimeout(() => {
      setTransitionPhase('skeleton');
    }, 120);
    const skeletonTimeout = window.setTimeout(() => {
      setTransitionPhase('fadeIn');
    }, 320);
    const doneTimeout = window.setTimeout(() => {
      setTransitionPhase('idle');
    }, 470);
    return () => {
      window.clearTimeout(fadeTimeout);
      window.clearTimeout(skeletonTimeout);
      window.clearTimeout(doneTimeout);
    };
  }, [selectedDate]);

  useEffect(() => {
    setPage(1);
  }, [selectedLeague, selectedDate, selectedStatus, sortBy, matches]);

  const leagueOptions = useMemo(() => getLeagueOptions(matches), [matches]);
  const leagueDropdownOptions = useMemo(() => {
    const base = [
      { value: 'ALL', label: 'All leagues' },
      { value: 'MY', label: 'My leagues' },
    ];
    return [
      ...base,
      ...leagueOptions.map((league) => ({
        value: String(league.id),
        label: league.name,
        subtitle: league.country ?? undefined,
      })),
    ];
  }, [leagueOptions]);

  useEffect(() => {
    if (!prefsLoaded || hasStoredPrefs) {
      return;
    }
    if (leagueOptions.length > 0) {
      setMyLeagues(leagueOptions.map((league) => league.id));
    }
  }, [hasStoredPrefs, leagueOptions, prefsLoaded]);

  useEffect(() => {
    if (!prefsLoaded) {
      return;
    }
    saveLeaguePreferences(myLeagues);
  }, [myLeagues, prefsLoaded]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const byLeague =
        selectedLeague === 'ALL' ||
        (selectedLeague === 'MY' && myLeagues.includes(match.tournament.id)) ||
        String(match.tournament.id) === selectedLeague;
      const byDate =
        !selectedDate ||
        isSameDay(new Date(match.date_time), selectedDate);
      const byStatus =
        selectedStatus === 'ALL' ||
        getStatusMeta(match.status, match.date_time).label === selectedStatus;
      return byLeague && byDate && byStatus;
    });
  }, [matches, myLeagues, selectedDate, selectedLeague, selectedStatus]);

  const sortedMatches = useMemo(() => {
    const list = [...filteredMatches];
    if (sortBy === 'rating_desc') {
      list.sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0));
    } else if (sortBy === 'rating_asc') {
      list.sort((a, b) => (a.avg_score ?? 0) - (b.avg_score ?? 0));
    } else if (sortBy === 'date_asc') {
      list.sort(
        (a, b) =>
          new Date(a.date_time).getTime() - new Date(b.date_time).getTime(),
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(b.date_time).getTime() - new Date(a.date_time).getTime(),
      );
    }
    return list;
  }, [filteredMatches, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedMatches.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const totalItems = sortedMatches.length;
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd =
    totalItems === 0 ? 0 : Math.min(totalItems, currentPage * pageSize);
  const pagedMatches = sortedMatches.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const today = new Date();
  const calendarLabel = selectedDate
    ? isSameDay(selectedDate, today)
      ? 'Hoy'
      : formatDateLabel(selectedDate)
    : 'Todas';
  const showingLabel = selectedDate
    ? `Showing: ${selectedDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`
    : 'Showing: All dates';

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

        <div className="flex flex-wrap items-center gap-3">
          <LeagueSelect
            label="League"
            value={selectedLeague}
            options={leagueDropdownOptions}
            onChange={setSelectedLeague}
          />
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
            onClick={() => setShowManageLeagues(true)}
          >
            Manage leagues
          </button>
          <SegmentedControl
            options={[
              { value: 'ALL', label: 'Todo' },
              { value: 'LIVE', label: 'Live' },
              { value: 'FINISHED', label: 'Finished' },
              { value: 'PENDING', label: 'Upcoming' },
            ]}
            value={selectedStatus}
            onChange={setSelectedStatus}
            ariaLabel="Estado del partido"
            size="sm"
          />
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
            <select
              className="bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 focus:outline-none"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="date_desc">Newest</option>
              <option value="date_asc">Oldest</option>
              <option value="rating_desc">Rating desc</option>
              <option value="rating_asc">Rating asc</option>
            </select>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
            onClick={() => {
              setSelectedDate(null);
              setSelectedLeague('ALL');
              setSelectedStatus('ALL');
            }}
          >
            Ver todas
          </button>
        </div>
      </div>

      {myLeagues.length > 0 && (
        <div className="hidden flex-wrap gap-2 lg:flex">
          {myLeagues
            .map((id) => leagueOptions.find((league) => league.id === id))
            .filter(Boolean)
            .slice(0, 3)
            .map((league) => (
              <button
                key={league!.id}
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10"
                onClick={() => setSelectedLeague(String(league!.id))}
              >
                {league!.name}
              </button>
            ))}
        </div>
      )}

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
        <StateEmpty
          title="No matches on this day for selected leagues."
          actionLabel="Ver todas"
          onAction={() => {
            setSelectedDate(null);
            setSelectedLeague('ALL');
          }}
        />
      )}

      {!loading && !error && filteredMatches.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-slate-500">
            <span>{showingLabel}</span>
            <span>
              Page {currentPage} / {totalPages} - {rangeStart}-{rangeEnd} of{' '}
              {totalItems}
            </span>
          </div>
          {transitionPhase === 'skeleton' ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonMatchCard key={`match-skeleton-${index}`} />
              ))}
            </div>
          ) : (
            <div
              className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 transition-opacity duration-150 ${
                transitionPhase === 'fadeOut' || transitionPhase === 'fadeIn'
                  ? 'opacity-0'
                  : 'opacity-100'
              }`}
            >
              {pagedMatches.map((match) => (
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_0_30px_rgba(255,255,255,0.06)]">
            <PaginationControls
              page={currentPage}
              totalPages={totalPages}
              totalItems={sortedMatches.length}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {showManageLeagues && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Manage leagues</h3>
              <button
                type="button"
                className="text-xs uppercase tracking-[0.2em] text-slate-400"
                onClick={() => setShowManageLeagues(false)}
              >
                Close
              </button>
            </div>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {leagueOptions.map((league) => {
                const isChecked = myLeagues.includes(league.id);
                return (
                  <label
                    key={league.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                  >
                    <span>
                      {league.name}
                      {league.country ? ` - ${league.country}` : ''}
                    </span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setMyLeagues((current) =>
                          current.includes(league.id)
                            ? current.filter((id) => id !== league.id)
                            : [...current, league.id],
                        );
                      }}
                    />
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
                onClick={() => setMyLeagues(leagueOptions.map((l) => l.id))}
              >
                Select all
              </button>
              <button
                type="button"
                className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-slate-200"
                onClick={() => setShowManageLeagues(false)}
              >
                Done
              </button>
            </div>
          </div>
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
