'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { fetchProfile } from '@/app/lib/api';
import type { ProfileResponse } from '@/app/lib/types';

type ProfilePageParams = {
  username?: string | string[];
};

// Formats dates for profile activity entries.
const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Maps minutes watched codes to readable labels.
const formatMinutes = (value: string) => {
  switch (value) {
    case 'LT_30':
      return 'Less than 30';
    case 'ONE_HALF':
      return 'One half';
    case 'ALMOST_ALL':
      return 'Almost all';
    case 'FULL':
      return 'Full match';
    default:
      return value;
  }
};

// Profile page showing stats and recent activity.
export default function Page() {
  const params = useParams<ProfilePageParams>();
  const usernameParam = params?.username;
  const username =
    typeof usernameParam === 'string'
      ? usernameParam
      : Array.isArray(usernameParam)
        ? usernameParam[0]
        : '';
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Loads profile data and updates UI state.
  const loadProfile = async (targetUsername?: string) => {
    if (!targetUsername) {
      setError('Invalid username.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetchProfile(targetUsername);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!username) {
      return;
    }
    loadProfile(username);
  }, [username]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          Loading profile...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          <p>{error}</p>
          <button
            className="mt-3 rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100"
            type="button"
            onClick={() => loadProfile(username)}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          No profile data found.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Profile
        </p>
        <h1 className="text-2xl font-semibold">@{data.user.username}</h1>
        <p className="text-sm text-slate-400">
          Recent ratings and stats.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total ratings', value: data.stats.total_ratings },
          { label: 'Average score', value: data.stats.avg_score.toFixed(1) },
          { label: 'Teams followed', value: data.stats.teams_followed },
          { label: 'Followers', value: data.stats.followers },
        ].map((stat) => (
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
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {data.recent_activity.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
            No ratings yet.
          </div>
        ) : (
          <div className="space-y-4">
            {data.recent_activity.map((rating) => (
              <article
                key={rating.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-white">
                      {rating.match.home_team.name} vs{' '}
                      {rating.match.away_team.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {rating.match.tournament.name} •{' '}
                      {formatDate(rating.match.date_time)}
                    </p>
                  </div>
                  <span className="text-2xl font-semibold text-white">
                    {rating.score}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-[0.2em] text-slate-400">
                    {formatMinutes(rating.minutes_watched)}
                  </span>
                  <span>{formatDate(rating.created_at)}</span>
                </div>
                {rating.review && (
                  <p className="mt-3 text-sm text-slate-300">
                    {rating.review}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
