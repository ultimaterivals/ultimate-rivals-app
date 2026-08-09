import { CalendarDays, Filter, Info, UsersRound } from "lucide-react";
import Link from "next/link";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
} from "@/components/ui";
import { EngagementViewEvent } from "@/features/engagement/engagement-client";
import {
  cancelInterestAction,
  createInterestAction,
  createReservationAction,
  createTrainingInterestAction,
} from "@/features/demand/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  type AgendaOpportunity,
  getCurrentAthleteId,
  listAgendaOpportunities,
  listInterestList,
  listMyDemandActivity,
  listTrainingInterestWindows,
} from "@/server/repositories/demand.repository";

const statusLabels: Record<string, string> = {
  collecting_interest: "Coletando interesse",
  forming: "Em formação",
  almost_full: "Quase completa",
  confirmed: "Confirmada",
  full: "Completa",
  waitlist: "Lista de espera",
  closed: "Encerrada",
  cancelled: "Cancelada",
};

const modeLabels: Record<string, string> = {
  have_formation: "Tenho formação",
  looking_for_partner: "Procuro parceiro(a)",
  available_to_join: "Posso completar",
  individual_interest: "Interesse individual",
};

type Filters = {
  pole?: string;
  activity?: string;
  format?: string;
  category?: string;
  level?: string;
};

