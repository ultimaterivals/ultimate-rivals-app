import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  finalizePostSessionAction,
  refreshPostSessionAction,
  reopenPostSessionAction,
  updatePostSessionTaskAction,
} from "@/app/admin/ur-play/pos-sessao/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import type { PostSessionTaskStatus } from "@/features/admin-ur-play-post-session/types";
import { requireRole } from "@/lib/auth/session";
import {
  getAdminPostSessionSnapshot,
  POST_SESSION_TASKS,
} from "@/server/services/admin-ur-play-post-session-service";

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

const statusLabels: Record<PostSessionTaskStatus, string> = {
  pending: "Pendente",
  in_progress: "Em andamento",
  completed: "Concluído",
  waived: "Dispensado",
};

const errorMessages: Record<string, string> = {
  invalid_request: "A solicitação não passou pela validação.",
  auth_required: "Sessão autenticada obrigatória.",
  operation_denied: "Seu perfil não pode operar esta sessão.",
  session_not_found: "Sessão UR Play não encontrada.",
  system_task: "Esta frente é controlada automaticamente pelo sistema.",
  already_closed: "O Pós-Sessão 360 já está fechado. Reabra antes de alterar tarefas.",
  not_ready: "Ainda existem frentes obrigatórias pendentes.",
  waiver_reason: "Dispensa exige uma justificativa com pelo menos 10 caracteres.",
  reopen_reason: "Reabertura exige uma justificativa com pelo menos 10 caracteres.",
  admin_required: "Esta exceção é exclusiva do administrador.",
  not_closed: "O Pós-Sessão 360 ainda não está fechado.",
  operation_failed: "A operação foi bloqueada. Nenhuma alteração parcial deve ser considerada concluída.",
};

const successMessages: Record<string, string> = {
  task_pending: "Tarefa reaberta.",
  task_in_progress: "Tarefa marcada como em andamento.",
  task_completed: "Tarefa concluída e auditada.",
  task_waived: "Tarefa dispensada por exceção administrativa.",
  refreshed: "Evidências automáticas reprocessadas.",
  post_session_closed: "Pós-Sessão 360 encerrado oficialmente.",
  post_session_reopened: "Pós-Sessão 360 reaberto para correção.",
};

