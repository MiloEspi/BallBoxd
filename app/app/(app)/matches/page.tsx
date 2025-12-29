import Link from 'next/link';

const matches = [
  { id: 'boca-river-2024', label: 'Boca vs River' },
  { id: 'argentina-francia-2022', label: 'Argentina vs Francia' },
  { id: 'madrid-barca-2023', label: 'Real Madrid vs Barcelona' },
];

export default function Page() {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Partidos</h1>
        <p className="mt-2 text-sm text-slate-400">
          Lista rapida para navegar a un partido.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {matches.map((match) => (
          <Link
            key={match.id}
            href={`/matches/${match.id}`}
            className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm text-slate-200 transition hover:border-slate-600"
          >
            {match.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
