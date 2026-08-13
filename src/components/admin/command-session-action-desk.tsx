import {
  ArrowUpRight,
  CircleAlert,
  ClipboardCheck,
  Flag,
  PlayCircle,
  RotateCcw,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { CommandSection } from "@/components/admin/command-section";
import { Badge, Card } from "@/components/ui";
import { getAdminAttendanceSnapshot } from "@/server/services/admin-attendance-service";
import { getAdminCourtOpsSnapshot } from "@/server/services/admin-court-ops-service";
import { getAdminPostSessionSnapshot } from "@/server/services/admin-ur-play-post-session-service";
import { getAdminUrPlayCloseSnapshot } from "@/server/services/admin-ur-play-close-service";
import { getAdminUrPlayStartSnapshot } from "@/server/services/admin-ur-play-start-service";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export async function CommandSessionActionDesk() {
  const [attendance, courtOps, postSession] = await Promise.all([
    getAdminAttendanceSnapshot(),
    getAdminCourtOpsSnapshot(),
    getAdminPostSessionSnapshot(),
  ]);

  const attendanceSessions = attendance.sessions ?? [];
  const startSnapshot = await getAdminUrPlayStartSnapshot(
    attendanceSessions.map((session) => session.id),
  );
  const inProgress = courtOps.sessions.filter(
    (session) => session.status === "in_progress",
  );
  const closeSnapshot = await getAdminUrPlayCloseSnapshot(
    inProgress.map((session) => session.id),
  );

  const attendanceOperationalSession =
    attendanceSessions.find((session) =>
      ["checkin_open", "registration_closed", "registration_open"].includes(
        session.status,
      ),
    ) ?? null;
  const courtOperationalSession = inProgress[0] ?? null;
  const operationalSession =
    attendanceOperationalSession ?? courtOperationalSession ?? null;
  const attendanceFocus = operationalSession
    ? (attendanceSessions.find(
        (session) => session.id === operationalSession.id,
      ) ?? null)
    : null;

  const startReadiness = startSnapshot.sessions.find(
    (item) => item.sessionId === operationalSession?.id,
  );
  const closeReadiness = closeSnapshot.sessions.find(
    (item) => item.sessionId === operationalSession?.id,
  );
  const postSessionFocus = postSession.sessions.find(
    (session) => !session.readiness.closed,
  );

  const focusId = operationalSession?.id ?? postSessionFocus?.id ?? null;
  const focusName = operationalSession?.name ?? postSessionFocus?.name ?? null;
  const focusStartsAt =
    operationalSession?.startsAt ?? postSessionFocus?.startsAt;

  if (!focusId || !focusName) return null;

  const actions = operationalSession
    ? [
        {
          label: "Presença",
          detail: attendanceFocus
            ? `${attendanceFocus.checkedInCount}/${attendanceFocus.confirmedCount} check-ins`
            : "Abrir presença da sessão",
          href: `/admin/ur-play/presenca?session=${operationalSession.id}`,
          icon: UsersRound,
          attention: Boolean(attendanceFocus?.pendingAttendanceCount),
        },
        {
          label: "Gate de início",
          detail: startReadiness
            ? startReadiness.ready
              ? "GO aprovado pelo banco"
              : "NO-GO: revisar preflight, quadra ou presença"
            : operationalSession.status === "in_progress"
              ? "Sessão já iniciada"
              : "Prontidão ainda não calculada",
          href: `/admin/ur-play/presenca?session=${operationalSession.id}`,
          icon: PlayCircle,
          attention: Boolean(startReadiness && !startReadiness.ready),
        },
        {
          label: "Operação",
          detail:
            operationalSession.status === "in_progress"
              ? "Sessão em andamento"
              : "Abrir mesa de quadra",
          href: "/admin/ur-play/quadra",
          icon: ClipboardCheck,
          attention: false,
        },
        {
          label: "Fechamento",
          detail: closeReadiness
            ? closeReadiness.ready
              ? "Pronto para fechar"
              : `${closeReadiness.openMatches} jogo(s) aberto(s) · ${closeReadiness.pendingResults} resultado(s) pendente(s)`
            : "Disponível quando a sessão estiver em andamento",
          href: `/admin/ur-play/fechamento?session=${operationalSession.id}`,
          icon: Flag,
          attention: Boolean(closeReadiness && !closeReadiness.ready),
        },
      ]
    : [
        {
          label: "Pós-Sessão 360",
          detail: postSessionFocus
            ? `${postSessionFocus.readiness.pendingTasks} tarefa(s) pendente(s) · ${postSessionFocus.readiness.overdueTasks} atrasada(s)`
            : "Nenhuma sessão em pós-fechamento",
          href: `/admin/ur-play/pos-sessao?session=${focusId}`,
          icon: RotateCcw,
          attention: Boolean(postSessionFocus?.readiness.overdueTasks),
        },
      ];

  return (
    <CommandSection
      title="Mesa de ação · Sessão prioritária"
      description="Atalhos contextuais para a sessão que exige ação agora. As operações continuam sendo executadas nos módulos especializados existentes."
    >
      <Card className="border-ur-gold/25">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-xl font-black text-white uppercase">
                {focusName}
              </p>
              <Badge>Sessão prioritária</Badge>
            </div>
            {focusStartsAt && (
              <p className="mt-2 text-sm text-zinc-500">
                {dateTime.format(new Date(focusStartsAt))}
              </p>
            )}
          </div>
          <Link
            href="/admin/ur-play"
            className="text-ur-gold inline-flex items-center gap-1 text-sm font-bold"
          >
            Abrir UR Play <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={`rounded-ur border p-4 transition-colors ${
                  action.attention
                    ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50"
                    : "hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
                      {action.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-300">
                      {action.detail}
                    </p>
                  </div>
                  {action.attention ? (
                    <CircleAlert
                      className="shrink-0 text-amber-300"
                      size={18}
                      aria-hidden="true"
                    />
                  ) : (
                    <Icon
                      className="text-ur-gold shrink-0"
                      size={18}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </CommandSection>
  );
}
