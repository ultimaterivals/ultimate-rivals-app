import { CheckCircle2, MessageSquareText } from "lucide-react";
import { updateAthleteFeedbackCaseAction } from "@/app/admin/feedback/actions";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{
  success?: string | string[];
  error?: string | string[];
}>;

const categoryLabels: Record<string, string> = {
  app: "App",
  game: "Jogo",
  refereeing: "Arbitragem",
  arena: "Arena",
  team: "Equipe",
  suggestion: "Sugestão",
  financial: "Financeiro",
  other: "Outro",
};

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireAdminModule("feedback");
  const [params, result] = await Promise.all([
    searchParams,
    (async () => {
      const supabase = await createClient();
      return supabase
        .from("athlete_feedback_cases")
        .select(
          "id,protocol,category,message,status,resolution_note,created_at,athletes(public_name,athlete_code)",
        )
        .order("created_at", { ascending: false })
        .limit(200);
    })(),
  ]);
  const cases = result.data ?? [];

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Relacionamento"
        title="Feedback dos atletas"
        description="Mensagens enviadas pelo Athlete App para acompanhamento da equipe UR."
      />
      {params.success && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 text-sm font-bold text-emerald-300">
          <CheckCircle2 className="mr-2 inline" size={16} aria-hidden="true" />{" "}
          Caso atualizado.
        </Card>
      )}
      {params.error && (
        <Card className="border-red-500/30 bg-red-500/5 text-sm font-bold text-red-300">
          Não foi possível atualizar este caso.
        </Card>
      )}
      {result.error && (
        <Card>
          <p className="font-bold">Não foi possível carregar os casos agora.</p>
        </Card>
      )}
      {cases.length === 0 && !result.error ? (
        <Card>
          <p className="font-bold">Nenhuma mensagem recebida.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Quando um atleta enviar feedback ou pedir suporte, o caso aparecerá
            aqui.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cases.map((item) => {
            const athlete = item.athletes as unknown as {
              public_name: string;
              athlete_code: string;
            } | null;
            return (
              <Card key={item.id} className="grid gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display flex items-center gap-2 text-xl font-black uppercase">
                      <MessageSquareText size={18} aria-hidden="true" />{" "}
                      {item.protocol}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {athlete?.public_name ?? "Atleta"} ·{" "}
                      {athlete?.athlete_code ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>
                      {categoryLabels[item.category] ?? item.category}
                    </Badge>
                    <Badge>{item.status}</Badge>
                  </div>
                </div>
                <p className="text-sm leading-6 whitespace-pre-wrap text-zinc-300">
                  {item.message}
                </p>
                <form
                  action={updateAthleteFeedbackCaseAction}
                  className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]"
                >
                  <input type="hidden" name="caseId" value={item.id} />
                  <select
                    name="status"
                    defaultValue={item.status}
                    className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                  >
                    <option value="open">Aberto</option>
                    <option value="in_review">Em análise</option>
                    <option value="resolved">Resolvido</option>
                  </select>
                  <input
                    name="resolutionNote"
                    maxLength={2000}
                    defaultValue={item.resolution_note ?? ""}
                    placeholder="Registro da tratativa (obrigatório ao resolver)"
                    className="rounded-ur min-h-11 border bg-black/20 px-3 text-sm"
                  />
                  <Button type="submit">Atualizar</Button>
                </form>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
