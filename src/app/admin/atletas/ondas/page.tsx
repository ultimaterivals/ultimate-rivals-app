import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Layers3,
  Link2,
  ListChecks,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import {
  createActivationWaveAction,
  removeActivationWaveMemberAction,
  selectActivationWaveMemberAction,
  updateActivationWaveStatusAction,
} from "@/app/admin/atletas/ondas/actions";
import type { AthleteWaveGate } from "@/features/admin-athlete-waves/types";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminAthleteWavesSnapshot } from "@/server/services/admin-athlete-waves-service";

type Params = Promise<{
  wave?: string | string[];
  q?: string | string[];
  success?: string | string[];
  error?: string | string[];
}>;

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const successMessages: Record<string, string> = {
  wave_created: "Onda criada. Agora selecione os atletas e registre o motivo da escolha.",
  member_selected: "Atleta incluído na onda sem alterar seu status institucional.",
  member_removed: "Atleta removido da onda. O histórico da decisão foi preservado.",
  status_updated: "Status operacional da onda atualizado.",
};
const errorMessages: Record<string, string> = {
  invalid: "Revise os campos informados.",
  target_reached: "A onda já atingiu o tamanho definido.",
  wrong_pole: "Este atleta pertence a outro polo e não pode entrar nesta onda regional.",
  athlete_ineligible: "Atleta arquivado ou suspenso não pode entrar na onda.",
  wave_closed: "Esta onda já está encerrada e não aceita novas alterações.",
  pole_required: "O polo selecionado precisa estar ativo.",
  reason_required: "Toda decisão de inclusão, remoção ou mudança de status exige motivo.",
  admin_required: "Somente administrador pode alterar ondas de ativação.",
  operation_failed: "Não foi possível concluir a operação.",
};

