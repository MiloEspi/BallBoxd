'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_username');
    router.replace('/');
  }, [router]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold text-white">Cerrando sesion...</h1>
      <p className="text-sm text-slate-400">
        Si no redirige automaticamente, vuelve al inicio.
      </p>
      <Link
        href="/"
        className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
