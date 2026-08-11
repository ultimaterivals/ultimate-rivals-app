import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import {
  refreshDevelopmentAction,
  reopenDevelopmentCaseAction,
  resolveDevelopmentCaseAction,
  waiveDevelopmentCaseAction,
} from "@/app/admin/ur-play/desenvolvimento/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminDevelopmentSnapshot } from "@/server/services/admin-ur-play-development-service";

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

const reasonLabels: Record<string, string> = {
  missing_active_level: "Sem nível ativo na temporada",
  leveling_process_missing: "Nivelamento sem processo ativo",
  observations_incomplete: "Observações ainda incompletas",
  leveling_ready_for_review: "Nivelamento pronto para revisão",
  level_change_review_pending: "Mudança de nível aguardando decisão",
  development_plan_review_due: "Plano de desenvolvimento em revisão",
};

const actionLabels: Record<string, string> = {
  continue_observation: "Continuar coleta de observações",
  start_leveling_process: "Iniciar processo de nivelamento",
  queue_level_review: "Encaminhar para revisão de nível",
  development_followup_recorded: "Registrar acompanhamento do plano",
  no_change_required: "Revisado, sem mudança necessária",
  other: "Outra decisão auditada",
  evidence_cleared: "Pendência eliminada pela fonte de verdade",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em análise",
  resolved: "Resolvido",
  waived: "Dispensado",
};

const errorMessages: Record<string, string> = {
  invalid_request: "A solicitação não passou pela validação.",
  auth_required: "Sessão autenticada obrigatória.",
  operation_denied: "Seu perfil não pode operar esta sessão.",
  session_not_found: "Sessão UR Play não encontrada.",
  case_not_found: "Caso de desenvolvimento não encontrado.",
  already_closed:
    "O Pós-Sessão 360 já foi fechado. Reabra o 360 antes de alterar desenvolvimento.",
  admin_required: "Esta exceção exige perfil administrador.",
  waiver_reason: "A dispensa exige justificativa com pelo menos 10 caracteres.",
  reopen_reason: "A reabertura exige justificativa com pelo menos 10 caracteres.",
  notes_required: "Esta decisão exige uma observação auditável.",
  operation_failed: "A operação foi bloqueada; nenhuma alteração parcial deve ser considerada concluída.",
};

const successMessages: Record<string, string> = {
  refreshed: "Evidências de desenvolvimento reprocessadas.",
  case_resolved: "Caso revisado. A prontidão do Pós-Sessão 360 foi recalculada.",
  case_waived: "Caso dispensado por exceção administrativa.",
  case_reopened: "Caso reaberto para nova análise.",
};

