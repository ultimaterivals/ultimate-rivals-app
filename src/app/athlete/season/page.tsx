import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Lock,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { EngagementViewEvent } from "@/features/engagement/engagement-client";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { listAthleteCompetitions } from "@/server/repositories/tournaments.repository";
import {
  getAthleteDashboard,
  getAthleteSeasonStages,
  type AthleteSeasonStage,
} from "@/server/services/athlete-experience.service";

const statusLabel: Record<AthleteSeasonStage["status"], string> = {
  active: "Agora",
  completed: "Concluído",
  registered: "Inscrito",
  available: "Disponível",
  locked: "Bloqueado",
  upcoming: "Em breve",
};

const statusIcon = {
  active: CalendarDays,
  completed: CheckCircle2,
  registered: CheckCircle2,
  available: Trophy,
  locked: Lock,
  upcoming: CalendarDays,
} satisfies Record<AthleteSeasonStage["status"], typeof CalendarDays>;

export default async function AthleteSeasonPage() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const dashboard = await getAthleteDashboard(
    client,
    viewer.isMirror ? viewer.athleteId : viewer.identity.userId,
    viewer.isMirror ? "athlete" : "profile",
  );
  if (!dashboard) notFound();

  const competitions = await listAthleteCompetitions(
    client,
    dashboard.athlete.id,
  );
  const stages = getAthleteSeasonStages({
    hasRanking: Boolean(dashboard.ranking.current),
    matchCount: dashboard.matches.length,
    hasUpcomingUrPlay: Boolean(dashboard.nextRegistration),
    seasonStatus: dashboard.season?.status ?? null,
    competitions,
  });

  const currentStage =
    stages.find((stage) =>
      ["active", "registered", "available"].includes(stage.status),
    ) ?? stages[0]!;

  return (
    <div className="grid gap-7">
      <EngagementViewEvent
        eventName="season_stage_viewed"
        athleteId={dashboard.athlete.id}
        objectType="season"
        objectId={dashboard.season?.id ?? null}
        metadata={{
          route: "/athlete/season",
          current_stage: currentStage.code,
          stage_status: currentStage.status,
          season_id: dashboard.season?.id ?? null,
        }}
        dedupKey={`season-stage:${dashboard.athlete.id}:${currentStage.code}`}
      />
      <PageHeader
        eyebrow="Minha temporada"
        title="Da primeira reserva à virada"
        description="A jornada mostra apenas estados derivados de dados oficiais: agenda, jogos, ranking, inscrições e competições."
      />

      <section className="ranking-hero border-ur-gold/50 rounded-ur overflow-hidden border p-5 sm:p-8">
        <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
              Próxima leitura
            </p>
            <h2 className="font-display mt-2 text-4xl font-black uppercase">
              {currentStage.label}
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-300">
              {currentStage.evidence}
            </p>
          </div>
          <Link
            href={currentStage.href}
            className="bg-ur-gold text-ur-black rounded-ur inline-flex min-h-12 items-center justify-center gap-2 px-5 font-black"
          >
            Abrir etapa <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ranking"
          value={
            dashboard.ranking.current
              ? `#${dashboard.ranking.current.current_position}`
              : "—"
          }
          hint={
            dashboard.ranking.current
              ? `${dashboard.ranking.current.total_points} pts`
              : "Sem pontuação homologada"
          }
        />
        <StatCard
          label="Jogos"
          value={String(dashboard.matches.length)}
          hint="Partidas reais vinculadas"
        />
        <StatCard
          label="Agenda"
          value={dashboard.nextRegistration ? "Ativa" : "Livre"}
          hint={
            dashboard.nextRegistration
              ? dashboard.nextRegistration.registration_status
              : "Sem reserva futura"
          }
        />
        <StatCard
          label="Competições"
          value={String(competitions.length)}
          hint="Inscrições reais encontradas"
        />
      </div>

      <section className="grid gap-4">
        {stages.map((stage, index) => {
          const Icon = statusIcon[stage.status];
          return (
            <Card
              key={stage.code}
              className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center"
            >
              <div className="bg-ur-gold/10 text-ur-gold flex size-12 items-center justify-center rounded-full font-black">
                {index + 1}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-black">{stage.label}</h2>
                  <Badge>{statusLabel[stage.status]}</Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{stage.evidence}</p>
              </div>
              <Link
                href={stage.href}
                className="inline-flex items-center gap-2 font-black"
              >
                <Icon className="text-ur-gold" size={18} />
                Ver
              </Link>
            </Card>
          );
        })}
      </section>

      <EmptyState
        title="Sem mecânicas artificiais"
        description="Esta tela não concede pontos, moedas, XP ou classificação. Ela apenas organiza a leitura da temporada a partir de registros reais."
      />
    </div>
  );
}
