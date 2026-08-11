import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Gauge,
  Users,
} from "lucide-react";
import Link from "next/link";
import { CommandSection } from "@/components/admin/command-section";
import { Badge, Card } from "@/components/ui";
import type { AdminCommandSnapshot } from "@/features/admin-command/types";

const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: SAO_PAULO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMoney(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function Metric({
  label,
  value,
  detail,
  href,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-transform group-hover:-translate-y-0.5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-zinc-500 uppercase">
              {label}
            </p>
            <p className="font-display mt-2 text-3xl font-black text-white uppercase">
              {value}
            </p>
          </div>
          <span className="text-ur-gold">{icon}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{detail}</p>
      </Card>
    </Link>
  );
}

export function CommandTodayControlRoom({
  snapshot,
}: {
  snapshot: AdminCommandSnapshot;
}) {
  const today = dateKey(new Date(snapshot.generatedAt));
  const todayEvents = snapshot.upcomingEvents.filter(
    (event) => dateKey(new Date(event.startsAt)) === today,
  );
  const criticalAlerts = snapshot.alerts.filter(
    (alert) => alert.severity === "critical",
  );
  const attentionAlerts = snapshot.alerts.filter(
    (alert) => alert.severity === "attention",
  );
  const readyDemand = snapshot.demand.filter((item) =>
    ["READY_TO_OPEN", "SECOND_COURT_OPPORTUNITY", "ALMOST_FULL"].includes(
      item.signal ?? "",
    ),
  );
  const primaryAction = snapshot.actions[0] ?? null;

  return (
    <CommandSection
      title="Sala de controle · Hoje"
      description="Camada executiva adicional para decidir rápido sem substituir nenhum módulo existente. Cada card leva à área operacional que já executa a ação."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Operações hoje"
          value={String(snapshot.metrics.todayEvents ?? "—")}
          detail={
            todayEvents.length > 0
              ? `${todayEvents.length} operação(ões) identificada(s) na agenda de hoje.`
              : "Consulte a agenda para planejar ou confirmar as próximas operações."
          }
          href="/admin/agenda"
          icon={<CalendarClock size={20} aria-hidden="true" />}
        />
        <Metric
          label="Atletas ativos · 30d"
          value={String(snapshot.metrics.activeAthletes30d ?? "—")}
          detail={
            snapshot.metrics.firstParticipationOnly
              ? `${snapshot.metrics.firstParticipationOnly} atleta(s) ainda precisam chegar à segunda participação.`
              : "Acompanhe ativação, retenção e ciclo dos atletas."
          }
          href="/admin/atletas"
          icon={<Users size={20} aria-hidden="true" />}
        />
        <Metric
          label="Pendências financeiras"
          value={String(snapshot.metrics.overduePayments ?? "—")}
          detail={`${formatMoney(snapshot.metrics.overdueAmount)} em cobranças vencidas identificadas.`}
          href="/admin/financeiro"
          icon={<CircleDollarSign size={20} aria-hidden="true" />}
        />
        <Metric
          label="Alertas críticos"
          value={String(criticalAlerts.length)}
          detail={
            criticalAlerts.length > 0
              ? "Existe bloqueio crítico que exige intervenção antes da operação."
              : `${attentionAlerts.length} alerta(s) de atenção permanecem visíveis no Command.`
          }
          href={criticalAlerts[0]?.href ?? "/admin"}
          icon={<AlertTriangle size={20} aria-hidden="true" />}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl font-black text-white uppercase">
                Linha operacional de hoje
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Visão resumida; check-in, quadra, preflight, partidas e fechamento
                continuam nos módulos atuais.
              </p>
            </div>
            <Link
              href="/admin/ur-play"
              className="text-ur-gold inline-flex items-center gap-1 text-sm font-bold"
            >
              Abrir UR Play <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {todayEvents.length > 0 ? (
              todayEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-white">{event.name}</p>
                        <Badge>{event.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {formatTime(event.startsAt)}–{formatTime(event.endsAt)}
                        {event.poleName ? ` · ${event.poleName}` : ""}
                        {event.venueName ? ` · ${event.venueName}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge>{event.openChecklistItems} checklist aberto</Badge>
                      <Badge>{event.conflictCount} conflito(s)</Badge>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-zinc-500">
                Nenhuma operação de hoje foi encontrada nesta leitura. A agenda
                existente permanece como fonte operacional.
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card>
            <div className="flex items-center gap-2">
              <Gauge
                className="text-ur-gold"
                size={18}
                aria-hidden="true"
              />
              <p className="font-display text-xl font-black text-white uppercase">
                Próxima decisão
              </p>
            </div>
            {primaryAction ? (
              <div className="mt-4">
                <Badge>{primaryAction.priority}</Badge>
                <p className="mt-3 font-bold text-white">
                  {primaryAction.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {primaryAction.detail}
                </p>
                <Link
                  href={primaryAction.href}
                  className="text-ur-gold mt-4 inline-flex items-center gap-1 text-sm font-bold"
                >
                  Executar no módulo
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-zinc-500">
                Nenhuma ação prioritária foi gerada pelas fontes atuais.
              </p>
            )}
          </Card>

          <Card>
            <p className="font-display text-xl font-black text-white uppercase">
              Sinais de capacidade
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Demanda pronta, últimas vagas e oportunidade de segunda quadra.
            </p>
            <div className="mt-4 grid gap-2">
              {readyDemand.length > 0 ? (
                readyDemand.slice(0, 3).map((item) => (
                  <Link
                    key={item.id}
                    href="/admin/agenda"
                    className="rounded-lg border border-white/10 p-3 transition-colors hover:border-white/20"
                  >
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {item.interestedCount} interessados · {item.readyFormations}/
                      {item.targetFormations} formações · {item.waitlistCount} espera
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm leading-6 text-zinc-500">
                  Nenhum sinal extraordinário de capacidade nesta leitura.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </CommandSection>
  );
}
