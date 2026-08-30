import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  RotateCcw,
  Target,
} from "lucide-react";
import Link from "next/link";
import {
  addSessionReportActionAction,
  finalizeSessionReportAction,
  reopenSessionReportAction,
  resolveSessionReportActionAction,
  saveSessionReportDraftAction,
} from "@/app/admin/ur-play/relatorio/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminReportSnapshot } from "@/server/services/admin-ur-play-report-service";

type Params = Promise<{
  session?: string | string[];
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function evidenceNumber(
  task: { evidence: Record<string, unknown> } | undefined,
  key: string,
) {
  const value = Number(task?.evidence[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const successMessages: Record<string, string> = {
  draft_saved: "Retrospectiva salva.",
  action_added: "Próxima ação registrada.",
  finalized: "Relatório finalizado e snapshot preservado.",
  reopened: "Relatório reaberto para correção.",
  action_resolved: "Ação de melhoria atualizada.",
};

const errorMessages: Record<string, string> = {
  auth_required: "Sessão autenticada obrigatória.",
  operation_denied: "Seu perfil não pode operar esta sessão.",
  already_closed: "O Pós-Sessão 360 está fechado. Reabra antes de editar o relatório.",
  already_finalized: "O relatório está finalizado. Reabra antes de editar.",
  dependencies_pending: "Ainda existem frentes anteriores pendentes. O relatório só pode congelar dados já consolidados.",
  reflection_incomplete: "Preencha os quatro blocos de aprendizado com conteúdo suficiente.",
  action_required: "Registre ao menos uma próxima ação antes de finalizar.",
  action_title: "A próxima ação precisa ter um título válido.",
  action_owner: "O responsável pela ação não está ativo.",
  action_due: "Defina o prazo da próxima ação.",
  admin_required: "A reabertura é exclusiva do administrador.",
  reopen_reason: "A reabertura exige justificativa com pelo menos 10 caracteres.",
  waiver_reason: "A dispensa da ação exige justificativa com pelo menos 10 caracteres.",
  operation_failed: "A operação foi bloqueada sem alteração parcial.",
};

const taskLabels: Record<string, string> = {
  ranking_data: "Dados & Ranking",
  ur_coins: "UR Coins",
  finance: "Financeiro",
  incidents: "Ocorrências",
  development: "Desenvolvimento",
  media: "Mídia",
  retention: "Retenção",
  feedback: "Feedback",
};

export default async function SessionReportPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const identity = await requireRole(["admin", "operator"]);
  const [snapshot, params] = await Promise.all([
    getAdminReportSnapshot(),
    searchParams,
  ]);
  const requestedSession = single(params.session);
  const success = single(params.success);
  const error = single(params.error);
  const selected =
    snapshot.reports.find((report) => report.sessionId === requestedSession) ??
    snapshot.reports[0];
  const generatedDate = new Date(snapshot.generatedAt);
  const today = generatedDate.toISOString().slice(0, 10);
  generatedDate.setUTCDate(generatedDate.getUTCDate() + 1);
  const tomorrow = generatedDate.toISOString().slice(0, 10);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Pós-evento · análise"
        title="Relatório & Aprendizados"
        description="A última frente do Pós-Sessão 360 transforma dados consolidados em decisão. O sistema preserva os indicadores; você registra aprendizado e a próxima mudança operacional."
        action={
          <Link
            href="/admin/ur-play/pos-sessao"
            className="rounded-ur flex min-h-11 items-center gap-2 border px-4 text-sm font-bold"
          >
            Pós-Sessão 360
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Relatórios", snapshot.metrics.reports],
          ["Em análise", snapshot.metrics.drafts],
          ["Finalizados", snapshot.metrics.finalized],
          ["Ações abertas", snapshot.metrics.openActions],
          ["Ações atrasadas", snapshot.metrics.overdueActions],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
            <p className="font-display mt-2 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>

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

      {snapshot.reports.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma sessão pronta para retrospectiva.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            O rascunho é criado automaticamente quando uma sessão termina esportivamente.
          </p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {snapshot.reports.map((report) => (
              <Link
                key={report.id}
                href={`/admin/ur-play/relatorio?session=${report.sessionId}`}
                className={`rounded-ur min-w-64 border px-4 py-3 text-sm ${selected?.sessionId === report.sessionId ? "border-ur-gold bg-ur-gold/10" : ""}`}
              >
                <span className="block font-bold">{report.sessionName}</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  {report.status === "finalized"
                    ? `Relatório v${report.reportVersion} finalizado`
                    : `${report.upstreamPending} frentes anteriores pendentes`}
                </span>
              </Link>
            ))}
          </div>

          {selected && (
            <>
              <Card className={selected.status === "finalized" ? "border-emerald-500/30" : "border-ur-gold/25"}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-3xl font-black uppercase">
                      {selected.sessionName}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Sessão encerrada em {dateTime.format(new Date(selected.endsAt))}
                      {selected.snapshotAt
                        ? ` · snapshot ${dateTime.format(new Date(selected.snapshotAt))}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{selected.status === "finalized" ? `Final v${selected.reportVersion}` : "Em análise"}</Badge>
                    <Badge>{selected.upstreamPending === 0 ? "Dados consolidados" : `${selected.upstreamPending} dependências`}</Badge>
                    {selected.closed360 && <Badge>360 fechado</Badge>}
                  </div>
                </div>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <Card>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">Confirmados</p>
                  <p className="font-display mt-2 text-2xl font-black">{selected.confirmedAthletes}</p>
                </Card>
                <Card>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">Presenças</p>
                  <p className="font-display mt-2 text-2xl font-black">{selected.presentAthletes}</p>
                </Card>
                <Card>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">Taxa de presença</p>
                  <p className="font-display mt-2 text-2xl font-black">{selected.attendanceRatePct}%</p>
                </Card>
                <Card>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">Resultado financeiro</p>
                  <p className="font-display mt-2 text-2xl font-black">
                    {money(evidenceNumber(selected.taskEvidence.finance, "recorded_net_amount"))}
                  </p>
                </Card>
                <Card>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">Nota média UR</p>
                  <p className="font-display mt-2 text-2xl font-black">
                    {selected.taskEvidence.feedback?.evidence.average_recommendation_score == null
                      ? "—"
                      : String(selected.taskEvidence.feedback.evidence.average_recommendation_score)}
                  </p>
                </Card>
                <Card>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase">Ocorrências</p>
                  <p className="font-display mt-2 text-2xl font-black">
                    {evidenceNumber(selected.taskEvidence.incidents, "total_incidents")}
                  </p>
                </Card>
              </div>

              <Card>
                <p className="font-display text-xl font-black uppercase">Estado das oito frentes anteriores</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(selected.taskEvidence).map(([key, task]) => (
                    <div key={key} className="rounded-ur border p-3">
                      <p className="text-xs font-bold text-zinc-500 uppercase">
                        {taskLabels[key] ?? key}
                      </p>
                      <p className="mt-1 font-black">{task.status}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {selected.status === "draft" && !selected.closed360 ? (
                <form action={saveSessionReportDraftAction} className="grid gap-4 xl:grid-cols-2">
                  <input type="hidden" name="sessionId" value={selected.sessionId} />
                  {[
                    ["whatWorked", "O que funcionou", selected.whatWorked, "Decisões, rotinas e elementos que devem ser preservados."],
                    ["risksAndFailures", "O que falhou ou gerou risco", selected.risksAndFailures, "Falhas, atrasos, gargalos e riscos observados. Se não houve falha relevante, registre explicitamente."],
                    ["keyLearning", "Aprendizado central", selected.keyLearning, "A principal conclusão que esta sessão trouxe para a operação."],
                    ["decisionSummary", "Decisão para a próxima sessão", selected.decisionSummary, "O que muda a partir deste aprendizado — regra, processo, comunicação ou operação."],
                  ].map(([name, label, value, placeholder]) => (
                    <Card key={String(name)}>
                      <label className="text-sm font-bold" htmlFor={String(name)}>{label}</label>
                      <textarea
                        id={String(name)}
                        name={String(name)}
                        defaultValue={String(value ?? "")}
                        maxLength={4000}
                        rows={6}
                        placeholder={String(placeholder)}
                        className="rounded-ur mt-3 w-full border bg-black/20 p-3 text-sm"
                      />
                    </Card>
                  ))}
                  <div className="xl:col-span-2">
                    <Button type="submit" variant="secondary">
                      <ClipboardCheck size={16} aria-hidden="true" /> Salvar retrospectiva
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2">
                  {[
                    ["O que funcionou", selected.whatWorked],
                    ["Falhas / riscos", selected.risksAndFailures],
                    ["Aprendizado", selected.keyLearning],
                    ["Decisão", selected.decisionSummary],
                  ].map(([label, value]) => (
                    <Card key={String(label)}>
                      <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
                      <p className="mt-2 text-sm leading-6 text-zinc-300">{value || "—"}</p>
                    </Card>
                  ))}
                </div>
              )}

              <Card>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-xl font-black uppercase">Próximas ações</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Aprendizado sem responsável e prazo não vira melhoria operacional.
                    </p>
                  </div>
                  <Badge>{selected.actions.filter((action) => action.status === "open").length} abertas</Badge>
                </div>

                <div className="mt-4 grid gap-3">
                  {selected.actions.length === 0 ? (
                    <p className="rounded-ur border border-dashed p-4 text-sm text-zinc-500">
                      Nenhuma ação registrada. Pelo menos uma é exigida para finalizar o relatório.
                    </p>
                  ) : (
                    selected.actions.map((action) => (
                      <div key={action.id} className="rounded-ur border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-bold">{action.title}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {action.category} · {action.priority} · prazo {dateTime.format(new Date(action.dueAt))}
                            </p>
                            {action.description && (
                              <p className="mt-2 text-sm text-zinc-400">{action.description}</p>
                            )}
                          </div>
                          <Badge>{action.status}</Badge>
                        </div>
                        {action.status === "open" && (
                          <form action={resolveSessionReportActionAction} className="mt-3 flex flex-wrap gap-2">
                            <input type="hidden" name="actionId" value={action.id} />
                            <input
                              name="reason"
                              maxLength={500}
                              placeholder="Motivo se for dispensar"
                              className="rounded-ur min-h-10 min-w-56 flex-1 border bg-black/20 px-3 text-sm"
                            />
                            <Button type="submit" name="status" value="completed" variant="secondary">
                              <CheckCircle2 size={15} aria-hidden="true" /> Concluir ação
                            </Button>
                            {identity.role === "admin" && (
                              <Button type="submit" name="status" value="waived" variant="secondary">
                                Dispensar
                              </Button>
                            )}
                          </form>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selected.status === "draft" && !selected.closed360 && (
                  <form action={addSessionReportActionAction} className="mt-5 grid gap-3 xl:grid-cols-6">
                    <input type="hidden" name="sessionId" value={selected.sessionId} />
                    <input
                      name="title"
                      required
                      minLength={5}
                      maxLength={180}
                      placeholder="Próxima ação objetiva"
                      className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm xl:col-span-2"
                    />
                    <select name="category" defaultValue="operation" className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm">
                      <option value="operation">Operação</option>
                      <option value="sports">Esportivo</option>
                      <option value="finance">Financeiro</option>
                      <option value="safety">Segurança</option>
                      <option value="development">Desenvolvimento</option>
                      <option value="media">Mídia</option>
                      <option value="retention">Retenção</option>
                      <option value="feedback">Feedback</option>
                      <option value="product">Produto</option>
                      <option value="commercial">Comercial</option>
                      <option value="other">Outro</option>
                    </select>
                    <select name="priority" defaultValue="medium" className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm">
                      <option value="low">Baixa</option>
                      <option value="medium">Média</option>
                      <option value="high">Alta</option>
                      <option value="critical">Crítica</option>
                    </select>
                    <input
                      name="dueDate"
                      type="date"
                      min={today}
                      defaultValue={tomorrow}
                      required
                      className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                    />
                    <Button type="submit">
                      <Target size={15} aria-hidden="true" /> Registrar ação
                    </Button>
                    <textarea
                      name="description"
                      maxLength={2000}
                      rows={2}
                      placeholder="Detalhe opcional da ação"
                      className="rounded-ur border bg-black/20 p-3 text-sm xl:col-span-6"
                    />
                  </form>
                )}
              </Card>

              {selected.status === "draft" && !selected.closed360 && (
                <Card className={selected.upstreamPending === 0 ? "border-ur-gold/40" : undefined}>
                  <div className="flex items-start gap-3">
                    {selected.upstreamPending === 0 ? (
                      <CheckCircle2 className="text-ur-gold mt-0.5" size={20} aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="mt-0.5 text-amber-300" size={20} aria-hidden="true" />
                    )}
                    <div className="flex-1">
                      <p className="font-display text-xl font-black uppercase">
                        {selected.upstreamPending === 0 ? "Dados prontos para congelar" : "Aguardando frentes anteriores"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        Finalizar preserva o snapshot das oito frentes e conclui a nona frente do Pós-Sessão 360.
                      </p>
                    </div>
                  </div>
                  <form action={finalizeSessionReportAction} className="mt-4">
                    <input type="hidden" name="sessionId" value={selected.sessionId} />
                    <Button type="submit" disabled={selected.upstreamPending > 0}>
                      Finalizar Relatório & Aprendizados
                    </Button>
                  </form>
                </Card>
              )}

              {selected.status === "finalized" && !selected.closed360 && identity.role === "admin" && (
                <Card>
                  <p className="font-bold">Correção administrativa</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Reabrir invalida a conclusão da frente até uma nova finalização e cria uma nova versão do relatório.
                  </p>
                  <form action={reopenSessionReportAction} className="mt-4 flex flex-wrap gap-2">
                    <input type="hidden" name="sessionId" value={selected.sessionId} />
                    <input
                      name="reason"
                      required
                      minLength={10}
                      maxLength={500}
                      placeholder="Motivo da reabertura"
                      className="rounded-ur min-h-11 min-w-72 flex-1 border bg-black/20 px-3 text-sm"
                    />
                    <Button type="submit" variant="secondary">
                      <RotateCcw size={15} aria-hidden="true" /> Reabrir relatório
                    </Button>
                  </form>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

