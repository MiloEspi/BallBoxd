'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import LeagueSelect from '@/app/components/ui/LeagueSelect';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import TeamLogo from '@/app/components/ui/TeamLogo';
import { fetchMatches, fetchTeams, followTeam, unfollowTeam } from '@/app/lib/api';
import type { Match, Team } from '@/app/lib/types';

type LeagueOption = {
  value: string;
  label: string;
  subtitle?: string;
};

const getDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 180);
  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
};

const buildLeagueOptions = (matches: Match[]) => {
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

const buildTeamLeagueMap = (matches: Match[]) => {
  const map = new Map<number, Set<number>>();
  matches.forEach((match) => {
    const leagueId = match.tournament.id;
    [match.home_team.id, match.away_team.id].forEach((teamId) => {
      if (!map.has(teamId)) {
        map.set(teamId, new Set());
      }
      map.get(teamId)!.add(leagueId);
    });
  });
  return map;
};

// Teams catalog page with league navigation and follow controls.
export default function Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [selectedLeague, setSelectedLeague] = useState('ALL');
  const [showFollowingOnly, setShowFollowingOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'az' | 'follow'>('az');
  const [transitionPhase, setTransitionPhase] = useState<
    'idle' | 'fadeOut' | 'skeleton' | 'fadeIn'
  >('idle');

  const loadTeams = async () => {
    setLoading(true);
    setError('');
    const range = getDateRange();
    try {
      const teamsResponse = await fetchTeams();
      setTeams(teamsResponse.results);
      try {
        const matchesResponse = await fetchMatches(range);
        setMatches(matchesResponse.results);
      } catch {
        setMatches([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('teams.follow.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedLeague === 'ALL') {
      setTransitionPhase('idle');
      return;
    }
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
  }, [selectedLeague]);

  const leagueOptions = useMemo(() => buildLeagueOptions(matches), [matches]);
  const teamLeagueMap = useMemo(() => buildTeamLeagueMap(matches), [matches]);
  const hasOtherTeams = teams.some((team) => !teamLeagueMap.has(team.id));

  const leagueDropdownOptions = useMemo<LeagueOption[]>(() => {
    const options = [
      { value: 'ALL', label: t('matches.toolbar.status.all') },
      ...leagueOptions.map((league) => ({
        value: String(league.id),
        label: league.name,
        subtitle: league.country ?? undefined,
      })),
    ];
    if (hasOtherTeams) {
      options.push({ value: 'OTHER', label: t('teams.other') });
    }
    return options;
  }, [hasOtherTeams, leagueOptions, t]);

  const filteredTeams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = teams.filter((team) => {
      if (showFollowingOnly && !team.is_following) {
        return false;
      }
      if (selectedLeague === 'ALL') {
        return true;
      }
      if (selectedLeague === 'OTHER') {
        return !teamLeagueMap.has(team.id);
      }
      const leagues = teamLeagueMap.get(team.id);
      return leagues ? leagues.has(Number(selectedLeague)) : false;
    });
    if (normalized) {
      list = list.filter((team) =>
        `${team.name} ${team.country}`.toLowerCase().includes(normalized),
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'follow') {
        const diff = Number(b.is_following) - Number(a.is_following);
        if (diff !== 0) {
          return diff;
        }
      }
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [query, selectedLeague, showFollowingOnly, sortBy, teamLeagueMap, teams]);

  const toggleFollow = async (team: Team) => {
    if (pendingId) {
      return;
    }
    setPendingId(team.id);
    const next = !team.is_following;
    setTeams((current) =>
      current.map((item) =>
        item.id === team.id ? { ...item, is_following: next } : item,
      ),
    );
    try {
      if (next) {
        await followTeam(team.id);
      } else {
        await unfollowTeam(team.id);
      }
    } catch (err) {
      setTeams((current) =>
        current.map((item) =>
          item.id === team.id ? { ...item, is_following: !next } : item,
        ),
      );
      setError(err instanceof Error ? err.message : t('teams.follow.error'));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('teams.title')}</h1>
        <p className="text-sm text-slate-400">{t('teams.subtitle')}</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="w-full max-w-md rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 outline-none focus:border-white/30"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('teams.search.placeholder')}
        />
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
          onClick={() => setQuery('')}
        >
          {t('teams.clear')}
        </button>
        <button
          type="button"
          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
            showFollowingOnly
              ? 'bg-white text-slate-900'
              : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
          onClick={() => setShowFollowingOnly((prev) => !prev)}
        >
          {t('common.followingOnly')}
        </button>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
          <select
            className="bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 focus:outline-none"
            value={sortBy}
            onChange={(event) =>
              setSortBy(event.target.value === 'follow' ? 'follow' : 'az')
            }
          >
            <option value="az">{t('teams.sort.az')}</option>
            <option value="follow">{t('teams.sort.followFirst')}</option>
          </select>
        </div>
      </div>

      <div className="lg:hidden">
        <LeagueSelect
          label={t('matches.toolbar.league')}
          value={selectedLeague}
          options={leagueDropdownOptions}
          onChange={setSelectedLeague}
          emptyLabel={t('leagues.empty')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden rounded-2xl border border-white/10 bg-white/5 p-4 lg:block">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
            {t('teams.leagues')}
          </p>
          <div className="mt-3 max-h-[70vh] space-y-2 overflow-y-auto pr-1">
            {leagueDropdownOptions.map((league) => {
              const isActive = selectedLeague === league.value;
              return (
                <button
                  key={league.value}
                  type="button"
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'border border-white/5 text-slate-300 hover:bg-white/5'
                  }`}
                  onClick={() => setSelectedLeague(league.value)}
                >
                  <div className="font-semibold">{league.label}</div>
                  {league.subtitle && (
                    <div className="text-xs text-slate-500">
                      {league.subtitle}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="space-y-4">
          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={`team-skeleton-${index}`} className="h-28" />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
              <p>{error}</p>
              <button
                className="mt-3 rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100"
                type="button"
                onClick={loadTeams}
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {!loading && !error && filteredTeams.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
              {t('teams.empty')}
            </div>
          )}

          {!loading && !error && filteredTeams.length > 0 && (
            <div
              className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 transition-opacity duration-150 ${
                transitionPhase === 'fadeOut' || transitionPhase === 'fadeIn'
                  ? 'opacity-0'
                  : 'opacity-100'
              }`}
            >
              {transitionPhase === 'skeleton'
                ? Array.from({ length: 6 }).map((_, index) => (
                    <SkeletonBlock
                      key={`team-skeleton-${index}`}
                      className="h-28"
                    />
                  ))
                : filteredTeams.map((team) => (
                    <article
                      key={team.id}
                      className="cursor-pointer rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 transition hover:border-slate-600"
                      onClick={() => router.push(`/teams/${team.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          router.push(`/teams/${team.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <TeamLogo name={team.name} logoUrl={team.logo_url} size="xl" />
                        <div className="space-y-1">
                          <h2 className="text-base font-semibold text-white">
                            {team.name}
                          </h2>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                            {team.country}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`mt-4 w-full rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                          team.is_following
                            ? 'border border-emerald-400/60 text-emerald-200 hover:border-emerald-300'
                            : 'bg-white text-slate-900 hover:bg-slate-200'
                        }`}
                        disabled={pendingId === team.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFollow(team);
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {pendingId === team.id
                          ? t('teams.follow.save')
                          : team.is_following
                            ? t('teams.follow.following')
                            : t('teams.follow.follow')}
                      </button>
                    </article>
                  ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
