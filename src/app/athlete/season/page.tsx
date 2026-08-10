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
  const currentStageIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.code === currentStage.code),
  );
  const completedStages = stages.filter(
    (stage) => stage.status === "completed",
  ).length;
  const campaignProgress = Math.round((completedStages / stages.length) * 100);

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
        eyebrow="Minha campanha"
        title="Da primeira reserva à virada"
        description="Sua temporada como uma campanha esportiva contínua. Cada checkpoint abaixo é derivado de agenda, jogos, ranking, inscrições e competições oficiais."
      />

      <section className="ranking-hero border-ur-gold/50 rounded-ur overflow-hidden border p-5 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-ur-gold text-xs font-black tracking-[.22em] uppercase">
              Checkpoint atual · {currentStageIndex + 1}/{stages.length}
            </p>
            <h2 className="font-display mt-2 text-4xl font-black uppercase sm:text-5xl">
              {currentStage.label}
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-300">
              {currentStage.evidence}
            </p>
            <div className="mt-6 max-w-2xl">
              <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[.16em]">
                <span className="text-zinc-400">Campanha concluída</span>
                <span className="text-ur-gold">{campaignProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="bg-ur-gold h-full rounded-full"
                  style={{ width: `${campaignProgress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                {completedStages} de {stages.length} etapas concluídas por evidência oficial.
              </p>
            </div>
          </div>
          <Link
            href={currentStage.href}
            className="bg-ur-gold text-ur-black rounded-ur inline-flex min-h-12 items-center justify-center gap-2 px-5 font-black"
          >
            Continuar campanha <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <section aria-label="Mapa da campanha" className="overflow-x-auto pb-2">
        <div className="grid min-w-[760px] grid-cols-6 gap-2">
          {stages.map((stage, index) => {
            const Icon = statusIcon[stage.status];
            const isCurrent = stage.code === currentStage.code;
            return (
              <Link
                key={stage.code}
                href={stage.href}
                className={`rounded-ur relative border p-4 transition-colors ${
                  isCurrent
                    ? "border-ur-gold bg-ur-gold/10"
                    : stage.status === "completed"
                      ? "border-white/20 bg-white/[.04]"
                      : "border-white/10 bg-black/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-zinc-500">
                    0{index + 1}
                  </span>
                  <Icon
                    size={17}
                    className={isCurrent ? "text-ur-gold" : "text-zinc-500"}
                  />
                </div>
                <strong className="mt-4 block text-sm uppercase">
                  {stage.label}
                </strong>
                <span
                  className={`mt-1 block text-[.68rem] font-black uppercase tracking-[.12em] ${
                    isCurrent ? "text-ur-gold" : "text-zinc-600"
                  }`}
                >
                  {statusLabel[stage.status]}
                </span>
                {index < stages.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 -right-2 z-10 hidden h-px w-2 bg-white/20 sm:block"
                  />
                )}
              </Link>
            );
          })}
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
        <div>
          <p className="text-ur-gold text-xs font-black uppercase tracking-[.18em]">
            Checkpoints
          </p>
          <h2 className="font-display mt-1 text-2xl font-black uppercase">
            Jornada oficial da temporada
          </h2>
        </div>
        {stages.map((stage, index) => {
          const Icon = statusIcon[stage.status];
          const isCurrent = stage.code === currentStage.code;
          return (
            <Card
              key={stage.code}
              className={`grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center ${
                isCurrent ? "border-ur-gold/60" : ""
              }`}
            >
              <div
                className={`flex size-12 items-center justify-center rounded-full font-black ${
                  isCurrent
                    ? "bg-ur-gold text-ur-black"
                    : "bg-ur-gold/10 text-ur-gold"
                }`}
              >
                {index + 1}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-2xl font-black">{stage.label}</h3>
                  <Badge>{statusLabel[stage.status]}</Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-400">{stage.evidence}</p>
              </div>
              <Link
                href={stage.href}
                className="inline-flex items-center gap-2 font-black"
              >
                <Icon className="text-ur-gold" size={18} />
                Ver etapa
              </Link>
            </Card>
          );
        })}
      </section>

      <EmptyState
        title="Progressão baseada em fatos"
        description="O mapa não concede pontos, UR Coins, XP ou classificação por conta própria. Ele transforma os registros oficiais do atleta em uma leitura contínua da campanha."
      />
    </div>
  );
}
