'use client';

import { useEffect, useMemo, useState } from 'react';

import { fetchTeams, followTeam, unfollowTeam } from '@/app/lib/api';
import type { Team } from '@/app/lib/types';

// Teams catalog page with search and follow controls.
export default function Page() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<number | null>(null);

  const loadTeams = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTeams();
      setTeams(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const filteredTeams = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return teams;
    }
    return teams.filter((team) =>
      `${team.name} ${team.country}`.toLowerCase().includes(normalized),
    );
  }, [teams, query]);

  const toggleFollow = async (team: Team) => {
    if (pendingId) {
      return;
    }
    setPendingId(team.id);
    try {
      if (team.is_following) {
        await unfollowTeam(team.id);
      } else {
        await followTeam(team.id);
      }
      setTeams((current) =>
        current.map((item) =>
          item.id === team.id
            ? { ...item, is_following: !item.is_following }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update follow.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Equipos</h1>
        <p className="text-sm text-slate-400">
          Busca equipos y sigue los que quieras ver en tu feed.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="w-full max-w-md rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 outline-none focus:border-white/30"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre o pais..."
        />
        <button
          type="button"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10"
          onClick={() => setQuery('')}
        >
          Limpiar
        </button>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          Loading teams...
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
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filteredTeams.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          No hay equipos para esta busqueda.
        </div>
      )}

      {!loading && !error && filteredTeams.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <article
              key={team.id}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5"
            >
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">
                  {team.name}
                </h2>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {team.country}
                </p>
              </div>
              <button
                type="button"
                className={`mt-4 w-full rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  team.is_following
                    ? 'border border-emerald-400/60 text-emerald-200 hover:border-emerald-300'
                    : 'bg-white text-slate-900 hover:bg-slate-200'
                }`}
                disabled={pendingId === team.id}
                onClick={() => toggleFollow(team)}
              >
                {pendingId === team.id
                  ? 'Guardando...'
                  : team.is_following
                  ? 'Siguiendo'
                  : 'Seguir'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
