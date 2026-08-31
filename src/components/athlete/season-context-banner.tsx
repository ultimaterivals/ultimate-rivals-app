import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { getAthleteSeasonContextSnapshot } from "@/server/services/athlete-season-context-service";

export async function SeasonContextBanner() {
  const season = await getAthleteSeasonContextSnapshot();

  return (
    <section
      aria-label="Contexto da temporada atual"
      className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] px-1 pb-4 sm:mb-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-ur-gold border-ur-gold/25 bg-ur-gold/[.06] grid size-9 shrink-0 place-items-center rounded-[.15rem_.8rem_.15rem_.8rem] border">
          <CalendarDays size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-ur-gold text-[.58rem] font-black tracking-[.19em] uppercase">
            {season.title}
          </p>
          <p className="mt-0.5 text-xs leading-5 font-black tracking-[.06em] text-zinc-300 uppercase">
            Fase atual · {season.phaseLabel}
          </p>
        </div>
      </div>
      <Link
        href="/athlete/season"
        className="text-ur-gold inline-flex min-h-9 items-center gap-1 text-[.62rem] font-black tracking-[.08em] uppercase"
      >
        Entenda sua temporada <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
