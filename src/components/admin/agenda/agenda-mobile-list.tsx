import { AlertTriangle, Clock3, MapPin, TicketCheck } from "lucide-react";
import type { AdminAgendaSnapshot } from "@/features/admin-agenda/types";
import { AGENDA_TIME_ZONE } from "@/features/admin-agenda/config";
import { agendaDateForInstant } from "@/server/services/admin-agenda-service";
import { Card } from "@/components/ui";

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

export function AgendaMobileList({ snapshot }: { snapshot: AdminAgendaSnapshot }) {
  return (
    <div className="grid gap-4 lg:hidden">
      {snapshot.days.map((day) => {
        const events = (snapshot.events ?? []).filter(
          (event) => agendaDateForInstant(event.startsAt) === day.date,
        );
        return (
          <section key={day.date} className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={`font-display text-lg font-black uppercase ${day.isToday ? "text-ur-gold" : ""}`}>
                {day.weekday} · {day.shortLabel}
              </h2>
              {day.isToday && <span className="text-xs font-bold text-ur-gold uppercase">Hoje</span>}
            </div>
            {events.length === 0 ? (
              <Card className="py-4 text-sm text-zinc-600">Nenhuma operação registrada.</Card>
            ) : (
              events.map((event) => (
                <Card key={event.id} className={event.conflictCount > 0 ? "border-red-500/50" : event.reservedCount > 0 ? "border-ur-gold/60" : ""}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{event.name}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Clock3 size={13} aria-hidden="true" />{timeFormatter.format(new Date(event.startsAt))}–{timeFormatter.format(new Date(event.endsAt))}</span>
                        <span className="flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{event.poleName ?? "Sem polo"}</span>
                        {event.reservedCount > 0 && <span className="flex items-center gap-1 text-ur-gold"><TicketCheck size={13} aria-hidden="true" />{event.reservedCount} reservas</span>}
                      </div>
                    </div>
                    {event.conflictCount > 0 && <AlertTriangle className="shrink-0 text-red-300" size={18} aria-label="Conflito" />}
                  </div>
                </Card>
              ))
            )}
          </section>
        );
      })}
    </div>
  );
}
