'use client';

import type { Rating } from '@/app/lib/types';

type ReviewItemProps = {
  review: Rating;
};

// Formats review dates for display.
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

// Renders a single review item with score and context.
export default function ReviewItem({ review }: ReviewItemProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <span className="font-semibold">@{review.user.username}</span>
        <span className="text-slate-400">{formatDate(review.created_at)}</span>
      </div>
      <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
          {formatMinutes(review.minutes_watched)}
        </span>
        <span className="text-xl font-semibold text-white">{review.score}</span>
      </div>
      {review.review && (
        <p className="mt-3 text-sm text-slate-300">{review.review}</p>
      )}
    </article>
  );
}
