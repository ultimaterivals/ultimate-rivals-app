import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { completeUrPlaySessionAction } from "@/app/admin/ur-play/fechamento/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminCourtOpsSnapshot } from "@/server/services/admin-court-ops-service";
import { getAdminUrPlayCloseSnapshot } from "@/server/services/admin-ur-play-close-service";

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
  invalid_request: "Revise a confirmação antes de encerrar.",
  auth_required: "Sessão autenticada obrigatória.",
  operation_denied: "Seu perfil não está autorizado a fechar esta sessão.",
  session_not_found: "Sessão UR Play não encontrada.",
  requires_in_progress: "Somente uma sessão em andamento pode ser encerrada.",
  close_not_ready:
    "O banco bloqueou o encerramento porque ainda existe partida, resultado ou presença pendente.",
  override_reason_required:
    "Override exige administrador e justificativa operacional com pelo menos 10 caracteres.",
  operation_failed: "O encerramento foi bloqueado; nenhuma alteração parcial permaneceu.",
};

export default async function UrPlayClosePage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const identity = await requireAdminModule("urPlay");
  const [courtOps, params] = await Promise.all([
    getAdminCourtOpsSnapshot(),
    searchParams,
  ]);
  const inProgress = courtOps.sessions.filter(
    (session) => session.status === "in_progress",
  );
  const closeSnapshot = await getAdminUrPlayCloseSnapshot(
    inProgress.map((session) => session.id),
  );
  const requestedSession = single(params.session);
  const success = single(params.success);
  const error = single(params.error);
  const session =
    inProgress.find((item) => item.id === requestedSession) ?? inProgress[0] ?? null;
  const readiness = closeSnapshot.sessions.find(
    (item) => item.sessionId === session?.id,
  );
  const isAdmin = identity.role === "admin";
  const sourceErrors = [
    ...new Set([...courtOps.sourceErrors, ...closeSnapshot.sourceErrors]),
  ];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="UR Play · Encerramento"
        title="Fechamento esportivo"
        description="A quadra terminar não encerra a sessão no sistema. O fechamento só é homologado quando jogos, resultados e presenças estão resolvidos."
        action={
          <Link
            href="/admin/ur-play/quadra"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Operação de quadra
          </Link>
        }
      />

      {success === "completed" && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm font-bold text-emerald-200">
            Sessão concluída com todos os gates esportivos aprovados.
          </p>
        </Card>
      )}
      {success === "completed_override" && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <p className="text-sm font-bold text-amber-200">
            Sessão encerrada por override administrativo. A justificativa e as pendências foram registradas na auditoria.
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

      {sourceErrors.length > 0 && (
        <Card className="border-red-500/25">
          <p className="font-bold">Leitura parcial do fechamento</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {sourceErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      )}

      {inProgress.length === 0 ? (
        <Card>
          <div className="flex items-start gap-3">
            <FileCheck2 className="text-ur-gold mt-0.5" size={20} aria-hidden="true" />
            <div>
              <p className="font-bold">Nenhuma sessão em andamento para fechar.</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Quando uma sessão entrar em `in_progress`, ela aparecerá aqui até o fechamento oficial.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          {inProgress.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {inProgress.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/ur-play/fechamento?session=${item.id}`}
                  className={`rounded-ur border px-3 py-2 text-xs font-bold ${session?.id === item.id ? "border-ur-gold text-ur-gold" : "text-zinc-500"}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          )}

          {session && readiness && (
            <>
              <Card
                className={
                  readiness.ready
                    ? "border-emerald-500/35 bg-emerald-500/5"
                    : "border-red-500/25 bg-red-500/5"
                }
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      {readiness.ready ? (
                        <CheckCircle2 className="text-emerald-400" size={20} aria-hidden="true" />
                      ) : (
                        <CircleAlert className="text-red-300" size={20} aria-hidden="true" />
                      )}
                      <p className="font-display text-2xl font-black uppercase">
                        {session.name}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      {dateFormatter.format(new Date(session.startsAt))} · {session.poleName} · {session.venueName}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge>{readiness.ready ? "PRONTO PARA FECHAR" : "PENDENTE"}</Badge>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-ur border p-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">Jogos válidos</p>
                    <p className="font-display mt-2 text-2xl font-black">{readiness.totalMatches}</p>
                  </div>
                  <div className={`rounded-ur border p-3 ${readiness.openMatches ? "border-red-500/30" : "border-emerald-500/25"}`}>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">Jogos abertos</p>
                    <p className="font-display mt-2 text-2xl font-black">{readiness.openMatches}</p>
                  </div>
                  <div className={`rounded-ur border p-3 ${readiness.pendingResults ? "border-red-500/30" : "border-emerald-500/25"}`}>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">Resultados pendentes</p>
                    <p className="font-display mt-2 text-2xl font-black">{readiness.pendingResults}</p>
                  </div>
                  <div className="rounded-ur border p-3">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">Homologados</p>
                    <p className="font-display mt-2 text-2xl font-black">{readiness.homologatedResults}/{readiness.completedMatches}</p>
                  </div>
                  <div className={`rounded-ur border p-3 ${readiness.pendingAttendance ? "border-red-500/30" : "border-emerald-500/25"}`}>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">Presenças pendentes</p>
                    <p className="font-display mt-2 text-2xl font-black">{readiness.pendingAttendance}</p>
                  </div>
                </div>
              </Card>

              {!readiness.ready && (
                <Card className="border-amber-500/25 bg-amber-500/5">
                  <div className="flex items-start gap-3">
                    <CircleAlert className="mt-0.5 shrink-0 text-amber-300" size={18} aria-hidden="true" />
                    <div>
                      <p className="font-bold text-amber-100">Fechamento normal bloqueado.</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        Resolva partidas abertas na Operação de Quadra, homologue os resultados pendentes e finalize check-in/no-show na Presença. O operador não consegue contornar esse gate.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold">
                        <Link href="/admin/ur-play/quadra" className="text-ur-gold">Operação de Quadra →</Link>
                        <Link href={`/admin/ur-play/presenca?session=${session.id}`} className="text-ur-gold">Presença →</Link>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {(readiness.ready || isAdmin) && (
                <Card>
                  <form action={completeUrPlaySessionAction} className="grid gap-4">
                    <input type="hidden" name="sessionId" value={session.id} />
                    <div className="flex items-start gap-3">
                      {readiness.ready ? (
                        <Trophy className="text-ur-gold mt-0.5" size={19} aria-hidden="true" />
                      ) : (
                        <ShieldCheck className="text-ur-gold mt-0.5" size={19} aria-hidden="true" />
                      )}
                      <div>
                        <p className="font-bold">
                          {readiness.ready ? "Homologar fechamento esportivo" : "Override administrativo"}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-zinc-500">
                          {readiness.ready
                            ? "A sessão será marcada como completed e deixará a fila operacional."
                            : "Use apenas quando a decisão de encerrar com pendências for consciente e documentável."}
                        </p>
                      </div>
                    </div>

                    {!readiness.ready && isAdmin ? (
                      <label className="grid gap-2 text-xs font-bold text-zinc-500 uppercase">
                        Justificativa do override
                        <textarea
                          name="overrideReason"
                          required
                          minLength={10}
                          maxLength={500}
                          rows={3}
                          className="rounded-ur border bg-black/25 px-3 py-2 text-sm font-normal text-white normal-case"
                        />
                      </label>
                    ) : (
                      <input type="hidden" name="overrideReason" value="" />
                    )}

                    <label className="grid gap-2 text-xs font-bold text-zinc-500 uppercase">
                      Confirmação
                      <input
                        name="confirmation"
                        required
                        autoComplete="off"
                        placeholder="Digite ENCERRAR"
                        className="rounded-ur min-h-11 border bg-black/25 px-3 text-sm font-normal text-white normal-case"
                      />
                    </label>
                    <Button type="submit">
                      <FileCheck2 size={15} aria-hidden="true" />
                      {readiness.ready ? "Encerrar sessão" : "Encerrar com override"}
                    </Button>
                  </form>
                </Card>
              )}
            </>
          )}

          {session && !readiness && (
            <Card className="border-red-500/25 bg-red-500/5">
              <p className="font-bold text-red-200">A prontidão de fechamento não pôde ser calculada.</p>
              <p className="mt-2 text-sm text-zinc-500">Não encerre a sessão até a leitura ser restaurada.</p>
            </Card>
          )}
        </>
      )}

      <Card className="border-ur-gold/20">
        <div className="flex items-start gap-3">
          <UsersRound className="text-ur-gold mt-0.5" size={18} aria-hidden="true" />
          <div>
            <p className="font-bold">Completed não significa pós-evento concluído.</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Este gate encerra a operação esportiva. Ranking, Coins, financeiro, mídia e relatório pós-sessão continuam como obrigações posteriores e serão tratados separadamente.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
