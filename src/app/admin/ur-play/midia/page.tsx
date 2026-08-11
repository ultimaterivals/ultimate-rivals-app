import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Film,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import {
  publishMediaDeliverableAction,
  startMediaDeliverableAction,
  waiveMediaDeliverableAction,
} from "@/app/admin/ur-play/midia/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import type {
  MediaChannel,
  MediaDeliverableStatus,
} from "@/features/admin-ur-play-media/types";
import { requireRole } from "@/lib/auth/session";
import {
  getAdminMediaSnapshot,
  MEDIA_DELIVERABLES,
} from "@/server/services/admin-ur-play-media-service";

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

const statusLabels: Record<MediaDeliverableStatus, string> = {
  pending: "Pendente",
  in_progress: "Em produção",
  published: "Publicado",
  waived: "Dispensado",
};

const channels: Array<[MediaChannel, string]> = [
  ["instagram_post", "Instagram · Post"],
  ["instagram_story", "Instagram · Story"],
  ["reel", "Reel / vídeo curto"],
  ["youtube", "YouTube"],
  ["whatsapp", "WhatsApp"],
  ["app", "App UR"],
  ["other", "Outro canal"],
];

const successMessages: Record<string, string> = {
  started: "Entrega colocada em produção.",
  published: "Publicação registrada com evidência.",
  waived: "Entrega dispensada por exceção administrativa.",
};

const errorMessages: Record<string, string> = {
  auth_required: "Sessão autenticada obrigatória.",
  operation_denied: "Seu perfil não pode operar esta sessão.",
  not_found: "Entrega de mídia não encontrada.",
  invalid_channel: "Canal de publicação inválido.",
  evidence_required: "Informe um link válido de publicação ou evidência.",
  asset_mismatch: "O ativo informado não pertence a esta sessão.",
  already_resolved: "Esta entrega já foi resolvida.",
  already_closed: "O Pós-Sessão 360 está fechado. Reabra antes de alterar a mídia.",
  admin_required: "A dispensa de uma entrega exige perfil administrador.",
  waiver_reason: "A dispensa exige justificativa com pelo menos 10 caracteres.",
  operation_failed: "A operação foi bloqueada sem alteração parcial.",
};

