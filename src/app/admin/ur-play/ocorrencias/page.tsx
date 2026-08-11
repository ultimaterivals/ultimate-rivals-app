import { AlertTriangle, ArrowLeft, CheckCircle2, RotateCcw, ShieldAlert } from "lucide-react";
import Link from "next/link";
import {
  confirmIncidentReviewAction,
  createIncidentAction,
  reopenIncidentReviewAction,
  setIncidentStatusAction,
} from "@/app/admin/ur-play/ocorrencias/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminIncidentDeskSnapshot } from "@/server/services/admin-ur-play-incidents-service";

type Params = Promise<{
  session?: string | string[];
  success?: string | string[];
  error?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

const typeLabels: Record<string, string> = {
  injury: "Lesão",
  medical: "Médica",
  conflict: "Conflito",
  behavior: "Comportamento",
  court_safety: "Segurança da quadra",
  equipment: "Equipamento",
  operational: "Operacional",
  other: "Outra",
};

const statusLabels: Record<string, string> = {
  open: "Aberta",
  monitoring: "Em acompanhamento",
  resolved: "Resolvida",
  closed_no_action: "Encerrada sem ação",
};

const errorMessages: Record<string, string> = {
  auth_required: "Autenticação obrigatória.",
  operation_denied: "Seu perfil não pode operar esta sessão.",
  session_not_found: "Sessão não encontrada.",
  already_closed: "O Pós-Sessão 360 já foi fechado. Reabra o ciclo antes de alterar ocorrências.",
  incident_invalid: "Os dados da ocorrência não atendem ao contrato operacional.",
  admin_required: "Esta ação exige perfil administrador.",
  operation_failed: "A operação foi bloqueada pelo motor de ocorrências.",
};

export default async function IncidentsPage({ searchParams }: { searchParams: Params }) {
  await requireRole(["admin", "operator"]);
  const params = await searchParams;
  const requestedSession = single(params.session);
  const success = single(params.success);
  const error = single(params.error);
  const snapshot = await getAdminIncidentDeskSnapshot(requestedSession);
  const selected = snapshot.selectedSession;
  const readiness = snapshot.readiness;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Segurança e qualidade"
        title="Ocorrências UR Play"
        description="Registro auditável de lesões, conflitos, riscos de quadra, equipamentos e falhas operacionais. A sessão só fecha o 360 quando a revisão final e os follow-ups obrigatórios estiverem resolvidos."
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
        <Card className="border-ur-gold/40">
          <p className="text-ur-gold text-sm font-bold">Operação registrada e evidência de segurança recalculada.</p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/40">
          <p className="text-sm font-bold text-red-300">{errorMessages[error] ?? errorMessages.operation_failed}</p>
        </Card>
      )}
      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </Card>
      )}

      {snapshot.sessions.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma sessão em operação ou concluída.</p>
          <p className="mt-2 text-sm text-zinc-500">A mesa de ocorrências passa a ser usada a partir do primeiro UR Play real.</p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {snapshot.sessions.map((session) => (
              <Link
                key={session.id}
                href={`/admin/ur-play/ocorrencias?session=${session.id}`}
                className={`rounded-ur min-w-56 border px-4 py-3 text-sm ${selected?.id === session.id ? "border-ur-gold bg-ur-gold/10" : ""}`}
              >
                <span className="block font-bold">{session.name}</span>
                <span className="mt-1 block text-xs text-zinc-500">{dateTime.format(new Date(session.startsAt))} · {session.status}</span>
              </Link>
            ))}
          </div>

          {selected && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Card><p className="text-xs font-bold text-zinc-500 uppercase">Ocorrências</p><p className="font-display mt-2 text-3xl font-black">{readiness?.totalIncidents ?? 0}</p></Card>
                <Card><p className="text-xs font-bold text-zinc-500 uppercase">Abertas</p><p className="font-display mt-2 text-3xl font-black">{readiness?.openIncidents ?? 0}</p></Card>
                <Card><p className="text-xs font-bold text-zinc-500 uppercase">Críticas abertas</p><p className="font-display mt-2 text-3xl font-black text-red-300">{readiness?.criticalOpenIncidents ?? 0}</p></Card>
                <Card><p className="text-xs font-bold text-zinc-500 uppercase">Follow-up</p><p className="font-display mt-2 text-3xl font-black">{readiness?.followUpOpen ?? 0}</p></Card>
                <Card className={readiness?.ready ? "border-ur-gold/40" : "border-red-500/30"}>
                  <p className="text-xs font-bold text-zinc-500 uppercase">Gate 360</p>
                  <p className={`font-display mt-2 text-2xl font-black ${readiness?.ready ? "text-ur-gold" : "text-red-300"}`}>{readiness?.ready ? "PRONTO" : "BLOQUEADO"}</p>
                </Card>
              </div>

              <Card className="border-ur-gold/20">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="text-ur-gold mt-1" size={22} aria-hidden="true" />
                  <div>
                    <p className="font-bold">Regra de segurança</p>
                    <p className="mt-1 text-sm text-zinc-500">Registrar o fato não encerra a ocorrência. Casos em acompanhamento e follow-ups obrigatórios permanecem visíveis até a resolução; a revisão final é uma confirmação separada.</p>
                  </div>
                </div>
              </Card>

              <Card>
                <p className="font-display text-xl font-black uppercase">Registrar ocorrência</p>
                <form action={createIncidentAction} className="mt-4 grid gap-4 lg:grid-cols-4">
                  <input type="hidden" name="sessionId" value={selected.id} />
                  <input type="hidden" name="athleteId" value="" />
                  <label className="grid gap-1 text-sm font-bold">Tipo
                    <select name="type" defaultValue="injury" className="rounded-ur min-h-11 border bg-transparent px-3">
                      {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-bold">Severidade
                    <select name="severity" defaultValue="low" className="rounded-ur min-h-11 border bg-transparent px-3">
                      <option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="critical">Crítica</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-bold lg:col-span-2">Data e hora
                    <input name="occurredAt" type="datetime-local" required className="rounded-ur min-h-11 border bg-transparent px-3" />
                  </label>
                  <label className="grid gap-1 text-sm font-bold lg:col-span-4">Descrição
                    <textarea name="description" minLength={5} maxLength={2000} required className="rounded-ur min-h-24 border bg-transparent p-3" placeholder="O que aconteceu, de forma objetiva." />
                  </label>
                  <label className="grid gap-1 text-sm font-bold lg:col-span-2">Ação imediata
                    <textarea name="immediateAction" maxLength={1000} className="rounded-ur min-h-20 border bg-transparent p-3" placeholder="Primeiros socorros, pausa, isolamento da área, mediação..." />
                  </label>
                  <label className="grid gap-1 text-sm font-bold lg:col-span-2">Follow-up necessário
                    <span className="rounded-ur flex min-h-11 items-center gap-3 border px-3"><input name="followUpRequired" type="checkbox" /> Exige acompanhamento após a sessão</span>
                  </label>
                  <label className="grid gap-1 text-sm font-bold lg:col-span-4">Plano de acompanhamento
                    <textarea name="followUpNotes" maxLength={1000} className="rounded-ur min-h-20 border bg-transparent p-3" />
                  </label>
                  <div className="lg:col-span-4"><Button type="submit"><AlertTriangle size={16} aria-hidden="true" /> Registrar ocorrência</Button></div>
                </form>
              </Card>

              <div className="grid gap-3">
                {snapshot.incidents.length === 0 ? (
                  <Card><p className="font-bold">Nenhuma ocorrência registrada nesta sessão.</p><p className="mt-1 text-sm text-zinc-500">Isso só vira evidência oficial depois da revisão final abaixo.</p></Card>
                ) : snapshot.incidents.map((incident) => (
                  <Card key={incident.id} className={incident.severity === "critical" && !["resolved", "closed_no_action"].includes(incident.status) ? "border-red-500/40" : ""}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap gap-2"><Badge>{typeLabels[incident.type] ?? incident.type}</Badge><Badge>{incident.severity}</Badge><Badge>{statusLabels[incident.status] ?? incident.status}</Badge></div>
                        <p className="mt-3 font-bold">{incident.description}</p>
                        <p className="mt-1 text-xs text-zinc-500">{dateTime.format(new Date(incident.occurredAt))}{incident.athleteName ? ` · ${incident.athleteName} (${incident.athleteCode})` : ""}</p>
                        {incident.immediateAction && <p className="mt-3 text-sm text-zinc-400"><strong>Ação imediata:</strong> {incident.immediateAction}</p>}
                        {incident.followUpRequired && <p className="mt-2 text-sm text-zinc-400"><strong>Follow-up:</strong> {incident.followUpNotes || "Obrigatório, sem nota registrada."}</p>}
                      </div>
                    </div>
                    {!(["resolved", "closed_no_action"] as string[]).includes(incident.status) && (
                      <form action={setIncidentStatusAction} className="mt-4 grid gap-3 lg:grid-cols-4">
                        <input type="hidden" name="sessionId" value={selected.id} /><input type="hidden" name="incidentId" value={incident.id} />
                        <select name="status" defaultValue={incident.status === "open" ? "monitoring" : "resolved"} className="rounded-ur min-h-11 border bg-transparent px-3"><option value="monitoring">Em acompanhamento</option><option value="resolved">Resolver</option><option value="closed_no_action">Encerrar sem ação</option></select>
                        <input name="resolutionNotes" placeholder="Resolução / decisão" className="rounded-ur min-h-11 border bg-transparent px-3 lg:col-span-2" />
                        <input name="followUpNotes" placeholder="Atualização do follow-up" className="rounded-ur min-h-11 border bg-transparent px-3" />
                        <div className="lg:col-span-4"><Button type="submit" variant="secondary">Atualizar ocorrência</Button></div>
                      </form>
                    )}
                  </Card>
                ))}
              </div>

              <Card className={readiness?.reviewConfirmed ? "border-ur-gold/40" : ""}>
                <div className="flex items-start gap-3">
                  {readiness?.reviewConfirmed ? <CheckCircle2 className="text-ur-gold" aria-hidden="true" /> : <AlertTriangle className="text-zinc-500" aria-hidden="true" />}
                  <div className="flex-1">
                    <p className="font-bold">Revisão final de ocorrências</p>
                    <p className="mt-1 text-sm text-zinc-500">Confirme apenas depois de revisar toda a sessão. Se não houve ocorrência, esta ação registra explicitamente “nenhuma ocorrência”, em vez de tratar ausência de registro como evidência.</p>
                    {snapshot.review && <p className="mt-2 text-xs text-zinc-500">Última revisão: {dateTime.format(new Date(snapshot.review.reviewedAt))} · {snapshot.review.status}</p>}
                  </div>
                </div>
                {!readiness?.reviewConfirmed ? (
                  <form action={confirmIncidentReviewAction} className="mt-4 flex flex-wrap gap-3">
                    <input type="hidden" name="sessionId" value={selected.id} />
                    <input name="notes" maxLength={1000} placeholder="Observação da revisão (opcional)" className="rounded-ur min-h-11 min-w-72 flex-1 border bg-transparent px-3" />
                    <Button type="submit">Confirmar revisão final</Button>
                  </form>
                ) : (
                  <form action={reopenIncidentReviewAction} className="mt-4 flex flex-wrap gap-3">
                    <input type="hidden" name="sessionId" value={selected.id} />
                    <input name="reason" minLength={10} maxLength={500} required placeholder="Motivo para reabrir a revisão" className="rounded-ur min-h-11 min-w-72 flex-1 border bg-transparent px-3" />
                    <Button type="submit" variant="secondary"><RotateCcw size={15} aria-hidden="true" /> Reabrir revisão (admin)</Button>
                  </form>
                )}
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
