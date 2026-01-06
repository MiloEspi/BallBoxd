'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import MatchResultCard from '@/app/components/search/MatchResultCard';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import { ApiError, fetchSearch } from '@/app/lib/api';
import type { League, MatchResult, SearchResponse, Team } from '@/app/lib/types';

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

const TABS = [
  { key: 'all', label: 'Todo' },
  { key: 'teams', label: 'Equipos' },
  { key: 'leagues', label: 'Ligas' },
  { key: 'matches', label: 'Partidos' },
];

const tabToTypes = (tab: string) => {
  if (tab === 'teams') return ['teams'];
  if (tab === 'leagues') return ['leagues'];
  if (tab === 'matches') return ['matches'];
  return undefined;
};

export default function Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const tab = searchParams.get('tab') ?? 'all';
  const page = Math.max(Number(searchParams.get('page') ?? 1) || 1, 1);
  const leagueId = searchParams.get('league_id') ?? undefined;

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);

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
            message: 'Tu sesión expiró. Iniciá sesión de nuevo.',
            action: 'login',
          });
        } else {
          setError({
            message: 'No pudimos cargar los datos.',
            action: 'retry',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [query, tab, page, leagueId]);

  const hasResults = useMemo(() => {
    if (!data) {
      return false;
    }
    return (
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
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Busqueda</h1>
        <p className="text-sm text-slate-400">
          Resultados para &quot;{query || '...'}&quot;.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((item) => {
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
          actionLabel={error.action === 'login' ? 'Iniciar sesión' : 'Reintentar'}
          onAction={
            error.action === 'login'
              ? () => router.push('/login')
              : () => updateQuery({ page })
          }
        />
      )}

      {!loading && !error && (!query || !data) && (
        <StateEmpty
          title="Ingresá una búsqueda para ver resultados."
          description="Podés buscar equipos, ligas o partidos."
        />
      )}

      {!loading && !error && query && data && !hasResults && (
        <StateEmpty
          title={`Sin resultados para "${data.q}".`}
          description={leagueId ? 'Probá con otra liga.' : undefined}
          actionLabel={leagueId ? 'Probar otra liga' : undefined}
          onAction={leagueId ? () => updateQuery({ league_id: null }) : undefined}
        />
      )}

      {!loading && !error && data && hasResults && (
        <div className="space-y-10">
          {(tab === 'all' || tab === 'teams') && data.results.teams.length > 0 && (
            <SearchSection
              title="Equipos"
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

          {(tab === 'all' || tab === 'leagues') && data.results.leagues.length > 0 && (
            <SearchSection
              title="Ligas"
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

          {(tab === 'all' || tab === 'matches') && data.results.matches.length > 0 && (
            <SearchSection
              title="Partidos"
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
            Anterior
          </button>
          <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Pagina {page}
          </span>
          <button
            type="button"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
            onClick={() => updateQuery({ page: page + 1 })}
            disabled={!hasNext}
          >
            Siguiente
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

const SearchSection = <T,>({ title, items, renderItem }: SearchSectionProps<T>) => (
  <section className="space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="grid gap-4 lg:grid-cols-2">
      {items.map(renderItem)}
    </div>
  </section>
);
