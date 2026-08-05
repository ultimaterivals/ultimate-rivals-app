import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthleteDevelopmentExperience } from "@/server/repositories/development.repository";
import { getDevelopment } from "@/server/repositories/progression.repository";
import { redirect } from "next/navigation";
import Link from "next/link";
function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
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
    seasonDevelopment = await getAthleteDevelopmentExperience(c, athlete.id),
    current = d.levels.find((x) => x.status === "active");
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Minha jornada"
        title="Desenvolvimento"
        description="Evolução esportiva homologada pela comissão técnica."
      />
      <Card className="ranking-hero border-ur-gold/40">
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
        <Link
          href="/athlete/journey"
          className="text-ur-gold mt-5 inline-flex min-h-11 items-center font-black"
        >
          VER TIMELINE COMPLETA â†’
        </Link>
      </Card>
      <Card>
        <h2 className="text-xl font-black">Plano individual</h2>
        {seasonDevelopment.summary?.plan_id ? (
          <div className="mt-3 grid gap-3">
            <p>
              <strong>Prioridades:</strong>{" "}
              {[
                seasonDevelopment.summary.priority_1,
                seasonDevelopment.summary.priority_2,
                seasonDevelopment.summary.priority_3,
              ]
                .filter(Boolean)
                .join(" • ")}
            </p>
            <p>
              <strong>Meta 30 dias:</strong>{" "}
              {seasonDevelopment.summary.goal_30_days ?? "A definir"}
            </p>
            <p>
              <strong>Hunter:</strong>{" "}
              {seasonDevelopment.summary.hunter_mission ??
                seasonDevelopment.summary.hunter_goal ??
                "Sem missão ativa"}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-zinc-500">
            Nenhum PID ativo. A comissão técnica pode criar um plano versionado
            com prioridades e revisão.
          </p>
        )}
      </Card>
      <Card>
        <h2 className="text-xl font-black">Treinos UR</h2>
        {seasonDevelopment.training.length ? (
          seasonDevelopment.training.map((item) => {
            const session = first(item.training_sessions);
            return (
              <p key={`${session?.id ?? "training"}-${item.status}`}>
                {session?.focus ?? "Treino"} · {item.status}
              </p>
            );
          })
        ) : (
          <p className="text-zinc-500">
            Nenhum treino registrado. Metodologia: Preparar → Desenvolver →
            Resolver → Competir.
          </p>
        )}
      </Card>
      <Card>
        <h2 className="text-xl font-black">Hunter Q1</h2>
        <p className="text-zinc-500">
          Missão atual:{" "}
          {seasonDevelopment.summary?.hunter_mission ??
            seasonDevelopment.summary?.hunter_theme ??
            "a definir"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {seasonDevelopment.hunterThemes.slice(0, 12).map((theme) => (
            <span
              key={theme.code}
              className="rounded-full border px-3 py-1 text-xs"
            >
              {theme.week_number}. {theme.name}
            </span>
          ))}
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