export default async function MediaOperationsPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const identity = await requireRole(["admin", "operator"]);
  const [snapshot, params] = await Promise.all([
    getAdminMediaSnapshot(),
    searchParams,
  ]);
  const success = single(params.success);
  const error = single(params.error);
  const now = new Date(snapshot.generatedAt).getTime();

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Pós-evento · narrativa"
        title="Mesa de Mídia Pós-Jogo"
        description="O sistema define o que precisa sair e o prazo. Uma entrega só vira publicada quando existe evidência registrada; até existir integração direta com os canais, nenhuma publicação é presumida."
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
          ["Entregas", snapshot.metrics.total],
          ["Publicadas", snapshot.metrics.published],
          ["Abertas", snapshot.metrics.pending],
          ["Atrasadas", snapshot.metrics.overdue],
          ["Sessões prontas", snapshot.metrics.readySessions],
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

      {snapshot.sessions.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma pauta pós-jogo aberta.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            As seis entregas são criadas automaticamente quando uma sessão UR Play é encerrada esportivamente.
          </p>
        </Card>
      ) : (
        snapshot.sessions.map((session) => (
          <section key={session.id} className="grid gap-4">
            <Card className={session.counts.ready ? "border-emerald-500/30" : undefined}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-black uppercase">
                    {session.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Sessão encerrada em {dateTime.format(new Date(session.endsAt))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>
                    {session.counts.ready
                      ? "Mídia pronta para 360"
                      : `${session.counts.pending} bloqueantes abertas`}
                  </Badge>
                  {session.closed && <Badge>360 fechado</Badge>}
                  {session.counts.overdue > 0 && (
                    <Badge>{session.counts.overdue} atrasadas</Badge>
                  )}
                </div>
              </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              {session.deliverables.map((delivery) => {
                const definition = MEDIA_DELIVERABLES[delivery.key];
                const overdue =
                  !["published", "waived"].includes(delivery.status) &&
                  new Date(delivery.dueAt).getTime() < now;
                const mutable = !session.closed;

                return (
                  <Card
                    key={delivery.id}
                    className={overdue ? "border-red-500/30" : undefined}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-xl font-black uppercase">
                          {delivery.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-zinc-500">
                          {delivery.description}
                        </p>
                      </div>
                      <Badge>{statusLabels[delivery.status]}</Badge>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
                      <span className="flex items-center gap-2">
                        <Clock3 size={14} aria-hidden="true" />
                        {definition?.sla ?? "—"} · {dateTime.format(new Date(delivery.dueAt))}
                      </span>
                      <span className="flex items-center gap-2">
                        {delivery.blocking ? (
                          <ShieldCheck size={14} aria-hidden="true" />
                        ) : (
                          <Film size={14} aria-hidden="true" />
                        )}
                        {delivery.blocking
                          ? "Bloqueia o 360"
                          : "Continuidade · não bloqueia o 360"}
                      </span>
                      {overdue && (
                        <span className="flex items-center gap-2 text-red-300">
                          <AlertTriangle size={14} aria-hidden="true" /> SLA vencido
                        </span>
                      )}
                    </div>

                    {delivery.notes && (
                      <p className="mt-4 rounded-ur border bg-black/10 p-3 text-sm text-zinc-400">
                        {delivery.notes}
                      </p>
                    )}

                    {delivery.status === "published" && (
                      <div className="mt-4 rounded-ur border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                          <CheckCircle2 size={16} aria-hidden="true" /> Evidência registrada
                        </p>
                        {delivery.publicationUrl && (
                          <a
                            href={delivery.publicationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-ur-gold mt-2 inline-flex items-center gap-2 text-sm font-bold underline"
                          >
                            Abrir publicação / evidência
                            <ExternalLink size={14} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    )}

                    {delivery.status === "waived" && delivery.waiverReason && (
                      <p className="mt-4 text-xs text-amber-300">
                        Exceção administrativa: {delivery.waiverReason}
                      </p>
                    )}

                    {mutable && delivery.status === "pending" && (
                      <form action={startMediaDeliverableAction} className="mt-4">
                        <input
                          type="hidden"
                          name="deliverableId"
                          value={delivery.id}
                        />
                        <input type="hidden" name="notes" value="" />
                        <Button type="submit" variant="secondary">
                          Colocar em produção
                        </Button>
                      </form>
                    )}

                    {mutable && ["pending", "in_progress"].includes(delivery.status) && (
                      <form
                        action={publishMediaDeliverableAction}
                        className="mt-4 grid gap-3"
                      >
                        <input
                          type="hidden"
                          name="deliverableId"
                          value={delivery.id}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <select
                            name="channel"
                            required
                            defaultValue=""
                            className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                          >
                            <option value="" disabled>
                              Canal de entrega
                            </option>
                            {channels.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                          <input
                            name="publicationUrl"
                            type="url"
                            required
                            maxLength={2000}
                            placeholder="Link da publicação ou evidência"
                            className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                          />
                        </div>
                        <textarea
                          name="notes"
                          maxLength={1000}
                          placeholder="Contexto, legenda, arquivo ou observação opcional..."
                          className="rounded-ur min-h-20 w-full border bg-black/20 p-3 text-sm"
                        />
                        <Button type="submit">
                          <CheckCircle2 size={15} aria-hidden="true" /> Registrar como publicada
                        </Button>
                      </form>
                    )}

                    {mutable &&
                      identity.role === "admin" &&
                      !["published", "waived"].includes(delivery.status) && (
                        <form
                          action={waiveMediaDeliverableAction}
                          className="mt-4 flex flex-wrap gap-2"
                        >
                          <input
                            type="hidden"
                            name="deliverableId"
                            value={delivery.id}
                          />
                          <input
                            name="reason"
                            required
                            minLength={10}
                            maxLength={500}
                            placeholder="Motivo da dispensa administrativa"
                            className="rounded-ur min-h-11 min-w-64 flex-1 border bg-black/20 px-3 text-sm"
                          />
                          <Button type="submit" variant="secondary">
                            Dispensar
                          </Button>
                        </form>
                      )}
                  </Card>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}