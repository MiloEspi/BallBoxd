'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { login, register } from '@/app/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  useEffect(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'register') {
      setMode('register');
    }
    if (modeParam === 'login') {
      setMode('login');
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const response = await register(username, email, password);
        localStorage.setItem('auth_token', response.token);
      } else {
        const response = await login(username, password);
        localStorage.setItem('auth_token', response.token);
      }
      router.push('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-md space-y-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          BallBoxd
        </p>
        <h1 className="text-2xl font-semibold text-white">
          {isRegister ? 'Crea tu cuenta' : 'Iniciar sesion'}
        </h1>
        <p className="text-sm text-slate-400">
          {isRegister
            ? 'Registrate para empezar a valorar partidos.'
            : 'Ingresa para ver tu feed y ratings.'}
        </p>
      </header>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400">
            Usuario
          </label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="camilo"
            autoComplete="username"
            required
          />
        </div>

        {isRegister && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">
              Email
            </label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="camilo@email.com"
              autoComplete="email"
              required
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400">
            Password
          </label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-slate-600"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimo 8 caracteres"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        <button
          className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Enviando...'
            : isRegister
            ? 'Crear cuenta'
            : 'Entrar'}
        </button>
      </form>

      <button
        className="w-full text-center text-xs text-slate-400 transition hover:text-slate-200"
        type="button"
        onClick={() =>
          setMode((current) => (current === 'login' ? 'register' : 'login'))
        }
      >
        {isRegister
          ? 'Ya tienes cuenta? Inicia sesion'
          : 'No tienes cuenta? Registrate'}
      </button>
    </section>
  );
}
