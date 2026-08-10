import { CalendarRange, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { agendaViewPresets } from "@/features/admin-agenda/config";
import type { AdminAgendaSnapshot } from "@/features/admin-agenda/types";
import { shiftAgendaWeek } from "@/server/services/admin-agenda-service";
import { Badge } from "@/components/ui";

function buildHref({
  week,
  pole,
  startHour,
  endHour,
}: {
  week: string;
  pole: string | null;
  startHour: number;
  endHour: number;
}) {
  const params = new URLSearchParams();
  params.set("week", week);
  if (pole) params.set("pole", pole);
  if (startHour !== 6) params.set("start", String(startHour));
  if (endHour !== 24) params.set("end", String(endHour));
  return `/admin/agenda?${params.toString()}`;
}

const weekFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "2-digit",
  month: "short",
});

export function AgendaToolbar({ snapshot }: { snapshot: AdminAgendaSnapshot }) {
  const first = new Date(`${snapshot.weekStart}T12:00:00.000Z`);
  const last = new Date(
    `${shiftAgendaWeek(snapshot.weekStart, 1)}T12:00:00.000Z`,
  );
  last.setUTCDate(last.getUTCDate() - 1);

  return (
    <div className="rounded-ur bg-ur-panel grid gap-4 border p-4 xl:grid-cols-[auto_1fr_auto] xl:items-center">
      <div className="flex items-center gap-2">
        <Link
          href={buildHref({
            week: shiftAgendaWeek(snapshot.weekStart, -1),
            pole: snapshot.selectedPoleId,
            startHour: snapshot.startHour,
            endHour: snapshot.endHour,
          })}
          aria-label="Semana anterior"
          className="rounded-ur flex min-h-11 min-w-11 items-center justify-center border bg-white/[0.02] hover:bg-white/5"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
        <div className="min-w-44 text-center">
          <p className="text-xs font-bold tracking-wider text-zinc-600 uppercase">
            Semana operacional
          </p>
          <p className="mt-1 font-bold">
            {weekFormatter.format(first)} – {weekFormatter.format(last)}
          </p>
        </div>
        <Link
          href={buildHref({
            week: shiftAgendaWeek(snapshot.weekStart, 1),
            pole: snapshot.selectedPoleId,
            startHour: snapshot.startHour,
            endHour: snapshot.endHour,
          })}
          aria-label="Próxima semana"
          className="rounded-ur flex min-h-11 min-w-11 items-center justify-center border bg-white/[0.02] hover:bg-white/5"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-center">
        <CalendarRange className="text-ur-gold" size={16} aria-hidden="true" />
        <Link
          href={buildHref({
            week: new Intl.DateTimeFormat("en-CA", {
              timeZone: "America/Sao_Paulo",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date()),
            pole: snapshot.selectedPoleId,
            startHour: snapshot.startHour,
            endHour: snapshot.endHour,
          })}
          className="rounded-full border px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white"
        >
          Hoje
        </Link>
        <span className="bg-ur-line mx-1 h-5 w-px" aria-hidden="true" />
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock3 size={14} aria-hidden="true" />
          Visualização
        </span>
        {agendaViewPresets.map((preset) => {
          const active =
            snapshot.startHour === preset.startHour &&
            snapshot.endHour === preset.endHour;
          return (
            <Link
              key={preset.key}
              href={buildHref({
                week: snapshot.weekStart,
                pole: snapshot.selectedPoleId,
                startHour: preset.startHour,
                endHour: preset.endHour,
              })}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "bg-ur-gold text-ur-black rounded-full px-3 py-1.5 text-xs font-black"
                  : "rounded-full border px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-white"
              }
            >
              {preset.label}
            </Link>
          );
        })}
      </div>

      <Badge>Grade 30 min · sessão padrão 2h</Badge>
    </div>
  );
}

export function AgendaPoleFilters({
  snapshot,
}: {
  snapshot: AdminAgendaSnapshot;
}) {
  if (!snapshot.poles) return null;

  const hrefForPole = (pole: string | null) =>
    buildHref({
      week: snapshot.weekStart,
      pole,
      startHour: snapshot.startHour,
      endHour: snapshot.endHour,
    });

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Filtrar agenda por polo"
    >
      <Link
        href={hrefForPole(null)}
        aria-current={!snapshot.selectedPoleId ? "page" : undefined}
        className={
          !snapshot.selectedPoleId
            ? "rounded-full bg-white px-3 py-1.5 text-xs font-black text-black"
            : "rounded-full border px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-white"
        }
      >
        Todos os polos
      </Link>
      {snapshot.poles.map((pole) => {
        const active = snapshot.selectedPoleId === pole.id;
        return (
          <Link
            key={pole.id}
            href={hrefForPole(pole.id)}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-full bg-white px-3 py-1.5 text-xs font-black text-black"
                : "rounded-full border px-3 py-1.5 text-xs font-bold text-zinc-500 hover:text-white"
            }
          >
            {pole.name}
          </Link>
        );
      })}
    </div>
  );
}
