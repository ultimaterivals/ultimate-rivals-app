import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Rocket,
} from "lucide-react";
import Link from "next/link";
import type { AdminPilotReadinessSnapshot } from "@/features/admin-pilot-readiness/types";
import { Badge, Card } from "@/components/ui";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function CommandLaunchDesk({
  snapshot,
}: {
  snapshot: AdminPilotReadinessSnapshot;
}) {
  const go = snapshot.status === "go";
  const session = snapshot.targetSession;
  const sessionRunning = session?.status === "in_progress";
  const sessionCompleted = session?.status === "completed";
  const needsPreflight = Boolean(
    go && session && !sessionRunning && !sessionCompleted,
  );
  const primaryHref = sessionCompleted
    ? "/admin/ur-play/pos-sessao"
    : sessionRunning
      ? "/admin/ur-play/quadra"
      : needsPreflight
        ? "/admin/ur-play/preflight"
        : "/admin/agenda/piloto";
  const primaryLabel = sessionCompleted
    ? "Concluir Pós-Sessão 360"
    : sessionRunning
      ? "Abrir operação de quadra"
      : needsPreflight
        ? "Concluir preflight"
        : "Abrir assistente do piloto";

  return (
    <Card
      className={
        go
          ? "border-emerald-500/35 bg-emerald-500/5"
          : "border-ur-gold/35 bg-ur-gold/5"
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-center">
        <div className="flex items-start gap-4">
          <div
            className={`rounded-ur grid size-12 shrink-0 place-items-center border ${go ? "border-emerald-500/30 bg-emerald-500/10" : "border-ur-gold/30 bg-black/20"}`}
          >
            {sessionCompleted ? (
              <CheckCircle2
                className="text-emerald-300"
                size={22}
                aria-hidden="true"
              />
            ) : sessionRunning ? (
              <Rocket
                className="text-emerald-300"
                size={22}
                aria-hidden="true"
              />
            ) : needsPreflight ? (
              <ClipboardCheck
                className="text-emerald-300"
                size={22}
                aria-hidden="true"
              />
            ) : (
              <CircleAlert
                className="text-ur-gold"
                size={22}
                aria-hidden="true"
              />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black tracking-[0.16em] text-zinc-500 uppercase">
                Próximo movimento
              </p>
              <Badge>{go ? "Implantação GO" : "NO-GO"}</Badge>
            </div>
            <h2 className="font-display mt-2 text-3xl font-black uppercase">
              {sessionCompleted
                ? "Quadra encerrada — fechar operação 360"
                : sessionRunning
                  ? "Sessão em operação"
                  : needsPreflight
                    ? "Sessão estruturada — concluir preflight"
                    : (snapshot.nextAction?.label ??
                      "Preparar primeiro UR Play")}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
              {sessionCompleted && session
                ? `${session.name} concluiu a etapa esportiva. A prioridade agora é fechar dados, Coins, financeiro, ocorrências, desenvolvimento, mídia, retenção, feedback e aprendizados dentro da janela de 24–48h.`
                : sessionRunning && session
                  ? `${session.name} já está em andamento. A prioridade agora é conduzir a quadra e preservar o registro oficial dos jogos.`
                  : needsPreflight && session
                    ? `${session.name} passou pelos gates de implantação. Antes do placar, confirme acesso à quadra, materiais, primeiros socorros, dispositivo/offline, responsável e briefing dos atletas.`
                    : snapshot.nextAction
                      ? `${snapshot.nextAction.detail} Use o fluxo guiado para resolver os gates na ordem correta sem navegar entre módulos isolados.`
                      : "Use o fluxo guiado para preparar a primeira operação real."}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-2">
                <CheckCircle2
                  className="text-emerald-400"
                  size={14}
                  aria-hidden="true"
                />
                {snapshot.readyGates}/{snapshot.totalGates} gates de implantação
              </span>
              {session && (
                <span className="flex items-center gap-2">
                  <CalendarClock
                    className="text-ur-gold"
                    size={14}
                    aria-hidden="true"
                  />
                  {dateFormatter.format(new Date(session.startsAt))}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:max-w-xs xl:justify-end">
          <Link
            href={primaryHref}
            className="bg-ur-gold text-ur-black rounded-ur inline-flex min-h-11 items-center gap-2 px-5 text-sm font-black"
          >
            {primaryLabel} <ArrowRight size={16} aria-hidden="true" />
          </Link>
          {!go && snapshot.nextAction && (
            <Link
              href={snapshot.nextAction.href}
              className="rounded-ur inline-flex min-h-11 items-center gap-2 border px-4 text-xs font-bold text-zinc-300"
            >
              Ir direto ao bloqueio
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
