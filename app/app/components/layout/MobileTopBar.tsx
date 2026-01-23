'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import useProfileHref from '@/app/lib/use-profile-href';
import GlobalSearch from '@/app/components/search/GlobalSearch';

type NavItem = {
  href: string;
  label: string;
};

export default function MobileTopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const profileHref = useProfileHref();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const navItems: NavItem[] = [
    { href: '/home', label: 'Home' },
    { href: '/matches', label: 'Partidos' },
    { href: '/teams', label: 'Equipos' },
    { href: profileHref, label: 'Perfil' },
  ];

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) {
        return;
      }
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  return (
    <>
      <div className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[linear-gradient(140deg,_rgba(2,6,23,0.95),_rgba(15,23,42,0.92))] shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur md:hidden">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="flex h-12 items-center justify-between gap-3">
            <Link
              href="/home"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-slate-200 shadow-[inset_0_0_18px_rgba(255,255,255,0.06)]"
              aria-label="BallBoxd"
            >
              BB
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
                onClick={() => router.push('/search')}
                aria-label="Buscar"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 active:scale-95"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  aria-label="Menu"
                >
                  <UserCircleIcon className="h-6 w-6" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-44 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur">
                    <Link
                      href={profileHref}
                      className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
                      onClick={() => setMenuOpen(false)}
                    >
                      Perfil
                    </Link>
                    <Link
                      href="/logout"
                      className="block rounded-xl px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
                      onClick={() => setMenuOpen(false)}
                    >
                      Cerrar sesion
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          <nav className="flex items-center justify-between gap-1 pb-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 rounded-full px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                    isActive
                      ? 'bg-white/10 text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.06)]'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {!pathname.startsWith('/search') && (
            <div className="pb-3">
              <GlobalSearch />
            </div>
          )}
        </div>
      </div>


    </>
  );
}
