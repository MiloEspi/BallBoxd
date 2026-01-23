'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import FriendsActivityCard from '@/app/components/feed/FriendsActivityCard';
import MatchCard from '@/app/components/match/MatchCard';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import SkeletonMatchCard from '@/app/components/ui/SkeletonMatchCard';
import { ApiError, fetchFeed, fetchFriendsFeed, fetchMe } from '@/app/lib/api';
import type { FriendsFeedItem, Match } from '@/app/lib/types';
import { addDays, startOfDay } from '@/app/lib/date-range';

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

// Home page with friends activity + team matches feed.
export default function Page() {
  const router = useRouter();
  const [items, setItems] = useState<FriendsFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [profileLink, setProfileLink] = useState('');
  const [friendsPage, setFriendsPage] = useState(1);
  const [friendsTotal, setFriendsTotal] = useState(0);
  const [teamMatches, setTeamMatches] = useState<Match[]>([]);
  const [matchFilter, setMatchFilter] = useState<'today' | 'week' | 'all'>(
    'today',
  );
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<ErrorState | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const loadFeed = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchFriendsFeed(page, 20);
      setFriendsTotal(response.total);
      setFriendsPage(page);
      setItems((prev) =>
        page > 1 ? [...prev, ...response.results] : response.results,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError({
          message: 'Tu sesion expiro. Inicia sesion de nuevo.',
          action: 'login',
        });
      } else {
        setError({
          message: 'No pudimos cargar la actividad.',
          action: 'retry',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTeamFeed = async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const response = await fetchFeed();
      setTeamMatches(response.results);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setTeamError({
          message: 'Tu sesion expiro. Inicia sesion de nuevo.',
          action: 'login',
        });
      } else {
        setTeamError({
          message: 'No pudimos cargar los partidos.',
          action: 'retry',
        });
      }
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
    loadTeamFeed();
  }, []);

  useEffect(() => {
    const cachedUsername = localStorage.getItem('auth_username');
    if (cachedUsername) {
      setProfileLink(`${window.location.origin}/u/${cachedUsername}`);
    }
    fetchMe()
      .then((me) => {
        if (me?.username) {
          const link = `${window.location.origin}/u/${me.username}`;
          setProfileLink(link);
          localStorage.setItem('auth_username', me.username);
        }
      })
      .catch(() => {
        // Keep cached link when auth is missing.
      });
  }, []);

  const emptyState = useMemo(
    () => (
      <StateEmpty
        title="Tu feed de amigos esta vacio."
        description="Segui a 2-3 amigos para ver sus ratings y reviews."
        actionLabel="Buscar amigos"
        onAction={() => router.push('/amigos')}
      />
    ),
    [router],
  );

  const filteredMatches = useMemo(() => {
    if (matchFilter === 'all') {
      return [...teamMatches].sort(
        (a, b) =>
          new Date(b.date_time).getTime() - new Date(a.date_time).getTime(),
      );
    }
    const today = startOfDay(new Date());
    if (matchFilter === 'today') {
      return teamMatches
        .filter((match) => {
          const matchDate = startOfDay(new Date(match.date_time));
          return matchDate.getTime() === today.getTime();
        })
        .sort(
          (a, b) =>
            new Date(b.date_time).getTime() -
            new Date(a.date_time).getTime(),
        );
    }
    const weekEnd = addDays(today, 6);
    return teamMatches
      .filter((match) => {
        const matchDate = new Date(match.date_time);
        return matchDate >= today && matchDate <= weekEnd;
      })
      .sort(
        (a, b) =>
          new Date(b.date_time).getTime() - new Date(a.date_time).getTime(),
      );
  }, [matchFilter, teamMatches]);

  return (
    <section className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="text-sm text-slate-400">
          Actividad social y partidos de tus equipos.
        </p>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Actividad de amigos</h2>
            <p className="text-sm text-slate-400">
              Lo ultimo que vieron tus amigos.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
            onClick={() => router.push('/search?tab=users')}
          >
            Buscar amigos
          </button>
        </div>

        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={`friends-skeleton-${index}`} className="h-24" />
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

        {!loading && !error && items.length === 0 && (
          <div className="space-y-4">
            {emptyState}
            {profileLink && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Comparte tu perfil
                </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-slate-700/70 bg-slate-950/60 px-3 py-1 text-xs text-slate-200">
                      {profileLink}
                    </span>
                    <button
                    type="button"
                    className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                      onClick={() => navigator.clipboard.writeText(profileLink)}
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Mandalo por WhatsApp a tu grupo.
                  </p>
                </div>
              )}
            </div>
          )}

        {!loading && !error && items.length > 0 && (
          <div className="space-y-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {items.map((item) => (
                <FriendsActivityCard
                  key={`${item.actor.id}-${item.match.id}`}
                  item={item}
                  variant="compact"
                  className="min-w-[260px] max-w-[280px] flex-shrink-0"
                />
              ))}
            </div>
            {items.length < friendsTotal && (
              <button
                type="button"
                className="w-full rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                onClick={() => loadFeed(friendsPage + 1)}
              >
                Ver mas
              </button>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Feed de partidos</h2>
            <p className="text-sm text-slate-400">
              Partidos de equipos que seguis.
            </p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
            onClick={() => router.push('/feed')}
          >
            Ver todo
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'today', label: 'Hoy' },
            { key: 'week', label: 'Esta semana' },
            { key: 'all', label: 'Todos' },
          ].map((item) => {
            const active = matchFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setMatchFilter(item.key as typeof matchFilter)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  active
                    ? 'bg-white text-slate-900'
                    : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {teamLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonMatchCard key={`team-feed-skeleton-${index}`} />
            ))}
          </div>
        )}

        {!teamLoading && teamError && (
          <StateError
            message={teamError.message}
            actionLabel={teamError.action === 'login' ? 'Iniciar sesion' : 'Reintentar'}
            onAction={
              teamError.action === 'login'
                ? () => router.push('/login')
                : loadTeamFeed
            }
          />
        )}

        {!teamLoading && !teamError && filteredMatches.length === 0 && (
          <StateEmpty
            title="Todavia no seguis equipos."
            description="Segui equipos para ver sus partidos aca."
            actionLabel="Explorar equipos"
            onAction={() => router.push('/teams')}
          />
        )}

        {!teamLoading && !teamError && filteredMatches.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMatches.slice(0, 6).map((match) => (
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
      </section>

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
          onSaved={() => {
            loadTeamFeed();
          }}
        />
      )}
    </section>
  );
}
