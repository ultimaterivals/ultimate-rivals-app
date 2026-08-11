import { CheckCircle2, MessageSquareText } from "lucide-react";
import { submitAthleteFeedbackAction } from "@/app/athlete/feedback/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAthleteFeedbackSnapshot } from "@/server/services/athlete-feedback-service";

type Params = Promise<{
  saved?: string | string[];
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

export default async function AthleteFeedbackPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const identity = await requireRole(["athlete"]);
  const [snapshot, params] = await Promise.all([
    getAthleteFeedbackSnapshot(identity.userId),
    searchParams,
  ]);
  const saved = single(params.saved);
  const error = single(params.error);
  const open = snapshot.requests.filter((item) => item.status === "sent");
  const answered = snapshot.requests.filter(
    (item) => item.status === "responded",
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Sua experiência"
        title="Feedback UR"
        description="Sua resposta ajuda o Ultimate Rivals a corrigir a operação e melhorar as próximas sessões. A pergunta oficial usa a escala de 0 a 10."
      />

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
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
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
