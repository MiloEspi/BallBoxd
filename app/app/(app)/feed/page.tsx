import Link from 'next/link';

const matches = [
  {
    id: 'boca-river-2024',
    title: 'Boca vs River',
    meta: 'Liga Profesional · 2-1 · 08 Sep 2024',
  },
  {
    id: 'argentina-francia-2022',
    title: 'Argentina vs Francia',
    meta: 'Copa del Mundo · 3-3 · 18 Dic 2022',
  },
];

export default function Page() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Feed</h1>
        <p className="mt-2 text-sm text-slate-400">
          Ultimos partidos valorados por la comunidad.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {matches.map((match) => (
          <Link
            key={match.id}
            href={`/matches/${match.id}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-600"
          >
            <h2 className="text-lg font-semibold">{match.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{match.meta}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Score global: 86</span>
              <span>+42 resenas</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