function evidenceNumber(evidence: Record<string, unknown>, key: string) {
  const parsed = Number(evidence[key] ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function evidenceText(evidence: Record<string, unknown>, key: string) {
  const value = evidence[key];
  return typeof value === "string" ? value : null;
}

export default async function DevelopmentPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const identity = await requireRole(["admin", "operator"]);
  const [snapshot, params] = await Promise.all([
    getAdminDevelopmentSnapshot(),
    searchParams,
  ]);
  const requestedSession = single(params.session);
  const success = single(params.success);
  const error = single(params.error);
  const selected =
    snapshot.sessions.find((session) => session.id === requestedSession) ??
    snapshot.sessions[0];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Pós-jogo · evolução mensurável"
        title="Desenvolvimento & Nivelamento"
        description="A mesa identifica automaticamente quem precisa de nivelamento, mais observações, revisão de nível ou acompanhamento de plano. Uma sessão isolada nunca promove nem rebaixa atleta automaticamente."
        action={
          <Link
            href="/admin/ur-play/pos-sessao"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            <ArrowLeft size={16} aria-hidden="true" /> Pós-Sessão 360
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Casos", snapshot.metrics.total],
          ["Pendentes", snapshot.metrics.pending],
          ["Em análise", snapshot.metrics.inProgress],
          ["Resolvidos", snapshot.metrics.resolved],
          ["Dispensados", snapshot.metrics.waived],
          ["SLA vencido", snapshot.metrics.overdue],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
            <p className="font-display mt-2 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      {snapshot.sessions.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma sessão concluída disponível.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Os casos são derivados apenas de atletas com presença real em sessões UR Play concluídas.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {snapshot.sessions.map((session) => (
              <Link
                key={session.id}
                href={`/admin/ur-play/desenvolvimento?session=${session.id}`}
                className={`rounded-ur min-w-60 border px-4 py-3 text-sm ${
                  selected?.id === session.id
                    ? "border-ur-gold bg-ur-gold/10"
                    : ""
                }`}
              >
                <span className="block font-bold">{session.name}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {dateFormatter.format(new Date(session.endsAt))} · {session.counts.pending + session.counts.inProgress} pendências
                </span>
              </Link>
            ))}
          </div>

          {selected && (
            <>
              <Card className="border-ur-gold/25">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-black uppercase">
                      {selected.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Encerrada em {dateFormatter.format(new Date(selected.endsAt))} · {selected.counts.total} casos derivados das fontes oficiais de nivelamento e desenvolvimento
                    </p>
                  </div>
                  <form action={refreshDevelopmentAction}>
                    <input type="hidden" name="sessionId" value={selected.id} />
                    <Button type="submit" variant="secondary">
                      <RefreshCw size={16} aria-hidden="true" /> Reverificar evidências
                    </Button>
                  </form>
                </div>
              </Card>

              {selected.cases.length === 0 ? (
                <Card className="border-emerald-500/25 bg-emerald-500/5">
                  <p className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 size={17} aria-hidden="true" /> Nenhum caso de desenvolvimento exige ação nesta sessão.
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    A frente pode ser concluída por evidência sistêmica sem criar trabalho artificial para o operador.
                  </p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {selected.cases.map((item) => {
                    const open = ["pending", "in_progress"].includes(item.status);
                    const overdue =
                      open &&
                      new Date(item.dueAt).getTime() <
                        new Date(snapshot.generatedAt).getTime();
                    const completedObservations = evidenceNumber(
                      item.evidence,
                      "completed_observations",
                    );
                    const requiredObservations = evidenceNumber(
                      item.evidence,
                      "required_observations",
                    );
                    return (
                      <Card
                        key={item.id}
                        className={overdue ? "border-red-500/30" : undefined}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-display text-2xl font-black uppercase">
                                {item.athleteName}
                              </p>
                              <Badge>{item.athleteCode}</Badge>
                              <Badge>{item.currentLevel?.toUpperCase() ?? "SEM NÍVEL"}</Badge>
                              <Badge>{statusLabels[item.status] ?? item.status}</Badge>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.reasons.map((reason) => (
                                <Badge key={reason}>
                                  {reasonLabels[reason] ?? reason}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          {overdue ? (
                            <span className="flex items-center gap-2 text-sm font-bold text-red-300">
                              <AlertTriangle size={16} aria-hidden="true" /> SLA 24h vencido
                            </span>
                          ) : open ? (
                            <span className="flex items-center gap-2 text-sm text-zinc-500">
                              <Clock3 size={16} aria-hidden="true" /> Até {dateFormatter.format(new Date(item.dueAt))}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                              <CheckCircle2 size={16} aria-hidden="true" /> Revisão registrada
                            </span>
                          )}
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className="rounded-ur border p-3">
                            <p className="text-[10px] font-bold text-zinc-600 uppercase">Processo</p>
                            <p className="mt-1 text-sm font-bold">
                              {evidenceText(item.evidence, "process_status") ?? "Não iniciado"}
                            </p>
                          </div>
                          <div className="rounded-ur border p-3">
                            <p className="text-[10px] font-bold text-zinc-600 uppercase">Observações</p>
                            <p className="mt-1 text-sm font-bold">
                              {requiredObservations > 0
                                ? `${completedObservations}/${requiredObservations}`
                                : "—"}
                            </p>
                          </div>
                          <div className="rounded-ur border p-3">
                            <p className="text-[10px] font-bold text-zinc-600 uppercase">Revisões de nível</p>
                            <p className="mt-1 text-sm font-bold">
                              {evidenceNumber(item.evidence, "pending_level_reviews")}
                            </p>
                          </div>
                          <div className="rounded-ur border p-3">
                            <p className="text-[10px] font-bold text-zinc-600 uppercase">Planos a revisar</p>
                            <p className="mt-1 text-sm font-bold">
                              {evidenceNumber(item.evidence, "development_plans_due")}
                            </p>
                          </div>
                        </div>

                        {open ? (
                          <form action={resolveDevelopmentCaseAction} className="mt-4 grid gap-3 border-t pt-4 lg:grid-cols-[260px_1fr_auto] lg:items-end">
                            <input type="hidden" name="sessionId" value={selected.id} />
                            <input type="hidden" name="caseId" value={item.id} />
                            <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                              Próxima decisão
                              <select
                                name="action"
                                defaultValue={item.recommendedAction ?? "continue_observation"}
                                className="rounded-ur min-h-11 border bg-transparent px-3 text-sm normal-case text-white"
                              >
                                <option value="continue_observation">Continuar observações</option>
                                <option value="start_leveling_process">Iniciar nivelamento</option>
                                <option value="queue_level_review">Encaminhar revisão de nível</option>
                                <option value="development_followup_recorded">Acompanhamento de plano feito</option>
                                <option value="no_change_required">Sem mudança necessária</option>
                                <option value="other">Outra decisão</option>
                              </select>
                            </label>
                            <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                              Evidência / observação
                              <input
                                name="notes"
                                maxLength={1500}
                                placeholder="Registre o que foi revisado e o próximo passo"
                                className="rounded-ur min-h-11 border bg-transparent px-3 text-sm normal-case text-white"
                              />
                            </label>
                            <Button type="submit">Concluir revisão</Button>
                          </form>
                        ) : (
                          <div className="mt-4 rounded-ur border p-4">
                            <p className="text-xs font-bold text-zinc-500 uppercase">Decisão registrada</p>
                            <p className="mt-2 font-bold">
                              {actionLabels[item.resolutionAction ?? ""] ??
                                (item.status === "waived" ? "Dispensa administrativa" : "Resolvido")}
                            </p>
                            {(item.resolutionNotes || item.waiverReason) && (
                              <p className="mt-2 text-sm text-zinc-500">
                                {item.resolutionNotes ?? item.waiverReason}
                              </p>
                            )}
                          </div>
                        )}

                        {identity.role === "admin" && open && (
                          <form action={waiveDevelopmentCaseAction} className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
                            <input type="hidden" name="sessionId" value={selected.id} />
                            <input type="hidden" name="caseId" value={item.id} />
                            <label className="grid min-w-72 flex-1 gap-1 text-xs font-bold text-zinc-500 uppercase">
                              Exceção administrativa
                              <input
                                name="reason"
                                minLength={10}
                                maxLength={500}
                                required
                                placeholder="Motivo auditável para dispensar este caso"
                                className="rounded-ur min-h-11 border bg-transparent px-3 text-sm normal-case text-white"
                              />
                            </label>
                            <Button type="submit" variant="secondary">Dispensar caso</Button>
                          </form>
                        )}

                        {identity.role === "admin" && !open && (
                          <form action={reopenDevelopmentCaseAction} className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
                            <input type="hidden" name="sessionId" value={selected.id} />
                            <input type="hidden" name="caseId" value={item.id} />
                            <label className="grid min-w-72 flex-1 gap-1 text-xs font-bold text-zinc-500 uppercase">
                              Reabrir revisão
                              <input
                                name="reason"
                                minLength={10}
                                maxLength={500}
                                required
                                placeholder="Explique por que a decisão precisa ser revista"
                                className="rounded-ur min-h-11 border bg-transparent px-3 text-sm normal-case text-white"
                              />
                            </label>
                            <Button type="submit" variant="secondary">
                              <RotateCcw size={16} aria-hidden="true" /> Reabrir caso
                            </Button>
                          </form>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
