'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SiteHeader() {
  const [hasToken, setHasToken] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setHasToken(Boolean(token));
  }, [pathname]);

  return (
    <header className="border-b border-slate-800/80">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-sm uppercase tracking-[0.3em] text-slate-400">
          BallBoxd
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {hasToken ? (
            <>
              <Link
                href="/feed"
                className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 transition hover:border-slate-500"
              >
                Ir al feed
              </Link>
              <Link
                href="/logout"
                className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                Cerrar sesion
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-slate-700 px-4 py-2 text-slate-200 transition hover:border-slate-500"
              >
                Iniciar sesion
              </Link>
              <Link
                href="/login?mode=register"
                className="rounded-full bg-white px-4 py-2 font-semibold text-slate-900 transition hover:bg-slate-200"
              >
                Registrarse
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
