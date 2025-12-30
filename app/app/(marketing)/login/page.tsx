import { Suspense } from 'react';

import LoginClient from './login-client';

// Wraps the client login form in Suspense to satisfy Next.js CSR hooks.
export default function Page() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <div className="h-5 w-24 rounded bg-slate-800/60" />
          <div className="h-8 w-48 rounded bg-slate-800/60" />
          <div className="space-y-3">
            <div className="h-10 rounded bg-slate-800/60" />
            <div className="h-10 rounded bg-slate-800/60" />
            <div className="h-10 rounded bg-slate-800/60" />
          </div>
        </section>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
