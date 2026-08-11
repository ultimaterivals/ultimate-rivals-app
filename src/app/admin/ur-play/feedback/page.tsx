import {
  AlertTriangle,
  CheckCircle2,
  MessageSquareText,
  Send,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  confirmFeedbackDispatchAction,
  recordFeedbackResponseAction,
  waiveFeedbackRequestAction,
} from "@/app/admin/ur-play/feedback/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminFeedbackSnapshot } from "@/server/services/admin-ur-play-feedback-service";

type Params = Promise<{
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

const successMessages: Record<string, string> = {
  dispatched: "Canal de feedback confirmado.",
  response_recorded: "Resposta registrada.",
  waived: "Solicitação dispensada por exceção administrativa.",
};

const errorMessages: Record<string, string> = {
  auth_required: "Sessão autenticada obrigatória.",
  operation_denied: "Seu perfil não pode operar esta sessão.",
  not_found: "Solicitação de feedback não encontrada.",
  invalid_channel: "Canal de feedback inválido.",
  dispatch_evidence: "Registre uma evidência real do disparo.",
  already_closed: "O Pós-Sessão 360 está fechado. O canal não pode mais ser alterado.",
  not_dispatched: "Registre o disparo antes de lançar uma resposta externa.",
  invalid_score: "A nota precisa estar entre 0 e 10.",
  admin_required: "A dispensa exige perfil administrador.",
  waiver_reason: "A dispensa exige justificativa com pelo menos 10 caracteres.",
  already_responded: "A solicitação já possui resposta.",
  operation_failed: "A operação foi bloqueada sem alteração parcial.",
};

export default async function FeedbackAdminPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const identity = await requireRole(["admin", "operator"]);
  const [snapshot, params] = await Promise.all([
    getAdminFeedbackSnapshot(),
    searchParams,
  ]);
  const success = single(params.success);
  const error = single(params.error);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Pós-evento · experiência"
        title="Feedback & NPS"
        description="Todo atleta presente precisa ter um canal real de feedback aberto. Responder é opcional e não bloqueia o fechamento; deixar alguém sem solicitação enviada, sim."
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {[
          ["Elegíveis", snapshot.metrics.eligible],
          ["Sem disparo", snapshot.metrics.pendingDispatch],
          ["Respostas", snapshot.metrics.responses],
          ["Taxa de resposta", `${snapshot.metrics.responseRatePct}%`],
          [
            "Nota média UR",
            snapshot.metrics.averageRecommendationScore ?? "—",
          ],
          ["NPS padrão", snapshot.metrics.standardNpsScore ?? "—"],
          ["Detratores", snapshot.metrics.detractors],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
            <p className="font-display mt-2 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <Card className="border-ur-gold/20">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-ur-gold mt-0.5" size={18} aria-hidden="true" />
          <div>
            <p className="font-bold">Duas leituras, sem misturar métricas</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              A Nota média UR preserva a pergunta 0–10 e a meta interna acima de 8. O NPS padrão é exibido separadamente pela classificação 9–10 promotores, 7–8 passivos e 0–6 detratores.
            </p>
          </div>
        </div>
      </Card>

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

      {snapshot.sessions.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhum ciclo de feedback aberto.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Quando uma sessão for concluída, atletas presentes com conta vinculada recebem a solicitação automaticamente no portal. Os demais entram na fila operacional.
          </p>
        </Card>
      ) : (
        snapshot.sessions.map((session) => (
          <section key={session.id} className="grid gap-4">
            <Card className={session.metrics.ready ? "border-emerald-500/30" : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-black uppercase">
                    {session.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Encerrada em {dateTime.format(new Date(session.endsAt))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>
                    {session.metrics.ready
                      ? "Feedback pronto para 360"
                      : `${session.metrics.pending} sem canal`}
                  </Badge>
                  <Badge>{session.metrics.responded} respostas</Badge>
                  {session.closed && <Badge>360 fechado</Badge>}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <div><p className="text-[10px] font-bold text-zinc-600 uppercase">Elegíveis</p><p className="mt-1 font-black">{session.metrics.eligible}</p></div>
                <div><p className="text-[10px] font-bold text-zinc-600 uppercase">Resposta</p><p className="mt-1 font-black">{session.metrics.responseRatePct}%</p></div>
                <div><p className="text-[10px] font-bold text-zinc-600 uppercase">Média UR</p><p className="mt-1 font-black">{session.metrics.averageRecommendationScore ?? "—"}</p></div>
                <div><p className="text-[10px] font-bold text-zinc-600 uppercase">NPS padrão</p><p className="mt-1 font-black">{session.metrics.standardNpsScore ?? "—"}</p></div>
                <div><p className="text-[10px] font-bold text-zinc-600 uppercase">Promotores</p><p className="mt-1 font-black">{session.metrics.promoters}</p></div>
                <div><p className="text-[10px] font-bold text-zinc-600 uppercase">Detratores</p><p className="mt-1 font-black">{session.metrics.detractors}</p></div>
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              {session.requests.map((request) => (
                <Card
                  key={request.id}
                  className={
                    request.score !== null && request.score <= 6
                      ? "border-red-500/30"
                      : undefined
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-xl font-black uppercase">
                        {request.athleteName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {request.athleteCode}
                      </p>
                    </div>
                    <Badge>{request.status}</Badge>
                  </div>

                  {request.channel && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
                      <Send size={14} aria-hidden="true" />
                      Canal: {request.channel} · {request.dispatchMode === "system" ? "automático" : "confirmado"}
                    </p>
                  )}

                  {request.score !== null && (
                    <div className="mt-4 rounded-ur border p-3">
                      <p className="flex items-center gap-2 font-bold">
                        {request.score <= 6 ? (
                          <AlertTriangle className="text-red-300" size={16} aria-hidden="true" />
                        ) : (
                          <CheckCircle2 className="text-emerald-400" size={16} aria-hidden="true" />
                        )}
                        Recomendação: {request.score}/10
                      </p>
                      {request.comment && (
                        <p className="mt-2 text-sm leading-6 text-zinc-500">
                          {request.comment}
                        </p>
                      )}
                    </div>
                  )}

                  {!session.closed && request.status === "pending" && (
                    <form action={confirmFeedbackDispatchAction} className="mt-4 grid gap-3">
                      <input type="hidden" name="requestId" value={request.id} />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          name="channel"
                          required
                          defaultValue=""
                          className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                        >
                          <option value="" disabled>Canal usado</option>
                          <option value="whatsapp">WhatsApp</option>
                          <option value="email">E-mail</option>
                          <option value="instagram">Instagram</option>
                          <option value="phone">Telefone</option>
                          <option value="other">Outro</option>
                        </select>
                        <input
                          name="evidence"
                          required
                          minLength={3}
                          maxLength={1000}
                          placeholder="Evidência: mensagem, protocolo ou referência"
                          className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                        />
                      </div>
                      <Button type="submit">
                        <Send size={15} aria-hidden="true" /> Confirmar disparo
                      </Button>
                    </form>
                  )}

                  {["sent", "responded"].includes(request.status) && (
                    <form action={recordFeedbackResponseAction} className="mt-4 grid gap-3">
                      <input type="hidden" name="requestId" value={request.id} />
                      <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                        <input
                          name="score"
                          type="number"
                          min={0}
                          max={10}
                          required
                          defaultValue={request.score ?? undefined}
                          placeholder="0–10"
                          className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                        />
                        <input
                          name="comment"
                          maxLength={2000}
                          defaultValue={request.comment ?? ""}
                          placeholder="Comentário recebido (opcional)"
                          className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                        />
                      </div>
                      <Button type="submit" variant="secondary">
                        <MessageSquareText size={15} aria-hidden="true" /> Registrar resposta externa
                      </Button>
                    </form>
                  )}

                  {!session.closed &&
                    identity.role === "admin" &&
                    !["responded", "waived"].includes(request.status) && (
                      <form action={waiveFeedbackRequestAction} className="mt-4 flex flex-wrap gap-2">
                        <input type="hidden" name="requestId" value={request.id} />
                        <input
                          name="reason"
                          required
                          minLength={10}
                          maxLength={500}
                          placeholder="Motivo da dispensa"
                          className="rounded-ur min-h-11 min-w-64 flex-1 border bg-black/20 px-3 text-sm"
                        />
                        <Button type="submit" variant="secondary">Dispensar</Button>
                      </form>
                    )}
                </Card>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
