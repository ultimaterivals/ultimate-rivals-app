import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { getAthleteSeasonContextSnapshot } from "@/server/services/athlete-season-context-service";

export async function SeasonContextBanner() {
  const season = await getAthleteSeasonContextSnapshot();

  return (
    <section
      aria-label="Contexto da temporada atual"
      className="border-ur-gold/20 bg-ur-gold/[.045] rounded-ur mb-5 flex flex-wrap items-center justify-between gap-3 border px-4 py-3"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="bg-ur-gold/10 text-ur-gold flex size-9 shrink-0 items-center justify-center rounded-full">
          <CalendarDays size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[.65rem] font-black tracking-[.18em] text-zinc-500 uppercase">
            {season.title}
          </p>
          <p className="text-sm leading-5 font-black text-zinc-200">
            Fase atual · {season.phaseLabel}
          </p>
        </div>
      </div>
      <Link
        href="/athlete/season"
        className="text-ur-gold inline-flex min-h-9 items-center gap-1 text-xs font-black"
      >
        Entenda sua temporada <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}
