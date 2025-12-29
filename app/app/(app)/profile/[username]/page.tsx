type ProfilePageProps = {
  params: { username: string };
};

export default function Page({ params }: ProfilePageProps) {
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Perfil
        </p>
        <h1 className="text-2xl font-semibold">@{params.username}</h1>
        <p className="mt-2 text-sm text-slate-400">
          Historial de partidos, resenas y sesgo declarado.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <p className="text-sm text-slate-300">
          Aca vas a mostrar la actividad reciente y estadisticas del usuario.
        </p>
      </div>
    </section>
  );
}
