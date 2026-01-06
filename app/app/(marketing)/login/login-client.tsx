'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { login, register } from '@/app/lib/api';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

type AuthMode = 'login' | 'register';

// Client login/register form that reads the mode from query params.
export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  // Syncs form mode from the URL query string.
  useEffect(() => {
    if (DEMO_MODE) {
      setMode('login');
      return;
    }
    const modeParam = searchParams.get('mode');
    if (modeParam === 'register') {
      setMode('register');
    }
    if (modeParam === 'login') {
      setMode('login');
    }
  }, [searchParams]);

  // Submits login/register and stores the auth token.
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister && !DEMO_MODE) {
        const response = await register(username, email, password);
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_username', response.user.username);
      } else {
        const response = await login(username, password);
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_username', username);
      }
      router.push('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  // Toggles between login and register modes.
  const toggleMode = () => {
    if (DEMO_MODE) {
      return;
    }
    setMode((current) => (current === 'login' ? 'register' : 'login'));
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

      {DEMO_MODE && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-100">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">
            Demo accounts
          </p>
          <div className="mt-3 space-y-2 font-semibold text-amber-50">
            <div>camilo / 1234</div>
            <div>alice / 1234</div>
            <div>bob / 1234</div>
          </div>
        </div>
      )}

      {!DEMO_MODE && (
        <button
          className="w-full text-center text-xs text-slate-400 transition hover:text-slate-200"
          type="button"
          onClick={toggleMode}
        >
          {isRegister
            ? 'Ya tienes cuenta? Inicia sesion'
            : 'No tienes cuenta? Registrate'}
        </button>
      )}
    </section>
  );
}
