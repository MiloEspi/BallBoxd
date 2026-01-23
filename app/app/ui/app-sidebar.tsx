'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import useProfileHref from '@/app/lib/use-profile-href';

type NavItem = {
  href: string;
  label: string;
};

// Renders the app navigation for mobile and desktop.
export default function AppSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const profileHref = useProfileHref();

  const navItems: NavItem[] = [
    { href: '/home', label: 'Home' },
    { href: '/matches', label: 'Partidos' },
    { href: '/teams', label: 'Equipos' },
    { href: profileHref, label: 'Perfil' },
  ];

  return (
    <>
      <aside className="sticky top-24 hidden h-[calc(100vh-10rem)] w-60 flex-col self-start rounded-3xl border border-slate-800/80 bg-[linear-gradient(160deg,_rgba(15,23,42,0.9),_rgba(2,6,23,0.95))] px-4 py-6 shadow-[0_25px_60px_rgba(0,0,0,0.35)] md:flex">
        <div className="space-y-1 px-2">
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
            BallBoxd
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-semibold text-white">Panel</p>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
              onClick={() => router.push('/search')}
              aria-label="Buscar"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 h-px w-full bg-slate-800/80" />

        <nav className="mt-6 flex flex-col gap-2 text-sm">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition ${
                  isActive
                    ? 'bg-white/10 text-white shadow-[inset_0_0_30px_rgba(255,255,255,0.08)]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isActive
                      ? 'bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                      : 'bg-slate-700'
                  }`}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="h-px w-full bg-slate-800/80" />
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/50 px-4 py-3 text-xs text-slate-400">
            Atajo ropido para explorar la jornada y tus ratings.
          </div>
        </div>
      </aside>

    </>
  );
}
