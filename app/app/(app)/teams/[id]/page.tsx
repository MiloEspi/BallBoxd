'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

import MatchResultCard from '@/app/components/search/MatchResultCard';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import {
  ApiError,
  fetchTeamDetail,
  fetchTeamMatches,
  followTeam,
  unfollowTeam,
} from '@/app/lib/api';
import type { MatchResult, Team } from '@/app/lib/types';

type TeamPageProps = {
  params: Promise<{ id: string }>;
};

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

const SCOPE_OPTIONS = [
  { value: 'recent', label: 'Recientes' },
  { value: 'upcoming', label: 'Proximos' },
  { value: 'all', label: 'Todos' },
] as const;

export default function Page({ params }: TeamPageProps) {
  const router = useRouter();
  const { id } = use(params);
  const teamId = Number(id);
  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [scope, setScope] = useState<'recent' | 'upcoming' | 'all'>('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [pendingFollow, setPendingFollow] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const resolveError = (err: unknown): ErrorState => {
    if (err instanceof ApiError && err.status === 401) {
      return {
        message: 'Tu sesion expiro. Inicia sesion de nuevo.',
        action: 'login',
      };
    }
    return {
      message: 'No pudimos cargar los datos.',
      action: 'retry',
    };
  };

  const loadTeam = async () => {
    if (Number.isNaN(teamId)) {
      setError({ message: 'No pudimos cargar los datos.', action: 'retry' });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchTeamDetail(teamId);
      setTeam(response);
      const matchesResponse = await fetchTeamMatches(teamId, { scope });
      setMatches(matchesResponse.results);
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, [teamId, scope]);

  useEffect(() => {
    if (!toastMessage) {
      return;
    }
    const timeout = window.setTimeout(() => setToastMessage(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  if (loading) {
    return (
      <section className="space-y-6">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-10" />
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonBlock className="h-32" />
          <SkeletonBlock className="h-32" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <StateError
          message={error.message}
          actionLabel={error.action === 'login' ? 'Iniciar sesion' : 'Reintentar'}
          onAction={
            error.action === 'login' ? () => router.push('/login') : loadTeam
          }
        />
      </section>
    );
  }

  if (!team) {
    return (
      <section className="space-y-6">
        <StateEmpty title="Equipo no encontrado." />
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Equipo
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {team.logo_url && (
              <img
                src={team.logo_url}
                alt={team.name}
                className="h-14 w-14 rounded-full border border-white/10 bg-slate-900/80 p-2"
              />
            )}
            <div>
              <h1 className="text-2xl font-semibold text-white">{team.name}</h1>
              <p className="mt-2 text-sm text-slate-400">
                {team.country}
                {team.city ? ` - ${team.city}` : ''}
                {team.stadium ? ` - ${team.stadium}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={`sticky top-4 self-start rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(255,255,255,0.2)] transition md:static md:self-auto ${
              team.is_following
                ? 'border border-emerald-400/60 text-emerald-200 hover:border-emerald-300'
                : 'bg-white text-slate-900 hover:bg-slate-200'
            }`}
            disabled={pendingFollow}
            onClick={async () => {
              if (pendingFollow) {
                return;
              }
              const next = !team.is_following;
              setPendingFollow(true);
              setTeam((current) =>
                current ? { ...current, is_following: next } : current,
              );
              setToastMessage(
                next ? `Now following ${team.name}` : `Unfollowed ${team.name}`,
              );
              try {
                if (next) {
                  await followTeam(team.id);
                } else {
                  await unfollowTeam(team.id);
                }
              } catch {
                setTeam((current) =>
                  current ? { ...current, is_following: !next } : current,
                );
                setToastMessage('Could not update follow status.');
              } finally {
                setPendingFollow(false);
              }
            }}
          >
            {pendingFollow
              ? 'Guardando...'
              : team.is_following
              ? 'Siguiendo'
              : 'Seguir'}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {SCOPE_OPTIONS.map((option) => {
          const isActive = scope === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setScope(option.value)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                isActive
                  ? 'bg-white text-slate-900'
                  : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {matches.length === 0 ? (
        <StateEmpty title="No hay partidos para este equipo." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {matches.map((match) => (
            <MatchResultCard key={match.id} match={match} />
          ))}
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_20px_45px_rgba(0,0,0,0.45)] backdrop-blur">
          {toastMessage}
        </div>
      )}
    </section>
  );
}
