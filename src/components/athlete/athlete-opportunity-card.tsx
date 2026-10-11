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
import { Badge, Button, Card } from "@/components/ui";
import { AGENDA_TIME_ZONE } from "@/features/admin-agenda/config";
import type { AthleteOpportunity } from "@/features/athlete-portal/types";

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

function personalStateLabel(status: string | null) {
  switch (status) {
    case "reserved":
    case "confirmed":
      return "Reserva confirmada";
    case "waitlisted":
      return "Lista de espera";
    case "checked_in":
      return "Check-in realizado";
    case "consumed":
      return "Participação concluída";
    case "no_show":
      return "Ausência registrada";
    default:
      return status;
  }
}

export function AthleteOpportunityCard({
  opportunity,
  availableCredits,
  readOnly = false,
}: {
  opportunity: AthleteOpportunity;
  availableCredits: number | null;
  readOnly?: boolean;
}) {
  const personalState =
    personalStateLabel(opportunity.personalReservationStatus) ??
    (opportunity.personalInterestStatus ? "Interesse registrado" : null);
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
  const creditsUnknown = availableCredits === null;
  const lacksCreditForDirectReservation =
    canReserve &&
    !willWaitlist &&
    availableCredits !== null &&
    availableCredits <= 0;
  const blockDirectReservationForUnknownCredit =
    canReserve && !willWaitlist && creditsUnknown;

  return (
    <Card
      data-testid={`athlete-opportunity-${opportunity.id}`}
      className={`athlete-panel relative overflow-hidden p-5 sm:p-6 ${opportunity.personalReservationStatus ? "athlete-panel-gold border-ur-gold/60" : ""}`}
    >
      <span
        className="border-ur-gold/10 pointer-events-none absolute -top-10 -right-10 size-28 rounded-full border"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="athlete-kicker">Oportunidade oficial</p>
          <p className="font-display mt-2 text-2xl leading-none font-black uppercase">
            {opportunity.title}
          </p>
          <p className="mt-2 text-xs font-bold tracking-[.04em] text-zinc-500 uppercase">
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

      <div className="mt-5 grid gap-2.5 border-t border-white/[.07] pt-4 text-sm text-zinc-400">
        {opportunity.startsAt && (
          <p className="flex items-center gap-2">
            <CalendarClock
              className="text-ur-gold"
              size={15}
              aria-hidden="true"
            />
            {dateFormatter.format(new Date(opportunity.startsAt))}
          </p>
        )}
        <p className="flex items-center gap-2">
          <MapPin className="text-ur-gold" size={15} aria-hidden="true" />
          {opportunity.poleName ?? "Polo a definir"}
          {opportunity.venueName ? ` · ${opportunity.venueName}` : ""}
        </p>
        <p className="flex items-center gap-2">
          <UsersRound className="text-ur-gold" size={15} aria-hidden="true" />
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
            <TicketCheck size={15} aria-hidden="true" /> Reserva confirmada
          </p>
        )}
        {opportunity.personalReservationStatus === "checked_in" && (
          <p className="text-ur-gold flex items-center gap-2 font-bold">
            <TicketCheck size={15} aria-hidden="true" /> Check-in realizado
          </p>
        )}
        {opportunity.personalReservationStatus === "consumed" && (
          <p className="text-ur-gold flex items-center gap-2 font-bold">
            <TicketCheck size={15} aria-hidden="true" /> Participação concluída
          </p>
        )}
        {opportunity.personalReservationStatus === "no_show" && (
          <p className="flex items-center gap-2 font-bold text-zinc-400">
            <TicketCheck size={15} aria-hidden="true" /> Ausência registrada
          </p>
        )}
        {opportunity.personalEligibilityStatus === "pending" && (
          <p className="text-xs text-amber-300">
            Elegibilidade esportiva pendente de validação. A vaga não altera seu
            nível ou classificação.
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 border-t border-white/[.07] pt-4">
        {readOnly ? (
          <p className="text-xs leading-5 text-zinc-500">
            Prévia somente leitura. As ações de interesse, reserva e
            cancelamento não são renderizadas para a sessão administrativa.
          </p>
        ) : (
          <>
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
              <form
                action={setAthleteOpportunityInterest}
                className="grid gap-2"
              >
                <input
                  type="hidden"
                  name="opportunityId"
                  value={opportunity.id}
                />
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
                <input
                  type="hidden"
                  name="opportunityId"
                  value={opportunity.id}
                />
                <Button
                  type="submit"
                  className="athlete-action w-full"
                  disabled={
                    lacksCreditForDirectReservation ||
                    blockDirectReservationForUnknownCredit
                  }
                >
                  {willWaitlist ? "Entrar na lista de espera" : "Reservar vaga"}
                </Button>
              </form>
            )}

            {lacksCreditForDirectReservation && (
              <p className="flex items-center gap-2 text-xs text-zinc-500">
                <CircleDollarSign size={14} aria-hidden="true" />
                Você precisa de pelo menos 1 crédito disponível para reservar
                uma vaga. Entrar em lista de espera não segura crédito.
              </p>
            )}

            {blockDirectReservationForUnknownCredit && (
              <p className="flex items-center gap-2 text-xs text-zinc-500">
                <CircleDollarSign size={14} aria-hidden="true" />O saldo de
                créditos está indisponível. A reserva direta fica bloqueada até
                a fonte responder, sem assumir saldo zero.
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
                    O cancelamento segue a janela desta sessão. Depois do prazo
                    gratuito, seu crédito pode ser usado.
                  </p>
                )}
              </form>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
