'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import MatchCard from '@/app/components/match/MatchCard';
import MatchesToolbar from '@/app/components/match/MatchesToolbar';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import CalendarModal from '@/app/components/ui/CalendarModal';
import PaginationControls from '@/app/components/ui/PaginationControls';
import SkeletonMatchCard from '@/app/components/ui/SkeletonMatchCard';
import StateEmpty from '@/app/components/ui/StateEmpty';
import { fetchMatches } from '@/app/lib/api';
import { addDays, isSameDay, startOfDay } from '@/app/lib/date-range';
import { getLocale } from '@/app/lib/i18n';
import { readLeaguePreferences, saveLeaguePreferences } from '@/app/lib/league-preferences';
import { getStatusMeta } from '@/app/lib/match-ui';
import type { Match } from '@/app/lib/types';

// Formats the date label for the calendar pill.
const formatDateLabel = (date: Date, locale: string) => {
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

// Matches listing page with date + league filters.
export default function MatchesClient() {
  const searchParams = useSearchParams();
  const tournamentParam = searchParams.get('tournament');
  const { t, language } = useLanguage();
  const locale = getLocale(language);
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
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(() => today);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_asc');
  const [page, setPage] = useState(1);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
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
      setError(err instanceof Error ? err.message : t('common.loadError'));
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
      setSelectedDate(today);
    }
  }, [matches, tournamentParam, today]);

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
      { value: 'ALL', label: t('matches.toolbar.status.all') },
      { value: 'MY', label: t('matches.toolbar.myLeagues') },
    ];
    return [
      ...base,
      ...leagueOptions.map((league) => ({
        value: String(league.id),
        label: league.name,
        subtitle: league.country ?? undefined,
      })),
    ];
  }, [leagueOptions, t]);

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
      const byDate = isSameDay(new Date(match.date_time), selectedDate);
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
      list.sort((a, b) => {
        const leftDate = new Date(a.date_time);
        const rightDate = new Date(b.date_time);
        const leftDay = new Date(
          leftDate.getFullYear(),
          leftDate.getMonth(),
          leftDate.getDate(),
        ).getTime();
        const rightDay = new Date(
          rightDate.getFullYear(),
          rightDate.getMonth(),
          rightDate.getDate(),
        ).getTime();
        if (leftDay !== rightDay) {
          return leftDay - rightDay;
        }
        return leftDate.getTime() - rightDate.getTime();
      });
    } else {
      list.sort((a, b) => {
        const leftDate = new Date(a.date_time);
        const rightDate = new Date(b.date_time);
        const leftDay = new Date(
          leftDate.getFullYear(),
          leftDate.getMonth(),
          leftDate.getDate(),
        ).getTime();
        const rightDay = new Date(
          rightDate.getFullYear(),
          rightDate.getMonth(),
          rightDate.getDate(),
        ).getTime();
        if (leftDay !== rightDay) {
          return rightDay - leftDay;
        }
        return leftDate.getTime() - rightDate.getTime();
      });
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

  const selectedLeagueLabel =
    leagueDropdownOptions.find((option) => option.value === selectedLeague)
      ?.label ?? t('matches.toolbar.status.all');
  const selectedStatusLabel =
    selectedStatus === 'ALL'
      ? t('matches.toolbar.status.all')
      : selectedStatus === 'LIVE'
        ? t('matches.toolbar.status.live')
        : selectedStatus === 'FINISHED'
          ? t('matches.toolbar.status.finished')
          : t('matches.toolbar.status.pending');
  const showingLabel = `${formatDateLabel(selectedDate, locale)} · ${selectedLeagueLabel} · ${selectedStatusLabel}`;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('matches.title')}</h1>
        <p className="text-sm text-slate-400">{t('matches.subtitle')}</p>
      </header>

      <MatchesToolbar
        selectedDate={selectedDate}
        today={today}
        selectedLeague={selectedLeague}
        selectedStatus={selectedStatus}
        sortBy={sortBy}
        leagueDropdownOptions={leagueDropdownOptions}
        onPrevDay={() => setSelectedDate(startOfDay(addDays(selectedDate, -1)))}
        onNextDay={() => setSelectedDate(startOfDay(addDays(selectedDate, 1)))}
        onOpenCalendar={() => setCalendarOpen(true)}
        onLeagueChange={setSelectedLeague}
        onOpenManageLeagues={() => setShowManageLeagues(true)}
        onStatusChange={setSelectedStatus}
        onSortChange={setSortBy}
        onClearFilters={() => {
          setSelectedLeague('ALL');
          setSelectedStatus('ALL');
        }}
      />

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          {t('matches.loading')}
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
            {t('common.retry')}
          </button>
        </div>
      )}

      {!loading && !error && filteredMatches.length === 0 && (
        <StateEmpty
          title={t('matches.emptyTitle')}
          actionLabel={t('matches.toolbar.clear')}
          onAction={() => {
            setSelectedLeague('ALL');
            setSelectedStatus('ALL');
          }}
        />
      )}

      {!loading && !error && filteredMatches.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.25em] text-slate-500">
            <span>{showingLabel}</span>
            <span>
              {t('matches.toolbar.page', {
                current: currentPage,
                total: totalPages,
                start: rangeStart,
                end: rangeEnd,
                totalItems,
              })}
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
              <h3 className="text-lg font-semibold text-white">
                {t('matches.toolbar.manage')}
              </h3>
              <button
                type="button"
                className="text-xs uppercase tracking-[0.2em] text-slate-400"
                onClick={() => setShowManageLeagues(false)}
              >
                {t('common.close')}
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
                {t('common.selectAll')}
              </button>
              <button
                type="button"
                className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-slate-200"
                onClick={() => setShowManageLeagues(false)}
              >
                {t('common.done')}
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

      <CalendarModal
        open={calendarOpen}
        selected={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          setPage(1);
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </section>
  );
}
