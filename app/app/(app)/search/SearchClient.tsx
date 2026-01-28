'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import MatchResultCard from '@/app/components/search/MatchResultCard';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import { ApiError, fetchSearch } from '@/app/lib/api';
import type {
  League,
  MatchResult,
  SearchResponse,
  Team,
  UserMini,
} from '@/app/lib/types';

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

const tabToTypes = (tab: string) => {
  if (tab === 'users') return ['users'];
  if (tab === 'teams') return ['teams'];
  if (tab === 'leagues') return ['leagues'];
  if (tab === 'matches') return ['matches'];
  return ['all'];
};

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const query = searchParams.get('q') ?? '';
  const tab = searchParams.get('tab') ?? 'all';
  const page = Math.max(Number(searchParams.get('page') ?? 1) || 1, 1);
  const leagueId = searchParams.get('league_id') ?? undefined;

  const tabs = [
    { key: 'all', label: t('matches.toolbar.status.all') },
    { key: 'users', label: t('search.page.tabs.users') },
    { key: 'teams', label: t('search.page.tabs.teams') },
    { key: 'leagues', label: t('search.page.tabs.leagues') },
    { key: 'matches', label: t('search.page.tabs.matches') },
  ];

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [draft, setDraft] = useState(query);

  const updateQuery = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`/search?${params.toString()}`);
  };

  useEffect(() => {
    setDraft(query);
  }, [query]);

  useEffect(() => {
    const trimmed = draft.trim();
    if (trimmed === query.trim()) {
      return;
    }
    const handle = window.setTimeout(() => {
      updateQuery({ q: trimmed, page: 1 });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [draft, query]);

  useEffect(() => {
    if (!query.trim()) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetchSearch({
      q: query,
      types: tabToTypes(tab),
      league_id: leagueId,
      page,
      page_size: 20,
    })
      .then((response) => setData(response))
      .catch((err) => {
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
      })
      .finally(() => setLoading(false));
  }, [query, tab, page, leagueId, t]);

  const hasResults = useMemo(() => {
    if (!data) {
      return false;
    }
    return (
      data.results.users.length > 0 ||
      data.results.teams.length > 0 ||
      data.results.leagues.length > 0 ||
      data.results.matches.length > 0
    );
  }, [data]);

  const hasNext = useMemo(() => {
    if (!data) {
      return false;
    }
    return data.total > data.page * data.page_size;
  }, [data]);

  return (
    <section className="space-y-8">
      <header className="sticky top-14 z-20 -mx-2 rounded-2xl border border-slate-800/70 bg-slate-950/95 px-4 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur md:hidden">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2">
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm text-slate-100 outline-none"
              placeholder={t('search.page.placeholder')}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label={t('nav.search')}
            />
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {query
              ? t('search.page.resultsFor', { query })
              : t('search.page.searchPrompt')}
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => {
          const isActive = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => updateQuery({ tab: item.key, page: 1 })}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                isActive
                  ? 'bg-white text-slate-900'
                  : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={`search-skeleton-${index}`} className="h-24" />
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
              : () => updateQuery({ page })
          }
        />
      )}

      {!loading && !error && (!query || !data) && (
        <StateEmpty
          title={t('search.page.empty')}
          description={t('search.page.placeholder')}
        />
      )}

      {!loading && !error && query && data && !hasResults && (
        <StateEmpty
          title={t('search.empty', { query: data.q })}
          description={leagueId ? t('matches.toolbar.league') : undefined}
          actionLabel={leagueId ? t('common.clear') : undefined}
          onAction={leagueId ? () => updateQuery({ league_id: null }) : undefined}
        />
      )}

      {!loading && !error && data && hasResults && (
        <div className="space-y-10">
          {(tab === 'all' || tab === 'users') &&
            data.results.users.length > 0 && (
              <SearchSection
                title={t('search.page.tabs.users')}
                items={data.results.users}
                renderItem={(user: UserMini) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => router.push(`/u/${user.username}`)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:border-slate-600"
                  >
                    <p className="text-base font-semibold text-white">
                      @{user.username}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {t('search.hint.user')}
                    </p>
                  </button>
                )}
              />
            )}

          {(tab === 'all' || tab === 'teams') && data.results.teams.length > 0 && (
            <SearchSection
              title={t('search.page.tabs.teams')}
              items={data.results.teams}
              renderItem={(team: Team) => (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => router.push(`/teams/${team.id}`)}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:border-slate-600"
                >
                  <p className="text-base font-semibold text-white">{team.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {team.country}
                  </p>
                </button>
              )}
            />
          )}

          {(tab === 'all' || tab === 'leagues') &&
            data.results.leagues.length > 0 && (
              <SearchSection
                title={t('search.page.tabs.leagues')}
                items={data.results.leagues}
                renderItem={(league: League) => (
                  <button
                    key={league.id}
                    type="button"
                    onClick={() => router.push(`/matches?tournament=${league.id}`)}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left transition hover:border-slate-600"
                  >
                    <p className="text-base font-semibold text-white">{league.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                      {league.country}
                    </p>
                  </button>
                )}
              />
            )}

          {(tab === 'all' || tab === 'matches') &&
            data.results.matches.length > 0 && (
              <SearchSection
                title={t('search.page.tabs.matches')}
                items={data.results.matches}
                renderItem={(match: MatchResult) => (
                  <MatchResultCard key={match.id} match={match} />
                )}
              />
            )}
        </div>
      )}

      {!loading && !error && data && hasResults && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
            onClick={() => updateQuery({ page: Math.max(page - 1, 1) })}
            disabled={page <= 1}
          >
            {t('common.prev')}
          </button>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {t('matches.toolbar.page', {
              current: page,
              total: Math.max(1, Math.ceil((data?.total ?? 0) / (data?.page_size ?? 1))),
              start: page,
              end: page,
              totalItems: data?.total ?? 0,
            })}
          </span>
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
            onClick={() => updateQuery({ page: page + 1 })}
            disabled={!hasNext}
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </section>
  );
}

type SearchSectionProps<T> = {
  title: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
};

const SearchSection = <T,>({
  title,
  items,
  renderItem,
}: SearchSectionProps<T>) => (
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="grid gap-4 lg:grid-cols-2">{items.map(renderItem)}</div>
  </section>
);
