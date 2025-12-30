'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { ApiError, rateMatch } from '@/app/lib/api';
import SegmentedControl from '@/app/ui/segmented-control';

type RateMatchModalProps = {
  matchId: number;
  initialScore?: number;
  initialMinutesWatched?: string;
  initialReview?: string;
  origin?: { x: number; y: number } | null;
  onClose: () => void;
  onSaved: () => void;
};

// Minutes watched options for the segmented control.
const minutesOptions = [
  { value: 'LT_30', label: 'Less than 30' },
  { value: 'ONE_HALF', label: 'One half' },
  { value: 'ALMOST_ALL', label: 'Almost all' },
  { value: 'FULL', label: 'Full match' },
];

// Modal overlay to create or update a match rating.
export default function RateMatchModal({
  matchId,
  initialScore,
  initialMinutesWatched,
  initialReview,
  origin,
  onClose,
  onSaved,
}: RateMatchModalProps) {
  const [score, setScore] = useState<number>(initialScore ?? 50);
  const [minutesWatched, setMinutesWatched] = useState<string>(
    initialMinutesWatched ?? 'FULL',
  );
  const [review, setReview] = useState<string>(initialReview ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  const hasExisting =
    initialScore !== undefined ||
    initialMinutesWatched !== undefined ||
    initialReview !== undefined;

  // Persists the rating via POST/PATCH and closes on success.
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      score,
      minutes_watched: minutesWatched,
      review: review.trim(),
    };

    try {
      if (hasExisting) {
        await rateMatch(matchId, payload, 'PATCH');
      } else {
        try {
          await rateMatch(matchId, payload, 'POST');
        } catch (err) {
          if (err instanceof ApiError && err.status === 409) {
            await rateMatch(matchId, payload, 'PATCH');
          } else {
            throw err;
          }
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rating.');
    } finally {
      setLoading(false);
    }
  };

  // Ensures portal rendering only runs on the client.
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-slate-950/80 animate-[modal-backdrop_240ms_ease-out]"
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative flex min-h-screen items-center justify-center px-4">
        {origin && (
          <span
            className="pointer-events-none absolute z-0 h-4 w-4 rounded-full bg-emerald-300/30 blur-xl animate-[ripple_520ms_ease-out]"
            style={{
              left: origin.x,
              top: origin.y,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
        <div className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/95 shadow-[0_30px_80px_rgba(0,0,0,0.45)] animate-[modal-in_320ms_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">
            Rate match
          </h2>
          <button
            className="text-sm text-slate-500 transition hover:text-slate-200"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <form className="space-y-6 px-6 py-6" onSubmit={handleSubmit}>
          <div className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Your rating
            </p>
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/70 text-4xl font-semibold text-white shadow-[0_0_35px_rgba(34,211,238,0.25)]">
              <span className="pointer-events-none absolute -inset-6 rounded-full bg-[conic-gradient(at_top,_#22d3ee,_#34d399,_#facc15,_#22d3ee)] opacity-40 blur-2xl animate-[spin_12s_linear_infinite]" />
              <span className="relative">{score}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={score}
              onChange={(event) => setScore(Number(event.target.value))}
              className="w-full cursor-pointer accent-emerald-300"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0</span>
              <span>100</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Minutes watched
            </label>
            <SegmentedControl
              options={minutesOptions}
              value={minutesWatched}
              onChange={setMinutesWatched}
              ariaLabel="Minutes watched"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Comment (optional)
            </label>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
              maxLength={240}
              value={review}
              onChange={(event) => setReview(event.target.value)}
              placeholder="Share your thoughts..."
            />
            <div className="text-right text-xs text-slate-500">
              {review.length}/240
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            className="w-full rounded-full bg-white px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_12px_25px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Submit rating'}
          </button>
        </form>
      </div>
      </div>
    </div>,
    document.body,
  );
}
