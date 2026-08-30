import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  ListTodo,
  ShieldAlert,
  UsersRound,
} from "lucide-react";
import { CommandSection } from "@/components/admin/command-section";
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  Select,
} from "@/components/ui";
import type {
  ExecutiveSignal,
  ExecutiveWorkItem,
  ExecutiveWorkStatus,
} from "@/features/admin-executive/types";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminExecutiveSnapshot } from "@/server/services/admin-executive-service";
import {
  assignExecutiveFunctionAction,
  createExecutiveWorkItemAction,
  updateExecutiveWorkItemAction,
} from "./actions";

const statusLabels: Record<ExecutiveWorkStatus, string> = {
  backlog: "Backlog",
  planned: "Planejado",
  in_progress: "Em execução",
  blocked: "Bloqueado",
  review: "Em revisão",
  done: "Concluído",
  cancelled: "Cancelado",
};
const signalLabels: Record<ExecutiveSignal, string> = {
  green: "Verde",
  yellow: "Amarelo",
  red: "Vermelho",
};
const statusTransitions: Record<ExecutiveWorkStatus, ExecutiveWorkStatus[]> = {
  backlog: ["backlog", "planned", "cancelled"],
  planned: ["planned", "backlog", "in_progress", "cancelled"],
  in_progress: ["in_progress", "planned", "blocked", "review", "cancelled"],
  blocked: ["blocked", "planned", "in_progress", "cancelled"],
  review: ["review", "in_progress", "blocked", "done", "cancelled"],
  done: ["done"],
  cancelled: ["cancelled"],
};

