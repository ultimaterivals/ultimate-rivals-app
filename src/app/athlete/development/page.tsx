import { CheckCircle2, LockKeyhole, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAthleteDevelopmentExperience } from "@/server/repositories/development.repository";
import { getDevelopment } from "@/server/repositories/progression.repository";

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function Page() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const { data: athlete } = await client
    .from("athletes")
    .select("id,public_name")
    .eq("profile_id", identity.userId)
    .single();

  if (!athlete) redirect("/athlete");

  const development = await getDevelopment(client, athlete.id);
  const seasonDevelopment = await getAthleteDevelopmentExperience(
    client,
    athlete.id,
  );
  const current = development.levels.find((item) => item.status === "active");
  const hunterMission =
    seasonDevelopment.summary?.hunter_mission ??
    seasonDevelopment.summary?.hunter_goal ??
    null;
  const priorities = [
    seasonDevelopment.summary?.priority_1,
    seasonDevelopment.summary?.priority_2,
    seasonDevelopment.summary?.priority_3,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Missões e evolução"
        title="Sua progressão"
        description="Objetivos esportivos, evolução Hunter e feedback técnico. Nada aqui cria pontuação automática: só entram dados homologados e publicados pela operação."
      />

      <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <Card className="ranking-hero border-ur-gold/40 overflow-hidden">
          <p className="text-ur-gold text-xs font-black tracking-[.2em] uppercase">
            Status atual
          </p>
          <strong className="font-display mt-3 block text-5xl uppercase sm:text-7xl">
            {current?.level ?? "Leveling"}
          </strong>
          <p className="mt-2 text-zinc-400">
            {current?.starts_at
              ? `Desde ${new Date(current.starts_at).toLocaleDateString("pt-BR")}`
              : "Aguardando homologação de nível"}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge>Competir</Badge>
            <Badge>Evoluir</Badge>
            <Badge>Conquistar</Badge>
          </div>
        </Card>

        <Card className="border-ur-gold/30">
          <Target className="text-ur-gold" size={28} />
          <p className="mt-4 text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Missão Hunter ativa
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {hunterMission ?? "Nenhuma missão publicada"}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {hunterMission
              ? "Objetivo ativo definido dentro do seu desenvolvimento."
              : "Quando a operação publicar uma missão válida, ela aparecerá aqui."}
          </p>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card>
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Missões de desenvolvimento
          </p>
          {priorities.length ? (
            <div className="mt-4 grid gap-3">
              {priorities.map((priority, index) => (
                <div
                  key={`${priority}-${index}`}
                  className="rounded-ur border border-white/10 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Target className="text-ur-gold mt-0.5" size={18} />
                    <div>
                      <strong className="block">Objetivo {index + 1}</strong>
                      <span className="text-sm text-zinc-400">{priority}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">
              Nenhuma prioridade publicada no plano individual.
            </p>
          )}
        </Card>

        <Card>
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Meta de 30 dias
          </p>
          <Trophy className="text-ur-gold mt-4" size={26} />
          <h2 className="mt-3 text-xl font-black">
            {seasonDevelopment.summary?.goal_30_days ?? "A definir"}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Meta técnica publicada pela comissão. Não altera ranking por si só.
          </p>
        </Card>

        <Card>
          <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
            Conquistas
          </p>
          <LockKeyhole className="text-ur-gold mt-4" size={26} />
          <h2 className="mt-3 text-xl font-black">Espaço preparado</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Badges e conquistas só serão exibidos quando houver registros oficiais. Nenhuma conquista fictícia foi criada.
          </p>
        </Card>
      </section>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black tracking-[.18em] text-zinc-500 uppercase">
              Jornada de nível
            </p>
            <h2 className="font-display text-2xl font-black uppercase">
              Evolução esportiva
            </h2>
          </div>
          <CheckCircle2 className="text-ur-gold" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {["Em nivelamento", "N3 Desenvolvimento", "N2 Avançado", "N1 Elite"].map(
            (stage) => (
              <div key={stage} className="rounded-ur border border-white/10 p-4">
                <span className="text-sm font-black">{stage}</span>
              </div>
            ),
          )}
        </div>
        <Link
          href="/athlete/journey"
          className="text-ur-gold mt-5 inline-flex min-h-11 items-center font-black"
        >
          Ver timeline completa →
        </Link>
      </Card>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">Treinos UR</h2>
          <div className="mt-4 grid gap-3">
            {seasonDevelopment.training.length ? (
              seasonDevelopment.training.map((item) => {
                const session = first(item.training_sessions);
                return (
                  <div
                    key={`${session?.id ?? "training"}-${item.status}`}
                    className="rounded-ur border border-white/10 p-4"
                  >
                    <strong>{session?.focus ?? "Treino"}</strong>
                    <p className="text-sm text-zinc-400">{item.status}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-zinc-500">
                Nenhum treino registrado. Metodologia: Preparar → Desenvolver → Resolver → Competir.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Temas Hunter</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {seasonDevelopment.hunterThemes.length ? (
              seasonDevelopment.hunterThemes.slice(0, 12).map((theme) => (
                <span
                  key={theme.code}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs"
                >
                  {theme.week_number}. {theme.name}
                </span>
              ))
            ) : (
              <p className="text-sm text-zinc-500">Nenhum tema publicado.</p>
            )}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">Feedbacks liberados</h2>
          <div className="mt-3 grid gap-3">
            {development.assessments.length === 0 ? (
              <p className="text-zinc-500">Nenhum feedback liberado.</p>
            ) : (
              development.assessments.map((assessment) => (
                <div key={assessment.id} className="rounded-ur border p-4">
                  <strong>{assessment.context}</strong>
                  <p className="mt-1">{assessment.athlete_feedback}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {assessment.scope} · {assessment.overall_score ?? "avaliação parcial"}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Progressão e proteção</h2>
          <div className="mt-3 grid gap-3">
            {development.reviews.map((review, index) => (
              <p key={`review-${index}`}>
                {review.current_level} → {review.proposed_level} · {review.status}
              </p>
            ))}
            {development.protections.map((protection, index) => (
              <p key={`protection-${index}`}>
                Proteção {protection.level} até {new Date(protection.ends_at).toLocaleDateString("pt-BR")}
              </p>
            ))}
            {!development.reviews.length && !development.protections.length && (
              <p className="text-sm text-zinc-500">
                Nenhuma revisão ou proteção ativa neste momento.
              </p>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
