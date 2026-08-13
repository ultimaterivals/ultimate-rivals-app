import { redirect } from "next/navigation";
import { CheckCircle2, MessageSquareText } from "lucide-react";
import {
  submitAthleteFeedbackAction,
  submitAthleteSupportAction,
} from "@/app/athlete/feedback/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteFeedbackSnapshot } from "@/server/services/athlete-feedback-service";

type Params = Promise<{
  saved?: string | string[];
  error?: string | string[];
  protocol?: string | string[];
  supportError?: string | string[];
}>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function AthleteFeedbackPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const viewer = await requireAthleteViewer();
  if (viewer.isPreview || !viewer.userId) redirect("/admin/preview");

  const [snapshot, params] = await Promise.all([
    getAthleteFeedbackSnapshot(viewer.userId),
    searchParams,
  ]);
  const saved = single(params.saved);
  const error = single(params.error);
  const protocol = single(params.protocol);
  const supportError = single(params.supportError);
  const open = snapshot.requests.filter((item) => item.status === "sent");
  const answered = snapshot.requests.filter(
    (item) => item.status === "responded",
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Sua experiência"
        title="Feedback e suporte"
        description="Conte o que aconteceu. Sua mensagem chega à equipe UR e recebe um protocolo para acompanhamento."
      />

      {protocol && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <CheckCircle2 size={16} aria-hidden="true" /> Mensagem recebida.
          </p>
          <p className="mt-2 text-sm text-zinc-300">
            Protocolo <strong>{protocol}</strong>. Guarde este número para
            acompanhar seu caso.
          </p>
        </Card>
      )}
      {supportError && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm font-bold text-red-300">
            {supportError === "invalid"
              ? "Escolha uma categoria e escreva pelo menos 10 caracteres."
              : "Não foi possível enviar sua mensagem agora."}
          </p>
        </Card>
      )}

      <Card className="border-ur-gold/25">
        <div>
          <p className="font-display text-xl font-black uppercase">
            Fale com a equipe UR
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Use este espaço para dúvidas, sugestões ou situações que precisam de
            atenção.
          </p>
        </div>
        <form action={submitAthleteSupportAction} className="mt-5 grid gap-4">
          <label className="grid gap-2 text-sm font-bold">
            Assunto
            <select
              name="category"
              required
              defaultValue=""
              className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm font-normal"
            >
              <option value="" disabled>
                Escolha um assunto
              </option>
              <option value="app">App</option>
              <option value="game">Jogo</option>
              <option value="refereeing">Arbitragem</option>
              <option value="arena">Arena</option>
              <option value="team">Equipe</option>
              <option value="suggestion">Sugestão</option>
              <option value="financial">Financeiro</option>
              <option value="other">Outro</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Sua mensagem
            <textarea
              name="message"
              minLength={10}
              maxLength={2000}
              required
              rows={5}
              className="rounded-ur border bg-black/20 p-3 text-sm font-normal"
              placeholder="Conte o que aconteceu e como podemos ajudar."
            />
          </label>
          <Button type="submit">
            <MessageSquareText size={16} aria-hidden="true" /> Enviar mensagem
          </Button>
        </form>
      </Card>

      {saved && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
            <CheckCircle2 size={16} aria-hidden="true" /> Feedback registrado.
          </p>
        </Card>
      )}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <p className="text-sm font-bold text-red-300">
            {error === "invalid"
              ? "Escolha uma nota entre 0 e 10."
              : "Não foi possível salvar sua resposta agora."}
          </p>
        </Card>
      )}

      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Algumas respostas ainda não apareceram</p>
          <p className="mt-2 text-sm text-zinc-500">
            Atualize a página em alguns instantes. Sua mensagem de suporte
            continua disponível acima.
          </p>
        </Card>
      )}

      {open.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhum feedback pendente.</p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Quando você participar de uma sessão concluída, a solicitação
            aparece aqui automaticamente.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {open.map((request) => (
            <Card key={request.id} className="border-ur-gold/25">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl font-black uppercase">
                    {request.sessionName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {dateTime.format(new Date(request.sessionEndsAt))}
                  </p>
                </div>
                <Badge>Feedback aberto</Badge>
              </div>

              <form
                action={submitAthleteFeedbackAction}
                className="mt-6 grid gap-4"
              >
                <input type="hidden" name="requestId" value={request.id} />
                <fieldset>
                  <legend className="text-sm font-bold">
                    De 0 a 10, o quanto você recomendaria o UR para um amigo?
                  </legend>
                  <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-11">
                    {Array.from({ length: 11 }, (_, score) => (
                      <label
                        key={score}
                        className="rounded-ur has-[:checked]:border-ur-gold has-[:checked]:bg-ur-gold/10 has-[:checked]:text-ur-gold flex cursor-pointer items-center justify-center border p-3 text-sm font-black"
                      >
                        <input
                          className="sr-only"
                          type="radio"
                          name="score"
                          value={score}
                          required
                        />
                        {score}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="grid gap-2 text-sm font-bold">
                  O que devemos manter ou melhorar?{" "}
                  <span className="font-normal text-zinc-600">Opcional</span>
                  <textarea
                    name="comment"
                    maxLength={2000}
                    rows={4}
                    className="rounded-ur border bg-black/20 p-3 text-sm font-normal"
                    placeholder="Conte o que mais impactou sua experiência."
                  />
                </label>

                <Button type="submit">
                  <MessageSquareText size={16} aria-hidden="true" /> Enviar
                  feedback
                </Button>
              </form>
            </Card>
          ))}
        </div>
      )}

      {answered.length > 0 && (
        <section className="grid gap-3">
          <div>
            <p className="font-display text-xl font-black uppercase">
              Respostas anteriores
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Histórico das sessões em que você já avaliou a experiência.
            </p>
          </div>
          {answered.map((request) => (
            <Card key={request.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{request.sessionName}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {dateTime.format(new Date(request.sessionEndsAt))}
                  </p>
                </div>
                <Badge>{request.score}/10</Badge>
              </div>
              {request.comment && (
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  {request.comment}
                </p>
              )}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
