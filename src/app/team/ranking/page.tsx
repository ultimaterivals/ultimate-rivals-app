import { redirect } from "next/navigation";
import { RankingMovement } from "@/components/ranking/ranking-movement";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTeamRanking } from "@/server/repositories/rankings.repository";
import { getManagedTeamId } from "@/server/repositories/team360.repository";

export default async function TeamRankingPage() {
  const identity = await requireRole("team_manager");
  const client = await createClient();
  const teamId = await getManagedTeamId(client, identity.userId);
  if (!teamId) redirect("/");
  const data = await getTeamRanking(client, teamId);
  if (!data.current)
    return (
      <EmptyState
        title="Equipe ainda sem classificação"
        description="Contribuições homologadas da equipe abrirão o ranking."
      />
    );
  const r = data.current;
  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Disputa por equipes"
        title={r.display_name}
        description={`${r.pole_name ?? "Polo não informado"} · todas as contribuições históricas válidas contam.`}
      />
      <Card className="ranking-hero border-ur-gold/50">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <strong className="font-display text-8xl">
              #{r.current_position}
            </strong>
            <RankingMovement movement={r.movement} change={r.position_change} />
          </div>
          <div className="text-right">
            <strong className="text-ur-gold text-5xl">{r.total_points}</strong>
            <p>PTS NO TRIMESTRE</p>
            <p className="text-zinc-500">
              Mês: +{data.monthly?.total_points ?? 0}
            </p>
          </div>
        </div>
      </Card>
      <section>
        <h2 className="mb-3 text-xl font-black">CONTRIBUIÇÃO DOS ATLETAS</h2>
        <div className="grid gap-3">
          {data.contributions.map((c, index) => (
            <Card key={c.athlete_id}>
              <div className="flex justify-between">
                <span>
                  <b>{index + 1}.</b> {c.athlete_name}
                </span>
                <strong className="text-ur-gold">+{c.points} pts</strong>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
