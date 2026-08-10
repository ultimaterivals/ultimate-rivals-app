import { CalendarClock, MapPin, TicketCheck, UsersRound } from "lucide-react";
import type { AthleteOpportunity } from "@/features/athlete-portal/types";
import { AGENDA_TIME_ZONE } from "@/features/admin-agenda/config";
import { Badge, Card } from "@/components/ui";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function AthleteOpportunityCard({
  opportunity,
}: {
  opportunity: AthleteOpportunity;
}) {
  const personalState =
    opportunity.personalReservationStatus ??
    (opportunity.personalInterestStatus ? "interessado" : null);

  return (
    <Card
      className={
        opportunity.personalReservationStatus ? "border-ur-gold/60" : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{opportunity.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {[
              opportunity.categoryCode,
              opportunity.level,
              opportunity.formatCode,
            ]
              .filter(Boolean)
              .join(" · ") || "Sessão aberta"}
          </p>
        </div>
        <Badge>{personalState ?? opportunity.status}</Badge>
      </div>

      <div className="mt-4 grid gap-2 text-sm text-zinc-400">
        {opportunity.startsAt && (
          <p className="flex items-center gap-2">
            <CalendarClock size={15} aria-hidden="true" />
            {dateFormatter.format(new Date(opportunity.startsAt))}
          </p>
        )}
        <p className="flex items-center gap-2">
          <MapPin size={15} aria-hidden="true" />
          {opportunity.poleName ?? "Polo a definir"}
          {opportunity.venueName ? ` · ${opportunity.venueName}` : ""}
        </p>
        {opportunity.personalReservationStatus === "waitlisted" && (
          <p className="text-ur-gold flex items-center gap-2 font-bold">
            <UsersRound size={15} aria-hidden="true" />
            Lista de espera
            {opportunity.waitlistPosition
              ? ` · posição ${opportunity.waitlistPosition}`
              : ""}
          </p>
        )}
        {(opportunity.personalReservationStatus === "reserved" ||
          opportunity.personalReservationStatus === "confirmed") && (
          <p className="text-ur-gold flex items-center gap-2 font-bold">
            <TicketCheck size={15} aria-hidden="true" /> Reserva ativa
          </p>
        )}
      </div>
    </Card>
  );
}
