'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import {
  ApiError,
  fetchMe,
  fetchPublicProfile,
  fetchSearch,
  followUser,
  unfollowUser,
} from '@/app/lib/api';
import type { SearchResponse } from '@/app/lib/types';

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

export default function Page() {
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [profileLink, setProfileLink] = useState('');
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    fetchMe()
      .then((me) => {
        if (me?.username) {
          setProfileLink(`${window.location.origin}/u/${me.username}`);
        }
      })
      .catch(() => {
        // Ignore missing auth.
      });
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const handle = window.setTimeout(async () => {
      try {
        const response = await fetchSearch({
          q: trimmed,
          types: ['users'],
          page: 1,
          page_size: 20,
        });
        setData(response);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setError({
            message: t('friends.search.login'),
            action: 'login',
          });
        } else {
          setError({
            message: t('friends.search.error'),
            action: 'retry',
          });
        }
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query, retryKey, t]);

  useEffect(() => {
    if (!data?.results.users.length) {
      return;
    }
    let cancelled = false;
    const loadFollowState = async () => {
      const entries = await Promise.all(
        data.results.users.map(async (user) => {
          try {
            const response = await fetchPublicProfile(user.username, 1, 1);
            return [user.username, Boolean(response?.is_following)] as const;
          } catch {
            return [user.username, false] as const;
          }
        }),
      );
      if (cancelled) {
        return;
      }
      setFollowed((prev) => {
        const next = { ...prev };
        entries.forEach(([username, isFollowing]) => {
          next[username] = isFollowing;
        });
        return next;
      });
    };
    loadFollowState();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const handleFollow = async (username: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await unfollowUser(username);
      } else {
        await followUser(username);
      }
      setFollowed((prev) => ({ ...prev, [username]: !isFollowing }));
    } catch {
      // Keep state unchanged on error.
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-2xl font-semibold">{t('friends.search.title')}</h1>
        <p className="text-sm text-slate-400">{t('friends.search.subtitle')}</p>
        <div className="flex items-center gap-3 rounded-full border border-slate-700/70 bg-slate-900/70 px-4 py-2">
          <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
          <input
            className="w-full bg-transparent text-sm text-slate-100 outline-none"
            placeholder={t('friends.search.placeholder')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t('friends.search.title')}
          />
        </div>
      </header>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={`friends-skeleton-${index}`} className="h-16" />
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
              : () => setRetryKey((prev) => prev + 1)
          }
        />
      )}

      {!loading && !error && !data && (
        <StateEmpty
          title={t('friends.search.emptyTitle')}
          description={t('friends.search.emptyDesc')}
        />
      )}

      {!loading && !error && data && data.results.users.length === 0 && (
        <StateEmpty
          title={t('friends.search.noResults', { query: data.q })}
          description={t('friends.search.noResultsDesc')}
        />
      )}

      {!loading && !error && data && data.results.users.length > 0 && (
        <div className="space-y-3">
          {data.results.users.map((user) => {
            const isFollowing = Boolean(followed[user.username]);
            return (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3"
              >
                <Link
                  href={`/u/${user.username}`}
                  className="text-sm font-semibold text-white hover:underline"
                >
                  @{user.username}
                </Link>
                <button
                  type="button"
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    isFollowing
                      ? 'border border-white/20 text-white hover:border-white/40'
                      : 'bg-white text-slate-900 hover:bg-slate-200'
                  }`}
                  onClick={() => handleFollow(user.username, isFollowing)}
                >
                  {isFollowing ? t('common.following') : t('common.follow')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {profileLink && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {t('friends.search.shareTitle')}
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
              {t('home.share.copy')}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {t('friends.search.shareCaption')}
          </p>
        </div>
      )}
    </section>
  );
}
