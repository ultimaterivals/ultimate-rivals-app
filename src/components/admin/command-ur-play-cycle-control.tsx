import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleDot,
  ClipboardCheck,
  Flag,
  MapPin,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { CommandSection } from "@/components/admin/command-section";
import { Badge, Card } from "@/components/ui";
import { getAdminAttendanceSnapshot } from "@/server/services/admin-attendance-service";
import { getAdminCourtOpsSnapshot } from "@/server/services/admin-court-ops-service";
import { getAdminPostSessionSnapshot } from "@/server/services/admin-ur-play-post-session-service";
import { getAdminUrPlayCloseSnapshot } from "@/server/services/admin-ur-play-close-service";
import { getAdminUrPlaySnapshot } from "@/server/services/admin-ur-play-service";
import { getAdminUrPlayStartSnapshot } from "@/server/services/admin-ur-play-start-service";

function StageCard({
  label,
  value,
  detail,
  href,
  icon,
  attention = false,
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  icon: React.ReactNode;
  attention?: boolean;
}) {
  return (
    <Link href={href} className="group block">
      <Card
        className={
          attention
            ? "h-full border-amber-500/30 bg-amber-500/5 transition-transform group-hover:-translate-y-0.5"
            : "h-full transition-transform group-hover:-translate-y-0.5"
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              {label}
            </p>
            <p className="font-display mt-2 text-3xl font-black text-white uppercase">
              {value}
            </p>
          </div>
          <span className={attention ? "text-amber-300" : "text-ur-gold"}>
            {icon}
          </span>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-400">{detail}</p>
        <span className="text-ur-gold mt-4 inline-flex items-center gap-1 text-xs font-bold">
          Abrir etapa <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </Card>
    </Link>
  );
}

export async function CommandUrPlayCycleControl() {
  const [attendance, courtOps, postSession, urPlay] = await Promise.all([
    getAdminAttendanceSnapshot(),
    getAdminCourtOpsSnapshot(),
    getAdminPostSessionSnapshot(),
    getAdminUrPlaySnapshot(),
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

  const confirmed = attendanceSessions.reduce(
    (total, session) => total + session.confirmedCount,
    0,
  );
  const checkedIn = attendanceSessions.reduce(
    (total, session) => total + session.checkedInCount,
    0,
  );
  const pendingAttendance = attendanceSessions.reduce(
    (total, session) => total + session.pendingAttendanceCount,
    0,
  );
  const readyToStart = startSnapshot.sessions.filter(
    (session) => session.ready,
  ).length;
  const blockedToStart = startSnapshot.sessions.filter(
    (session) => !session.ready,
  ).length;
  const readyToClose = closeSnapshot.sessions.filter(
    (session) => session.ready,
  ).length;
  const blockedToClose = closeSnapshot.sessions.filter(
    (session) => !session.ready,
  ).length;
  const openMatches = closeSnapshot.sessions.reduce(
    (total, session) => total + session.openMatches,
    0,
  );
  const pendingResults = closeSnapshot.sessions.reduce(
    (total, session) => total + session.pendingResults,
    0,
  );
  const now = new Date(urPlay.generatedAt).getTime();
  const operationalRisks = urPlay.sessions
    .filter((session) => new Date(session.startsAt).getTime() >= now)
    .filter((session) => session.courts === 0 || session.staff === 0)
    .sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  const sourceErrors = [
    ...new Set([
      ...attendance.sourceErrors,
      ...courtOps.sourceErrors,
      ...startSnapshot.sourceErrors,
      ...closeSnapshot.sourceErrors,
      ...postSession.sourceErrors,
      ...urPlay.sourceErrors,
    ]),
  ];

  return (
    <CommandSection
      title="Ciclo operacional UR Play"
      description="Leitura executiva adicional dos fluxos especializados já existentes: presença, gate de início, operação de quadra, fechamento e Pós-Sessão 360. Nenhuma etapa foi substituída."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StageCard
          label="Presença"
          value={`${checkedIn}/${confirmed}`}
          detail={
            pendingAttendance > 0
              ? `${pendingAttendance} presença(s) ainda precisam ser resolvidas entre check-in e no-show.`
              : "Presenças confirmadas na janela operacional atual."
          }
          href="/admin/ur-play/presenca"
          icon={<UsersRound size={20} aria-hidden="true" />}
          attention={pendingAttendance > 0}
        />
        <StageCard
          label="Gate de início"
          value={
            startSnapshot.sessions.length === 0 ? "—" : `${readyToStart} GO`
          }
          detail={
            blockedToStart > 0
              ? `${blockedToStart} sessão(ões) ainda estão em NO-GO por preflight, quadra ou presença mínima.`
              : "As sessões calculadas estão liberadas pelo gate do banco."
          }
          href="/admin/ur-play/presenca"
          icon={<PlayCircle size={20} aria-hidden="true" />}
          attention={blockedToStart > 0}
        />
        <StageCard
          label="Operação ao vivo"
          value={String(courtOps.metrics.sessionsInProgress)}
          detail={`${courtOps.metrics.playing} partida(s) em jogo · ${courtOps.metrics.pendingReview} aguardando revisão.`}
          href="/admin/ur-play/quadra"
          icon={<CircleDot size={20} aria-hidden="true" />}
          attention={courtOps.metrics.pendingReview > 0}
        />
        <StageCard
          label="Fechamento"
          value={
            closeSnapshot.sessions.length === 0
              ? "—"
              : `${readyToClose}/${closeSnapshot.sessions.length}`
          }
          detail={
            blockedToClose > 0
              ? `${blockedToClose} sessão(ões) bloqueadas · ${openMatches} jogo(s) aberto(s) · ${pendingResults} resultado(s) pendente(s).`
              : "As sessões em andamento avaliadas estão prontas para fechamento esportivo."
          }
          href="/admin/ur-play/fechamento"
          icon={<Flag size={20} aria-hidden="true" />}
          attention={blockedToClose > 0}
        />
        <StageCard
          label="Pós-Sessão 360"
          value={String(postSession.metrics.pending)}
          detail={`${postSession.metrics.ready} pronta(s) · ${postSession.metrics.closed} fechada(s) · ${postSession.metrics.overdue} com atraso.`}
          href="/admin/ur-play/pos-sessao"
          icon={<RotateCcw size={20} aria-hidden="true" />}
          attention={postSession.metrics.overdue > 0}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-ur-gold/20">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardCheck
                  className="text-ur-gold"
                  size={18}
                  aria-hidden="true"
                />
                <p className="font-display text-xl font-black text-white uppercase">
                  Integridade do ciclo
                </p>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-500">
                O Command resume os gates reais sem duplicar regras. Toda ação
                continua sendo executada nas mesas especializadas e validada
                pelas fontes atuais.
              </p>
            </div>
            <Badge>
              {sourceErrors.length === 0 ? "Fontes íntegras" : "Leitura parcial"}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-ur border p-3">
              <p className="text-[10px] font-bold text-zinc-600 uppercase">
                Fila de quadra
              </p>
              <p className="font-display mt-2 text-2xl font-black">
                {courtOps.metrics.waiting}
              </p>
            </div>
            <div className="rounded-ur border p-3">
              <p className="text-[10px] font-bold text-zinc-600 uppercase">
                Chamados
              </p>
              <p className="font-display mt-2 text-2xl font-black">
                {courtOps.metrics.called}
              </p>
            </div>
            <div className="rounded-ur border p-3">
              <p className="text-[10px] font-bold text-zinc-600 uppercase">
                Partidas concluídas
              </p>
              <p className="font-display mt-2 text-2xl font-black">
                {courtOps.metrics.completed}
              </p>
            </div>
            <div
              className={`rounded-ur border p-3 ${sourceErrors.length > 0 ? "border-amber-500/30" : "border-emerald-500/25"}`}
            >
              <p className="text-[10px] font-bold text-zinc-600 uppercase">
                Saúde das leituras
              </p>
              <div className="mt-2 flex items-center gap-2">
                {sourceErrors.length === 0 ? (
                  <CheckCircle2
                    className="text-emerald-400"
                    size={18}
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className="text-amber-300"
                    size={18}
                    aria-hidden="true"
                  />
                )}
                <p className="font-bold">
                  {sourceErrors.length === 0
                    ? "Sem falhas"
                    : `${sourceErrors.length} fonte(s)`}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card
          className={
            operationalRisks.length > 0
              ? "border-amber-500/30 bg-amber-500/5"
              : undefined
          }
        >
          <div className="flex items-center gap-2">
            <ShieldAlert
              className={
                operationalRisks.length > 0 ? "text-amber-300" : "text-ur-gold"
              }
              size={18}
              aria-hidden="true"
            />
            <p className="font-display text-xl font-black text-white uppercase">
              Riscos de estrutura
            </p>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Sessões futuras sem quadra ativa ou staff registrado na fonte UR Play.
          </p>

          <div className="mt-4 grid gap-2">
            {operationalRisks.length === 0 ? (
              <div className="rounded-ur border p-3 text-sm text-zinc-500">
                Nenhuma sessão futura com ausência de quadra ou staff nesta
                leitura.
              </div>
            ) : (
              operationalRisks.slice(0, 4).map((session) => (
                <Link
                  key={session.id}
                  href="/admin/ur-play"
                  className="rounded-ur border border-amber-500/20 p-3 transition-colors hover:border-amber-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-white">
                        {session.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                        <MapPin size={12} aria-hidden="true" />
                        {session.poleName ?? "Sem polo"} ·{" "}
                        {session.venueName ?? "Local a definir"}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {session.courts === 0 && <Badge>Sem quadra</Badge>}
                      {session.staff === 0 && <Badge>Sem staff</Badge>}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </CommandSection>
  );
}
