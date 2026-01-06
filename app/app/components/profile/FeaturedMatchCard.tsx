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
  const canSwap = hasRepresentative && hasStadium;
  const primaryChoice = rating.featured_primary_image ?? 'representative';
  const primary =
    primaryChoice === 'stadium' && canSwap ? stadium : representative;
  const secondary = canSwap
    ? primaryChoice === 'stadium'
      ? representative
      : stadium
    : '';
  const showBadge = canSwap;
  const note = rating.featured_note?.trim() || rating.review?.trim() || '';
  const ringPercent = Math.min(100, Math.max(0, rating.score ?? 0));

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
        <div className="flex flex-col gap-2 px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
                {match.tournament.name}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatDate(match.date_time)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="relative">
                <div className="pointer-events-none absolute -inset-4 rounded-full bg-emerald-400/25 blur-2xl" />
                <div
                  className="relative flex h-11 w-11 items-center justify-center rounded-full p-[3px] shadow-[0_0_18px_rgba(255,255,255,0.22)]"
                  style={{
                    background: `conic-gradient(rgba(255,255,255,0.95) ${ringPercent}%, rgba(255,255,255,0.08) ${ringPercent}% 100%)`,
                  }}
                >
                  <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-slate-950 text-sm font-semibold text-white">
                    {rating.score}
                  </div>
                </div>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2">
                  <button
                    className="rounded-full border border-slate-700 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-slate-300 transition hover:border-slate-500"
                    type="button"
                    onClick={() => onEdit?.(rating)}
                  >
                    Editar
                  </button>
                  <button
                    className="rounded-full border border-rose-400/40 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-rose-200 transition hover:border-rose-300"
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
            <div className="min-w-0 text-sm font-semibold text-white truncate">
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
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-900/60 text-[10px] uppercase tracking-[0.3em] text-slate-500">
              Imagen destacada
              {isOwner && (
                <button
                  className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/40"
                  type="button"
                  onClick={() => onEdit?.(rating)}
                >
                  Agregar imagen
                </button>
              )}
            </div>
          )}

          {note && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent px-3 pb-3 pt-6">
              <p className="max-h-[32px] overflow-hidden text-[11px] leading-snug text-slate-100">
                {note}
              </p>
            </div>
          )}

          {showBadge && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-slate-100 shadow-[0_8px_20px_rgba(0,0,0,0.35)]">
              <StadiumIcon />
              Estuve ahi
            </div>
          )}

          {secondary && (
            <div className="absolute bottom-3 right-3">
              {isOwner && onSwapPrimary ? (
                <button
                  className="group relative h-12 w-12 overflow-hidden rounded-xl border border-white/20 bg-slate-900/70 shadow-[0_10px_25px_rgba(0,0,0,0.35)]"
                  type="button"
                  onClick={() =>
                    onSwapPrimary(
                      match.id,
                      primaryChoice === 'stadium' ? 'representative' : 'stadium',
                    )
                  }
                >
                  <img
                    src={secondary}
                    alt="Imagen secundaria"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-[9px] uppercase tracking-[0.2em] text-white opacity-0 transition group-hover:opacity-100">
                    Swap
                  </span>
                </button>
              ) : (
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/20 bg-slate-900/70 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                  <img
                    src={secondary}
                    alt="Imagen secundaria"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {isOwner && (
            <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-slate-300">
              Arrastra
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
