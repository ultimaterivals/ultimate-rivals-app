import { AthleteHistoricalResults } from "@/components/athlete/athlete-historical-results";
import { AthleteLiveResults } from "@/components/athlete/athlete-live-results";

export function AthleteResultsContent() {
  return (
    <div className="mx-auto grid max-w-7xl gap-8 pb-6">
      <header className="border-ur-gold/20 relative overflow-hidden rounded-[28px] border bg-[radial-gradient(circle_at_80%_0%,rgba(212,175,55,.18),transparent_34%),linear-gradient(145deg,rgba(20,20,20,.98),rgba(5,5,5,.98))] px-5 py-7 shadow-2xl sm:px-8 sm:py-10">
        <div className="border-ur-gold/10 bg-ur-gold/[.03] pointer-events-none absolute -top-12 -right-10 h-44 w-44 rounded-full border" />
        <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
          Minha carreira em quadra
        </p>
        <h1 className="font-display mt-2 text-4xl font-black tracking-tight text-white sm:text-6xl">
          Resultados
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
          Cada partida homologada preserva um momento da sua trajetória. Aqui
          você acompanha o que jogou agora e o histórico oficial que já faz
          parte da sua carreira no Ultimate Rivals.
        </p>
      </header>

      <AthleteLiveResults />
      <AthleteHistoricalResults />
    </div>
  );
}
