import { Button, Card, PageHeader } from "@/components/ui";
import { createReviewAction } from "@/features/progression/actions";
import { createClient } from "@/lib/supabase/server";
import { getDevelopment } from "@/server/repositories/progression.repository";
export default async function Page({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const { athleteId } = await params,
    c = await createClient(),
    d = await getDevelopment(c, athleteId),
    { data: athlete } = await c
      .from("athletes")
      .select("public_name")
      .eq("id", athleteId)
      .single(),
    current = d.levels.find((x) => x.status === "active"),
    { data: seasons } = await c
      .from("seasons")
      .select("id,name")
      .in("status", ["registration", "active"]);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Jornada técnica"
        title={athlete?.public_name ?? "Atleta"}
      />
      <Card>
        <h2 className="text-xl font-black">Homologar progressão</h2>
        <form
          action={createReviewAction}
          className="mt-3 grid gap-3 md:grid-cols-2"
        >
          <input name="athleteId" type="hidden" value={athleteId} />
          <input
            name="currentLevel"
            type="hidden"
            value={current?.level ?? "leveling"}
          />
          <select name="seasonId" className="rounded-ur border bg-black p-3">
            {seasons?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select name="reviewType" className="rounded-ur border bg-black p-3">
            <option value="leveling">Nivelamento</option>
            <option value="promotion">Promoção</option>
            <option value="relegation">Rebaixamento</option>
            <option value="correction">Correction</option>
          </select>
          <select
            name="proposedLevel"
            className="rounded-ur border bg-black p-3"
          >
            <option value="n3">N3 Desenvolvimento</option>
            <option value="n2">N2 Avançado</option>
            <option value="n1">N1 Elite</option>
          </select>
          <input
            name="protectionEndsAt"
            type="datetime-local"
            className="rounded-ur border bg-black p-3"
          />
          <textarea
            name="decisionReason"
            required
            placeholder="Motivo homologado"
            className="rounded-ur border bg-black p-3"
          />
          <textarea
            name="evidenceSummary"
            required
            placeholder="Resumo das evidências"
            className="rounded-ur border bg-black p-3"
          />
          <Button>Homologar nível</Button>
        </form>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Avaliações</h2>
        {d.assessments.map((a) => (
          <p key={a.id}>
            {a.assessment_type} · {a.overall_score ?? "parcial"} ·{" "}
            {a.assessed_at}
          </p>
        ))}
      </Card>
      <Card>
        <h2 className="text-xl font-black">Histórico</h2>
        {d.levels.map((l, i) => (
          <p key={i}>
            {l.level} · desde{" "}
            {new Date(l.starts_at).toLocaleDateString("pt-BR")}
          </p>
        ))}
      </Card>
    </div>
  );
}
