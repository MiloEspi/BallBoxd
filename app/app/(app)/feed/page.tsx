'use client';

import { useEffect, useState } from 'react';

import MatchCard from '@/app/components/match/MatchCard';
import RateMatchModal from '@/app/components/match/RateMatchModal';
import { fetchFeed } from '@/app/lib/api';
import type { Match } from '@/app/lib/types';

// Feed page showing recent matches from followed teams.
export default function Page() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [modalOrigin, setModalOrigin] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Loads the feed data from the API and updates UI state.
  const loadFeed = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchFeed();
      setMatches(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Feed</h1>
        <p className="mt-2 text-sm text-slate-400">
          Recent matches from teams you follow.
        </p>
      </header>

      {loading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          Loading feed...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          <p>{error}</p>
          <button
            className="mt-3 rounded-full border border-red-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100"
            type="button"
            onClick={loadFeed}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-sm text-slate-400">
          No matches yet. Follow more teams to fill your feed.
        </div>
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {matches.map((match) => (
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
          onSaved={loadFeed}
        />
      )}
    </section>
  );
}
