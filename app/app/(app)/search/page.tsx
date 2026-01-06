import { Suspense } from 'react';

import SearchClient from './SearchClient';

const fallbackRows = Array.from({ length: 6 });

export default function Page() {
  return (
    <Suspense
      fallback={
        <section className="space-y-6">
          <div className="space-y-3">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-800/70" />
            <div className="h-4 w-64 animate-pulse rounded bg-slate-800/70" />
          </div>
          <div className="space-y-3">
            {fallbackRows.map((_, index) => (
              <div
                key={`search-suspense-${index}`}
                className="h-20 animate-pulse rounded-2xl border border-slate-800/70 bg-slate-900/50"
              />
            ))}
          </div>
        </section>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
