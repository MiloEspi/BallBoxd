import Link from 'next/link';

export default function Page() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
      <header className="space-y-4">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
          BallBoxd
        </p>
        <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
          Valora partidos como experiencias compartidas.
        </h1>
        <p className="max-w-2xl text-lg text-slate-300">
          Una plataforma para puntuar partidos por entretenimiento, ritmo y
          emocion. Menos estadisticas, mas memoria colectiva.
        </p>
      </header>

      <section className="flex flex-wrap gap-4">
        <Link
          href="/feed"
          className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
        >
          Entrar al feed
        </Link>
        <Link
          href="/matches/placeholder"
          className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
        >
          Ver un partido
        </Link>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: 'Puntajes 0-100',
            copy: 'Resume la experiencia general del partido.',
          },
          {
            title: 'Contexto del espectador',
            copy: 'Cuanto viste y desde donde se mira el futbol.',
          },
          {
            title: 'Memoria colectiva',
            copy: 'Resenas cortas y figura del partido.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6"
          >
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{item.copy}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
