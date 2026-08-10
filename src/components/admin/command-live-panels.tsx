import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  Lightbulb,
} from "lucide-react";
import Link from "next/link";
import type {
  AdminCommandSnapshot,
  CommandAlertSeverity,
} from "@/features/admin-command/types";
import { Badge, Card } from "@/components/ui";
import { CommandSection } from "./command-section";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function alertIcon(severity: CommandAlertSeverity) {
  if (severity === "critical") return CircleAlert;
  if (severity === "opportunity") return Lightbulb;
  if (severity === "attention") return AlertTriangle;
  return CircleCheck;
}

function metric(value: number | null) {
  return value === null ? "—" : value.toLocaleString("pt-BR");
}

export function CommandMetricGrid({
  snapshot,
}: {
  snapshot: AdminCommandSnapshot;
}) {
  const items = [
    {
      label: "Hoje",
      value: metric(snapshot.metrics.todayEvents),
      hint: "operações na agenda",
    },
    {
      label: "Próximos 7 dias",
      value: metric(snapshot.metrics.next7DaysEvents),
      hint: "eventos operacionais",
    },
    {
      label: "Atletas ativos",
      value: metric(snapshot.metrics.activeAthletes30d),
      hint: "atividade nos últimos 30 dias",
    },
    {
      label: "Receita da temporada",
      value:
        snapshot.metrics.revenue === null
          ? "—"
          : money.format(snapshot.metrics.revenue),
      hint: snapshot.season
        ? snapshot.season.name
        : "sem temporada selecionável",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="min-h-32">
          <p className="text-xs font-bold tracking-[0.16em] text-zinc-500 uppercase">
            {item.label}
          </p>
          <p className="font-display mt-3 text-3xl font-black tracking-tight">
            {item.value}
          </p>
          <p className="mt-2 text-sm text-zinc-500">{item.hint}</p>
        </Card>
      ))}
    </div>
  );
}

export function CommandAttention({
  snapshot,
}: {
  snapshot: AdminCommandSnapshot;
}) {
  return (
    <CommandSection title="O que exige atenção">
      <Card className="min-h-44">
        {snapshot.alerts.length === 0 ? (
          <div className="flex items-start gap-3">
            <CircleCheck
              className="text-ur-gold mt-0.5"
              size={20}
              aria-hidden="true"
            />
            <div>
              <p className="font-bold">
                Nenhum alerta derivado dos dados atuais
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                O painel não inventa pendências. Alertas aparecem quando agenda,
                demanda, ativação ou financeiro geram sinais reais.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {snapshot.alerts.map((alert) => {
              const Icon = alertIcon(alert.severity);
              return (
                <Link
                  key={alert.id}
                  href={alert.href}
                  className="rounded-ur flex items-start gap-3 border bg-white/[0.02] p-3 transition-colors hover:bg-white/5"
                >
                  <Icon
                    className="text-ur-gold mt-0.5 shrink-0"
                    size={18}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">
                      {alert.title}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-zinc-500">
                      {alert.detail}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </CommandSection>
  );
}

export function CommandActions({
  snapshot,
}: {
  snapshot: AdminCommandSnapshot;
}) {
  return (
    <CommandSection title="O que fazer agora">
      <Card className="min-h-44">
        {snapshot.actions.length === 0 ? (
          <p className="text-sm leading-6 text-zinc-400">
            Nenhuma ação prioritária foi derivada das fontes disponíveis.
          </p>
        ) : (
          <ol className="grid gap-3">
            {snapshot.actions.map((action, index) => (
              <li key={action.id}>
                <Link
                  href={action.href}
                  className="rounded-ur group flex gap-3 border border-transparent p-2 hover:border-white/5 hover:bg-white/[0.03]"
                >
                  <span className="text-ur-gold pt-0.5 text-sm font-black">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">
                      {action.title}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-zinc-500">
                      {action.detail}
                    </span>
                  </span>
                  <ArrowRight
                    className="text-ur-gold mt-1 shrink-0 transition-transform group-hover:translate-x-0.5"
                    size={16}
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </CommandSection>
  );
}

export function CommandUpcoming({
  snapshot,
}: {
  snapshot: AdminCommandSnapshot;
}) {
  return (
    <CommandSection
      title="Próximas operações"
      description="Agenda real dos próximos 7 dias."
    >
      <Card>
        {snapshot.upcomingEvents.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Nenhuma operação futura registrada para a próxima semana.
          </p>
        ) : (
          <div className="grid divide-y">
            {snapshot.upcomingEvents.slice(0, 8).map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">{event.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {event.poleName ?? "Sem polo"} ·{" "}
                    {event.venueName ?? "Local a definir"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-sm text-zinc-400">
                  <CalendarClock size={16} aria-hidden="true" />
                  {dateTime.format(new Date(event.startsAt))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </CommandSection>
  );
}

export function CommandDemand({
  snapshot,
}: {
  snapshot: AdminCommandSnapshot;
}) {
  return (
    <CommandSection
      title="Sinais de demanda"
      description="Oportunidades e formação de sessões registradas no sistema."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {snapshot.demand.length === 0 ? (
          <Card className="lg:col-span-2">
            <p className="text-sm text-zinc-400">
              Nenhum sinal de demanda registrado.
            </p>
          </Card>
        ) : (
          snapshot.demand.slice(0, 6).map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.poleName ?? "Polo a definir"} ·{" "}
                    {item.venueName ?? "Local em formação"}
                  </p>
                </div>
                <Badge>{item.signal ?? item.status}</Badge>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="font-display text-xl font-black">
                    {item.interestedCount}
                  </p>
                  <p className="text-[0.68rem] text-zinc-600 uppercase">
                    Interesse
                  </p>
                </div>
                <div>
                  <p className="font-display text-xl font-black">
                    {item.readyFormations}/{item.targetFormations}
                  </p>
                  <p className="text-[0.68rem] text-zinc-600 uppercase">
                    Formações
                  </p>
                </div>
                <div>
                  <p className="font-display text-xl font-black">
                    {item.reservedCount}
                  </p>
                  <p className="text-[0.68rem] text-zinc-600 uppercase">
                    Reservas
                  </p>
                </div>
                <div>
                  <p className="font-display text-xl font-black">
                    {item.waitlistCount}
                  </p>
                  <p className="text-[0.68rem] text-zinc-600 uppercase">
                    Espera
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </CommandSection>
  );
}

export function CommandFunnelPanel({
  snapshot,
}: {
  snapshot: AdminCommandSnapshot;
}) {
  const funnel = snapshot.funnel;
  const stages = funnel
    ? [
        ["Visitantes", funnel.visitors],
        ["Cadastros", funnel.signups],
        ["Interesses", funnel.interests],
        ["Reservas", funnel.reservations],
        ["1ª participação", funnel.firstParticipation],
        ["2ª participação", funnel.secondParticipation],
        ["Retornos", funnel.returning],
      ]
    : [];

  return (
    <CommandSection
      title="Funil registrado"
      description="Eventos de aquisição já consolidados na base."
    >
      <Card>
        {!funnel ? (
          <p className="text-sm text-zinc-400">
            Fonte de aquisição indisponível.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {stages.map(([label, value]) => (
              <div
                key={label}
                className="rounded-ur border bg-white/[0.02] p-3"
              >
                <p className="text-xs text-zinc-500">{label}</p>
                <p className="font-display mt-2 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </CommandSection>
  );
}
