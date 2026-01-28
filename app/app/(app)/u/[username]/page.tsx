'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import MatchSummaryCard from '@/app/components/match/MatchSummaryCard';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import {
  ApiError,
  fetchMe,
  fetchPublicProfile,
  followUser,
  unfollowUser,
} from '@/app/lib/api';
import type { FollowStateResponse, PublicProfileRatingsResponse } from '@/app/lib/types';

type ProfilePageParams = {
  username?: string | string[];
};

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

const getUsernameFromParams = (params: ProfilePageParams) => {
  const usernameParam = params?.username;
  if (typeof usernameParam === 'string') {
    return usernameParam;
  }
  if (Array.isArray(usernameParam)) {
    return usernameParam[0] ?? '';
  }
  return '';
};

// Public profile page with follow controls and latest ratings.
export default function Page() {
  const router = useRouter();
  const params = useParams<ProfilePageParams>();
  const username = getUsernameFromParams(params);
  const { t } = useLanguage();
  const [data, setData] = useState<PublicProfileRatingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [page, setPage] = useState(1);
  const [isOwner, setIsOwner] = useState(false);
  const [followState, setFollowState] = useState<FollowStateResponse | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const loadProfile = async (targetPage: number = page) => {
    if (!username) {
      return;
    }
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchPublicProfile(username, targetPage, 6);
      if (requestRef.current !== requestId || !response) {
        return;
      }
      setData(response);
      setFollowState({
        is_following: response.is_following,
        followers: response.stats.followers,
        following: response.stats.following,
      });
    } catch (err) {
      if (requestRef.current !== requestId) {
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        setError({
          message: t('common.sessionExpired'),
          action: 'login',
        });
      } else {
        setError({
          message: t('public.noProfile'),
          action: 'retry',
        });
      }
    } finally {
      if (requestRef.current === requestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!username) {
      return;
    }
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) {
          setIsOwner(me.username === username);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsOwner(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    setPage(1);
    setData(null);
    setFollowState(null);
    setFollowError(null);
    setError(null);
  }, [username]);

  useEffect(() => {
    loadProfile(page);
  }, [username, page]);

  const statsCards = useMemo(() => {
    if (!data) {
      return [];
    }
    return [
      { label: t('profile.stats.totalRatings'), value: data.stats.total_ratings },
      { label: t('profile.stats.avgScore'), value: data.stats.avg_score.toFixed(1) },
      { label: t('profile.stats.teamsFollowed'), value: data.stats.teams_followed },
      { label: t('profile.stats.followers'), value: data.stats.followers },
      { label: t('profile.stats.following'), value: data.stats.following },
      { label: t('profile.stats.fullyWatched'), value: `${data.stats.fully_watched_pct}%` },
    ];
  }, [data, t]);

  const handleFollowToggle = async () => {
    if (!username || isOwner) {
      return;
    }
    setFollowError(null);
    try {
      const response = followState?.is_following
        ? await unfollowUser(username)
        : await followUser(username);
      setFollowState(response);
      setData((prev) =>
        prev
          ? {
              ...prev,
              is_following: response.is_following,
              stats: {
                ...prev.stats,
                followers: response.followers,
                following: response.following,
              },
            }
          : prev,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setFollowError(t('public.followErrorLogin'));
        return;
      }
      setFollowError(t('public.followError'));
    }
  };

  if (!username) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          {t('profile.invalidUsername')}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">@{username}</h1>
          {!isOwner && (
            <button
              type="button"
              className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
              onClick={handleFollowToggle}
              disabled={!followState}
            >
              {followState?.is_following ? t('common.unfollow') : t('common.follow')}
            </button>
          )}
        </div>
        {followError && <p className="text-xs text-rose-200">{followError}</p>}
        <p className="text-sm text-slate-400">{t('public.subtitle')}</p>
      </header>

      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={`public-stats-${index}`} className="h-24" />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBlock key={`public-rating-${index}`} className="h-24" />
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <StateError
          message={error.message}
          actionLabel={error.action === 'login' ? t('nav.login') : t('common.retry')}
          onAction={
            error.action === 'login'
              ? () => router.push('/login')
              : loadProfile
          }
        />
      )}

      {!loading && !error && !data && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          {t('public.noProfile')}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {statsCards.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-semibold text-white">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">{t('public.latestRatings')}</h2>
            {data.ratings.length === 0 ? (
              <StateEmpty
                title={t('public.noRatings')}
                description={t('public.noRatingsDesc')}
              />
            ) : (
              <div className="space-y-4">
                {data.ratings.map((rating) => (
                  <MatchSummaryCard key={rating.id} rating={rating} />
                ))}
              </div>
            )}
          </section>

          {data.total > data.page_size && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
              >
                {t('common.prev')}
              </button>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {t('matches.toolbar.page', {
                  current: page,
                  total: Math.max(1, Math.ceil(data.total / data.page_size)),
                  start: page,
                  end: page,
                  totalItems: data.total,
                })}
              </span>
              <button
                type="button"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={data.total <= page * data.page_size}
              >
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
