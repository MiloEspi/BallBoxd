'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import {
  ApiError,
  fetchProfileActivity,
  fetchProfileHighlights,
  fetchProfileStats,
} from '@/app/lib/api';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import MatchSummaryCard from '@/app/components/match/MatchSummaryCard';
import ProfileMemoriesSection from '@/app/components/profile/ProfileMemoriesSection';
import type {
  ProfileActivityResponse,
  ProfileHighlightsResponse,
  ProfileStatsResponse,
  TeamDistributionItem,
  RatingWithMatch,
} from '@/app/lib/types';
import SegmentedControl from '@/app/ui/segmented-control';

type ProfilePageParams = {
  username?: string | string[];
};

type TabKey = 'stats' | 'activity' | 'highlights';
type RangeKey = 'week' | 'month' | 'year';
type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

type StatsPanelProps = {
  data: ProfileStatsResponse | null;
  loading: boolean;
  error: ErrorState | null;
  onRetry: () => void;
  onLogin: () => void;
};

type ActivityPanelProps = {
  data: ProfileActivityResponse | null;
  loading: boolean;
  error: ErrorState | null;
  onRetry: () => void;
  onLogin: () => void;
  onExplore: () => void;
};

type HighlightsPanelProps = {
  data: ProfileHighlightsResponse | null;
  loading: boolean;
  error: ErrorState | null;
  onRetry: () => void;
  onLogin: () => void;
};

type StatCardItem = {
  label: string;
  value: string | number;
};

const TAB_OPTIONS = [
  { value: 'stats', label: 'Stats' },
  { value: 'activity', label: 'Activity' },
  { value: 'highlights', label: 'Highlights' },
];

