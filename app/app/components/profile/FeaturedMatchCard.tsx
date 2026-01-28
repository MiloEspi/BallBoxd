'use client';

import { useRouter } from 'next/navigation';

import { useLanguage } from '@/app/components/i18n/LanguageProvider';
import { getLocale } from '@/app/lib/i18n';
import type { RatingWithMatch } from '@/app/lib/types';

type FeaturedMatchCardProps = {
  rating: RatingWithMatch;
  isOwner: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onEdit?: (rating: RatingWithMatch) => void;
  onRemove?: (matchId: number) => void;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
};

const formatDate = (value: string, locale: string) => {
  const date = new Date(value);
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const StadiumIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <path d="M3 19h18" />
    <path d="M5 19V8l7-4 7 4v11" />
    <path d="M8 12h8" />
  </svg>
);

// Editorial featured match card for "My matches".
export default function FeaturedMatchCard({
  rating,
  isOwner,
  isDragging,
  isDragOver,
  onEdit,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: FeaturedMatchCardProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const match = rating.match;
  const representative = rating.representative_photo_url ?? '';
  const hasRepresentative = Boolean(representative);
  const showBadge = Boolean(rating.attended);
  const ringPercent = Math.min(100, Math.max(0, rating.score ?? 0));
  const locale = getLocale(language);

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 shadow-[0_24px_60px_rgba(0,0,0,0.35)] transition duration-300 ${
        isDragOver
          ? 'border-emerald-400/80 shadow-[0_0_0_2px_rgba(16,185,129,0.35)]'
          : 'border-slate-800/80'
      } ${isDragging ? 'scale-[0.98] opacity-80' : 'hover:-translate-y-1'}`}
      draggable={isOwner}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (!isDragging) {
          router.push(`/matches/${match.id}`);
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (!isDragging) {
            router.push(`/matches/${match.id}`);
          }
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-2 px-3 pb-3 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
              {match.tournament.name}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {formatDate(match.date_time, locale)}
            </p>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-full bg-emerald-400/25 blur-2xl" />
            <div
              className="relative flex h-10 w-10 items-center justify-center rounded-full p-[3px] shadow-[0_0_18px_rgba(255,255,255,0.22)]"
              style={{
                background: `conic-gradient(rgba(255,255,255,0.95) ${ringPercent}%, rgba(255,255,255,0.08) ${ringPercent}% 100%)`,
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-slate-950 text-xs font-semibold text-white">
                {rating.score}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
            <span className="min-w-0 truncate">{match.home_team.name}</span>
            <span className="text-slate-200">{match.home_score}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
            <span className="min-w-0 truncate">{match.away_team.name}</span>
            <span className="text-slate-200">{match.away_score}</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-950/60">
          <div className="relative aspect-square">
            {hasRepresentative ? (
              <img
                src={representative}
                alt={`${match.home_team.name} vs ${match.away_team.name}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-500">
                {t('profile.memories.imagePlaceholder')}
              </div>
            )}

            {showBadge && (
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
                <StadiumIcon />
                {t('profile.memories.attendedBadge')}
              </div>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center justify-between gap-2">
            <button
              className="rounded-full border border-slate-700 px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onEdit?.(rating);
              }}
            >
              {t('common.edit')}
            </button>
            <button
              className="text-[10px] uppercase tracking-[0.2em] text-rose-200 transition hover:text-rose-100"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove?.(match.id);
              }}
            >
              {t('memory.remove')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
