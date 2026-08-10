import {
  CalendarClock,
  CircleDollarSign,
  MapPin,
  TicketCheck,
  UsersRound,
} from "lucide-react";
import {
  cancelAthleteReservation,
  reserveAthleteOpportunity,
  setAthleteOpportunityInterest,
} from "@/app/athlete/agenda/actions";
import { AGENDA_TIME_ZONE } from "@/features/admin-agenda/config";
import type { AthleteOpportunity } from "@/features/athlete-portal/types";
import { Badge, Button, Card } from "@/components/ui";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: AGENDA_TIME_ZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const interestStatuses = new Set([
  "collecting_interest",
  "forming",
  "almost_full",
  "confirmed",
]);
const reservableStatuses = new Set([
  "forming",
  "almost_full",
  "confirmed",
  "full",
]);
const cancellableStatuses = new Set(["reserved", "confirmed", "waitlisted"]);

export function AthleteOpportunityCard({
  opportunity,
  availableCredits,
}: {
  opportunity: AthleteOpportunity;
  availableCredits: number;
}) {
  const personalState =
    opportunity.personalReservationStatus ??
    (opportunity.personalInterestStatus ? "interessado" : null);
  const hasReservation = Boolean(opportunity.personalReservationStatus);
  const canCancel =
    opportunity.personalReservationId !== null &&
    opportunity.personalReservationStatus !== null &&
    cancellableStatuses.has(opportunity.personalReservationStatus);
  const canExpressInterest =
    !hasReservation && interestStatuses.has(opportunity.configuredStatus);
  const canReserve =
    !hasReservation && reservableStatuses.has(opportunity.configuredStatus);
  const willWaitlist = opportunity.remainingCapacity <= 0;
  const lacksCreditForDirectReservation =
    canReserve && !willWaitlist && availableCredits <= 0;

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
        <p className="flex items-center gap-2">
          <UsersRound size={15} aria-hidden="true" />
          {opportunity.remainingCapacity > 0
            ? `${opportunity.remainingCapacity} vaga(s) disponível(is)`
            : "Capacidade preenchida · próximas entradas vão para a lista"}
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
        {opportunity.personalReservationStatus === "checked_in" && (
          <p className="text-ur-gold flex items-center gap-2 font-bold">
            <TicketCheck size={15} aria-hidden="true" /> Check-in concluído
          </p>
        )}
        {opportunity.personalEligibilityStatus === "pending" && (
          <p className="text-xs text-amber-300">
            Elegibilidade esportiva pendente de validação. A vaga não altera seu
            nível ou classificação.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 border-t pt-4">
        {canExpressInterest &&
          opportunity.personalInterestStatus === "active" && (
            <form action={setAthleteOpportunityInterest}>
              <input
                type="hidden"
                name="opportunityId"
                value={opportunity.id}
              />
              <input type="hidden" name="active" value="false" />
              <input
                type="hidden"
                name="interestMode"
                value={
                  opportunity.personalInterestMode ?? "individual_interest"
                }
              />
              <Button type="submit" variant="ghost" className="w-full">
                Retirar interesse
              </Button>
            </form>
          )}

        {canExpressInterest && !opportunity.personalInterestStatus && (
          <form action={setAthleteOpportunityInterest} className="grid gap-2">
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            <input type="hidden" name="active" value="true" />
            <label className="grid gap-1 text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Como você quer participar?
              <select
                name="interestMode"
                defaultValue="individual_interest"
                className="rounded-ur bg-ur-panel min-h-11 border px-3 text-sm text-white"
              >
                <option value="individual_interest">Tenho interesse</option>
                <option value="looking_for_partner">Procuro dupla</option>
                <option value="have_formation">Já tenho formação</option>
                <option value="available_to_join">
                  Posso completar uma formação
                </option>
              </select>
            </label>
            <Button type="submit" variant="secondary" className="w-full">
              Registrar interesse
            </Button>
          </form>
        )}

        {canReserve && (
          <form action={reserveAthleteOpportunity}>
            <input type="hidden" name="opportunityId" value={opportunity.id} />
            <Button
              type="submit"
              className="w-full"
              disabled={lacksCreditForDirectReservation}
            >
              {willWaitlist ? "Entrar na lista de espera" : "Reservar vaga"}
            </Button>
          </form>
        )}

        {lacksCreditForDirectReservation && (
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <CircleDollarSign size={14} aria-hidden="true" />
            Você precisa de pelo menos 1 crédito disponível para reservar uma
            vaga. Entrar em lista de espera não segura crédito.
          </p>
        )}

        {canCancel && (
          <form action={cancelAthleteReservation} className="grid gap-2">
            <input
              type="hidden"
              name="reservationId"
              value={opportunity.personalReservationId ?? ""}
            />
            <Button type="submit" variant="secondary" className="w-full">
              {opportunity.personalReservationStatus === "waitlisted"
                ? "Sair da lista de espera"
                : "Cancelar reserva"}
            </Button>
            {opportunity.personalReservationStatus !== "waitlisted" && (
              <p className="text-xs leading-5 text-zinc-600">
                O backend aplica a janela de cancelamento da sessão. Fora da
                janela gratuita, o crédito pode ser consumido.
              </p>
            )}
          </form>
        )}
      </div>
    </Card>
  );
}
