import Link from "next/link";
import {
  CheckCircle2,
  CircleAlert,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { activateActivationWaveBatchAction } from "@/app/admin/atletas/ondas/actions";
import { WaveInviteBundle } from "@/components/admin/wave-invite-bundle";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminAthleteWavesSnapshot } from "@/server/services/admin-athlete-waves-service";

type Params = Promise<{
  wave?: string | string[];
  success?: string | string[];
  error?: string | string[];
}>;

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const successMessages: Record<string, string> = {
  wave_activated:
    "Homologação em lote concluída. O grupo foi revalidado pelo mesmo gate individual de ativação.",
};

const errorMessages: Record<string, string> = {
  invalid: "Revise a confirmação e o motivo operacional.",
  target_not_filled:
    "A seleção precisa atingir exatamente o tamanho alvo antes da homologação em lote.",
  member_not_activatable:
    "Há integrante com status que não pode ser homologado por esta ação.",
  activation_blocked:
    "A transação foi revertida porque pelo menos um atleta ainda possui bloqueio de homologação.",
  wave_closed: "A onda está encerrada e não aceita execução em lote.",
  admin_required: "Somente administrador pode executar esta etapa.",
  operation_failed: "A operação não pôde ser concluída.",
};

export default async function AthleteWaveExecutionPage({
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
  const openWaves = snapshot.waves.filter(
    (wave) => !["completed", "cancelled"].includes(wave.status),
  );
  const wave =
    openWaves.find((item) => item.id === requestedWaveId) ?? openWaves[0] ?? null;
  const success = single(params.success);
  const error = single(params.error);

  const selectionComplete = Boolean(
    wave && wave.selectedCount === wave.targetSize && wave.targetSize > 0,
  );
  const draftMembers = wave?.members.filter((member) => member.status === "draft") ?? [];
  const activatableDrafts = draftMembers.filter((member) => member.readyToActivate);
  const blockedDrafts = draftMembers.filter((member) => !member.readyToActivate);
  const invalidStatusMembers =
    wave?.members.filter(
      (member) => !["draft", "active"].includes(member.status),
    ) ?? [];
  const activeMembers = wave?.members.filter((member) => member.status === "active") ?? [];
  const inviteEligible = activeMembers.filter((member) => !member.linked);
  const categoryReady =
    wave?.members.filter((member) => ["female", "male"].includes(member.gender)) ?? [];
  const availabilityReady =
    wave?.members.filter((member) => member.availabilityCount > 0) ?? [];
  const pilotReady = wave?.members.filter((member) => member.readyForPilot) ?? [];
  const canBatchActivate = Boolean(
    wave &&
      selectionComplete &&
      draftMembers.length > 0 &&
      blockedDrafts.length === 0 &&
      invalidStatusMembers.length === 0 &&
      activatableDrafts.length === draftMembers.length,
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Atletas · Ondas"
        title="Execução assistida"
        description="Aplique os próximos gates de uma onda já escolhida. Cada etapa exige confirmação humana, reutiliza as regras oficiais e mantém trilha de auditoria. Nenhuma mensagem é enviada automaticamente."
        action={
          <Link
            href={wave ? `/admin/atletas/ondas?wave=${wave.id}` : "/admin/atletas/ondas"}
            className="rounded-ur border px-3 py-2 text-xs font-bold text-zinc-300 uppercase"
          >
            Voltar à seleção
          </Link>
        }
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

      {openWaves.length === 0 ? (
        <Card>
          <div className="flex gap-3">
            <LockKeyhole className="text-ur-gold mt-0.5" size={20} aria-hidden="true" />
            <div>
              <p className="font-bold">Nenhuma onda aberta para executar.</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Crie a onda e escolha os atletas antes de chegar à execução. Esta tela
                nunca cria uma seleção por conta própria.
              </p>
              <Link
                href="/admin/atletas/ondas"
                className="text-ur-gold mt-4 inline-flex text-sm font-bold"
              >
                Abrir Ondas de ativação →
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-3">
            {openWaves.map((item) => (
              <Link key={item.id} href={`/admin/atletas/ondas/executar?wave=${item.id}`}>
                <Card
                  className={`h-full transition ${wave?.id === item.id ? "border-ur-gold/50" : "hover:border-ur-gold/30"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-black uppercase">
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {item.poleName ?? "Todos os polos"}
                      </p>
                    </div>
                    <Badge>{item.status}</Badge>
                  </div>
                  <p className="mt-4 text-sm text-zinc-500">
                    {item.selectedCount}/{item.targetSize} selecionados · {item.readyCount}{" "}
                    prontos para piloto
                  </p>
                </Card>
              </Link>
            ))}
          </div>

          {wave && (
            <>
              <Card className="border-ur-gold/20">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl font-black uppercase">
                      {wave.name}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {wave.poleName ?? "Todos os polos"} · {wave.selectedCount}/
                      {wave.targetSize} selecionados
                    </p>
                  </div>
                  <Badge>{selectionComplete ? "seleção fechada" : "seleção incompleta"}</Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[
                    ["Homologados", activeMembers.length, UserRoundCheck],
                    ["Sem conta", inviteEligible.length, LockKeyhole],
                    ["Categoria pronta", categoryReady.length, ShieldCheck],
                    ["Com horários", availabilityReady.length, CheckCircle2],
                    ["Prontos p/ piloto", pilotReady.length, CheckCircle2],
                  ].map(([label, value, Icon]) => {
                    const MetricIcon = Icon as typeof CheckCircle2;
                    return (
                      <div key={String(label)} className="rounded-ur border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold text-zinc-600 uppercase">
                            {label}
                          </p>
                          <MetricIcon className="text-ur-gold" size={14} aria-hidden="true" />
                        </div>
                        <p className="font-display mt-2 text-2xl font-black">{value}</p>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <div className="grid gap-5 xl:grid-cols-2">
                <Card>
                  <div className="flex items-start gap-3">
                    <UserRoundCheck
                      className="text-ur-gold mt-0.5 shrink-0"
                      size={19}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-display text-lg font-black uppercase">
                        1. Homologar grupo selecionado
                      </p>
                      <p className="mt-1 text-sm leading-6 text-zinc-500">
                        Executa o mesmo gate de homologação individual para todos os
                        integrantes. É transacional: se um único atleta estiver bloqueado,
                        ninguém do lote é ativado.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2 text-sm">
                    <div className="flex justify-between gap-3 border-b pb-2">
                      <span className="text-zinc-500">Drafts elegíveis</span>
                      <strong>{activatableDrafts.length}</strong>
                    </div>
                    <div className="flex justify-between gap-3 border-b pb-2">
                      <span className="text-zinc-500">Drafts bloqueados</span>
                      <strong className={blockedDrafts.length ? "text-red-300" : ""}>
                        {blockedDrafts.length}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">Já ativos</span>
                      <strong>{activeMembers.length}</strong>
                    </div>
                  </div>

                  {!selectionComplete && (
                    <p className="rounded-ur mt-4 border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">
                      Complete {wave.targetSize} integrantes antes de executar uma ação em
                      lote.
                    </p>
                  )}

                  {blockedDrafts.length > 0 && (
                    <div className="rounded-ur mt-4 border border-red-500/30 bg-red-500/5 p-3">
                      <p className="flex items-center gap-2 text-sm font-bold text-red-200">
                        <CircleAlert size={15} aria-hidden="true" />
                        Resolva os bloqueios antes da homologação em lote.
                      </p>
                      <div className="mt-2 grid gap-1 text-xs text-zinc-500">
                        {blockedDrafts.map((member) => (
                          <p key={member.athleteId}>
                            {member.publicName}: {member.activationBlockers.join(", ") || "revisão necessária"}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {draftMembers.length === 0 && selectionComplete && (
                    <p className="rounded-ur mt-4 border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-200">
                      Todos os integrantes já passaram pela homologação institucional.
                    </p>
                  )}

                  {canBatchActivate && (
                    <form action={activateActivationWaveBatchAction} className="mt-5 grid gap-3">
                      <input type="hidden" name="waveId" value={wave.id} />
                      <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                        Motivo operacional
                        <input
                          name="reason"
                          required
                          minLength={5}
                          maxLength={500}
                          placeholder="Ex.: homologar a onda piloto após revisão dos cadastros"
                          className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                        Confirmação
                        <input
                          name="confirmation"
                          required
                          autoComplete="off"
                          placeholder="Digite HOMOLOGAR"
                          className="rounded-ur border bg-black/30 px-3 py-3 text-sm text-white"
                        />
                      </label>
                      <Button type="submit">
                        Homologar {draftMembers.length} atleta(s) em uma transação
                      </Button>
                    </form>
                  )}
                </Card>

                <Card>
                  <WaveInviteBundle
                    waveId={wave.id}
                    eligibleCount={inviteEligible.length}
                    selectionComplete={selectionComplete}
                  />
                </Card>
              </div>

              <Card>
                <p className="font-display text-lg font-black uppercase">
                  3. Concluir prontidão esportiva
                </p>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-500">
                  Depois do claim, cada atleta confirma a própria categoria e seus horários
                  reais no portal. A UR não preenche esses dados por inferência. O grupo só
                  aparece como pronto para piloto quando todos os gates individuais estão
                  concluídos.
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-ur border p-4">
                    <p className="text-xs font-bold text-zinc-600 uppercase">Contas vinculadas</p>
                    <p className="font-display mt-2 text-3xl font-black">
                      {wave.members.filter((member) => member.linked).length}/{wave.targetSize}
                    </p>
                  </div>
                  <div className="rounded-ur border p-4">
                    <p className="text-xs font-bold text-zinc-600 uppercase">Categoria + horário</p>
                    <p className="font-display mt-2 text-3xl font-black">
                      {
                        wave.members.filter(
                          (member) =>
                            ["female", "male"].includes(member.gender) &&
                            member.availabilityCount > 0,
                        ).length
                      }
                      /{wave.targetSize}
                    </p>
                  </div>
                  <div className="rounded-ur border border-emerald-500/20 p-4">
                    <p className="text-xs font-bold text-zinc-600 uppercase">Prontos para piloto</p>
                    <p className="font-display mt-2 text-3xl font-black text-emerald-300">
                      {pilotReady.length}/{wave.targetSize}
                    </p>
                  </div>
                </div>
              </Card>
            </>
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
