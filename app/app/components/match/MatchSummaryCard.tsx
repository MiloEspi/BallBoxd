'use client';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import MatchCardCompact from '@/app/components/match/MatchCardCompact';
import { getLocale } from '@/app/lib/i18n';
import type { RatingWithMatch } from '@/app/lib/types';

type MatchSummaryCardProps = {
  rating: RatingWithMatch;
};

const formatDate = (value: string, locale: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Compact, clickable match summary card for profile activity/highlights.
export default function MatchSummaryCard({ rating }: MatchSummaryCardProps) {
  const { t, language } = useLanguage();
  const locale = getLocale(language);
  const match = rating.match;

  const minutesLabel =
    rating.minutes_watched === 'LT_30'
      ? t('match.minutes.lt30')
      : rating.minutes_watched === 'ONE_HALF'
        ? t('match.minutes.oneHalf')
        : rating.minutes_watched === 'ALMOST_ALL'
          ? t('match.minutes.almostAll')
          : rating.minutes_watched === 'FULL'
            ? t('match.minutes.full')
            : rating.minutes_watched;

  return (
    <MatchCardCompact
      match={match}
      footer={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-[0.2em] text-slate-300">
              {minutesLabel}
            </span>
            {rating.attended && (
              <span className="rounded-full border border-emerald-400/40 px-3 py-1 uppercase tracking-[0.2em] text-emerald-200">
                {t('match.attended')}
              </span>
            )}
            <span>{formatDate(rating.created_at, locale)}</span>
            <span className="ml-auto rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-slate-100">
              {rating.score}
            </span>
          </div>
          {rating.review && (
            <p className="text-sm text-slate-300">{rating.review}</p>
          )}
        </div>
      }
    />
  );
}
