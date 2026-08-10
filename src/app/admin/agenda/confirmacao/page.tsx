import { ArrowLeft, CalendarCheck2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import {
  confirmUrPlayOpportunityAction,
  homologateSeasonAction,
} from "@/app/admin/agenda/confirmacao/actions";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminOperationalSetupSnapshot } from "@/server/services/admin-operational-setup-service";
import { getAdminSessionConfirmationSnapshot } from "@/server/services/admin-session-confirmation-service";

type Params = Promise<{
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

const errorMessages: Record<string, string> = {
  invalid_request: "Revise os dados enviados.",
  SEASON_NOT_FOUND: "Temporada não encontrada.",
  SEASON_NOT_HOMOLOGATABLE: "A temporada não está em estado homologável.",
  SEASON_REQUIRES_THREE_CYCLES: "A temporada precisa ter exatamente três ciclos.",
  INVALID_SEASON_CYCLE_PERIOD: "Existe ciclo fora do período da temporada.",
  SEASON_CYCLES_OVERLAP: "Os ciclos da temporada estão sobrepostos.",
  OPPORTUNITY_NOT_FOUND: "Oportunidade não encontrada.",
  OPPORTUNITY_NOT_UR_PLAY: "Essa oportunidade não é um UR Play.",
  OPPORTUNITY_NOT_CONFIRMABLE: "A oportunidade não está pronta para este gate.",
  OPPORTUNITY_ALREADY_LINKED: "A oportunidade já foi convertida em operação.",
  INVALID_OPPORTUNITY_PERIOD: "O período da oportunidade é inválido.",
  UR_PLAY_REQUIRES_POLE: "O UR Play precisa ter um polo definido.",
  UR_PLAY_REQUIRES_FORMAT: "Defina Duplas ou Quartetos antes da confirmação.",
  INVALID_REGISTRATION_CLOSE: "O fechamento das reservas precisa ficar entre agora e o início do UR Play.",
  INVALID_PRICE_AMOUNT: "Valor informado inválido.",
  INVALID_CANCELLATION_WINDOW: "Janela de cancelamento inválida.",
  SEASON_NOT_READY: "Homologue a temporada antes de confirmar o UR Play.",
  OPPORTUNITY_OUTSIDE_SEASON: "A oportunidade está fora do período da temporada.",
  SEASON_CYCLE_NOT_FOUND: "Ciclo não encontrado para a temporada.",
  SEASON_CYCLE_NOT_READY: "O ciclo ainda não pode receber sessões.",
  OPPORTUNITY_OUTSIDE_CYCLE: "O UR Play precisa ficar integralmente dentro do ciclo selecionado.",
  COURT_NOT_READY: "A quadra escolhida não está homologada.",
  VENUE_NOT_READY: "O local da quadra não está homologado ou não pertence ao polo.",
  COURT_VENUE_MISMATCH: "A quadra selecionada não pertence ao local já definido.",
  FORMAT_NOT_FOUND: "O formato competitivo não está ativo no sistema.",
  CATEGORY_NOT_FOUND: "A categoria competitiva não está ativa no sistema.",
  DEMAND_NOT_READY: "A demanda mínima ainda não foi atingida. Para confirmar mesmo assim, registre uma justificativa de override com pelo menos 10 caracteres.",
  confirmation_failed: "A confirmação foi bloqueada e nenhuma operação parcial deve permanecer.",
};

function within(value: string, startsAt: string, endsAt: string) {
  const time = new Date(value).getTime();
  return time >= new Date(startsAt).getTime() && time <= new Date(endsAt).getTime();
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireRole(["admin"]);
  const [setup, confirmation, params] = await Promise.all([
    getAdminOperationalSetupSnapshot(),
    getAdminSessionConfirmationSnapshot(),
    searchParams,
  ]);

  const success = single(params.success);
  const error = single(params.error);
  const seasons = setup.seasons ?? [];
  const cycles = setup.cycles ?? [];
  const poles = setup.poles ?? [];
  const venues = setup.venues ?? [];
  const courts = setup.courts ?? [];
  const opportunities = confirmation.opportunities ?? [];
  const readySeasons = seasons.filter((season) =>
    ["registration", "active"].includes(season.status),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Gate operacional"
        title="Confirmar UR Play"
        description="Converta demanda em calendário, sessão oficial e reservas abertas somente quando temporada, quadra e demanda passarem pelos gates."
        action={
          <Link
            href="/admin/agenda"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Agenda
          </Link>
        }
      />

      {success === "season_homologated" && (
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">
            Temporada homologada. Ela já pode receber sessões dentro dos ciclos válidos.
          </p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? errorMessages.confirmation_failed}
          </p>
        </Card>
      )}

      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-xl font-black uppercase">Temporadas</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Uma temporada só é homologada quando possui três ciclos válidos e sem sobreposição.
          </p>
        </div>
        {seasons.length === 0 ? (
          <Card>
            <p className="font-bold">Nenhuma temporada cadastrada.</p>
            <Link
              href="/admin/agenda/configuracao"
              className="text-ur-gold mt-3 inline-block text-sm font-bold"
            >
              Abrir Setup Operacional
            </Link>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {seasons.map((season) => {
              const seasonCycles = cycles
                .filter((cycle) => cycle.seasonId === season.id)
                .sort((a, b) => a.cycleNumber - b.cycleNumber);
              const ready = ["registration", "active"].includes(season.status);
              return (
                <Card key={season.id} className={ready ? "border-ur-gold/35" : undefined}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{season.name}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {dateFormatter.format(new Date(season.startsAt))} →{" "}
                        {dateFormatter.format(new Date(season.endsAt))}
                      </p>
                    </div>
                    <Badge>{season.status}</Badge>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    {seasonCycles.map((cycle) => (
                      <div key={cycle.id} className="rounded-ur border p-3 text-xs">
                        <p className="font-bold">C{cycle.cycleNumber} · {cycle.name}</p>
                        <p className="mt-1 text-zinc-600">{cycle.status}</p>
                      </div>
                    ))}
                  </div>
                  {!ready && (
                    <form action={homologateSeasonAction} className="mt-4">
                      <input type="hidden" name="seasonId" value={season.id} />
                      <Button type="submit" className="w-full">
                        <ShieldCheck size={16} aria-hidden="true" /> Homologar temporada
                      </Button>
                    </form>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-xl font-black uppercase">
            Demandas aguardando confirmação
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            A confirmação cria o evento de calendário, a sessão UR Play, escopo técnico e quadra; só então abre reservas.
          </p>
        </div>

        {opportunities.length === 0 ? (
          <Card>
            <p className="font-bold">Nenhuma coleta aguardando confirmação.</p>
            <Link
              href="/admin/agenda/nova-oportunidade"
              className="text-ur-gold mt-3 inline-block text-sm font-bold"
            >
              Abrir nova oportunidade
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4">
            {opportunities.map((opportunity) => {
              const pole = poles.find((item) => item.id === opportunity.poleId);
              const validCycles = cycles.filter((cycle) => {
                const season = readySeasons.find((item) => item.id === cycle.seasonId);
                return (
                  season &&
                  ["planned", "active"].includes(cycle.status) &&
                  within(opportunity.startsAt, cycle.startsAt, cycle.endsAt) &&
                  within(opportunity.endsAt, cycle.startsAt, cycle.endsAt)
                );
              });
              const compatibleCourts = courts.filter((court) => {
                if (court.status !== "active") return false;
                const venue = venues.find((item) => item.id === court.venueId);
                if (!venue || venue.status !== "active" || venue.poleId !== opportunity.poleId) return false;
                return !opportunity.venueId || opportunity.venueId === venue.id;
              });
              const formationSize = opportunity.formatCode === "fours" ? 4 : 2;
              const minimumAthletes = opportunity.minFormations * formationSize;
              const demandReady =
                opportunity.readyFormations >= opportunity.minFormations ||
                opportunity.interestedCount >= minimumAthletes;

              return (
                <Card key={opportunity.id} className="border-ur-gold/20">
                  <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{opportunity.title}</p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {dateFormatter.format(new Date(opportunity.startsAt))} ·{" "}
                            {pole?.name ?? "Polo"}
                          </p>
                        </div>
                        <Badge>{opportunity.status}</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-ur border p-3">
                          <p className="text-xs text-zinc-500 uppercase">Interesse</p>
                          <p className="font-display mt-1 text-xl font-black">
                            {opportunity.interestedCount}
                          </p>
                        </div>
                        <div className="rounded-ur border p-3">
                          <p className="text-xs text-zinc-500 uppercase">Formações</p>
                          <p className="font-display mt-1 text-xl font-black">
                            {opportunity.readyFormations}/{opportunity.targetFormations}
                          </p>
                        </div>
                        <div className="rounded-ur border p-3">
                          <p className="text-xs text-zinc-500 uppercase">Capacidade</p>
                          <p className="font-display mt-1 text-xl font-black">
                            {opportunity.capacityAthletes}
                          </p>
                        </div>
                        <div className="rounded-ur border p-3">
                          <p className="text-xs text-zinc-500 uppercase">Gate</p>
                          <p className={`mt-1 text-sm font-bold ${demandReady ? "text-ur-gold" : "text-amber-300"}`}>
                            {demandReady ? "Demanda mínima" : "Override necessário"}
                          </p>
                        </div>
                      </div>
                      <p className="mt-4 text-xs leading-5 text-zinc-600">
                        {opportunity.level ?? "Nível aberto"} · {opportunity.formatCode ?? "Formato não definido"} ·{" "}
                        {opportunity.categoryCode ?? "Categoria aberta"}
                      </p>
                    </div>

                    <form action={confirmUrPlayOpportunityAction} className="grid gap-4">
                      <input type="hidden" name="opportunityId" value={opportunity.id} />
                      {validCycles.length === 0 ? (
                        <p className="rounded-ur border border-amber-500/25 p-3 text-sm text-amber-200">
                          Nenhum ciclo homologado cobre integralmente esta data. Ajuste a temporada/ciclos antes de confirmar.
                        </p>
                      ) : (
                        <label className="grid gap-2 text-sm font-medium">
                          Temporada / ciclo
                          <select
                            name="cycleId"
                            className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                            required
                          >
                            {validCycles.map((cycle) => {
                              const season = readySeasons.find((item) => item.id === cycle.seasonId);
                              return (
                                <option key={cycle.id} value={cycle.id}>
                                  {season?.name ?? "Temporada"} · C{cycle.cycleNumber} · {cycle.name}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                      )}

                      {compatibleCourts.length === 0 ? (
                        <p className="rounded-ur border border-amber-500/25 p-3 text-sm text-amber-200">
                          Nenhuma quadra ativa compatível com este polo/local.
                        </p>
                      ) : (
                        <label className="grid gap-2 text-sm font-medium">
                          Quadra
                          <select
                            name="courtId"
                            defaultValue={opportunity.courtId ?? compatibleCourts[0]?.id}
                            className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
                            required
                          >
                            {compatibleCourts.map((court) => {
                              const venue = venues.find((item) => item.id === court.venueId);
                              return (
                                <option key={court.id} value={court.id}>
                                  {court.name} · {venue?.name ?? "Local"}
                                </option>
                              );
                            })}
                          </select>
                        </label>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          id={`registration-close-${opportunity.id}`}
                          name="registrationClosesAt"
                          type="datetime-local"
                          label="Fechamento das reservas"
                          required
                        />
                        <Input
                          id={`cancellation-hours-${opportunity.id}`}
                          name="cancellationHours"
                          type="number"
                          min={0}
                          max={168}
                          defaultValue={12}
                          label="Cancelamento grátis até (h antes)"
                          required
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          id={`price-${opportunity.id}`}
                          name="priceAmount"
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={0}
                          label="Valor de referência"
                          required
                        />
                        <Input
                          id={`price-label-${opportunity.id}`}
                          name="priceLabel"
                          label="Rótulo do valor (opcional)"
                          placeholder="Crédito UR"
                        />
                      </div>
                      <label className="grid gap-2 text-sm font-medium">
                        Justificativa de override (se a demanda mínima não foi atingida)
                        <textarea
                          name="overrideReason"
                          rows={3}
                          className="rounded-ur bg-ur-black border px-3 py-2 text-white"
                          placeholder="Deixe vazio quando o gate de demanda já estiver verde."
                        />
                      </label>
                      <Button
                        type="submit"
                        disabled={validCycles.length === 0 || compatibleCourts.length === 0}
                      >
                        <CalendarCheck2 size={16} aria-hidden="true" /> Confirmar e abrir reservas
                      </Button>
                    </form>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {[...setup.sourceErrors, ...confirmation.sourceErrors].length > 0 && (
        <Card>
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {[...setup.sourceErrors, ...confirmation.sourceErrors].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