export default async function AthleteAgendaPage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  await requireRole("athlete");
  const filters = await searchParams;
  const client = await createClient();
  const athleteId = await getCurrentAthleteId(client);
  const [opportunities, windows] = await Promise.all([
    listAgendaOpportunities(client),
    listTrainingInterestWindows(client),
  ]);
  const filteredOpportunities = opportunities.filter((opportunity) =>
    matchesFilters(opportunity, filters),
  );
  const [interestList, mine] = await Promise.all([
    listInterestList(
      client,
      filteredOpportunities.map((opportunity) => opportunity.id),
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
  const myAgenda = opportunities.filter((opportunity) => {
    const status = reservationByOpportunity.get(opportunity.id);
    return (
      status === "reserved" || status === "confirmed" || status === "waitlisted"
    );
  });
  const filterOptions = buildFilterOptions(opportunities);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="grid gap-8">
      {athleteId && (
        <EngagementViewEvent
          eventName="calendar_viewed"
          athleteId={athleteId}
          objectType="calendar"
          metadata={{
            route: "/athlete/agenda",
            filtered: hasFilters,
            pole: filters.pole ?? null,
            activity: filters.activity ?? null,
            format: filters.format ?? null,
            category: filters.category ?? null,
            level: filters.level ?? null,
          }}
          dedupKey={`calendar:${athleteId}:${JSON.stringify(filters)}`}
        />
      )}
      {athleteId && hasFilters && (
        <EngagementViewEvent
          eventName="calendar_filter_changed"
          athleteId={athleteId}
          objectType="calendar"
          metadata={{
            route: "/athlete/agenda",
            pole: filters.pole ?? null,
            activity: filters.activity ?? null,
            format: filters.format ?? null,
            category: filters.category ?? null,
            level: filters.level ?? null,
          }}
          dedupKey={`calendar-filter:${athleteId}:${JSON.stringify(filters)}`}
        />
      )}

      <PageHeader
        eyebrow="Agenda UR"
        title="Minha agenda e calendário"
        description="Interesse sinaliza vontade de jogar. Formação organiza parceiros. Reserva ocupa capacidade real. Check-in continua sendo uma etapa separada."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Oportunidades"
          value={String(filteredOpportunities.length)}
          hint="Resultado dos filtros atuais"
        />
        <StatCard
          label="Minha agenda"
          value={String(myAgenda.length)}
          hint="Reservas e listas de espera"
        />
        <StatCard
          label="Quase completas"
          value={String(
            filteredOpportunities.filter(
              (item) => item.computed_status === "almost_full",
            ).length,
          )}
          hint="Última dupla/quarteto"
        />
        <StatCard
          label="Segunda quadra"
          value={String(
            filteredOpportunities.filter(
              (item) => item.second_court_opportunity,
            ).length,
          )}
          hint="Sinal para operação"
        />
      </div>

      <section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <Card>
          <div className="flex items-center gap-2">
            <CalendarDays className="text-ur-gold" />
            <h2 className="font-display text-xl font-black uppercase">
              Minha Agenda
            </h2>
          </div>
          <div className="mt-4 grid gap-3">
            {myAgenda.length ? (
              myAgenda.map((opportunity) => (
                <div
                  key={`mine-${opportunity.id}`}
                  className="rounded-ur border border-white/10 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>{opportunity.title}</strong>
                      <p className="text-sm text-zinc-400">
                        {formatDateRange(
                          opportunity.starts_at,
                          opportunity.ends_at,
                        )}
                      </p>
                    </div>
                    <Badge>
                      {reservationByOpportunity.get(opportunity.id) ?? "ativo"}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">
                Você ainda não tem reserva ou lista de espera futura.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <Filter className="text-ur-gold" />
            <h2 className="font-display text-xl font-black uppercase">
              Filtros do Calendário UR
            </h2>
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-5">
            <FilterSelect
              name="pole"
              label="Polo"
              value={filters.pole}
              options={filterOptions.poles}
            />
            <FilterSelect
              name="activity"
              label="Atividade"
              value={filters.activity}
              options={filterOptions.activities}
            />
            <FilterSelect
              name="format"
              label="Formato"
              value={filters.format}
              options={filterOptions.formats}
            />
            <FilterSelect
              name="category"
              label="Categoria"
              value={filters.category}
              options={filterOptions.categories}
            />
            <FilterSelect
              name="level"
              label="Nível"
              value={filters.level}
              options={filterOptions.levels}
            />
            <Button type="submit" className="md:col-span-2">
              Aplicar filtros
            </Button>
            <Link
              href="/athlete/agenda"
              className="rounded-ur inline-flex min-h-11 items-center justify-center px-5 text-sm font-bold text-zinc-300 uppercase hover:bg-white/10 md:col-span-3"
            >
              Limpar filtros
            </Link>
          </form>
          <p className="mt-4 flex gap-2 text-sm text-zinc-500">
            <Info className="text-ur-gold mt-0.5 shrink-0" size={16} />
            Os filtros não criam novas regras esportivas: apenas recortam a
            agenda publicada para o atleta.
          </p>
        </Card>
      </section>

      <section className="grid gap-4">
        <div>
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Calendário UR
          </p>
          <h2 className="font-display text-2xl font-black uppercase">
            Atividades disponíveis
          </h2>
        </div>
        {filteredOpportunities.length ? (
          filteredOpportunities.map((opportunity) => {
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
                {athleteId && (
                  <EngagementViewEvent
                    eventName="activity_viewed"
                    athleteId={athleteId}
                    objectType="demand_opportunity"
                    objectId={opportunity.id}
                    metadata={{
                      route: "/athlete/agenda",
                      status: opportunity.computed_status,
                      opportunity_type: opportunity.opportunity_type,
                      format: opportunity.format_code,
                      category: opportunity.category_code,
                      level: opportunity.level,
                    }}
                    dedupKey={`activity:${athleteId}:${opportunity.id}`}
                  />
                )}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge>
                      {statusLabels[opportunity.computed_status] ??
                        opportunity.computed_status}
                    </Badge>
                    <h3 className="font-display mt-3 text-2xl font-black">
                      {opportunity.title}
                    </h3>
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
                  <MiniStat
                    label="Reservas"
                    value={opportunity.reserved_count}
                  />
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
                  <h4 className="font-bold">Lista esportiva pública</h4>
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

                <div className="rounded-ur grid gap-3 border border-white/10 p-3 md:grid-cols-[1fr_auto]">
                  <div className="flex gap-3">
                    <UsersRound className="text-ur-gold mt-1 shrink-0" />
                    <div>
                      <strong>Escolha o tipo de intenção</strong>
                      <p className="text-sm text-zinc-500">
                        Interesse mostra demanda. Formação indica parceiros.
                        Reserva tenta ocupar capacidade real ou entra na espera.
                      </p>
                    </div>
                  </div>
                  <Badge>{reservationStatus ?? "sem reserva"}</Badge>
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
                      <option value="have_formation">
                        Tenho dupla/quarteto
                      </option>
                      <option value="looking_for_partner">
                        Procuro parceiro(a)
                      </option>
                      <option value="available_to_join">Posso completar</option>
                      <option value="individual_interest">
                        Interesse individual
                      </option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-zinc-300">
                      <input
                        name="showIdentity"
                        type="checkbox"
                        defaultChecked
                      />
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
          })
        ) : (
          <EmptyState
            title="Nenhuma atividade encontrada"
            description="Ajuste os filtros ou aguarde a publicação de novas oportunidades pela operação."
            action={
              <Link href="/athlete/agenda" className="text-ur-gold font-black">
                Limpar filtros
              </Link>
            }
          />
        )}
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

function FilterSelect({
  name,
  label,
  value,
  options,
}: {
  name: keyof Filters;
  label: string;
  value?: string;
  options: string[];
}) {
  return (
    <label className="grid gap-1 text-xs font-black tracking-[.12em] text-zinc-500 uppercase">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="rounded-ur border bg-black p-3 text-sm font-normal tracking-normal text-white normal-case"
      >
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
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

function buildFilterOptions(opportunities: AgendaOpportunity[]) {
  const unique = (values: (string | null)[]) =>
    [...new Set(values.filter(Boolean) as string[])].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  return {
    poles: unique(opportunities.map((item) => item.pole_name)),
    activities: unique(opportunities.map((item) => item.opportunity_type)),
    formats: unique(opportunities.map((item) => item.format_code)),
    categories: unique(opportunities.map((item) => item.category_code)),
    levels: unique(opportunities.map((item) => item.level)),
  };
}

function matchesFilters(opportunity: AgendaOpportunity, filters: Filters) {
  return (
    (!filters.pole || opportunity.pole_name === filters.pole) &&
    (!filters.activity || opportunity.opportunity_type === filters.activity) &&
    (!filters.format || opportunity.format_code === filters.format) &&
    (!filters.category || opportunity.category_code === filters.category) &&
    (!filters.level || opportunity.level === filters.level)
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
