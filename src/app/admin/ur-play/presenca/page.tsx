import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Play,
  ShieldCheck,
  UserCheck,
  UserX,
} from "lucide-react";
import Link from "next/link";
import {
  advanceAttendanceSessionAction,
  manualCheckinAction,
  markNoShowAction,
  startUrPlaySessionAction,
} from "@/app/admin/ur-play/presenca/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminAttendanceSnapshot } from "@/server/services/admin-attendance-service";
import { getAdminUrPlayStartSnapshot } from "@/server/services/admin-ur-play-start-service";

type Params = Promise<{
  session?: string | string[];
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const successMessages: Record<string, string> = {
  checked_in: "Check-in registrado e crédito consumido de forma auditável.",
  no_show: "No-show registrado e crédito consumido de forma auditável.",
  session_registration_closed:
    "Reservas encerradas. A sessão pode avançar para abertura do check-in.",
  session_checkin_open:
    "Check-in aberto. Registre a presença real antes de iniciar os jogos.",
  session_started:
    "Sessão iniciada com todos os gates operacionais aprovados pelo banco.",
  session_started_override:
    "Sessão iniciada por override administrativo. A justificativa e o estado dos gates foram registrados na auditoria.",
};

const errorMessages: Record<string, string> = {
  invalid_request: "Registro ou confirmação inválida.",
  AUTH_REQUIRED: "Sessão autenticada obrigatória.",
  OPERATION_ID_REQUIRED: "Identificador da operação ausente.",
  UR_PLAY_REGISTRATION_NOT_FOUND: "Inscrição oficial não encontrada.",
  UR_PLAY_REGISTRATION_NOT_CONFIRMED:
    "Somente inscrições confirmadas recebem presença.",
  UR_PLAY_ALREADY_NO_SHOW: "Esse atleta já está marcado como no-show.",
  UR_PLAY_ALREADY_CHECKED_IN: "Esse atleta já realizou check-in.",
  UR_PLAY_SESSION_NOT_FOUND: "Sessão UR Play não encontrada.",
  NO_SHOW_BEFORE_SESSION_START:
    "No-show só pode ser registrado após o início da sessão.",
  OPERATION_DENIED:
    "Seu perfil não possui permissão operacional para esta sessão.",
  SESSION_OPERATION_DENIED:
    "Seu perfil não está atribuído à operação desta sessão.",
  CHECKIN_METHOD_NOT_CONFIGURED:
    "Método de check-in não configurado no sistema.",
  ACTIVITY_RESERVATION_CANCELLED:
    "A reserva comercial vinculada já foi cancelada.",
  RESERVATION_CREDIT_HOLD_NOT_FOUND:
    "A reserva não possui o crédito reservado esperado. O check-in foi bloqueado para preservar a auditoria.",
  INVALID_SESSION_TRANSITION:
    "A sessão não pode avançar diretamente a partir do estado atual.",
  UR_PLAY_START_NOT_READY:
    "O banco bloqueou o início: ainda existe gate crítico, quadra ou presença mínima pendente.",
  UR_PLAY_START_REQUIRES_CHECKIN_OPEN:
    "Abra o check-in antes de iniciar a sessão.",
  ADMIN_START_OVERRIDE_REASON_REQUIRED:
    "Override exige administrador e justificativa operacional com pelo menos 10 caracteres.",
  attendance_failed:
    "A operação foi bloqueada; nenhuma alteração parcial deve permanecer.",
};

function activityLabel(status: string | null) {
  if (status === "reserved") return "crédito reservado";
  if (status === "consumed") return "crédito consumido";
  if (status === "no_show") return "no-show consumido";
  if (status === "cancelled") return "cancelado";
  return status ?? "sem vínculo comercial";
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const user = await requireRole(["admin", "operator"]);
  const [snapshot, params] = await Promise.all([
    getAdminAttendanceSnapshot(),
    searchParams,
  ]);
  const sessions = snapshot.sessions ?? [];
  const startSnapshot = await getAdminUrPlayStartSnapshot(
    sessions.map((session) => session.id),
  );
  const requestedSession = single(params.session);
  const success = single(params.success);
  const error = single(params.error);
  const selected =
    sessions.find((session) => session.id === requestedSession) ?? sessions[0];
  const startReadiness = startSnapshot.sessions.find(
    (session) => session.sessionId === selected?.id,
  );
  const isAdmin = user.role === "admin";
  const sourceErrors = [
    ...new Set([...snapshot.sourceErrors, ...startSnapshot.sourceErrors]),
  ];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Operação de quadra"
        title="Presença UR Play"
        description="Check-in, no-show e progressão D0 sincronizados com inscrição oficial, créditos, preflight e estado da sessão. A sessão só entra em jogo quando o banco aprova os gates."
        action={
          <Link
            href="/admin/ur-play"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> UR Play
          </Link>
        }
      />

      {success && successMessages[success] && (
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">
            {successMessages[success]}
          </p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? errorMessages.attendance_failed}
          </p>
        </Card>
      )}

      {sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {sourceErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      )}

      {sessions.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma sessão na janela operacional.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Sessões com reservas abertas, em andamento ou recém-concluídas
            aparecem aqui entre 12 horas atrás e os próximos 7 dias.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/admin/ur-play/presenca?session=${session.id}`}
                className={`rounded-ur min-w-52 border px-4 py-3 text-sm ${selected?.id === session.id ? "border-ur-gold bg-ur-gold/10" : ""}`}
              >
                <span className="block font-bold">{session.name}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {dateFormatter.format(new Date(session.startsAt))}
                </span>
              </Link>
            ))}
          </div>

          {selected && (
            <>
              <Card className="border-ur-gold/25">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-black uppercase">
                      {selected.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {dateFormatter.format(new Date(selected.startsAt))} →{" "}
                      {dateFormatter.format(new Date(selected.endsAt))}
                      {selected.venueName ? ` · ${selected.venueName}` : ""}
                    </p>
                  </div>
                  <Badge>{selected.status}</Badge>
                </div>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Confirmados
                  </p>
                  <p className="font-display mt-2 text-3xl font-black">
                    {selected.confirmedCount}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Check-ins
                  </p>
                  <p className="font-display text-ur-gold mt-2 text-3xl font-black">
                    {selected.checkedInCount}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    No-shows
                  </p>
                  <p className="font-display mt-2 text-3xl font-black">
                    {selected.noShowCount}
                  </p>
                </Card>
                <Card>
                  <p className="text-xs font-bold text-zinc-500 uppercase">
                    Pendentes
                  </p>
                  <p className="font-display mt-2 text-3xl font-black">
                    {selected.pendingAttendanceCount}
                  </p>
                </Card>
              </div>

              <Card className="border-ur-gold/25">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black tracking-wider text-zinc-500 uppercase">
                      Fluxo D0
                    </p>
                    <p className="font-display mt-2 text-xl font-black uppercase">
                      {selected.status === "registration_open"
                        ? "1. Encerrar reservas"
                        : selected.status === "registration_closed"
                          ? "2. Abrir check-in"
                          : selected.status === "checkin_open"
                            ? "3. Autorizar início"
                            : selected.status === "in_progress"
                              ? "Sessão em andamento"
                              : "Aguardar estágio operacional"}
                    </p>
                  </div>
                  <Badge>{selected.status}</Badge>
                </div>

                {selected.status === "registration_open" && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-ur border p-4">
                    <div>
                      <p className="font-bold">Fechar novas reservas</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Depois desta transição, a lista de participantes é
                        congelada para o D0 e o próximo estágio será o check-in.
                      </p>
                    </div>
                    <form action={advanceAttendanceSessionAction}>
                      <input type="hidden" name="sessionId" value={selected.id} />
                      <input
                        type="hidden"
                        name="targetStatus"
                        value="registration_closed"
                      />
                      <Button type="submit">Encerrar reservas</Button>
                    </form>
                  </div>
                )}

                {selected.status === "registration_closed" && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-ur border p-4">
                    <div>
                      <p className="font-bold">Abrir presença real</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        O check-in passa a representar quem efetivamente chegou.
                        O início dos jogos usará essa presença, não apenas a reserva.
                      </p>
                    </div>
                    <form action={advanceAttendanceSessionAction}>
                      <input type="hidden" name="sessionId" value={selected.id} />
                      <input
                        type="hidden"
                        name="targetStatus"
                        value="checkin_open"
                      />
                      <Button type="submit">Abrir check-in</Button>
                    </form>
                  </div>
                )}

                {selected.status === "checkin_open" && (
                  <div className="mt-5 grid gap-4">
                    {startReadiness ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div
                          className={`rounded-ur border p-3 ${startReadiness.criticalReady === startReadiness.criticalTotal ? "border-emerald-500/25" : "border-red-500/25"}`}
                        >
                          <p className="text-[10px] font-bold text-zinc-600 uppercase">
                            Preflight crítico
                          </p>
                          <p className="font-display mt-2 text-2xl font-black">
                            {startReadiness.criticalReady}/
                            {startReadiness.criticalTotal}
                          </p>
                        </div>
                        <div
                          className={`rounded-ur border p-3 ${startReadiness.courtReady ? "border-emerald-500/25" : "border-red-500/25"}`}
                        >
                          <p className="text-[10px] font-bold text-zinc-600 uppercase">
                            Quadra
                          </p>
                          <p className="mt-2 font-bold">
                            {startReadiness.courtReady ? "Pronta" : "Bloqueada"}
                          </p>
                        </div>
                        <div
                          className={`rounded-ur border p-3 ${startReadiness.checkedIn >= startReadiness.minimumAthletes && startReadiness.minimumAthletes > 0 ? "border-emerald-500/25" : "border-red-500/25"}`}
                        >
                          <p className="text-[10px] font-bold text-zinc-600 uppercase">
                            Presença real
                          </p>
                          <p className="font-display mt-2 text-2xl font-black">
                            {startReadiness.checkedIn}/
                            {startReadiness.minimumAthletes || "—"}
                          </p>
                        </div>
                        <div
                          className={`rounded-ur border p-3 ${startReadiness.ready ? "border-emerald-500/25 bg-emerald-500/5" : "border-red-500/25 bg-red-500/5"}`}
                        >
                          <p className="text-[10px] font-bold text-zinc-600 uppercase">
                            Gate do banco
                          </p>
                          <p className="font-display mt-2 text-2xl font-black">
                            {startReadiness.ready ? "GO" : "NO-GO"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-ur border border-red-500/25 bg-red-500/5 p-4 text-sm text-red-200">
                        A prontidão de início não pôde ser calculada. Não inicie a
                        sessão até a leitura ser restaurada.
                      </div>
                    )}

                    {!startReadiness?.ready && (
                      <div className="rounded-ur flex flex-wrap items-center justify-between gap-4 border border-amber-500/25 bg-amber-500/5 p-4">
                        <div className="flex items-start gap-3">
                          <CircleAlert
                            className="mt-0.5 shrink-0 text-amber-300"
                            size={18}
                            aria-hidden="true"
                          />
                          <div>
                            <p className="font-bold text-amber-100">
                              O início normal está bloqueado.
                            </p>
                            <p className="mt-1 text-sm text-zinc-500">
                              Conclua o preflight e registre presença suficiente.
                              O operador não consegue contornar este gate.
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/admin/ur-play/preflight?session=${selected.id}`}
                          className="text-ur-gold inline-flex items-center gap-2 text-sm font-black"
                        >
                          Abrir preflight <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    )}

                    {(startReadiness?.ready || isAdmin) && (
                      <form
                        action={startUrPlaySessionAction}
                        className="rounded-ur grid gap-4 border p-4"
                      >
                        <input type="hidden" name="sessionId" value={selected.id} />
                        <div className="flex items-start gap-3">
                          {startReadiness?.ready ? (
                            <CheckCircle2
                              className="mt-0.5 shrink-0 text-emerald-400"
                              size={19}
                              aria-hidden="true"
                            />
                          ) : (
                            <ShieldCheck
                              className="text-ur-gold mt-0.5 shrink-0"
                              size={19}
                              aria-hidden="true"
                            />
                          )}
                          <div>
                            <p className="font-bold">
                              {startReadiness?.ready
                                ? "Autorizar jogos"
                                : "Override administrativo"}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-zinc-500">
                              {startReadiness?.ready
                                ? "A confirmação muda a sessão para in_progress e libera o matchmaking."
                                : "Use somente diante de uma decisão operacional consciente. O banco registrará os gates que estavam pendentes e a justificativa."}
                            </p>
                          </div>
                        </div>

                        {!startReadiness?.ready && isAdmin && (
                          <label className="grid gap-2 text-xs font-bold text-zinc-500 uppercase">
                            Justificativa do override
                            <textarea
                              name="overrideReason"
                              required
                              minLength={10}
                              maxLength={500}
                              rows={3}
                              className="rounded-ur border bg-black/25 px-3 py-2 text-sm font-normal text-white normal-case"
                              placeholder="Explique por que a sessão precisa iniciar mesmo com o gate incompleto."
                            />
                          </label>
                        )}
                        {startReadiness?.ready && (
                          <input type="hidden" name="overrideReason" value="" />
                        )}

                        <label className="grid gap-2 text-xs font-bold text-zinc-500 uppercase">
                          Confirmação
                          <input
                            name="confirmation"
                            required
                            autoComplete="off"
                            placeholder="Digite INICIAR"
                            className="rounded-ur min-h-11 border bg-black/25 px-3 text-sm font-normal text-white normal-case"
                          />
                        </label>
                        <Button type="submit">
                          <Play size={15} aria-hidden="true" />
                          {startReadiness?.ready
                            ? "Iniciar sessão"
                            : "Iniciar com override"}
                        </Button>
                      </form>
                    )}
                  </div>
                )}

                {selected.status === "in_progress" && (
                  <div className="rounded-ur mt-5 flex flex-wrap items-center justify-between gap-4 border border-emerald-500/25 bg-emerald-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        className="mt-0.5 text-emerald-400"
                        size={18}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold text-emerald-100">
                          Sessão liberada para jogo.
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          Matchmaking e console de quadra podem operar sobre esta
                          sessão.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/admin/ur-play/quadra"
                      className="bg-ur-gold text-ur-black rounded-ur inline-flex min-h-11 items-center gap-2 px-4 text-sm font-black"
                    >
                      Operação de quadra <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </Card>

              <div className="rounded-ur overflow-x-auto border">
                <table className="w-full min-w-[64rem] text-left text-sm">
                  <thead className="bg-ur-panel text-xs text-zinc-500 uppercase">
                    <tr>
                      <th className="px-4 py-3">Atleta</th>
                      <th className="px-4 py-3">Inscrição</th>
                      <th className="px-4 py-3">Presença</th>
                      <th className="px-4 py-3">Crédito</th>
                      <th className="px-4 py-3">Pagamento</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selected.registrations.map((registration) => {
                      const confirmed =
                        registration.registrationStatus === "confirmed";
                      const checkedIn =
                        registration.attendanceStatus === "checked_in";
                      const noShow = registration.attendanceStatus === "no_show";
                      const pending = confirmed && !checkedIn && !noShow;

                      return (
                        <tr
                          key={registration.id}
                          className="bg-ur-graphite/50"
                        >
                          <td className="px-4 py-3">
                            <p className="font-bold">
                              {registration.athleteName}
                            </p>
                            <p className="mt-1 text-xs text-zinc-600">
                              {registration.athleteCode}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge>{registration.registrationStatus}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {checkedIn ? (
                              <span className="text-ur-gold inline-flex items-center gap-2 font-bold">
                                <CheckCircle2 size={15} aria-hidden="true" />
                                Check-in
                              </span>
                            ) : noShow ? (
                              <span className="inline-flex items-center gap-2 font-bold text-red-300">
                                <UserX size={15} aria-hidden="true" /> No-show
                              </span>
                            ) : (
                              <span className="text-zinc-500">Pendente</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 text-zinc-400">
                              <CircleDollarSign size={15} aria-hidden="true" />
                              {activityLabel(registration.activityStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-400">
                            {registration.paymentStatus}
                          </td>
                          <td className="px-4 py-3">
                            {pending ? (
                              <div className="flex justify-end gap-2">
                                <form action={manualCheckinAction}>
                                  <input
                                    type="hidden"
                                    name="registrationId"
                                    value={registration.id}
                                  />
                                  <Button type="submit">
                                    <UserCheck size={15} aria-hidden="true" />
                                    Check-in
                                  </Button>
                                </form>
                                <form action={markNoShowAction}>
                                  <input
                                    type="hidden"
                                    name="registrationId"
                                    value={registration.id}
                                  />
                                  <input
                                    type="hidden"
                                    name="reason"
                                    value="No-show registrado pela mesa de operação"
                                  />
                                  <Button type="submit" variant="secondary">
                                    <UserX size={15} aria-hidden="true" />
                                    No-show
                                  </Button>
                                </form>
                              </div>
                            ) : (
                              <span className="block text-right text-xs text-zinc-600">
                                Sem ação pendente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
