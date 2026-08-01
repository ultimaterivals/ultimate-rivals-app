import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getDevelopment } from "@/server/repositories/progression.repository";
import { redirect } from "next/navigation";
export default async function Page() {
  const a = await requireRole("athlete"),
    c = await createClient(),
    { data: athlete } = await c
      .from("athletes")
      .select("id,public_name")
      .eq("profile_id", a.userId)
      .single();
  if (!athlete) redirect("/athlete");
  const d = await getDevelopment(c, athlete.id),
    current = d.levels.find((x) => x.status === "active");
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Minha jornada"
        title="Desenvolvimento"
        description="Evolução esportiva homologada pela comissão técnica."
      />
      <Card className="bg-gradient-to-br from-amber-400/20 to-black">
        <p className="text-ur-gold text-sm font-bold uppercase">Meu nível</p>
        <strong className="text-5xl uppercase">
          {current?.level ?? "leveling"}
        </strong>
        <p>
          {current?.starts_at
            ? `Desde ${new Date(current.starts_at).toLocaleDateString("pt-BR")}`
            : "Em nivelamento"}
        </p>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Jornada</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 font-black">
          <span>Em Nivelamento</span>
          <span>↓</span>
          <span>N3 Desenvolvimento</span>
          <span>↓</span>
          <span>N2 Avançado</span>
          <span>↓</span>
          <span>N1 Elite</span>
        </div>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Feedbacks liberados</h2>
        {d.assessments.length === 0 ? (
          <p className="text-zinc-500">Nenhum feedback liberado.</p>
        ) : (
          d.assessments.map((x) => (
            <div key={x.id} className="border-t py-3">
              <strong>{x.context}</strong>
              <p>{x.athlete_feedback}</p>
              <p className="text-zinc-500">
                {x.scope} · {x.overall_score ?? "avaliação parcial"}
              </p>
            </div>
          ))
        )}
      </Card>
      <Card>
        <h2 className="text-xl font-black">Progressão e proteção</h2>
        {d.reviews.map((x, i) => (
          <p key={i}>
            {x.current_level} → {x.proposed_level} · {x.status}
          </p>
        ))}
        {d.protections.map((x, i) => (
          <p key={i}>
            Proteção {x.level} até{" "}
            {new Date(x.ends_at).toLocaleDateString("pt-BR")}
          </p>
        ))}
      </Card>
    </div>
  );
}
