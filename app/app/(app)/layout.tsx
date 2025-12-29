import Link from 'next/link';

const navItems = [
  { href: '/feed', label: 'Feed' },
  { href: '/matches', label: 'Partidos' },
  { href: '/profile/camilo', label: 'Perfil' },
];

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="hidden w-56 flex-col border-r border-slate-800 px-4 py-6 md:flex">
        <Link href="/feed" className="text-lg font-semibold tracking-wide">
          BallBoxd
        </Link>
        <nav className="mt-8 flex flex-col gap-2 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-slate-300 transition hover:bg-slate-900 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              BallBoxd
            </p>
            <p className="text-lg font-semibold">Panel</p>
          </div>
          <div className="text-sm text-slate-400">Usuario demo</div>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>

        <footer className="border-t border-slate-800 px-6 py-4 text-xs text-slate-500">
          Hecho para registrar como se vive el futbol.
        </footer>
      </div>
    </div>
  );
}
