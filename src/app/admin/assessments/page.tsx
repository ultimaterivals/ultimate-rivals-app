import { Card, PageHeader } from "@/components/ui";
import { createAssessmentAction } from "@/features/progression/actions";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  const c = await createClient(),
    [
      { data: athletes },
      { data: seasons },
      { data: criteria },
      { data: processes },
      { data: assessments },
    ] = await Promise.all([
      c
        .from("athlete_public_profiles")
        .select("athlete_id,athlete_code,public_name")
        .order("public_name"),
      c
        .from("seasons")
        .select("id,name")
        .in("status", ["registration", "active"]),
      c
        .from("assessment_criteria")
        .select("id,name,category")
        .eq("status", "active")
        .order("sort_order"),
      c
        .from("athlete_leveling_processes")
        .select("id,athlete_id")
        .not("status", "in", "(completed,cancelled)"),
      c
        .from("athlete_assessments")
        .select(
          "id,context,status,overall_score,assessed_at,athlete_public_profiles:athletes(public_name)",
        )
        .order("assessed_at", { ascending: false })
        .limit(30),
    ]);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Comissão técnica"
        title="Avaliações"
        description="Avaliação humana estruturada; dados do sistema permanecem parciais até existir UR Play."
      />
      <Card>
        <form action={createAssessmentAction} className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <select
              name="athleteId"
              required
              className="rounded-ur border bg-black p-3"
            >
              {athletes?.map((a) => (
                <option key={a.athlete_id} value={a.athlete_id}>
                  {a.athlete_code} · {a.public_name}
                </option>
              ))}
            </select>
            <select
              name="seasonId"
              required
              className="rounded-ur border bg-black p-3"
            >
              {seasons?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              name="levelingProcessId"
              className="rounded-ur border bg-black p-3"
            >
              <option value="">Sem processo</option>
              {processes?.map((p) => (
                <option key={p.id} value={p.id}>
                  Nivelamento · {p.athlete_id.slice(0, 8)}
                </option>
              ))}
            </select>
            <select
              name="assessmentType"
              className="rounded-ur border bg-black p-3"
            >
              <option value="leveling">Nivelamento</option>
              <option value="periodic">Periódica</option>
              <option value="promotion_review">Promoção</option>
              <option value="relegation_review">Rebaixamento</option>
              <option value="development">Desenvolvimento</option>
            </select>
            <select name="scope" className="rounded-ur border bg-black p-3">
              <option value="overall">Geral</option>
              <option value="doubles">Duplas</option>
              <option value="fours">Quartetos</option>
            </select>
            <input
              name="context"
              required
              placeholder="Contexto da observação"
              className="rounded-ur border bg-black p-3"
            />
          </div>
          {["TECHNICAL", "TACTICAL", "COGNITIVE", "BEHAVIORAL"].map(
            (category) => (
              <fieldset key={category} className="rounded-ur border p-4">
                <legend className="text-ur-gold px-2 font-black">
                  {category}
                </legend>
                <div className="grid gap-3 md:grid-cols-3">
                  {criteria
                    ?.filter((x) => x.category === category)
                    .map((x) => (
                      <label key={x.id} className="grid gap-1 text-sm">
                        {x.name}
                        <select
                          name={`score:${x.id}`}
                          className="rounded-ur border bg-black p-2"
                        >
                          <option value="">Não observado</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                </div>
              </fieldset>
            ),
          )}
          <textarea
            name="notes"
            placeholder="Notas internas"
            className="rounded-ur border bg-black p-3"
          />
          <textarea
            name="athleteFeedback"
            placeholder="Feedback liberado ao atleta"
            className="rounded-ur border bg-black p-3"
          />
          <label>
            <input name="athleteVisible" type="checkbox" /> Liberar ao atleta
          </label>
          <button className="rounded-ur bg-ur-gold px-5 py-3 font-black text-black">
            Enviar avaliação
          </button>
        </form>
      </Card>
      <div className="grid gap-3">
        {assessments?.map((a) => (
          <Card key={a.id}>
            <strong>{a.context}</strong>
            <p>
              {a.status} · score técnico {a.overall_score ?? "parcial"}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
