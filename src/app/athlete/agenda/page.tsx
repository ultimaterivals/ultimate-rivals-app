import { Badge, Button, Card, PageHeader, StatCard } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  cancelInterestAction,
  createInterestAction,
  createReservationAction,
  createTrainingInterestAction,
} from "@/features/demand/actions";
import {
  getCurrentAthleteId,
  listAgendaOpportunities,
  listInterestList,
  listMyDemandActivity,
  listTrainingInterestWindows,
} from "@/server/repositories/demand.repository";

const statusLabels: Record<string, string> = {
  collecting_interest: "Coletando Interesse",
  forming: "Em Formação",
  almost_full: "Quase Completa",
  confirmed: "Confirmada",
  full: "Completa",
  waitlist: "Lista de Espera",
  closed: "Encerrada",
  cancelled: "Cancelada",
};

const modeLabels: Record<string, string> = {
  have_formation: "Tenho formação",
  looking_for_partner: "Procuro parceiro(a)",
  available_to_join: "Posso completar",
  individual_interest: "Interesse individual",
};

export default async function AthleteAgendaPage() {
  await requireRole("athlete");
  const client = await createClient();
  const athleteId = await getCurrentAthleteId(client);
  const [opportunities, windows] = await Promise.all([
    listAgendaOpportunities(client),
    listTrainingInterestWindows(client),
  ]);
  const [interestList, mine] = await Promise.all([
    listInterestList(
      client,
      opportunities.map((opportunity) => opportunity.id),
    ),
    listMyDemandActivity(client, athleteId),
  ]);

  const activeInterestIds = new Set(
    mine.interests
      .filter((interest) => interest.status === "active")
      .map((interest) => interest.opportunity_id),
  );
  const reservationByOpportunity = new Map(
    mine.reservations.map((reservation) => [
      reservation.opportunity_id,
      reservation.status,
    ]),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Agenda UR"
        title="Interesse, formação e reserva"
        description="Mostre intenção sem ocupar vaga, forme grupos com consentimento e reserve somente quando houver capacidade real."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Oportunidades"
          value={String(opportunities.length)}
          hint="Agenda esportiva disponível"
        />
        <StatCard
          label="Quase completas"
          value={String(
            opportunities.filter(
              (item) => item.computed_status === "almost_full",
            ).length,
          )}
          hint="Última dupla/quarteto"
        />
        <StatCard
          label="Lista de espera"
          value={String(
            opportunities.reduce((sum, item) => sum + item.waitlist_count, 0),
          )}
          hint="Demanda não atendida"
        />
        <StatCard
          label="Segunda quadra"
          value={String(
            opportunities.filter((item) => item.second_court_opportunity)
              .length,
          )}
          hint="Sinal para operação"
        />
      </div>

      <section className="grid gap-4">
        {opportunities.map((opportunity) => {
          const members = interestList.filter(
            (item) => item.opportunity_id === opportunity.id,
          );
          const aggregate = members.filter(
            (item) => item.aggregate_only,
          ).length;
          const reservationStatus = reservationByOpportunity.get(
            opportunity.id,
          );
          return (
            <Card key={opportunity.id} className="grid gap-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge>{statusLabels[opportunity.computed_status]}</Badge>
                  <h2 className="font-display mt-3 text-2xl font-black">
                    {opportunity.title}
                  </h2>
                  <p className="text-sm text-zinc-400">
                    {formatDateRange(
                      opportunity.starts_at,
                      opportunity.ends_at,
                    )}{" "}
                    · {opportunity.pole_name ?? "Polo a definir"} ·{" "}
                    {opportunity.format_code ?? "formato livre"} ·{" "}
                    {opportunity.level ?? "nível aberto"}
                  </p>
                </div>
                <div className="text-right">
                  <strong className="font-display block text-3xl">
                    {opportunity.ready_formations}/
                    {opportunity.target_formations}
                  </strong>
                  <span className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                    formações prontas
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <MiniStat
                  label="Interessados"
                  value={opportunity.interested_count}
                />
                <MiniStat label="Reservas" value={opportunity.reserved_count} />
                <MiniStat
                  label="Vagas"
                  value={opportunity.remaining_capacity}
                />
                <MiniStat label="Espera" value={opportunity.waitlist_count} />
              </div>

              {opportunity.computed_status === "almost_full" && (
                <p className="rounded-ur bg-ur-gold/10 text-ur-gold p-3 text-sm font-black">
                  {opportunity.format_code === "fours"
                    ? "ÚLTIMO QUARTETO"
                    : "ÚLTIMA DUPLA"}{" "}
                  — não é “última vaga”; ainda é uma formação completa.
                </p>
              )}

              {opportunity.second_court_opportunity && (
                <p className="rounded-ur border-ur-gold/30 border p-3 text-sm text-zinc-200">
                  SECOND_COURT_OPPORTUNITY: há capacidade cheia e demanda não
                  atendida suficiente para avaliação da operação.
                </p>
              )}

              <div>
                <h3 className="font-bold">Lista esportiva pública</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {members
                    .filter((item) => !item.aggregate_only)
                    .slice(0, 8)
                    .map((item) => (
                      <span
                        key={`${item.opportunity_id}-${item.athlete_id}`}
                        className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-300"
                      >
                        {item.display_name} · {item.level ?? "nível aberto"} ·{" "}
                        {modeLabels[item.interest_mode] ?? item.interest_mode}
                      </span>
                    ))}
                  {aggregate > 0 && (
                    <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-300">
                      +{aggregate} atletas interessados em modo agregado
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <form
                  action={createInterestAction}
                  className="grid gap-3 sm:grid-cols-4"
                >
                  <input
                    type="hidden"
                    name="opportunityId"
                    value={opportunity.id}
                  />
                  <select
                    name="interestMode"
                    aria-label="Modo de interesse"
                    className="rounded-ur border bg-black p-3 sm:col-span-2"
                    defaultValue="individual_interest"
                  >
                    <option value="have_formation">Tenho dupla/quarteto</option>
                    <option value="looking_for_partner">
                      Procuro parceiro(a)
                    </option>
                    <option value="available_to_join">Posso completar</option>
                    <option value="individual_interest">
                      Interesse individual
                    </option>
                  </select>
                  <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input name="showIdentity" type="checkbox" defaultChecked />
                    Mostrar perfil esportivo
                  </label>
                  <Button type="submit">
                    {activeInterestIds.has(opportunity.id)
                      ? "Atualizar interesse"
                      : "Tenho interesse"}
                  </Button>
                </form>

                <div className="flex gap-2">
                  {activeInterestIds.has(opportunity.id) && (
                    <form action={cancelInterestAction}>
                      <input
                        type="hidden"
                        name="opportunityId"
                        value={opportunity.id}
                      />
                      <Button variant="ghost" type="submit">
                        Cancelar
                      </Button>
                    </form>
                  )}
                  <form action={createReservationAction}>
                    <input
                      type="hidden"
                      name="opportunityId"
                      value={opportunity.id}
                    />
                    <Button
                      variant={reservationStatus ? "secondary" : "primary"}
                      type="submit"
                    >
                      {reservationStatus
                        ? reservationStatus
                        : opportunity.remaining_capacity > 0
                          ? "Reservar"
                          : "Entrar na espera"}
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Treino experimental
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Interesse de treino não gera cobrança, ranking, presença nem consumo
          de pacote.
        </p>
        <form
          action={createTrainingInterestAction}
          className="mt-4 grid gap-3 md:grid-cols-4"
        >
          <select
            name="windowId"
            aria-label="Janela de treino"
            className="rounded-ur border bg-black p-3 md:col-span-2"
          >
            <option value="">Janela livre</option>
            {windows.map((window) => (
              <option key={window.id} value={window.id}>
                {window.title}
              </option>
            ))}
          </select>
          <select
            name="timePreference"
            aria-label="Preferência"
            className="rounded-ur border bg-black p-3"
          >
            <option value="morning">Manhã</option>
            <option value="afternoon">Tarde</option>
            <option value="evening">Noite</option>
            <option value="specific">Horário específico</option>
          </select>
          <select
            name="level"
            aria-label="Nível"
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Nível aberto</option>
            <option value="leveling">Nivelamento</option>
            <option value="n3">N3</option>
            <option value="n2">N2</option>
            <option value="n1">N1</option>
          </select>
          <input
            name="trainingFocus"
            placeholder="Foco opcional"
            className="rounded-ur border bg-black p-3 md:col-span-3"
          />
          <Button type="submit">Registrar interesse</Button>
        </form>
      </Card>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-ur border border-zinc-800 p-3">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <strong className="font-display text-2xl">{value}</strong>
    </div>
  );
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return "Data a definir";
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;
  return `${startDate.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  })} · ${startDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}${
    endDate
      ? `–${endDate.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : ""
  }`;
}
