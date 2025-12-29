type MatchPageProps = {
  params: { matchId: string };
};

export default function Page({ params }: MatchPageProps) {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Partido
        </p>
        <h1 className="text-2xl font-semibold">{params.matchId}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Aca vive el detalle del partido, ratings y resenas.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Score global', value: '84' },
          { label: 'Ritmo', value: '79' },
          { label: 'Emocion', value: '91' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {item.label}
            </p>
            <p className="mt-2 text-3xl font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
