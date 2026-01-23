'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

import { fetchSearch } from '@/app/lib/api';
import type {
  MatchResult,
  SearchResponse,
  Team,
  League,
  UserMini,
} from '@/app/lib/types';

type SearchItem = {
  id: string;
  label: string;
  hint?: string;
  href: string;
};

const buildMatchLabel = (match: MatchResult) =>
  `${match.home.name} vs ${match.away.name}`;

const buildMatchHint = (match: MatchResult) =>
  `${match.league.name} · ${new Date(match.kickoff_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;

// Global search input with grouped typeahead results.
export default function GlobalSearch({ autoFocus = false }: { autoFocus?: boolean }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setOpen(false);
      setLoading(false);
      setError('');
      return;
    }

    setOpen(true);
    setLoading(true);
    setError('');

    const handle = window.setTimeout(async () => {
      try {
        const response = await fetchSearch({ q: query, page_size: 5, page: 1 });
        setResults(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed.');
      } finally {
        setLoading(false);
        setActiveIndex(0);
      }
    }, 250);

    return () => {
      window.clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  const items = useMemo(() => {
    if (!results) {
      return [] as SearchItem[];
    }
    const list: SearchItem[] = [];
    results.results.users.forEach((user: UserMini) => {
      list.push({
        id: `user-${user.id}`,
        label: `@${user.username}`,
        hint: 'Usuario',
        href: `/u/${user.username}`,
      });
    });
    results.results.teams.forEach((team: Team) => {
      list.push({
        id: `team-${team.id}`,
        label: team.name,
        hint: team.country,
        href: `/teams/${team.id}`,
      });
    });
    results.results.leagues.forEach((league: League) => {
      list.push({
        id: `league-${league.id}`,
        label: league.name,
        hint: league.country,
        href: `/matches?tournament=${league.id}`,
      });
    });
    results.results.matches.forEach((match: MatchResult) => {
      list.push({
        id: `match-${match.id}`,
        label: buildMatchLabel(match),
        hint: buildMatchHint(match),
        href: `/matches/${match.id}`,
      });
    });
    return list;
  }, [results]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = items[activeIndex];
      if (target) {
        setOpen(false);
        router.push(target.href);
      }
    }
    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <input
        className="w-full rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-emerald-400/60"
        placeholder="Buscar usuarios, equipos o partidos..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => query.trim() && setOpen(true)}
        onKeyDown={handleKeyDown}
        aria-label="Global search"
        autoFocus={autoFocus}
      />

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-40 rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`search-skeleton-${index}`}
                  className="h-8 rounded-lg bg-slate-800/70 animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-red-200">{error}</p>
          )}

          {!loading && !error && results && items.length === 0 && (
            <p className="text-sm text-slate-400">
              Sin resultados para &quot;{results.q}&quot;.
            </p>
          )}

          {!loading && !error && results && items.length > 0 && (
            <div className="space-y-4">
              {results.results.users.length > 0 && (
                <SearchGroup
                  title="Usuarios"
                  items={results.results.users.map((user) => ({
                    id: `user-${user.id}`,
                    label: `@${user.username}`,
                    hint: 'Perfil',
                    href: `/u/${user.username}`,
                  }))}
                  activeId={items[activeIndex]?.id}
                  onSelect={(href) => {
                    setOpen(false);
                    router.push(href);
                  }}
                />
              )}
              {results.results.teams.length > 0 && (
                <SearchGroup
                  title="Equipos"
                  items={results.results.teams.map((team) => ({
                    id: `team-${team.id}`,
                    label: team.name,
                    hint: team.country,
                    href: `/teams/${team.id}`,
                  }))}
                  activeId={items[activeIndex]?.id}
                  onSelect={(href) => {
                    setOpen(false);
                    router.push(href);
                  }}
                />
              )}
              {results.results.leagues.length > 0 && (
                <SearchGroup
                  title="Ligas"
                  items={results.results.leagues.map((league) => ({
                    id: `league-${league.id}`,
                    label: league.name,
                    hint: league.country,
                    href: `/matches?tournament=${league.id}`,
                  }))}
                  activeId={items[activeIndex]?.id}
                  onSelect={(href) => {
                    setOpen(false);
                    router.push(href);
                  }}
                />
              )}
              {results.results.matches.length > 0 && (
                <SearchGroup
                  title="Partidos"
                  items={results.results.matches.map((match) => ({
                    id: `match-${match.id}`,
                    label: buildMatchLabel(match),
                    hint: buildMatchHint(match),
                    href: `/matches/${match.id}`,
                  }))}
                  activeId={items[activeIndex]?.id}
                  onSelect={(href) => {
                    setOpen(false);
                    router.push(href);
                  }}
                />
              )}
              <button
                className="w-full rounded-full border border-slate-700/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push(`/search?q=${encodeURIComponent(results.q)}`);
                }}
              >
                Ver todos los resultados
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type SearchGroupProps = {
  title: string;
  items: SearchItem[];
  activeId?: string;
  onSelect: (href: string) => void;
};

const SearchGroup = ({ title, items, activeId, onSelect }: SearchGroupProps) => (
  <div className="space-y-2">
    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">
      {title}
    </p>
    <div className="space-y-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.href)}
          className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
            item.id === activeId
              ? 'bg-white/10 text-white'
              : 'text-slate-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          <div className="font-semibold">{item.label}</div>
          {item.hint && (
            <div className="text-xs text-slate-500">{item.hint}</div>
          )}
        </button>
      ))}
    </div>
  </div>
);
