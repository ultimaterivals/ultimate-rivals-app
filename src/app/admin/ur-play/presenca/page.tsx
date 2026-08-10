import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  UserCheck,
  UserX,
} from "lucide-react";
import Link from "next/link";
import {
  manualCheckinAction,
  markNoShowAction,
} from "@/app/admin/ur-play/presenca/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminAttendanceSnapshot } from "@/server/services/admin-attendance-service";

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

const errorMessages: Record<string, string> = {
  invalid_request: "Registro inválido.",
  AUTH_REQUIRED: "Sessão autenticada obrigatória.",
  OPERATION_ID_REQUIRED: "Identificador da operação ausente.",
  UR_PLAY_REGISTRATION_NOT_FOUND: "Inscrição oficial não encontrada.",
  UR_PLAY_REGISTRATION_NOT_CONFIRMED: "Somente inscrições confirmadas recebem presença.",
  UR_PLAY_ALREADY_NO_SHOW: "Esse atleta já está marcado como no-show.",
  UR_PLAY_ALREADY_CHECKED_IN: "Esse atleta já realizou check-in.",
  UR_PLAY_SESSION_NOT_FOUND: "Sessão UR Play não encontrada.",
  NO_SHOW_BEFORE_SESSION_START: "No-show só pode ser registrado após o início da sessão.",
  OPERATION_DENIED: "Seu perfil não possui permissão operacional para esta sessão.",
  CHECKIN_METHOD_NOT_CONFIGURED: "Método de check-in não configurado no sistema.",
  ACTIVITY_RESERVATION_CANCELLED: "A reserva comercial vinculada já foi cancelada.",
  RESERVATION_CREDIT_HOLD_NOT_FOUND: "A reserva não possui o crédito reservado esperado. O check-in foi bloqueado para preservar a auditoria.",
  attendance_failed: "A presença foi bloqueada; nenhuma cobrança parcial deve permanecer.",
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
  await requireRole(["admin", "operator"]);
  const [snapshot, params] = await Promise.all([
    getAdminAttendanceSnapshot(),
    searchParams,
  ]);
  const requestedSession = single(params.session);
  const success = single(params.success);
  const error = single(params.error);
  const sessions = snapshot.sessions ?? [];
  const selected =
    sessions.find((session) => session.id === requestedSession) ?? sessions[0];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Operação de quadra"
        title="Presença UR Play"
        description="Check-in e no-show sincronizados com inscrição oficial, reserva do atleta e ledger de créditos. Cada participação é consumida no máximo uma vez."
        action={
          <Link
            href="/admin/ur-play"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> UR Play
          </Link>
        }
      />

      {success && (
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">
            {success === "checked_in"
              ? "Check-in registrado e crédito consumido de forma auditável."
              : "No-show registrado e crédito consumido de forma auditável."}
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

      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      )}

      {sessions.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma sessão na janela operacional.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Sessões com reservas abertas, em andamento ou recém-concluídas aparecem aqui entre 12 horas atrás e os próximos 7 dias.
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
                      const confirmed = registration.registrationStatus === "confirmed";
                      const checkedIn = registration.attendanceStatus === "checked_in";
                      const noShow = registration.attendanceStatus === "no_show";
                      const pending = confirmed && !checkedIn && !noShow;

                      return (
                        <tr key={registration.id} className="bg-ur-graphite/50">
                          <td className="px-4 py-3">
                            <p className="font-bold">{registration.athleteName}</p>
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
                                <CheckCircle2 size={15} aria-hidden="true" /> Check-in
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
                                  <Button type="submit" size="sm">
                                    <UserCheck size={15} aria-hidden="true" /> Check-in
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
                                  <Button type="submit" size="sm" variant="secondary">
                                    <UserX size={15} aria-hidden="true" /> No-show
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
