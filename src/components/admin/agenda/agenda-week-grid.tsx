import { AlertTriangle, ClipboardList, UsersRound } from "lucide-react";
import type {
  AdminAgendaSnapshot,
  AgendaEvent,
} from "@/features/admin-agenda/types";
import {
  AGENDA_SLOT_MINUTES,
  AGENDA_TIME_ZONE,
} from "@/features/admin-agenda/config";
import {
  agendaDateForInstant,
  durationMinutes,
  minutesSinceDayStart,
} from "@/server/services/admin-agenda-service";

const SLOT_HEIGHT = 30;

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

function eventStyle(event: AgendaEvent) {
  if (event.conflictCount > 0) return "border-red-500/60 bg-red-500/10";
  if (event.status === "in_progress") return "border-ur-gold bg-ur-gold/20";
  if (event.reservedCount > 0) return "border-ur-gold/70 bg-ur-gold/10";
  if (event.status === "registration_open")
    return "border-ur-gold/50 bg-ur-gold/[0.06]";
  if (event.status === "completed")
    return "border-zinc-700 bg-zinc-900/80 opacity-70";
  return "border-zinc-700 bg-ur-panel";
}

function EventCard({
  event,
  day,
  startHour,
  endHour,
}: {
  event: AgendaEvent;
  day: string;
  startHour: number;
  endHour: number;
}) {
  const startMinute = minutesSinceDayStart(event.startsAt, day);
  if (startMinute === null) return null;

  const viewStart = startHour * 60;
  const viewEnd = endHour * 60;
  const eventEnd = startMinute + durationMinutes(event.startsAt, event.endsAt);
  if (eventEnd <= viewStart || startMinute >= viewEnd) return null;

  const clippedStart = Math.max(startMinute, viewStart);
  const clippedEnd = Math.min(eventEnd, viewEnd);
  const top = ((clippedStart - viewStart) / AGENDA_SLOT_MINUTES) * SLOT_HEIGHT;
  const height = Math.max(
    28,
    ((clippedEnd - clippedStart) / AGENDA_SLOT_MINUTES) * SLOT_HEIGHT - 3,
  );

  return (
    <article
      className={`rounded-ur absolute inset-x-1 z-10 overflow-hidden border p-2 shadow-lg ${eventStyle(event)}`}
      style={{ top, height }}
      title={`${event.name} · ${timeFormatter.format(new Date(event.startsAt))}–${timeFormatter.format(new Date(event.endsAt))}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="truncate text-xs font-black">{event.name}</p>
        {event.conflictCount > 0 && (
          <AlertTriangle
            className="shrink-0 text-red-300"
            size={13}
            aria-label="Conflito"
          />
        )}
      </div>
      <p className="mt-0.5 text-[0.68rem] text-zinc-400">
        {timeFormatter.format(new Date(event.startsAt))}–
        {timeFormatter.format(new Date(event.endsAt))}
      </p>
      {height >= 52 && (
        <p className="mt-1 truncate text-[0.68rem] text-zinc-500">
          {event.poleName ?? "Sem polo"} ·{" "}
          {event.venueName ?? "Local a definir"}
        </p>
      )}
      {height >= 78 &&
        (event.reservedCount > 0 || event.interestedCount > 0) && (
          <div className="mt-1 flex flex-wrap gap-x-2 text-[0.65rem] text-zinc-300">
            <span className="flex items-center gap-1">
              <UsersRound size={11} aria-hidden="true" /> {event.reservedCount}{" "}
              reservas
            </span>
            {event.targetFormations > 0 && (
              <span>
                {event.readyFormations}/{event.targetFormations} formações
              </span>
            )}
          </div>
        )}
      {height >= 96 && event.openChecklistItems > 0 && (
        <p className="mt-1 flex items-center gap-1 text-[0.65rem] text-zinc-400">
          <ClipboardList size={11} aria-hidden="true" />{" "}
          {event.openChecklistItems} pendência(s)
        </p>
      )}
    </article>
  );
}

export function AgendaWeekGrid({
  snapshot,
}: {
  snapshot: AdminAgendaSnapshot;
}) {
  const slots =
    ((snapshot.endHour - snapshot.startHour) * 60) / AGENDA_SLOT_MINUTES;
  const hours = Array.from(
    { length: snapshot.endHour - snapshot.startHour },
    (_, index) => snapshot.startHour + index,
  );

  return (
    <div className="rounded-ur bg-ur-graphite hidden overflow-x-auto border lg:block">
      <div className="min-w-[78rem]">
        <div className="bg-ur-panel grid grid-cols-[5rem_repeat(7,minmax(0,1fr))] border-b">
          <div className="border-r p-3 text-xs font-bold text-zinc-600 uppercase">
            Hora
          </div>
          {snapshot.days.map((day) => (
            <div
              key={day.date}
              className={`border-r p-3 text-center last:border-r-0 ${day.isToday ? "bg-ur-gold/[0.06]" : ""}`}
            >
              <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
                {day.weekday}
              </p>
              <p
                className={`font-display mt-1 text-xl font-black ${day.isToday ? "text-ur-gold" : ""}`}
              >
                {day.shortLabel}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[5rem_repeat(7,minmax(0,1fr))]">
          <div
            className="relative border-r"
            style={{ height: slots * SLOT_HEIGHT }}
          >
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-3 -translate-y-2 text-xs text-zinc-600"
                style={{
                  top:
                    (((hour - snapshot.startHour) * 60) / AGENDA_SLOT_MINUTES) *
                    SLOT_HEIGHT,
                }}
              >
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          {snapshot.days.map((day) => {
            const dayEvents = (snapshot.events ?? []).filter(
              (event) => agendaDateForInstant(event.startsAt) === day.date,
            );
            return (
              <div
                key={day.date}
                className={`relative border-r last:border-r-0 ${day.isToday ? "bg-ur-gold/[0.025]" : ""}`}
                style={{ height: slots * SLOT_HEIGHT }}
              >
                {Array.from({ length: slots }, (_, index) => (
                  <div
                    key={index}
                    className={
                      index % 2 === 0
                        ? "h-[30px] border-b border-zinc-800/80"
                        : "h-[30px] border-b border-zinc-900"
                    }
                  />
                ))}
                {dayEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    day={day.date}
                    startHour={snapshot.startHour}
                    endHour={snapshot.endHour}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