function WorkItemCard({
  item,
  workstreamName,
}: {
  item: ExecutiveWorkItem;
  workstreamName: string;
}) {
  return (
    <Card className={item.signal === "red" ? "border-red-400/40" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{item.priority.toUpperCase()}</Badge>
            <Badge>{statusLabels[item.status]}</Badge>
            <Badge>{signalLabels[item.signal]}</Badge>
          </div>
          <p className="mt-3 font-bold">{item.title}</p>
          <p className="mt-1 text-xs text-zinc-500">
            {workstreamName} · {item.assigneeName ?? "Sem responsável"}
            {item.dueAt ? ` · prazo ${item.dueAt}` : " · sem prazo"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-400">
        Aceite: {item.acceptanceCriteria}
      </p>
      {item.blockedReason && (
        <p className="mt-3 text-sm text-red-300">
          Bloqueio: {item.blockedReason}
        </p>
      )}
      <details className="mt-5 border-t pt-4">
        <summary className="cursor-pointer text-sm font-bold text-zinc-300">
          Atualizar execução
        </summary>
        <form
          action={updateExecutiveWorkItemAction}
          className="mt-4 grid gap-3"
        >
          <input type="hidden" name="workItemId" value={item.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              id={`status-${item.id}`}
              name="status"
              label="Status"
              defaultValue={item.status}
            >
              {statusTransitions[item.status].map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </Select>
            <Select
              id={`signal-${item.id}`}
              name="signal"
              label="Semáforo"
              defaultValue={item.signal}
            >
              {Object.entries(signalLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          <label
            className="grid gap-2 text-sm font-medium"
            htmlFor={`blocked-${item.id}`}
          >
            Motivo do bloqueio
            <textarea
              id={`blocked-${item.id}`}
              name="blockedReason"
              defaultValue={item.blockedReason ?? ""}
              rows={2}
              className="rounded-ur bg-ur-black focus:border-ur-gold border px-3 py-2 text-white"
            />
          </label>
          <label
            className="grid gap-2 text-sm font-medium"
            htmlFor={`result-${item.id}`}
          >
            Resultado entregue
            <textarea
              id={`result-${item.id}`}
              name="resultSummary"
              defaultValue={item.resultSummary ?? ""}
              rows={2}
              className="rounded-ur bg-ur-black focus:border-ur-gold border px-3 py-2 text-white"
            />
          </label>
          <Input
            id={`evidence-${item.id}`}
            name="evidenceUrl"
            label="Evidência HTTPS"
            type="url"
            defaultValue={item.evidenceUrl ?? ""}
            placeholder="https://"
          />
          <Button type="submit" size="sm" className="justify-self-start">
            Salvar atualização
          </Button>
        </form>
      </details>
    </Card>
  );
}

export default async function ExecutiveManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireAdminModule("management");
  const [snapshot, query] = await Promise.all([
    getAdminExecutiveSnapshot(),
    searchParams,
  ]);
  const workstreamNames = new Map(
    snapshot.workstreams.map((item) => [item.id, item.name]),
  );
  const sourceBadge =
    snapshot.status === "ready"
      ? "Dados reais"
      : snapshot.status === "partial"
        ? "Leitura parcial"
        : "Estrutura aguardando migration";
  const assignableProfiles = snapshot.profiles.filter(
    (profile) => profile.role !== "athlete",
  );
  const criticalityLabels = {
    critical: "Crítica",
    essential: "Essencial",
    support: "Apoio",
  } as const;
  const metrics = [
    ["Frentes", snapshot.metrics.workstreams, ListTodo],
    ["Funções", snapshot.metrics.functions, UsersRound],
    ["Cobertas", snapshot.metrics.coveredFunctions, CheckCircle2],
    ["Críticas descobertas", snapshot.metrics.criticalUncovered, ShieldAlert],
    ["Focos ativos", snapshot.metrics.activeFocus, CircleDot],
    ["Bloqueados", snapshot.metrics.blocked, AlertTriangle],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Comando único"
        title="Gestão Executiva"
        description="Funções, responsáveis, prioridades, bloqueios e entregas do Ultimate Rivals em uma única trilha operacional."
        action={<Badge>{sourceBadge}</Badge>}
      />

      {(query.success || query.error) && (
        <Card
          className={query.error ? "border-red-400/40" : "border-ur-gold/40"}
        >
          <p className="text-sm font-bold">
            {query.error
              ? "A alteração não foi salva. Revise os campos e tente novamente."
              : "Alteração registrada e incorporada ao Command."}
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {label}
              </p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <CommandSection
        title="Três focos da semana"
        description="O Command limita o foco visível aos três itens realmente em execução."
      >
        {snapshot.focusItems.length > 0 ? (
          <div className="grid gap-4 xl:grid-cols-3">
            {snapshot.focusItems.map((item) => (
              <WorkItemCard
                key={item.id}
                item={item}
                workstreamName={
                  workstreamNames.get(item.workstreamId) ??
                  "Frente não disponível"
                }
              />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-zinc-400">
              Nenhum foco está em execução. Selecione conscientemente até três
              itens abaixo.
            </p>
          </Card>
        )}
      </CommandSection>

      <CommandSection
        title="Mapa de responsabilidade"
        description="Cada função tem missão, autoridade, indicadores e no máximo um ocupante vigente."
      >
        {snapshot.workstreams.map((workstream) => {
          const functions = snapshot.functions.filter(
            (item) => item.workstreamId === workstream.id,
          );
          return (
            <details
              key={workstream.id}
              className="rounded-ur border bg-white/[0.02] p-5"
            >
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-black uppercase">
                      {workstream.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {workstream.purpose}
                    </p>
                  </div>
                  <Badge>
                    {workstream.coveredFunctionCount}/{workstream.functionCount}{" "}
                    cobertas
                  </Badge>
                </div>
              </summary>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {functions.map((fn) => (
                  <Card
                    key={fn.id}
                    className={
                      !fn.assignment && fn.criticality === "critical"
                        ? "border-red-400/40"
                        : undefined
                    }
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold">{fn.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {criticalityLabels[fn.criticality]}
                        </p>
                      </div>
                      <Badge>
                        {fn.assignment?.displayName ?? "Descoberta"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      {fn.mission}
                    </p>
                    <p className="mt-3 text-xs text-zinc-500">
                      Autoridade: {fn.decisionAuthority}
                    </p>
                    <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase">
                          Resultados esperados
                        </p>
                        <ul className="mt-2 grid gap-2 text-sm text-zinc-400">
                          {fn.expectedOutcomes.length > 0 ? (
                            fn.expectedOutcomes.map((outcome) => (
                              <li key={outcome}>• {outcome}</li>
                            ))
                          ) : (
                            <li>Não definido.</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-500 uppercase">
                          Indicadores de desempenho
                        </p>
                        <ul className="mt-2 grid gap-2 text-sm text-zinc-400">
                          {fn.performanceIndicators.length > 0 ? (
                            fn.performanceIndicators.map((indicator) => (
                              <li key={indicator}>• {indicator}</li>
                            ))
                          ) : (
                            <li>Não definido.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                    {fn.weeklyRitual && (
                      <div className="rounded-ur mt-4 border bg-white/[0.02] p-3">
                        <p className="text-xs font-bold text-zinc-500 uppercase">
                          Ritual semanal
                        </p>
                        <p className="mt-2 text-sm text-zinc-400">
                          {fn.weeklyRitual}
                        </p>
                      </div>
                    )}
                    {assignableProfiles.length > 0 && (
                      <details className="mt-4 border-t pt-4">
                        <summary className="cursor-pointer text-sm font-bold">
                          Designar responsável
                        </summary>
                        <form
                          action={assignExecutiveFunctionAction}
                          className="mt-4 grid gap-3"
                        >
                          <input
                            type="hidden"
                            name="functionId"
                            value={fn.id}
                          />
                          <Select
                            id={`profile-${fn.id}`}
                            name="profileId"
                            label="Pessoa"
                            required
                          >
                            <option value="">Selecione</option>
                            {assignableProfiles.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.displayName} · {profile.role}
                              </option>
                            ))}
                          </Select>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <Select
                              id={`assignment-status-${fn.id}`}
                              name="status"
                              label="Situação"
                              defaultValue="active"
                            >
                              <option value="planned">Planejado</option>
                              <option value="active">Ativo</option>
                              <option value="paused">Pausado</option>
                            </Select>
                            <Input
                              id={`allocation-${fn.id}`}
                              name="allocationPercent"
                              label="Alocação %"
                              type="number"
                              min={1}
                              max={100}
                              defaultValue={100}
                            />
                            <Input
                              id={`review-${fn.id}`}
                              name="reviewDueAt"
                              label="Revisão"
                              type="date"
                            />
                          </div>
                          <Input
                            id={`mandate-${fn.id}`}
                            name="mandate"
                            label="Mandato específico"
                            placeholder="Escopo e resultado esperado"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="justify-self-start"
                          >
                            Registrar designação
                          </Button>
                        </form>
                      </details>
                    )}
                  </Card>
                ))}
              </div>
            </details>
          );
        })}
      </CommandSection>

      {snapshot.workstreams.length > 0 && (
        <CommandSection
          title="Nova entrega"
          description="Toda entrega nasce com frente, prioridade e critério verificável de aceite."
        >
          <Card>
            <form action={createExecutiveWorkItemAction} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Select
                  id="workstreamId"
                  name="workstreamId"
                  label="Frente"
                  required
                >
                  <option value="">Selecione</option>
                  {snapshot.workstreams.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
                <Select
                  id="functionId"
                  name="functionId"
                  label="Função relacionada"
                >
                  <option value="">Nenhuma</option>
                  {snapshot.functions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </Select>
                <Select
                  id="assigneeProfileId"
                  name="assigneeProfileId"
                  label="Responsável"
                >
                  <option value="">Sem responsável</option>
                  {snapshot.profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName}
                    </option>
                  ))}
                </Select>
                <Select
                  id="priority"
                  name="priority"
                  label="Prioridade"
                  defaultValue="p2"
                >
                  <option value="p0">P0 · crise</option>
                  <option value="p1">P1 · crítico</option>
                  <option value="p2">P2 · importante</option>
                  <option value="p3">P3 · melhoria</option>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
                <Input
                  id="title"
                  name="title"
                  label="Entrega"
                  required
                  placeholder="Resultado concreto a produzir"
                />
                <Input id="dueAt" name="dueAt" label="Prazo" type="date" />
              </div>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="description"
              >
                Contexto
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  className="rounded-ur bg-ur-black focus:border-ur-gold border px-3 py-2 text-white"
                />
              </label>
              <label
                className="grid gap-2 text-sm font-medium"
                htmlFor="acceptanceCriteria"
              >
                Critério de aceite
                <textarea
                  id="acceptanceCriteria"
                  name="acceptanceCriteria"
                  required
                  rows={3}
                  className="rounded-ur bg-ur-black focus:border-ur-gold border px-3 py-2 text-white"
                  placeholder="Como saberemos, sem opinião, que a entrega foi concluída?"
                />
              </label>
              <Button type="submit" className="justify-self-start">
                Criar entrega
              </Button>
            </form>
          </Card>
        </CommandSection>
      )}

      <CommandSection
        title="Fila crítica"
        description="P0 e P1 não concluídos, ordenados por prioridade e prazo."
      >
        {snapshot.criticalItems.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {snapshot.criticalItems.map((item) => (
              <WorkItemCard
                key={item.id}
                item={item}
                workstreamName={
                  workstreamNames.get(item.workstreamId) ??
                  "Frente não disponível"
                }
              />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-zinc-400">
              Nenhuma entrega P0 ou P1 aberta.
            </p>
          </Card>
        )}
      </CommandSection>

      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Saúde das fontes</p>
          <ul className="mt-3 grid gap-2 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