const RANGE_OPTIONS = [
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const TEAM_COLORS = [
  '#6EE7B7',
  '#60A5FA',
  '#FBBF24',
  '#F87171',
  '#A78BFA',
  '#F472B6',
  '#38BDF8',
];

// Extracts a usable username from Next.js route params.
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

// Renders a single activity row card.
const renderActivityCard = (rating: RatingWithMatch) => (
  <MatchSummaryCard key={rating.id} rating={rating} />
);

// Renders a summary stat card.
const renderStatCard = (stat: StatCardItem) => (
  <div
    key={stat.label}
    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
  >
    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
      {stat.label}
    </p>
    <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
  </div>
);

// Builds a conic-gradient string for the team distribution donut.
const buildConicGradient = (
  items: TeamDistributionItem[],
  colors: string[],
) => {
  if (items.length === 0) {
    return 'conic-gradient(#1f2937 0% 100%)';
  }
  let current = 0;
  const stops = items.map((item, index) => {
    const start = current;
    const end = Math.min(100, current + item.pct);
    current = end;
    const color = colors[index % colors.length];
    return `${color} ${start}% ${end}%`;
  });
  if (current < 100) {
    stops.push(`#0f172a ${current}% 100%`);
  }
  return `conic-gradient(${stops.join(', ')})`;
};

// Shows profile stats summary cards.
function StatsPanel({
  data,
  loading,
  error,
  onRetry,
  onLogin,
}: StatsPanelProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={`stats-card-${index}`} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <SkeletonBlock className="h-64" />
          <SkeletonBlock className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <StateError
        message={error.message}
        actionLabel={error.action === 'login' ? 'Iniciar sesión' : 'Reintentar'}
        onAction={error.action === 'login' ? onLogin : onRetry}
      />
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        No stats data found.
      </div>
    );
  }

  const statsCards: StatCardItem[] = [
    { label: 'Total ratings', value: data.stats.total_ratings },
    { label: 'Average score', value: data.stats.avg_score.toFixed(1) },
    { label: 'Teams followed', value: data.stats.teams_followed },
    { label: 'Followers', value: data.stats.followers },
    { label: 'Following', value: data.stats.following },
    { label: 'Fully watched', value: `${data.stats.fully_watched_pct}%` },
  ];
  const teamGradient = buildConicGradient(data.team_distribution, TEAM_COLORS);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statsCards.map(renderStatCard)}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Teams distribution
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Matches rated by team.
              </p>
            </div>
          </div>

          {data.team_distribution.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">
              No team data yet.
            </p>
          ) : (
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <div className="relative h-44 w-44 shrink-0">
                <div
                  className="h-full w-full rounded-full border border-white/10"
                  style={{ background: teamGradient }}
                />
                <div className="absolute inset-6 rounded-full border border-white/10 bg-slate-950/80" />
              </div>
              <div className="space-y-3">
                {data.team_distribution.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    title={`${item.label}: ${item.count} (${item.pct}%)`}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: TEAM_COLORS[index % TEAM_COLORS.length],
                      }}
                    />
                    <span className="min-w-[140px] font-medium">
                      {item.label}
                    </span>
                    <span className="text-slate-500">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Leagues top 5
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Share of rated matches by league.
          </p>

          {data.league_top.length === 0 ? (
            <p className="mt-6 text-sm text-slate-400">
              No league data yet.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {data.league_top.map((item) => (
                <div key={item.tournament.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span className="font-medium">
                      {item.tournament.name}
                    </span>
                    <span className="text-slate-500">
                      {item.count} ({item.pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800/80">
                    <div
                      className="h-full rounded-full bg-emerald-400/70"
                      style={{ width: `${Math.max(item.pct, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Shows profile activity list.
function ActivityPanel({
  data,
  loading,
  error,
  onRetry,
  onLogin,
  onExplore,
}: ActivityPanelProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={`activity-skeleton-${index}`} className="h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <StateError
        message={error.message}
        actionLabel={error.action === 'login' ? 'Iniciar sesión' : 'Reintentar'}
        onAction={error.action === 'login' ? onLogin : onRetry}
      />
    );
  }

  if (!data || data.results.length === 0) {
    return (
      <StateEmpty
        title="Todavía no hay actividad."
        actionLabel="Explorar partidos"
        onAction={onExplore}
      />
    );
  }

  return <div className="space-y-4">{data.results.map(renderActivityCard)}</div>;
}

// Shows highlights lists for top and low rated matches.
function HighlightsPanel({
  data,
  loading,
  error,
  onRetry,
  onLogin,
}: HighlightsPanelProps) {
  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <SkeletonBlock className="h-52" />
        <SkeletonBlock className="h-52" />
      </div>
    );
  }

  if (error) {
    return (
      <StateError
        message={error.message}
        actionLabel={error.action === 'login' ? 'Iniciar sesión' : 'Reintentar'}
        onAction={error.action === 'login' ? onLogin : onRetry}
      />
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
        No highlights data found.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Top rated
        </h3>
        {data.top_rated.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No top matches.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {data.top_rated.map(renderActivityCard)}
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Low rated
        </h3>
        {data.low_rated.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No low matches.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {data.low_rated.map(renderActivityCard)}
          </div>
        )}
      </div>
    </div>
  );
}

// Profile page that lazy loads stats, activity, and highlights tabs.
export default function Page() {
  const router = useRouter();
  const params = useParams<ProfilePageParams>();
  const username = getUsernameFromParams(params);
  const [activeTab, setActiveTab] = useState<TabKey>('stats');
  const [range, setRange] = useState<RangeKey>('month');
  const [statsData, setStatsData] = useState<ProfileStatsResponse | null>(null);
  const [activityData, setActivityData] =
    useState<ProfileActivityResponse | null>(null);
  const [highlightsData, setHighlightsData] =
    useState<ProfileHighlightsResponse | null>(null);
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    stats: false,
    activity: false,
    highlights: false,
  });
  const [errors, setErrors] = useState<Record<TabKey, ErrorState | null>>({
    stats: null,
    activity: null,
    highlights: null,
  });

  // Updates the loading flag for a specific tab.
  const setTabLoading = (tab: TabKey, value: boolean) => {
    setLoading((prev) => ({ ...prev, [tab]: value }));
  };

  // Updates the error message for a specific tab.
  const setTabError = (tab: TabKey, value: ErrorState | null) => {
    setErrors((prev) => ({ ...prev, [tab]: value }));
  };

  const resolveError = (err: unknown): ErrorState => {
    if (err instanceof ApiError && err.status === 401) {
      return {
        message: 'Tu sesión expiró. Iniciá sesión de nuevo.',
        action: 'login',
      };
    }
    return {
      message: 'No pudimos cargar los datos.',
      action: 'retry',
    };
  };

  // Loads the stats tab content.
  const loadStats = async (targetUsername: string, rangeKey: RangeKey) => {
    setTabLoading('stats', true);
    setTabError('stats', null);
    try {
      const response = await fetchProfileStats(targetUsername, rangeKey);
      setStatsData(response);
    } catch (err) {
      setTabError('stats', resolveError(err));
    } finally {
      setTabLoading('stats', false);
    }
  };

  // Loads the activity tab content.
  const loadActivity = async (targetUsername: string, rangeKey: RangeKey) => {
    setTabLoading('activity', true);
    setTabError('activity', null);
    try {
      const response = await fetchProfileActivity(targetUsername, rangeKey);
      setActivityData(response);
    } catch (err) {
      setTabError('activity', resolveError(err));
    } finally {
      setTabLoading('activity', false);
    }
  };

  // Loads the highlights tab content.
  const loadHighlights = async (targetUsername: string, rangeKey: RangeKey) => {
    setTabLoading('highlights', true);
    setTabError('highlights', null);
    try {
      const response = await fetchProfileHighlights(targetUsername, rangeKey);
      setHighlightsData(response);
    } catch (err) {
      setTabError('highlights', resolveError(err));
    } finally {
      setTabLoading('highlights', false);
    }
  };

  // Resets tab data when switching to a new profile username.
  const handleUsernameChange = () => {
    if (!username) {
      return;
    }

    setActiveTab('stats');
    setRange('month');
    setStatsData(null);
    setActivityData(null);
    setHighlightsData(null);
    setErrors({ stats: null, activity: null, highlights: null });
  };

  // Loads tab data when the active tab or range changes.
  const handleTabFetch = () => {
    if (!username) {
      return;
    }

    if (activeTab === 'stats') {
      if (loading.stats) {
        return;
      }
      if (
        !statsData ||
        statsData.user.username !== username ||
        statsData.range !== range
      ) {
        loadStats(username, range);
      }
      return;
    }

    if (activeTab === 'activity') {
      if (loading.activity) {
        return;
      }
      if (
        !activityData ||
        activityData.user.username !== username ||
        activityData.range !== range
      ) {
        loadActivity(username, range);
      }
      return;
    }

    if (activeTab === 'highlights') {
      if (loading.highlights) {
        return;
      }
      if (
        !highlightsData ||
        highlightsData.user.username !== username ||
        highlightsData.range !== range
      ) {
        loadHighlights(username, range);
      }
    }
  };

  // Handles tab selection from the segmented control.
  const handleTabChange = (value: string) => {
    setActiveTab(value as TabKey);
  };

  // Handles range selection for activity and highlights.
  const handleRangeChange = (value: string) => {
    setRange(value as RangeKey);
  };

  // Retries loading stats for the current profile.
  const handleStatsRetry = () => {
    if (!username) {
      return;
    }
    loadStats(username, range);
  };

  // Retries loading activity for the current profile.
  const handleActivityRetry = () => {
    if (!username) {
      return;
    }
    loadActivity(username, range);
  };

  // Retries loading highlights for the current profile.
  const handleHighlightsRetry = () => {
    if (!username) {
      return;
    }
    loadHighlights(username, range);
  };

  const handleLogin = () => {
    router.push('/login');
  };

  const handleExplore = () => {
    router.push('/matches');
  };

  useEffect(handleUsernameChange, [username]);
  useEffect(handleTabFetch, [
    activeTab,
    range,
    username,
    statsData,
    activityData,
    highlightsData,
    loading.stats,
    loading.activity,
    loading.highlights,
  ]);

  if (!username) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          Invalid username.
        </div>
      </section>
    );
  }

  const profileUser =
    statsData?.user ?? activityData?.user ?? highlightsData?.user ?? null;

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Profile
        </p>
        <h1 className="text-2xl font-semibold">
          @{profileUser?.username ?? username}
        </h1>
        <p className="text-sm text-slate-400">
          Switch between stats, activity, and highlights.
        </p>
      </header>

      <ProfileMemoriesSection username={username} />

      <div className="flex flex-wrap items-center gap-4">
        <SegmentedControl
          options={TAB_OPTIONS}
          value={activeTab}
          onChange={handleTabChange}
          ariaLabel="Profile tabs"
          size="lg"
        />
        {(activeTab === 'highlights' || activeTab === 'stats') && (
          <div className="ml-auto">
            <SegmentedControl
              options={RANGE_OPTIONS}
              value={range}
              onChange={handleRangeChange}
              ariaLabel="Profile range"
              size="sm"
            />
          </div>
        )}
      </div>

      {activeTab === 'stats' && (
        <StatsPanel
          data={statsData}
          loading={loading.stats}
          error={errors.stats}
          onRetry={handleStatsRetry}
          onLogin={handleLogin}
        />
      )}

      {activeTab === 'activity' && (
        <ActivityPanel
          data={activityData}
          loading={loading.activity}
          error={errors.activity}
          onRetry={handleActivityRetry}
          onLogin={handleLogin}
          onExplore={handleExplore}
        />
      )}

      {activeTab === 'highlights' && (
        <HighlightsPanel
          data={highlightsData}
          loading={loading.highlights}
          error={errors.highlights}
          onRetry={handleHighlightsRetry}
          onLogin={handleLogin}
        />
      )}
    </section>
  );
}
