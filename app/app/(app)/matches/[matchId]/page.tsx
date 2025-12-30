'use client';

import { useEffect, useState, use } from 'react';

import RateMatchModal from '@/app/components/match/RateMatchModal';
import ReviewItem from '@/app/components/reviews/ReviewItem';
import { fetchMatchDetail } from '@/app/lib/api';
import type { MatchDetailResponse } from '@/app/lib/types';

type MatchPageProps = {
  params: { matchId: string };
};

// Formats match date for the detail header.
// Formats match date for the detail header.
const formatDate = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Match detail page with stats and reviews.
// Match detail page with stats and reviews.
export default function Page({ params }: MatchPageProps) {
  const { matchId: matchIdParam } = use(params);
  const [data, setData] = useState<MatchDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const matchId = Number(matchIdParam);

  // Loads match detail data and handles validation/errors.
  // Loads match detail data and handles validation/errors.
  const loadMatch = async () => {
    if (Number.isNaN(matchId)) {
      setError('Invalid match id.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetchMatchDetail(matchId);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load match.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          Loading match...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          <p>{error}</p>
          <button
            className="mt-3 rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100"
            type="button"
            onClick={loadMatch}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          No match data found.
        </div>
      </section>
    );
  }

  const { match, avg_score, rating_count, full_watched_pct, my_rating } = data;

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {match.tournament.name}
        </p>
        <h1 className="text-2xl font-semibold">
          {match.home_team.name} vs {match.away_team.name}
        </h1>
        <p className="text-sm text-slate-400">{formatDate(match.date_time)}</p>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-sm text-slate-400">Score</p>
            <p className="text-3xl font-semibold text-white">
              {match.home_score} - {match.away_score}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            {my_rating && (
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Your rating
                </p>
                <div className="relative mt-2 flex h-16 w-16 items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/70 text-xl font-semibold text-white shadow-[0_0_30px_rgba(34,211,238,0.25)]">
                  <span className="pointer-events-none absolute -inset-4 rounded-full bg-[conic-gradient(at_top,_#22d3ee,_#34d399,_#facc15,_#22d3ee)] opacity-30 blur-xl animate-[spin_12s_linear_infinite]" />
                  <span className="relative">{my_rating.score}</span>
                </div>
              </div>
            )}
            <button
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 shadow-[0_12px_25px_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-200 active:translate-y-0 active:scale-[0.98]"
              type="button"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setModalOrigin({
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                });
                setShowModal(true);
              }}
            >
              {my_rating ? 'Edit rating' : 'Rate match'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Average rating', value: Math.round(avg_score) },
          { label: 'Total ratings', value: rating_count },
          { label: 'Full watched %', value: `${full_watched_pct}%` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Highlighted reviews</h2>
          {data.featured_reviews.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
              No reviews yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.featured_reviews.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Friends opinions</h2>
          {data.followed_ratings.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
              No ratings from friends yet.
            </div>
          ) : (
            <div className="space-y-3">
              {data.followed_ratings.map((review) => (
                <ReviewItem key={review.id} review={review} />
              ))}
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <RateMatchModal
          matchId={match.id}
          initialScore={my_rating?.score}
          initialMinutesWatched={my_rating?.minutes_watched}
          initialReview={my_rating?.review}
          origin={modalOrigin}
          onClose={() => {
            setShowModal(false);
            setModalOrigin(null);
          }}
          onSaved={loadMatch}
        />
      )}
    </section>
  );
}
