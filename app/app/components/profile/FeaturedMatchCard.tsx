'use client';

import type { RatingWithMatch } from '@/app/lib/types';

type FeaturedMatchCardProps = {
  rating: RatingWithMatch;
  isOwner: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  onEdit?: (rating: RatingWithMatch) => void;
  onRemove?: (matchId: number) => void;
  onSwapPrimary?: (matchId: number, nextPrimary: 'representative' | 'stadium') => void;
  onDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('es-AR', {
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

// Editorial featured match card for "Mis partidos".
export default function FeaturedMatchCard({
  rating,
  isOwner,
  isDragging,
  isDragOver,
  onEdit,
  onRemove,
  onSwapPrimary,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: FeaturedMatchCardProps) {
  const match = rating.match;
  const representative = rating.representative_photo_url ?? '';
  const stadium = rating.attended ? rating.stadium_photo_url ?? '' : '';
  const hasRepresentative = Boolean(representative);
  const hasStadium = Boolean(stadium);
  const primaryChoice = rating.featured_primary_image ?? 'representative';
  const primary =
    primaryChoice === 'stadium' && hasStadium
      ? stadium
      : representative || stadium;
  const secondary =
    primary === representative && hasStadium
      ? stadium
      : primary === stadium && hasRepresentative
        ? representative
        : '';
  const showBadge = hasRepresentative && hasStadium;
  const note = rating.featured_note?.trim() || rating.review?.trim() || '';

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
    >
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-16 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative grid">
        <div className="flex min-h-[140px] flex-col justify-between gap-3 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">
                {match.tournament.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatDate(match.date_time)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                {rating.score}
              </span>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-slate-700 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
                    type="button"
                    onClick={() => onEdit?.(rating)}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-full border border-rose-400/40 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-300"
                    type="button"
                    onClick={() => onRemove?.(match.id)}
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-base font-semibold text-white">
              {match.home_team.name} vs {match.away_team.name}
            </div>
            <div className="text-sm font-semibold text-slate-200">
              {match.home_score}-{match.away_score}
            </div>
          </div>
        </div>

        <div className="relative aspect-square">
          {primary ? (
            <img
              src={primary}
              alt={`${match.home_team.name} vs ${match.away_team.name}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-900/60 text-xs uppercase tracking-[0.3em] text-slate-500">
              Sin imagen
            </div>
          )}

          {note && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-4 pb-4 pt-8">
              <p className="text-sm text-slate-100">{note}</p>
            </div>
          )}

          {showBadge && (
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
              <StadiumIcon />
              Estuve ahi
            </div>
          )}

          {secondary && (
            <div className="absolute bottom-4 right-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/20 bg-slate-900/70 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                <img
                  src={secondary}
                  alt="Imagen secundaria"
                  className="h-full w-full object-cover"
                />
              </div>
              {isOwner && onSwapPrimary && (
                <button
                  className="mt-2 w-full rounded-full border border-slate-700 bg-slate-900/70 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-500"
                  type="button"
                  onClick={() =>
                    onSwapPrimary(
                      match.id,
                      primaryChoice === 'stadium' ? 'representative' : 'stadium',
                    )
                  }
                >
                  Swap
                </button>
              )}
            </div>
          )}

          {isOwner && (
            <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-slate-300">
              Arrastra
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
