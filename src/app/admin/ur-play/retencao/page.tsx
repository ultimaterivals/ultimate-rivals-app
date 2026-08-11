import { AlertTriangle, ArrowLeft, CheckCircle2, Clock3, Repeat2 } from "lucide-react";
import Link from "next/link";
import {
  confirmRetentionContactAction,
  waiveRetentionFollowupAction,
} from "@/app/admin/ur-play/retencao/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminRetentionSnapshot } from "@/server/services/admin-ur-play-retention-service";

type Params = Promise<{
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

const statusLabel = {
  pending: "Contato pendente",
  contacted: "Contato realizado",
  converted: "2ª participação",
  waived: "Dispensado",
} as const;

const errorMessages: Record<string, string> = {
  invalid_request: "A solicitação não passou pela validação.",
  auth_required: "Sessão autenticada obrigatória.",
  operation_denied: "Seu perfil não pode operar esta sessão.",
  not_found: "Follow-up de retenção não encontrado.",
  invalid_channel: "Canal de contato inválido.",
  already_closed: "O Pós-Sessão 360 já foi fechado; reabra a sessão antes de alterar a retenção.",
  admin_required: "Somente administrador pode dispensar um follow-up.",
  waiver_reason: "A dispensa exige justificativa com pelo menos 10 caracteres.",
  operation_failed: "A operação foi bloqueada; nenhuma confirmação parcial foi considerada.",
};

export default async function RetentionPage({ searchParams }: { searchParams: Params }) {
  const identity = await requireRole(["admin", "operator"]);
  const [snapshot, params] = await Promise.all([
    getAdminRetentionSnapshot(),
    searchParams,
  ]);
  const success = single(params.success);
  const error = single(params.error);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="CRM pós-jogo · 1º → 2º UR Play"
        title="Mesa de Retenção"
        description="O sistema identifica automaticamente a primeira participação, sugere a próxima oportunidade e mede a conversão para o segundo jogo. Nenhum contato é tratado como enviado sem confirmação operacional."
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
            {success === "contacted"
              ? "Contato registrado. A frente de retenção foi reavaliada automaticamente."
              : "Follow-up dispensado por exceção administrativa."}
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
          ["1ª participação", snapshot.metrics.total],
          ["Pendentes", snapshot.metrics.pending],
          ["Contatados", snapshot.metrics.contacted],
          ["Convertidos", snapshot.metrics.converted],
          ["Atrasados", snapshot.metrics.overdue],
          ["Conversão", `${snapshot.metrics.conversionRate.toFixed(1)}%`],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
            <p className="font-display mt-2 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      {snapshot.followups.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhum follow-up de primeira participação aberto.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Quando uma sessão UR Play for concluída, atletas presentes pela primeira vez entram aqui automaticamente. O cadastro ou o interesse sozinho não contam como participação.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {snapshot.followups.map((followup) => {
            const overdue =
              followup.status === "pending" &&
              new Date(followup.dueAt).getTime() < new Date(snapshot.generatedAt).getTime();
            return (
              <Card key={followup.id} className={overdue ? "border-red-500/30" : undefined}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-2xl font-black uppercase">
                        {followup.athleteName}
                      </p>
                      <Badge>{followup.athleteCode}</Badge>
                      <Badge>{statusLabel[followup.status]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      1ª participação em {followup.sourceSessionName} · {dateFormatter.format(new Date(followup.sourceSessionEndsAt))}
                    </p>
                  </div>
                  {followup.status === "converted" ? (
                    <span className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                      <CheckCircle2 size={16} aria-hidden="true" /> Conversão comprovada pelo sistema
                    </span>
                  ) : overdue ? (
                    <span className="flex items-center gap-2 text-sm font-bold text-red-300">
                      <AlertTriangle size={16} aria-hidden="true" /> SLA de contato vencido
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-zinc-500">
                      <Clock3 size={16} aria-hidden="true" /> Até {dateFormatter.format(new Date(followup.dueAt))}
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-ur border p-4">
                    <p className="text-xs font-bold text-zinc-500 uppercase">Próxima oportunidade sugerida</p>
                    {followup.suggestedOpportunityTitle ? (
                      <>
                        <p className="mt-2 font-bold">{followup.suggestedOpportunityTitle}</p>
                        {followup.suggestedOpportunityStartsAt && (
                          <p className="mt-1 text-sm text-zinc-500">
                            {dateFormatter.format(new Date(followup.suggestedOpportunityStartsAt))}
                          </p>
                        )}
                        <p className="mt-2 text-xs leading-5 text-zinc-600">
                          Sugestão não é reserva. O atleta continua decidindo se quer demonstrar interesse ou reservar a vaga.
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-zinc-500">
                        Nenhuma próxima oportunidade compatível está estruturada no momento.
                      </p>
                    )}
                  </div>

                  <div className="rounded-ur border p-4">
                    {followup.status === "pending" ? (
                      <form action={confirmRetentionContactAction} className="grid gap-3">
                        <input type="hidden" name="followupId" value={followup.id} />
                        <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                          Canal realmente utilizado
                          <select name="channel" defaultValue="whatsapp" className="rounded-ur min-h-11 border bg-transparent px-3 text-sm normal-case text-white">
                            <option value="whatsapp">WhatsApp</option>
                            <option value="instagram">Instagram</option>
                            <option value="phone">Telefone</option>
                            <option value="app">App</option>
                            <option value="email">E-mail</option>
                            <option value="other">Outro</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                          Observação opcional
                          <input name="notes" maxLength={1000} placeholder="Ex.: agradecimento + convite para próxima sessão" className="rounded-ur min-h-11 border bg-transparent px-3 text-sm normal-case text-white" />
                        </label>
                        <Button type="submit">
                          <Repeat2 size={16} aria-hidden="true" /> Registrar contato realizado
                        </Button>
                      </form>
                    ) : followup.status === "contacted" ? (
                      <div>
                        <p className="font-bold text-emerald-300">Contato confirmado</p>
                        <p className="mt-2 text-sm text-zinc-500">
                          {followup.contactedAt ? dateFormatter.format(new Date(followup.contactedAt)) : "Registrado"}
                          {followup.contactChannel ? ` · ${followup.contactChannel}` : ""}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-zinc-600">
                          Agora o sistema aguarda uma segunda participação real. Interesse ou reserva não contam como conversão.
                        </p>
                      </div>
                    ) : followup.status === "waived" ? (
                      <div>
                        <p className="font-bold">Follow-up dispensado</p>
                        <p className="mt-2 text-sm text-zinc-500">{followup.waiverReason}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-emerald-300">Segunda participação detectada</p>
                        <p className="mt-2 text-sm text-zinc-500">
                          {followup.convertedAt ? dateFormatter.format(new Date(followup.convertedAt)) : "Conversão registrada"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {followup.status === "pending" && identity.role === "admin" && (
                  <form action={waiveRetentionFollowupAction} className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
                    <input type="hidden" name="followupId" value={followup.id} />
                    <label className="grid min-w-72 flex-1 gap-1 text-xs font-bold text-zinc-500 uppercase">
                      Exceção administrativa
                      <input name="reason" minLength={10} maxLength={500} required placeholder="Motivo auditável para não realizar o follow-up" className="rounded-ur min-h-11 border bg-transparent px-3 text-sm normal-case text-white" />
                    </label>
                    <Button type="submit" variant="secondary">Dispensar follow-up</Button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
