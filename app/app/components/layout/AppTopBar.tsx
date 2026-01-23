'use client';

import Link from 'next/link';

import GlobalSearch from '@/app/components/search/GlobalSearch';
import useProfileHref from '@/app/lib/use-profile-href';

// Desktop top bar for authenticated pages.
export default function AppTopBar() {
  const profileHref = useProfileHref();

  return (
    <div className="sticky top-0 z-40 hidden w-full border-b border-slate-800/80 bg-[linear-gradient(140deg,_rgba(2,6,23,0.95),_rgba(15,23,42,0.92))] shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur md:block">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-4">
        <Link
          href="/home"
          className="flex items-center gap-3 text-sm font-semibold text-white"
          aria-label="BallBoxd home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-[0.2em] text-slate-200 shadow-[inset_0_0_18px_rgba(255,255,255,0.06)]">
            BB
          </span>
          <span className="text-xs uppercase tracking-[0.35em] text-slate-400">
            BallBoxd
          </span>
        </Link>

        <div className="w-full max-w-xl flex-1">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]">
          <Link
            href={profileHref}
            className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 transition hover:border-slate-500"
          >
            Perfil
          </Link>
          <Link
            href="/logout"
            className="rounded-full bg-white px-4 py-2 text-slate-900 transition hover:bg-slate-200"
          >
            Cerrar sesion
          </Link>
        </div>
      </div>
    </div>
  );
}
