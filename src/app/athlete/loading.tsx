export default function AthleteLoading() {
  return (
    <div
      className="mx-auto grid max-w-7xl animate-pulse gap-5"
      aria-label="Carregando experiÃªncia do atleta"
    >
      <div className="h-16 rounded-xl bg-zinc-900" />
      <div className="grid gap-5 lg:grid-cols-[1.45fr_.85fr]">
        <div className="h-96 rounded-xl bg-zinc-900" />
        <div className="h-72 rounded-xl bg-zinc-900" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl bg-zinc-900" />
        ))}
      </div>
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
