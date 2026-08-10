import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  CircleAlert,
  MapPinned,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  confirmPilotSessionAction,
  createPilotOpportunityAction,
  createPilotVenueAction,
  homologatePilotInfrastructureAction,
} from "@/app/admin/agenda/piloto/actions";
import { Badge, Button, Card, Input, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminOperationalSetupSnapshot } from "@/server/services/admin-operational-setup-service";
import { getAdminPilotReadinessSnapshot } from "@/server/services/admin-pilot-readiness-service";
import { getAdminQuarterSeasonSnapshot } from "@/server/services/admin-quarter-season-service";
import { getAdminSessionConfirmationSnapshot } from "@/server/services/admin-session-confirmation-service";

type Params = Promise<{
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function within(value: string, startsAt: string, endsAt: string) {
  const timestamp = new Date(value).getTime();
  return (
    timestamp >= new Date(startsAt).getTime() &&
    timestamp <= new Date(endsAt).getTime()
  );
}

const successMessages: Record<string, string> = {
  venue_created:
    "Local e quadra registrados em rascunho. Revise e homologue a infraestrutura antes de usar a quadra.",
  infrastructure_homologated:
    "Infraestrutura homologada. A quadra ativa já pode receber oportunidades reais.",
  opportunity_created:
    "Oportunidade criada. Ela entrou em coleta de interesse e ainda não é uma sessão confirmada.",
  session_confirmed:
    "UR Play confirmado. Calendário, sessão, escopo técnico e quadra foram vinculados em uma única operação.",
};

const errorMessages: Record<string, string> = {
  invalid_request: "Revise os dados obrigatórios antes de continuar.",
  invalid_confirmation: "A confirmação textual não corresponde à ação solicitada.",
  ADMIN_REQUIRED: "Somente administrador pode executar este gate.",
  POLE_NOT_FOUND: "Polo não encontrado.",
  INVALID_VENUE_NAME: "Nome do local inválido.",
  INVALID_COURT_NAME: "Nome da quadra inválido.",
  INVALID_VENUE_STATE: "UF do local inválida.",
  POLE_REQUIRES_VENUE: "Cadastre um local antes de homologar o polo.",
  POLE_REQUIRES_COURT: "Cadastre uma quadra antes de homologar o polo.",
  VENUE_REQUIRES_COURT: "O local precisa ter ao menos uma quadra.",
  COURT_NOT_FOUND: "Quadra não encontrada.",
  COURT_NOT_ACTIVE: "A quadra ainda não está homologada.",
  VENUE_NOT_FOUND: "Local não encontrado.",
  VENUE_NOT_ACTIVE: "O local ainda não está homologado.",
  OPPORTUNITY_MUST_BE_FUTURE: "A oportunidade precisa acontecer no futuro.",
  INVALID_OPPORTUNITY_PERIOD: "O início e o fim da oportunidade são inválidos.",
  INVALID_FORMATION_TARGET: "Revise as quantidades de formações.",
  INVALID_OPPORTUNITY_CAPACITY: "Capacidade de atletas inválida.",
  OPPORTUNITY_NOT_FOUND: "Oportunidade não encontrada.",
  OPPORTUNITY_NOT_CONFIRMABLE: "A oportunidade não está em estado confirmável.",
  INVALID_REGISTRATION_CLOSE:
    "O fechamento das reservas precisa ficar entre agora e o início do UR Play.",
  SEASON_NOT_READY: "Homologue a temporada antes de confirmar a sessão.",
  OPPORTUNITY_OUTSIDE_SEASON:
    "O horário escolhido está fora da temporada homologada.",
  SEASON_CYCLE_NOT_FOUND: "Macro-ciclo interno não encontrado.",
  SEASON_CYCLE_NOT_READY: "O macro-ciclo interno ainda não pode receber sessão.",
  OPPORTUNITY_OUTSIDE_CYCLE:
    "A oportunidade não cabe integralmente no macro-ciclo selecionado.",
  COURT_NOT_READY: "A quadra escolhida não está pronta para operação.",
  VENUE_NOT_READY: "O local da quadra não está pronto para operação.",
  COURT_VENUE_MISMATCH: "A quadra não pertence ao local da oportunidade.",
  DEMAND_NOT_READY:
    "A demanda mínima ainda não foi atingida. Se a operação piloto precisar ser confirmada mesmo assim, registre uma justificativa real de override com ao menos 10 caracteres.",
  operation_failed:
    "A operação foi bloqueada. Nenhuma alteração parcial deve permanecer.",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const stateLabel = {
  ready: "Pronto",
  attention: "Atenção",
  blocked: "Bloqueado",
} as const;

export default async function PilotSetupPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireRole(["admin"]);
  const [quarter, setup, confirmation, readiness, params] = await Promise.all([
    getAdminQuarterSeasonSnapshot(),
    getAdminOperationalSetupSnapshot(),
    getAdminSessionConfirmationSnapshot(),
    getAdminPilotReadinessSnapshot(),
    searchParams,
  ]);

  const success = single(params.success);
  const error = single(params.error);
  const season = quarter.currentSeason;
  const seasonReady = Boolean(
    season?.structureReady && ["registration", "active"].includes(season.status),
  );
  const poles = setup.poles ?? [];
  const venues = setup.venues ?? [];
  const courts = setup.courts ?? [];
  const cycles = setup.cycles ?? [];
  const opportunities = confirmation.opportunities ?? [];
  const activeCourts = courts.filter((court) => {
    if (court.status !== "active") return false;
    const venue = venues.find((item) => item.id === court.venueId);
    if (!venue || venue.status !== "active") return false;
    const pole = poles.find((item) => item.id === venue.poleId);
    return pole?.status === "active";
  });
  const pendingInfrastructure = poles.filter((pole) => {
    const poleVenues = venues.filter((venue) => venue.poleId === pole.id);
    const venueIds = new Set(poleVenues.map((venue) => venue.id));
    const poleCourts = courts.filter((court) => venueIds.has(court.venueId));
    return (
      poleVenues.length > 0 &&
      poleCourts.length > 0 &&
      !(
        poleVenues.some((venue) => venue.status === "active") &&
        poleCourts.some((court) => court.status === "active")
      )
    );
  });

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Implantação"
        title="Assistente do primeiro UR Play"
        description="Uma única tela para sair do NO-GO com dados reais. O assistente não cria temporada, quadra, horário, preço, categoria ou override por conta própria: ele apenas conduz os gates na ordem correta."
        action={
          <Link
            href="/admin"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            Command Center <ArrowRight size={16} aria-hidden="true" />
          </Link>
        }
      />

      {success && successMessages[success] && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm font-bold text-emerald-200">
            {successMessages[success]}
          </p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm font-bold text-red-200">
            {errorMessages[error] ?? errorMessages.operation_failed}
          </p>
        </Card>
      )}

      <Card className={readiness.status === "go" ? "border-emerald-500/40" : "border-red-500/30"}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-wider text-zinc-500 uppercase">
              Gate consolidado
            </p>
            <p className="font-display mt-2 text-4xl font-black uppercase">
              {readiness.status === "go" ? "GO" : "NO-GO"}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {readiness.readyGates}/{readiness.totalGates} condições reais aprovadas.
            </p>
          </div>
          {readiness.nextAction && (
            <div className="max-w-md">
              <p className="text-xs font-bold text-zinc-500 uppercase">
                Próximo bloqueio
              </p>
              <p className="mt-1 font-bold">{readiness.nextAction.label}</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                {readiness.nextAction.detail}
              </p>
            </div>
          )}
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {readiness.gates.map((gate) => (
            <div key={gate.key} className="rounded-ur border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold">{gate.label}</p>
                <Badge>{stateLabel[gate.state]}</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-600">{gate.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className={seasonReady ? "border-emerald-500/25" : "border-amber-500/25"}>
          <div className="flex items-start gap-3">
            {seasonReady ? (
              <CheckCircle2 className="mt-0.5 text-emerald-400" size={20} />
            ) : (
              <CircleAlert className="mt-0.5 text-amber-300" size={20} />
            )}
            <div>
              <Badge>1 · Temporada</Badge>
              <h2 className="font-display mt-3 text-xl font-black uppercase">
                {season?.name ?? "Temporada ainda não criada"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {season
                  ? `${season.weeks.length}/13 semanas · status ${season.status}${season.currentWeek ? ` · W${season.currentWeek.weekNumber}` : ""}`
                  : "Informe nome, código e data real da W1. O sistema calcula o trimestre inteiro."}
              </p>
              <Link
                href="/admin/agenda/temporada"
                className="text-ur-gold mt-4 inline-flex text-sm font-bold"
              >
                {seasonReady ? "Revisar temporada" : "Resolver temporada"} →
              </Link>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-ur-gold mt-0.5" size={20} />
            <div>
              <Badge>2 · Atletas</Badge>
              <h2 className="font-display mt-3 text-xl font-black uppercase">
                Onda do piloto
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {readiness.currentWave
                  ? `${readiness.currentWave.name}: ${readiness.currentWave.readyCount}/${readiness.currentWave.targetSize} atletas prontos.`
                  : "A escolha do grupo é humana e auditada. O assistente não seleciona atletas automaticamente."}
              </p>
              <Link
                href="/admin/atletas/ondas/executar"
                className="text-ur-gold mt-4 inline-flex text-sm font-bold"
              >
                Abrir execução da onda →
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge>3 · Infraestrutura</Badge>
            <h2 className="font-display mt-3 text-xl font-black uppercase">
              Quadra real
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              Os polos já existem. Cadastre o local e a quadra somente depois da parceria/reserva real; depois homologue o conjunto para liberar uso operacional.
            </p>
          </div>
          <Badge>{activeCourts.length} quadra(s) ativa(s)</Badge>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-2">
          <form action={createPilotVenueAction} className="rounded-ur grid gap-4 border p-4">
            <p className="font-bold">Cadastrar local + primeira quadra</p>
            <label className="grid gap-2 text-sm font-medium">
              Polo real
              <select
                name="poleId"
                required
                defaultValue=""
                className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
              >
                <option value="" disabled>
                  Selecione o polo
                </option>
                {poles.map((pole) => (
                  <option key={pole.id} value={pole.id}>
                    {pole.name} · {pole.city}/{pole.state}
                  </option>
                ))}
              </select>
            </label>
            <Input id="pilot-venue" name="venueName" label="Nome real do local" required />
            <Input id="pilot-address" name="addressLine" label="Endereço" />
            <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
              <Input id="pilot-city" name="city" label="Cidade (vazio = polo)" />
              <Input id="pilot-state" name="state" label="UF" maxLength={2} />
            </div>
            <Input id="pilot-court" name="courtName" label="Nome da quadra" required />
            <Button type="submit" disabled={poles.length === 0}>
              Registrar infraestrutura em rascunho
            </Button>
          </form>

          <div className="grid gap-3">
            {poles.map((pole) => {
              const poleVenues = venues.filter((venue) => venue.poleId === pole.id);
              const ids = new Set(poleVenues.map((venue) => venue.id));
              const poleCourts = courts.filter((court) => ids.has(court.venueId));
              const ready =
                poleVenues.some((venue) => venue.status === "active") &&
                poleCourts.some((court) => court.status === "active");
              return (
                <div key={pole.id} className="rounded-ur border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{pole.name}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {poleVenues.length} local(is) · {poleCourts.length} quadra(s)
                      </p>
                    </div>
                    <Badge>{ready ? "operacional" : poleCourts.length ? "rascunho" : "sem quadra"}</Badge>
                  </div>
                  {!ready && poleVenues.length > 0 && poleCourts.length > 0 && (
                    <form action={homologatePilotInfrastructureAction} className="mt-4 grid gap-3">
                      <input type="hidden" name="poleId" value={pole.id} />
                      <Input
                        id={`infra-confirm-${pole.id}`}
                        name="confirmation"
                        label="Digite HOMOLOGAR"
                        autoComplete="off"
                        required
                      />
                      <Button type="submit">Homologar local e quadra</Button>
                    </form>
                  )}
                </div>
              );
            })}
            {pendingInfrastructure.length === 0 && activeCourts.length > 0 && (
              <div className="rounded-ur border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                Há infraestrutura homologada disponível para a próxima etapa.
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge>4 · Oportunidade</Badge>
            <h2 className="font-display mt-3 text-xl font-black uppercase">
              Definir o primeiro UR Play
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
              Aqui o horário ainda é uma oportunidade em coleta de interesse, não uma reserva confirmada. Todos os parâmetros abaixo são decisões reais do administrador.
            </p>
          </div>
          <Badge>{opportunities.length} aguardando confirmação</Badge>
        </div>

        <form action={createPilotOpportunityAction} className="mt-5 grid gap-4 lg:grid-cols-2">
          <Input id="pilot-title" name="title" label="Nome da oportunidade" required />
          <label className="grid gap-2 text-sm font-medium">
            Quadra homologada
            <select
              name="courtId"
              required
              defaultValue=""
              className="rounded-ur bg-ur-black min-h-11 border px-3 text-white"
            >
              <option value="" disabled>
                Selecione a quadra
              </option>
              {activeCourts.map((court) => {
                const venue = venues.find((item) => item.id === court.venueId);
                const pole = poles.find((item) => item.id === venue?.poleId);
                return (
                  <option key={court.id} value={court.id}>
                    {pole?.name ?? "Polo"} · {venue?.name ?? "Local"} · {court.name}
                  </option>
                );
              })}
            </select>
          </label>
          <Input id="pilot-start" name="startsAt" label="Início real" type="datetime-local" required />
          <Input id="pilot-end" name="endsAt" label="Fim real" type="datetime-local" required />
          <label className="grid gap-2 text-sm font-medium">
            Nível
            <select name="level" required defaultValue="" className="rounded-ur bg-ur-black min-h-11 border px-3 text-white">
              <option value="" disabled>Selecione</option>
              <option value="leveling">Nivelamento</option>
              <option value="n3">N3</option>
              <option value="n2">N2</option>
              <option value="n1">N1</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Formato
            <select name="formatCode" required defaultValue="" className="rounded-ur bg-ur-black min-h-11 border px-3 text-white">
              <option value="" disabled>Selecione</option>
              <option value="doubles">Duplas</option>
              <option value="fours">Quartetos</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Categoria
            <select name="categoryCode" required defaultValue="" className="rounded-ur bg-ur-black min-h-11 border px-3 text-white">
              <option value="" disabled>Selecione</option>
              <option value="female">Feminino</option>
              <option value="male">Masculino</option>
              <option value="mixed">Misto</option>
            </select>
          </label>
          <Input id="pilot-target" name="targetFormations" label="Formações-alvo" type="number" min={1} max={24} required />
          <Input id="pilot-max" name="maxFormations" label="Máximo de formações" type="number" min={1} max={24} required />
          <Input id="pilot-capacity" name="capacityAthletes" label="Capacidade de atletas" type="number" min={2} max={96} required />
          <div className="lg:col-span-2">
            <Button type="submit" disabled={!seasonReady || activeCourts.length === 0}>
              Abrir coleta de interesse
            </Button>
            {!seasonReady && <p className="mt-2 text-xs text-amber-300">Homologue a temporada antes desta etapa.</p>}
            {activeCourts.length === 0 && <p className="mt-2 text-xs text-amber-300">Homologue ao menos uma quadra antes desta etapa.</p>}
          </div>
        </form>
      </Card>

      <Card>
        <div>
          <Badge>5 · Confirmação</Badge>
          <h2 className="font-display mt-3 text-xl font-black uppercase">
            Converter demanda em sessão oficial
          </h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">
            A confirmação cria calendário, sessão, escopo competitivo e vínculo com a quadra. Se a demanda mínima não existir, o banco só aceita override acompanhado de justificativa administrativa real.
          </p>
        </div>

        {opportunities.length === 0 ? (
          <div className="rounded-ur mt-5 border border-dashed p-5 text-sm text-zinc-500">
            Nenhuma oportunidade UR Play aguarda confirmação.
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {opportunities.map((opportunity) => {
              const validCycles = cycles.filter(
                (cycle) =>
                  ["planned", "active"].includes(cycle.status) &&
                  within(opportunity.startsAt, cycle.startsAt, cycle.endsAt) &&
                  within(opportunity.endsAt, cycle.startsAt, cycle.endsAt),
              );
              const compatibleCourts = activeCourts.filter((court) => {
                const venue = venues.find((item) => item.id === court.venueId);
                return venue?.poleId === opportunity.poleId;
              });
              const formationSize = opportunity.formatCode === "fours" ? 4 : 2;
              const demandReady =
                opportunity.readyFormations >= opportunity.minFormations ||
                opportunity.interestedCount >= opportunity.minFormations * formationSize;

              return (
                <div key={opportunity.id} className="rounded-ur grid gap-5 border p-4 xl:grid-cols-[0.7fr_1.3fr]">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{opportunity.title}</p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {dateFormatter.format(new Date(opportunity.startsAt))} → {dateFormatter.format(new Date(opportunity.endsAt))}
                        </p>
                      </div>
                      <Badge>{demandReady ? "demanda pronta" : "coletando"}</Badge>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-ur border p-3">
                        <p className="text-xs text-zinc-600">Interessados</p>
                        <p className="mt-1 font-black">{opportunity.interestedCount}</p>
                      </div>
                      <div className="rounded-ur border p-3">
                        <p className="text-xs text-zinc-600">Formações</p>
                        <p className="mt-1 font-black">{opportunity.readyFormations}</p>
                      </div>
                    </div>
                  </div>

                  <form action={confirmPilotSessionAction} className="grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="opportunityId" value={opportunity.id} />
                    <label className="grid gap-2 text-sm font-medium">
                      Macro interno compatível
                      <select name="cycleId" required defaultValue="" className="rounded-ur bg-ur-black min-h-11 border px-3 text-white">
                        <option value="" disabled>Selecione</option>
                        {validCycles.map((cycle) => (
                          <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                      Quadra
                      <select name="courtId" required defaultValue="" className="rounded-ur bg-ur-black min-h-11 border px-3 text-white">
                        <option value="" disabled>Selecione</option>
                        {compatibleCourts.map((court) => (
                          <option key={court.id} value={court.id}>{court.name}</option>
                        ))}
                      </select>
                    </label>
                    <Input id={`close-${opportunity.id}`} name="registrationClosesAt" label="Fechamento das reservas" type="datetime-local" required />
                    <Input id={`price-${opportunity.id}`} name="priceAmount" label="Preço por atleta (R$)" type="number" min={0} step="0.01" required />
                    <Input id={`price-label-${opportunity.id}`} name="priceLabel" label="Descrição do preço" />
                    <Input id={`cancel-${opportunity.id}`} name="cancellationHours" label="Janela sem cobrança (horas)" type="number" min={0} max={168} required />
                    <div className="md:col-span-2">
                      <Input id={`override-${opportunity.id}`} name="overrideReason" label="Justificativa de override (somente se demanda insuficiente)" />
                    </div>
                    <div className="md:col-span-2">
                      <Input id={`confirm-${opportunity.id}`} name="confirmation" label="Digite CONFIRMAR" autoComplete="off" required />
                    </div>
                    <div className="md:col-span-2">
                      <Button type="submit" disabled={validCycles.length === 0 || compatibleCourts.length === 0}>
                        Confirmar UR Play oficial
                      </Button>
                    </div>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {readiness.targetSession && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-start gap-3">
            <CalendarCheck2 className="mt-0.5 text-emerald-400" size={20} />
            <div>
              <Badge>6 · Operação</Badge>
              <p className="mt-3 font-bold text-emerald-100">
                {readiness.targetSession.name}
              </p>
              <p className="mt-1 text-sm text-emerald-200/70">
                {readiness.targetSession.status} · {readiness.targetSession.poleName ?? "Polo"} · {readiness.targetSession.courts} quadra(s)
              </p>
              <Link href="/admin/ur-play/quadra" className="text-ur-gold mt-4 inline-flex items-center gap-2 text-sm font-black">
                Abrir operação de quadra <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </Card>
      )}

      <Card className="border-ur-gold/20">
        <div className="flex items-start gap-3">
          <MapPinned className="text-ur-gold mt-0.5" size={18} />
          <div>
            <p className="font-bold">Princípio do assistente</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Ele reduz navegação e risco operacional, mas não transforma hipótese em dado. Nome da quadra, endereço, horário, preço, janela de cancelamento, categoria, nível e eventual override continuam sendo decisões explícitas e auditáveis.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
