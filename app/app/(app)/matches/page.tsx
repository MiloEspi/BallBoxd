import { Suspense } from 'react';

import MatchesClient from './MatchesClient';

const fallbackCards = Array.from({ length: 4 });

export default function Page() {
  return (
    <Suspense
      fallback={
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-800/70" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-800/70" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {fallbackCards.map((_, index) => (
              <div
                key={`matches-suspense-${index}`}
                className="h-64 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/50"
              />
            ))}
          </div>
        </section>
      }
    >
      <MatchesClient />
    </Suspense>
  );
}