function evidenceNumber(evidence: Record<string, unknown>, key: string) {
  const value = Number(evidence[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function evidenceText(evidence: Record<string, unknown>, key: string) {
  const value = evidence[key];
  return typeof value === "string" ? value : null;
}

export default async function PostSessionPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const identity = await requireRole(["admin", "operator"]);
  const [snapshot, params] = await Promise.all([
    getAdminPostSessionSnapshot(),
    searchParams,
  ]);
  const requestedSession = single(params.session);
  const success = single(params.success);
  const error = single(params.error);
  const selected =
    snapshot.sessions.find((session) => session.id === requestedSession) ??
    snapshot.sessions[0];
  const taskDefinitions = new Map(
    POST_SESSION_TASKS.map((definition) => [definition.key, definition]),
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Pós-evento · 24–48h"
        title="Pós-Sessão 360"
        description="O placar terminou, mas a operação ainda não. Esta mesa fecha dados, moedas, financeiro, ocorrências, desenvolvimento, mídia, retenção, feedback e aprendizados sem presumir que uma área foi concluída por outra."
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
        <Card className="border-emerald-500/35 bg-emerald-500/5">
          <p className="text-sm font-bold text-emerald-300">
            {successMessages[success] ?? "Operação concluída."}
          </p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/35 bg-red-500/5">
          <p className="text-sm font-bold text-red-300">
            {errorMessages[error] ?? errorMessages.operation_failed}
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Sessões", snapshot.metrics.total],
          ["Em fechamento", snapshot.metrics.pending],
          ["Prontas", snapshot.metrics.ready],
          ["Fechadas 360", snapshot.metrics.closed],
          ["Com atraso", snapshot.metrics.overdue],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
            <p className="font-display mt-2 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      {snapshot.sessions.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma sessão esportiva concluída.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Assim que uma sessão passar pelo gate de Fechamento, as nove frentes de pós-evento serão abertas automaticamente com SLA de 24 ou 48 horas.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {snapshot.sessions.map((session) => (
              <Link
                key={session.id}
                href={`/admin/ur-play/pos-sessao?session=${session.id}`}
                className={`rounded-ur min-w-60 border px-4 py-3 text-sm ${selected?.id === session.id ? "border-ur-gold bg-ur-gold/10" : ""}`}
              >
                <span className="block font-bold">{session.name}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {dateFormatter.format(new Date(session.endsAt))} · {session.readiness.closed ? "360 fechado" : `${session.readiness.pendingTasks} pendências`}
                </span>
              </Link>
            ))}
          </div>

          {selected && (
            <>
              <Card className="border-ur-gold/25">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-3xl font-black uppercase">
                      {selected.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {selected.poleName} · {selected.venueName} · encerramento previsto {dateFormatter.format(new Date(selected.endsAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selected.readiness.closed ? "360 fechado" : selected.readiness.ready ? "Pronto para fechar" : "Pós-evento aberto"}</Badge>
                    {selected.readiness.overdueTasks > 0 && (
                      <Badge>{selected.readiness.overdueTasks} atrasadas</Badge>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">Frentes resolvidas</p>
                    <p className="font-display mt-1 text-2xl font-black">
                      {selected.readiness.completedTasks + selected.readiness.waivedTasks}/{selected.readiness.totalTasks}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">Atletas confirmados</p>
                    <p className="font-display mt-1 text-2xl font-black">{selected.confirmedAthletes}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">Presenças</p>
                    <p className="font-display mt-1 text-2xl font-black">{selected.presentAthletes}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">Pagamentos resolvidos</p>
                    <p className="font-display mt-1 text-2xl font-black">{selected.paymentConfirmed}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">Pagamentos pendentes</p>
                    <p className="font-display mt-1 text-2xl font-black">{selected.paymentPending}</p>
                  </div>
                </div>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                {selected.tasks.map((task) => {
                  const definition = taskDefinitions.get(task.key);
                  const overdue =
                    !["completed", "waived"].includes(task.status) &&
                    new Date(task.dueAt).getTime() < new Date(snapshot.generatedAt).getTime();
                  const systemTask = task.managedBy === "system";
                  return (
                    <Card
                      key={task.id}
                      className={overdue ? "border-red-500/30" : undefined}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-display text-xl font-black uppercase">
                            {definition?.label ?? task.key}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-zinc-500">
                            {definition?.description}
                          </p>
                        </div>
                        <Badge>{statusLabels[task.status]}</Badge>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-2">
                          <Clock3 size={14} aria-hidden="true" /> {definition?.sla} · {dateFormatter.format(new Date(task.dueAt))}
                        </span>
                        {systemTask && (
                          <span className="flex items-center gap-2 text-emerald-400">
                            <ShieldCheck size={14} aria-hidden="true" /> Evidência automática
                          </span>
                        )}
                        {overdue && (
                          <span className="flex items-center gap-2 text-red-300">
                            <AlertTriangle size={14} aria-hidden="true" /> SLA vencido
                          </span>
                        )}
                      </div>

                      {task.key === "ranking_data" && (
                        <div className="mt-4 grid grid-cols-3 gap-2 rounded-ur border p-3 text-center">
                          <div>
                            <p className="text-[10px] font-bold text-zinc-600 uppercase">Jogos</p>
                            <p className="mt-1 font-black">{evidenceNumber(task.evidence, "completed_matches")}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-zinc-600 uppercase">Processados</p>
                            <p className="mt-1 font-black">{evidenceNumber(task.evidence, "ranked_matches")}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-zinc-600 uppercase">Transações</p>
                            <p className="mt-1 font-black">{evidenceNumber(task.evidence, "ranking_transactions")}</p>
                          </div>
                        </div>
                      )}

                      {task.key === "ur_coins" && (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-ur border p-3 text-center sm:grid-cols-4">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">Lançamentos</p>
                    <p className="mt-1 font-black">{evidenceNumber(task.evidence, "generated_transactions")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">Estornos</p>
                    <p className="mt-1 font-black">{evidenceNumber(task.evidence, "reversal_transactions")}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">Créditos</p>
                    <p className="mt-1 font-black">{evidenceNumber(task.evidence, "credited_amount")} URC</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-600 uppercase">Líquido</p>
                    <p className="mt-1 font-black">{evidenceNumber(task.evidence, "net_amount")} URC</p>
                  </div>
                </div>
                {evidenceText(task.evidence, "error") && (
                  <p className="mt-3 rounded-ur border border-red-500/30 bg-red-500/5 p-3 text-xs font-bold text-red-300">
                    {evidenceText(task.evidence, "error")}
                  </p>
                )}
              </>
            )}

                      {task.notes && (
                        <p className="mt-4 rounded-ur border bg-black/10 p-3 text-sm text-zinc-400">
                          {task.notes}
                        </p>
                      )}
                      {task.status === "waived" && task.waiverReason && (
                        <p className="mt-3 text-xs text-amber-300">
                          Exceção: {task.waiverReason}
                        </p>
                      )}

                      {!selected.readiness.closed && systemTask && (
                        <form action={refreshPostSessionAction} className="mt-4">
                          <input type="hidden" name="sessionId" value={selected.id} />
                          <Button type="submit" variant="secondary">
                            <RefreshCw size={15} aria-hidden="true" /> Reverificar evidência
                          </Button>
                        </form>
                      )}

                      {!selected.readiness.closed && !systemTask && (
                        <form action={updatePostSessionTaskAction} className="mt-4 grid gap-3">
                          <input type="hidden" name="sessionId" value={selected.id} />
                          <input type="hidden" name="taskKey" value={task.key} />
                          <textarea
                            name="notes"
                            defaultValue={task.notes ?? ""}
                            maxLength={1000}
                            placeholder="Evidência, decisão, pendência ou referência operacional..."
                            className="rounded-ur min-h-24 w-full border bg-black/20 p-3 text-sm"
                          />
                          {identity.role === "admin" && (
                            <input
                              name="waiverReason"
                              maxLength={500}
                              placeholder="Justificativa da dispensa administrativa (mín. 10 caracteres)"
                              className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                            />
                          )}
                          <div className="flex flex-wrap gap-2">
                            {task.status !== "in_progress" && task.status !== "completed" && (
                              <Button type="submit" name="status" value="in_progress" variant="secondary">
                                Em andamento
                              </Button>
                            )}
                            {task.status !== "completed" && (
                              <Button type="submit" name="status" value="completed">
                                <CheckCircle2 size={15} aria-hidden="true" /> Concluir
                              </Button>
                            )}
                            {["completed", "waived"].includes(task.status) && (
                              <Button type="submit" name="status" value="pending" variant="secondary">
                                <RotateCcw size={15} aria-hidden="true" /> Reabrir tarefa
                              </Button>
                            )}
                            {identity.role === "admin" && task.status !== "waived" && (
                              <Button type="submit" name="status" value="waived" variant="secondary">
                                Dispensar com justificativa
                              </Button>
                            )}
                          </div>
                        </form>
                      )}
                    </Card>
                  );
                })}
              </div>

              {selected.readiness.closed ? (
                <Card className="border-emerald-500/35 bg-emerald-500/5">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 text-emerald-300" size={22} aria-hidden="true" />
                    <div>
                      <p className="font-display text-2xl font-black uppercase">Sessão encerrada em 360°</p>
                      <p className="mt-2 text-sm text-zinc-400">
                        Fechamento registrado em {selected.closure ? dateFormatter.format(new Date(selected.closure.closedAt)) : "—"}. O snapshot das nove frentes ficou preservado para auditoria.
                      </p>
                    </div>
                  </div>
                  {identity.role === "admin" && (
                    <form action={reopenPostSessionAction} className="mt-5 flex flex-wrap gap-2">
                      <input type="hidden" name="sessionId" value={selected.id} />
                      <input
                        name="reason"
                        required
                        minLength={10}
                        maxLength={500}
                        placeholder="Motivo da reabertura administrativa"
                        className="rounded-ur min-h-11 min-w-72 flex-1 border bg-black/20 px-3 text-sm"
                      />
                      <Button type="submit" variant="secondary">
                        <RotateCcw size={15} aria-hidden="true" /> Reabrir 360
                      </Button>
                    </form>
                  )}
                </Card>
              ) : (
                <Card className={selected.readiness.ready ? "border-ur-gold/40" : undefined}>
                  <p className="font-display text-2xl font-black uppercase">
                    {selected.readiness.ready ? "Gate final liberado" : "Gate final bloqueado"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {selected.readiness.ready
                      ? "As nove frentes obrigatórias estão resolvidas. O fechamento abaixo cria um snapshot auditável e congela as tarefas até eventual reabertura administrativa."
                      : `Ainda existem ${selected.readiness.pendingTasks} frentes obrigatórias abertas. Conclua ou trate as exceções antes do fechamento 360.`}
                  </p>
                  {selected.readiness.ready && (
                    <form action={finalizePostSessionAction} className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="sessionId" value={selected.id} />
                      <input
                        name="confirmation"
                        required
                        placeholder="Digite FECHAR 360"
                        className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                      />
                      <input
                        name="notes"
                        maxLength={1000}
                        placeholder="Nota final opcional"
                        className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                      />
                      <Button type="submit">Fechar Pós-Sessão 360</Button>
                    </form>
                  )}
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
