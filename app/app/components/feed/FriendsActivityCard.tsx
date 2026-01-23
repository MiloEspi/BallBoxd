'use client';

import Link from 'next/link';

import type { FriendsFeedItem } from '@/app/lib/types';

type FriendsActivityCardProps = {
  item: FriendsFeedItem;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Compact activity card for friends feed.
export default function FriendsActivityCard({ item }: FriendsActivityCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/u/${item.actor.username}`}
            className="text-sm font-semibold text-white hover:underline"
          >
            @{item.actor.username}
          </Link>
          <p className="mt-1 text-xs text-slate-400">
            {formatDate(item.created_at)}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-base font-semibold text-white">
          {item.rating_score}
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={`/matches/${item.match.id}`}
          className="text-base font-semibold text-white hover:underline"
        >
          {item.match.title}
        </Link>
        <p className="mt-1 text-xs text-slate-500">
          {formatDate(item.match.date_time)}
        </p>
      </div>

      {item.review_snippet && (
        <p className="mt-3 text-sm text-slate-300">{item.review_snippet}</p>
      )}
    </article>
  );
}
