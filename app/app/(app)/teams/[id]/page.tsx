'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import MatchCard from '@/app/components/match/MatchCard';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import TeamLogo from '@/app/components/ui/TeamLogo';
import {
  ApiError,
  fetchTeamDetail,
  fetchTeamMatches,
  followTeam,
  unfollowTeam,
} from '@/app/lib/api';
import type { Match, Team } from '@/app/lib/types';

type TeamPageProps = {
  params: Promise<{ id: string }>;
};

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

export default function Page({ params }: TeamPageProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const { id } = use(params);
  const teamId = Number(id);
  const [team, setTeam] = useState<Team | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scope, setScope] = useState<'recent' | 'upcoming' | 'all'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [pendingFollow, setPendingFollow] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const SCOPE_OPTIONS = [
    { value: 'recent', label: t('team.scope.recent') },
    { value: 'upcoming', label: t('team.scope.upcoming') },
    { value: 'all', label: t('team.scope.all') },
  ] as const;

  const sortTeamMatches = (
    list: Match[],
    mode: 'recent' | 'upcoming' | 'all',
  ) => {
    const sorted = [...list];
    sorted.sort((a, b) => {
      const leftDate = new Date(a.date_time);
      const rightDate = new Date(b.date_time);
      const now = Date.now();
      const leftDay = new Date(
        leftDate.getFullYear(),
        leftDate.getMonth(),
        leftDate.getDate(),
      ).getTime();
      const rightDay = new Date(
        rightDate.getFullYear(),
        rightDate.getMonth(),
        rightDate.getDate(),
      ).getTime();
      if (mode === 'upcoming') {
        return leftDate.getTime() - rightDate.getTime();
      }
      if (mode === 'all') {
        const leftUpcoming = leftDate.getTime() >= now;
        const rightUpcoming = rightDate.getTime() >= now;
        if (leftUpcoming !== rightUpcoming) {
          return leftUpcoming ? -1 : 1;
        }
        if (leftUpcoming) {
          return leftDate.getTime() - rightDate.getTime();
        }
        if (leftDay !== rightDay) {
          return rightDay - leftDay;
        }
        return leftDate.getTime() - rightDate.getTime();
      }
      if (leftDay !== rightDay) {
        return rightDay - leftDay;
      }
      return leftDate.getTime() - rightDate.getTime();
    });
    return sorted;
  };

  const resolveError = (err: unknown): ErrorState => {
    if (err instanceof ApiError && err.status === 401) {
      return {
        message: t('common.sessionExpired'),
        action: 'login',
      };
    }
    return {
      message: t('common.loadError'),
      action: 'retry',
    };
  };

  const loadTeam = async () => {
    if (Number.isNaN(teamId)) {
      setError({ message: t('common.loadError'), action: 'retry' });
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchTeamDetail(teamId);
      setTeam(response);
      const matchesResponse = await fetchTeamMatches(teamId, { scope });
      setMatches(sortTeamMatches(matchesResponse.results, scope));
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
          actionLabel={error.action === 'login' ? t('nav.login') : t('common.retry')}
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
        <StateEmpty title={t('team.notFound')} />
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <header className="relative rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {t('team.title')}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <TeamLogo name={team.name} logoUrl={team.logo_url} size="xl" />
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
                next
                  ? t('team.follow.nowFollowing', { team: team.name })
                  : t('team.follow.unfollowed', { team: team.name }),
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
                setToastMessage(t('team.follow.error'));
              } finally {
                setPendingFollow(false);
              }
            }}
          >
            {pendingFollow
              ? t('team.follow.saving')
              : team.is_following
                ? t('team.follow.following')
                : t('team.follow.follow')}
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
        <StateEmpty title={t('team.matches.empty')} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
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

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_20px_45px_rgba(0,0,0,0.45)] backdrop-blur">
          {toastMessage}
        </div>
      )}

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
          onSaved={loadTeam}
        />
      )}
    </section>
  );
}