function gateClass(gate: AthleteWaveGate) {
  if (gate.state === "ready")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (gate.state === "blocked")
    return "border-red-500/30 bg-red-500/10 text-red-300";
  if (gate.state === "review")
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AthleteActivationWavesPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireRole(["admin"]);
  const [snapshot, params] = await Promise.all([
    getAdminAthleteWavesSnapshot(),
    searchParams,
  ]);
  const requestedWaveId = single(params.wave);
  const selectedWave =
    snapshot.waves.find((wave) => wave.id === requestedWaveId) ??
    snapshot.waves.find(
      (wave) => !["completed", "cancelled"].includes(wave.status),
    ) ??
    snapshot.waves[0] ??
    null;
  const query = (single(params.q) ?? "").trim().toLowerCase();
  const selectedAthleteIds = new Set(
    selectedWave?.members.map((member) => member.athleteId) ?? [],
  );
  const candidates = snapshot.candidates.filter((candidate) => {
    if (selectedAthleteIds.has(candidate.athleteId)) return false;
    if (
      selectedWave?.poleId &&
      candidate.poleId !== selectedWave.poleId
    )
      return false;
    if (["archived", "suspended"].includes(candidate.status)) return false;
    if (!query) return true;
    return `${candidate.publicName} ${candidate.athleteCode} ${candidate.poleName ?? ""}`
      .toLowerCase()
      .includes(query);
  });
  const success = single(params.success);
  const error = single(params.error);
  const waveOpen =
    selectedWave && !["completed", "cancelled"].includes(selectedWave.status);
  const capacityRemaining = selectedWave
    ? Math.max(selectedWave.targetSize - selectedWave.selectedCount, 0)
    : 0;

  const metrics = [
    ["Ondas abertas", snapshot.metrics.wavesOpen, Layers3],
    ["Selecionados", snapshot.metrics.selected, ListChecks],
    ["Ativos", snapshot.metrics.active, UserRoundCheck],
    ["Com conta", snapshot.metrics.linked, Link2],
    ["Categoria pronta", snapshot.metrics.categoryReady, ShieldCheck],
    ["Com horários", snapshot.metrics.availabilityReady, Clock3],
    ["Prontos p/ piloto", snapshot.metrics.pilotReady, CheckCircle2],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Atletas"
        title="Ondas de ativação"
        description="Selecione grupos controlados de atletas e acompanhe todos os gates até a operação real. Entrar em uma onda não ativa cadastro, não envia convite e não altera ranking."
      />

      {success && successMessages[success] && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="text-sm text-emerald-200">{successMessages[success]}</p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm text-red-200">
            {errorMessages[error] ?? errorMessages.operation_failed}
          </p>
        </Card>
      )}

      <Card className="border-sky-500/30 bg-sky-500/5">
        <div className="flex gap-3">
          <CircleAlert
            className="mt-0.5 shrink-0 text-sky-300"
            size={20}
            aria-hidden="true"
          />
          <div>
            <p className="font-bold text-sky-100">Seleção por decisão, não por dado inventado</p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              A base atual não possui histórico esportivo completo o bastante para o
              sistema recomendar automaticamente os oito melhores candidatos. Por isso,
              a seleção desta primeira onda é uma decisão administrativa explícita e o
              motivo fica auditado. Ranking legado não vira ranking oficial do novo
              sistema.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-zinc-500 uppercase">{label}</p>
              <Icon className="text-ur-gold" size={15} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <details open={snapshot.waves.length === 0}>
          <summary className="cursor-pointer font-display text-lg font-black uppercase">
            Criar nova onda
          </summary>
          <form action={createActivationWaveAction} className="mt-5 grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase md:col-span-2">
                Nome da onda
                <input
                  name="name"
                  required
                  minLength={3}
                  maxLength={100}
                  placeholder="Ex.: Piloto Betim — Agosto"
                  className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
                />
              </label>
              <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                Tamanho alvo
                <input
                  name="targetSize"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={8}
                  required
                  className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
                />
              </label>
            </div>
            <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
              Polo opcional
              <select
                name="poleId"
                defaultValue=""
                className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
              >
                <option value="">Todos os polos</option>
                {snapshot.candidates
                  .filter((candidate) => candidate.poleId && candidate.poleName)
                  .filter(
                    (candidate, index, rows) =>
                      rows.findIndex((item) => item.poleId === candidate.poleId) === index,
                  )
                  .map((candidate) => (
                    <option key={candidate.poleId} value={candidate.poleId ?? ""}>
                      {candidate.poleName}
                    </option>
                  ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
              Nota operacional
              <textarea
                name="notes"
                maxLength={1000}
                placeholder="Objetivo, contexto ou critério desta onda."
                className="rounded-ur min-h-24 border bg-black/30 px-3 py-3 text-sm text-white"
              />
            </label>
            <Button type="submit">Criar onda de ativação</Button>
          </form>
        </details>
      </Card>

      {snapshot.waves.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-3">
          {snapshot.waves.map((wave) => (
            <Link key={wave.id} href={`/admin/atletas/ondas?wave=${wave.id}`}>
              <Card
                className={`h-full transition ${selectedWave?.id === wave.id ? "border-ur-gold/50" : "hover:border-ur-gold/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-black uppercase">{wave.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {wave.poleName ?? "Todos os polos"}
                    </p>
                  </div>
                  <Badge>{wave.status}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Selecionados</p>
                    <p className="font-display mt-1 text-2xl font-black">
                      {wave.selectedCount}/{wave.targetSize}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Prontos</p>
                    <p className="font-display mt-1 text-2xl font-black text-emerald-300">
                      {wave.readyCount}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {selectedWave && (
        <>
          <Card className="border-ur-gold/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-display text-2xl font-black uppercase">{selectedWave.name}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {selectedWave.poleName ?? "Todos os polos"} · {selectedWave.selectedCount}/{selectedWave.targetSize} selecionados · {selectedWave.readyCount} prontos para piloto
                </p>
                {selectedWave.notes && (
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                    {selectedWave.notes}
                  </p>
                )}
              </div>
              <Badge>{selectedWave.status}</Badge>
            </div>

            {waveOpen && (
              <details className="mt-5 border-t pt-4">
                <summary className="cursor-pointer text-xs font-bold text-zinc-500 uppercase">
                  Alterar ciclo da onda
                </summary>
                <form action={updateActivationWaveStatusAction} className="mt-4 grid gap-3 md:grid-cols-[220px_1fr_auto]">
                  <input type="hidden" name="waveId" value={selectedWave.id} />
                  <select
                    name="status"
                    defaultValue={selectedWave.status}
                    className="rounded-ur border bg-black/30 px-3 py-2 text-sm text-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="preparing">Preparando</option>
                    <option value="running">Em execução</option>
                    <option value="completed">Concluída</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                  <input
                    name="reason"
                    required
                    minLength={5}
                    maxLength={500}
                    placeholder="Motivo da mudança"
                    className="rounded-ur border bg-black/30 px-3 py-2 text-sm text-white"
                  />
                  <Button type="submit" variant="secondary">Atualizar</Button>
                </form>
              </details>
            )}
          </Card>

          <section className="grid gap-4">
            <div>
              <p className="font-display text-xl font-black uppercase">Atletas da onda</p>
              <p className="mt-1 text-sm text-zinc-500">
                Cada gate aponta a próxima ação real. A onda não executa essas ações sozinha.
              </p>
            </div>
            {selectedWave.members.length === 0 ? (
              <Card>
                <p className="text-sm text-zinc-500">Nenhum atleta selecionado ainda.</p>
              </Card>
            ) : (
              selectedWave.members.map((member) => (
                <Card key={member.athleteId}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-white">{member.publicName}</p>
                        <Badge>{member.athleteCode}</Badge>
                        {member.readyForPilot && <Badge>pronto para piloto</Badge>}
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {member.poleName ?? "Sem polo"} · prioridade {member.priority} · selecionado {formatDate(member.selectedAt)}
                      </p>
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        <span className="font-bold text-zinc-300">Motivo:</span> {member.selectionReason}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member.status !== "active" && (
                        <Link
                          href={`/admin/atletas/homologacao?q=${encodeURIComponent(member.athleteCode)}&status=all`}
                          className="rounded-ur border px-3 py-2 text-xs font-bold text-zinc-300 uppercase"
                        >
                          Homologação
                        </Link>
                      )}
                      {member.status === "active" && !member.linked && (
                        <Link
                          href={`/admin/atletas/acessos?q=${encodeURIComponent(member.athleteCode)}`}
                          className="rounded-ur border-ur-gold/30 text-ur-gold rounded-ur border px-3 py-2 text-xs font-bold uppercase"
                        >
                          Primeiro acesso
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {member.gates.map((gate) => (
                      <div key={gate.key} className={`rounded-ur border p-3 ${gateClass(gate)}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black uppercase">{gate.label}</p>
                          <span className="text-[10px] font-black uppercase">{gate.state}</span>
                        </div>
                        <p className="mt-2 text-xs leading-5 opacity-90">{gate.detail}</p>
                      </div>
                    ))}
                  </div>

                  {waveOpen && (
                    <details className="mt-4 border-t pt-3">
                      <summary className="cursor-pointer text-xs font-bold text-zinc-600 uppercase">
                        Remover da onda
                      </summary>
                      <form action={removeActivationWaveMemberAction} className="mt-3 flex flex-wrap gap-2">
                        <input type="hidden" name="waveId" value={selectedWave.id} />
                        <input type="hidden" name="athleteId" value={member.athleteId} />
                        <input
                          name="reason"
                          required
                          minLength={5}
                          maxLength={500}
                          placeholder="Motivo da remoção"
                          className="rounded-ur min-w-64 flex-1 border bg-black/30 px-3 py-2 text-sm text-white"
                        />
                        <Button type="submit" variant="secondary">Remover</Button>
                      </form>
                    </details>
                  )}
                </Card>
              ))
            )}
          </section>

          {waveOpen && capacityRemaining > 0 && (
            <section className="grid gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-black uppercase">Adicionar atletas</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {capacityRemaining} vaga(s) restante(s). O sistema não recomenda automaticamente candidatos porque a evidência histórica atual é insuficiente.
                  </p>
                </div>
                <form role="search" className="flex gap-2">
                  <input type="hidden" name="wave" value={selectedWave.id} />
                  <input
                    name="q"
                    defaultValue={single(params.q) ?? ""}
                    placeholder="Nome, código ou polo"
                    className="rounded-ur min-h-10 border bg-black/30 px-3 text-sm text-white"
                  />
                  <Button type="submit" variant="secondary">Buscar</Button>
                </form>
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                {candidates.map((candidate) => (
                  <Card key={candidate.athleteId}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">{candidate.publicName}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {candidate.athleteCode} · {candidate.poleName ?? "sem polo"} · {candidate.status}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                          <span className={candidate.readyToActivate || candidate.status === "active" ? "text-emerald-300" : "text-amber-300"}>
                            {candidate.status === "active" ? "ativo" : candidate.readyToActivate ? "pronto p/ homologar" : "homologação pendente"}
                          </span>
                          <span className={["female", "male"].includes(candidate.gender) ? "text-emerald-300" : "text-sky-300"}>
                            categoria {candidate.gender}
                          </span>
                          <span className={candidate.availabilityCount > 0 ? "text-emerald-300" : "text-zinc-600"}>
                            {candidate.availabilityCount} horário(s)
                          </span>
                        </div>
                      </div>
                      {candidate.importSourceRow && (
                        <span className="text-[10px] text-zinc-600 uppercase">
                          origem linha {candidate.importSourceRow}
                        </span>
                      )}
                    </div>
                    <form action={selectActivationWaveMemberAction} className="mt-4 grid gap-2 md:grid-cols-[1fr_90px_auto]">
                      <input type="hidden" name="waveId" value={selectedWave.id} />
                      <input type="hidden" name="athleteId" value={candidate.athleteId} />
                      <input
                        name="reason"
                        required
                        minLength={5}
                        maxLength={500}
                        placeholder="Por que este atleta entra nesta onda?"
                        className="rounded-ur border bg-black/30 px-3 py-2 text-sm text-white"
                      />
                      <input
                        name="priority"
                        type="number"
                        min={-100}
                        max={100}
                        defaultValue={0}
                        title="Prioridade"
                        className="rounded-ur border bg-black/30 px-3 py-2 text-sm text-white"
                      />
                      <Button type="submit" size="sm">Selecionar</Button>
                    </form>
                  </Card>
                ))}
              </div>
              {candidates.length === 0 && (
                <Card>
                  <p className="text-center text-sm text-zinc-500">Nenhum candidato disponível para este filtro.</p>
                </Card>
              )}
            </section>
          )}
        </>
      )}

      {snapshot.sourceErrors.length > 0 && (
        <Card className="border-red-500/30">
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((sourceError) => (
              <li key={sourceError}>{sourceError}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
