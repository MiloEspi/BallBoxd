'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import FriendsActivityCard from '@/app/components/feed/FriendsActivityCard';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import { ApiError, fetchFriendsFeed, fetchMe } from '@/app/lib/api';
import type { FriendsFeedItem } from '@/app/lib/types';
import SegmentedControl from '@/app/ui/segmented-control';

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

type TabKey = 'friends' | 'today';

// Friends feed landing page with a lightweight Today tab.
export default function Page() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('friends');
  const [items, setItems] = useState<FriendsFeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [profileLink, setProfileLink] = useState('');

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchFriendsFeed(1, 20);
      setItems(response.results);
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

  useEffect(() => {
    loadFeed();
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
        description="Segui usuarios para ver sus ratings recientes."
        actionLabel="Buscar amigos"
        onAction={() => router.push('/search?tab=users')}
      />
    ),
    [router],
  );

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Home</h1>
        <p className="text-sm text-slate-400">
          Lo ultimo que vieron tus amigos.
        </p>
      </header>

      <SegmentedControl
        options={[
          { value: 'friends', label: 'Friends' },
          { value: 'today', label: 'Today' },
        ]}
        value={tab}
        onChange={(value) => setTab(value as TabKey)}
        ariaLabel="Feed tabs"
        size="sm"
      />

      {tab === 'friends' && (
        <>
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
                </div>
              )}
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="space-y-4">
              {items.map((item) => (
                <FriendsActivityCard key={`${item.actor.id}-${item.match.id}`} item={item} />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'today' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          <p className="text-sm text-slate-300">
            Explora los partidos del dia en tu feed de equipos.
          </p>
          <button
            type="button"
            className="mt-4 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
            onClick={() => router.push('/feed')}
          >
            Ver feed de equipos
          </button>
        </div>
      )}
    </section>
  );
}
