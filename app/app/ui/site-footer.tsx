import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-800/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 text-xs font-semibold text-slate-300">
              BB
            </div>
            <div>
              <p className="text-sm font-semibold text-white">BallBoxd</p>
              <p className="text-xs text-slate-400">
                Recuerdos compartidos del futbol.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Calle Falsa 123, Buenos Aires, Argentina
          </p>
        </div>

        <div className="grid gap-8 text-sm text-slate-400 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Plataforma
            </p>
            <Link href="/home" className="block hover:text-slate-200">
              Home
            </Link>
            <Link href="/matches" className="block hover:text-slate-200">
              Partidos
            </Link>
            <Link href="/login" className="block hover:text-slate-200">
              Iniciar sesion
            </Link>
          </div>
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Redes
            </p>
            <span className="block text-slate-500">Instagram</span>
            <span className="block text-slate-500">X / Twitter</span>
            <span className="block text-slate-500">TikTok</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
