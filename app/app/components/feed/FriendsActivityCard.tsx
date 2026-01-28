'use client';

import Link from 'next/link';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import { getLocale } from '@/app/lib/i18n';
import type { FriendsFeedItem } from '@/app/lib/types';

type FriendsActivityCardProps = {
  item: FriendsFeedItem;
  className?: string;
  variant?: 'default' | 'compact';
};

const formatDate = (value: string, locale: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const timeAgo = (
  value: string,
  language: 'en' | 'es',
  t: (key: string, vars?: Record<string, string | number>) => string,
) => {
  const now = Date.now();
  const timestamp = new Date(value).getTime();
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return t('time.agoDays', { count: days });
  if (hours > 0) return t('time.agoHours', { count: hours });
  if (minutes > 0) return t('time.agoMinutes', { count: minutes });
  return t('time.justNow');
};

const getInitials = (value: string) => {
  return value.slice(0, 2).toUpperCase();
};

// Compact activity card for friends feed.
export default function FriendsActivityCard({
  item,
  className,
  variant = 'default',
}: FriendsActivityCardProps) {
  const { t, language } = useLanguage();
  const action = item.review_snippet ? t('match.reviewed') : t('match.rated');
  const initials = getInitials(item.actor.username);
  const locale = getLocale(language);
  const baseClass =
    variant === 'compact'
      ? 'rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-[0_14px_30px_rgba(0,0,0,0.24)]'
      : 'rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]';

  return (
    <article className={[baseClass, className].filter(Boolean).join(' ')}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-xs font-semibold text-slate-200">
            {initials}
          </div>
          <div>
            <Link
              href={`/u/${item.actor.username}`}
              className="text-sm font-semibold text-white hover:underline"
            >
              @{item.actor.username}
            </Link>
            <p className="mt-1 text-xs text-slate-400">
              {action} {t('common.match')} -{' '}
              {timeAgo(item.created_at, language, t)}
            </p>
          </div>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-lg font-semibold text-white">
          {item.rating_score}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800/70 bg-slate-950/60 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {item.match.tournament}
        </p>
        <Link
          href={`/matches/${item.match.id}`}
          className="mt-2 block text-base font-semibold text-white hover:underline"
        >
          {item.match.home_team.name} vs {item.match.away_team.name}
        </Link>
        <p className="mt-1 text-xs text-slate-500">
          {formatDate(item.match.date_time, locale)}
        </p>
      </div>

      {item.review_snippet && (
        <p className="mt-3 text-sm text-slate-300">
          {item.review_snippet}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
        <Link
          href={`/matches/${item.match.id}`}
          className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 transition hover:border-slate-500"
        >
          {t('common.viewMatch')}
        </Link>
      </div>
    </article>
  );
}
