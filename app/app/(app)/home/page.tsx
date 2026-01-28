'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import FriendsActivityCard from '@/app/components/feed/FriendsActivityCard';
import MatchCard from '@/app/components/match/MatchCard';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import CalendarModal from '@/app/components/ui/CalendarModal';
import StateEmpty from '@/app/components/ui/StateEmpty';
import StateError from '@/app/components/ui/StateError';
import SkeletonBlock from '@/app/components/ui/SkeletonBlock';
import SkeletonMatchCard from '@/app/components/ui/SkeletonMatchCard';
import { ApiError, fetchFeed, fetchFriendsFeed, fetchMe } from '@/app/lib/api';
import { getLocale } from '@/app/lib/i18n';
import { sortMatchesByClosest, sortMatchesByDateAsc } from '@/app/lib/match-sort';
import type { FriendsFeedItem, Match } from '@/app/lib/types';
import { addDays, endOfDay, isSameDay, startOfDay } from '@/app/lib/date-range';

type ErrorState = {
  message: string;
  action: 'retry' | 'login';
};

// Home page with friends activity + team matches feed.
export default function Page() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const locale = getLocale(language);
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
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<Date>(() => today);
  const [calendarOpen, setCalendarOpen] = useState(false);
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
          message: t('common.sessionExpired'),
          action: 'login',
        });
      } else {
        setError({
          message: t('common.loadError'),
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
          message: t('common.sessionExpired'),
          action: 'login',
        });
      } else {
        setTeamError({
          message: t('common.loadError'),
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
        title={t('home.friends.emptyTitle')}
        description={t('home.friends.emptyDesc')}
        actionLabel={t('home.friends.cta')}
        onAction={() => router.push('/amigos')}
      />
    ),
    [router, t],
  );

  const filteredMatches = useMemo(() => {
    const anchorDate = startOfDay(selectedDate);
    if (matchFilter === 'all') {
      return sortMatchesByClosest(teamMatches, new Date());
    }
    if (matchFilter === 'today') {
      return sortMatchesByDateAsc(
        teamMatches.filter((match) =>
          isSameDay(new Date(match.date_time), anchorDate),
        ),
      );
    }
    const weekEnd = endOfDay(addDays(anchorDate, 6));
    return sortMatchesByDateAsc(
      teamMatches.filter((match) => {
        const matchDate = new Date(match.date_time);
        return matchDate >= anchorDate && matchDate <= weekEnd;
      }),
    );
  }, [matchFilter, selectedDate, teamMatches]);

  const dateLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    [locale, selectedDate],
  );

  return (
    <section className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{t('home.title')}</h1>
        <p className="text-sm text-slate-400">{t('home.subtitle')}</p>
      </header>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('home.friends.title')}</h2>
            <p className="text-sm text-slate-400">{t('home.friends.subtitle')}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
            onClick={() => router.push('/search?tab=users')}
          >
            {t('home.friends.cta')}
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
            actionLabel={error.action === 'login' ? t('nav.login') : t('common.retry')}
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
                  {t('home.shareProfile')}
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
                  {t('home.share.caption')}
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
                {t('common.viewAll')}
              </button>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t('home.matches.title')}</h2>
            <p className="text-sm text-slate-400">{t('home.matches.subtitle')}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
            onClick={() => router.push('/feed')}
          >
            {t('home.matches.viewAll')}
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5">
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
              onClick={() =>
                setSelectedDate(startOfDay(addDays(selectedDate, -1)))
              }
              aria-label={t('date.yesterday')}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              className="flex items-center gap-2 px-2 text-sm font-semibold text-slate-100"
              onClick={() => setCalendarOpen(true)}
              aria-label={t('matches.toolbar.today')}
            >
              <span className="min-w-[120px] text-center">{dateLabel}</span>
              {isSameDay(selectedDate, today) && (
                <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                  {t('matches.toolbar.today')}
                </span>
              )}
            </button>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
              onClick={() =>
                setSelectedDate(startOfDay(addDays(selectedDate, 1)))
              }
              aria-label={t('date.tomorrow')}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
              onClick={() => setCalendarOpen(true)}
              aria-label={t('matches.toolbar.today')}
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
          </div>

          {[
            { key: 'today', label: t('home.matches.filter.today') },
            { key: 'week', label: t('home.matches.filter.week') },
            { key: 'all', label: t('home.matches.filter.all') },
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
            actionLabel={teamError.action === 'login' ? t('nav.login') : t('common.retry')}
            onAction={
              teamError.action === 'login'
                ? () => router.push('/login')
                : loadTeamFeed
            }
          />
        )}

        {!teamLoading && !teamError && filteredMatches.length === 0 && (
          <StateEmpty
            title={t('home.matches.emptyTitle')}
            description={t('home.matches.emptyDesc')}
            actionLabel={t('home.matches.emptyCta')}
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

      <CalendarModal
        open={calendarOpen}
        selected={selectedDate}
        onSelect={(date) => {
          setSelectedDate(startOfDay(date));
        }}
        onClose={() => setCalendarOpen(false)}
      />
    </section>
  );
}
