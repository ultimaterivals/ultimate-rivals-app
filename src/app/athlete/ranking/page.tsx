import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

export default async function AthleteRankingPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);
  const client = await createClient();
  const { data: publicRankings, error: publicRankingsError } = await client
    .from("public_rankings")
    .select(
      "id,display_name,level,category_code,format_code,total_points,games_played,current_position,pole_name",
    )
    .eq("ranking_type", "individual")
    .order("current_position", { ascending: true })
    .limit(20);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Performance"
        title="Meu Ranking"
        description="Classificações individuais disponíveis para o seu perfil, calculadas pelo motor oficial do ranking."
      />

      {!snapshot.identity ? (
        <Card>
          <p className="text-sm text-zinc-400">
            Perfil de atleta ainda não vinculado.
          </p>
        </Card>
      ) : snapshot.rankings && snapshot.rankings.length > 0 ? (
        <div className="grid gap-4">
          {snapshot.rankings.map((ranking) => {
            const change = ranking.positionChange ?? 0;
            const MovementIcon =
              change > 0 ? ArrowUp : change < 0 ? ArrowDown : Minus;
            return (
              <Card key={ranking.id}>
                <div className="grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <div>
                    <p className="text-xs font-bold text-zinc-500 uppercase">
                      Posição
                    </p>
                    <p className="font-display mt-1 text-4xl font-black">
                      {ranking.currentPosition
                        ? `#${ranking.currentPosition}`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {ranking.level && <Badge>{ranking.level}</Badge>}
                      {ranking.categoryCode && (
                        <Badge>{ranking.categoryCode}</Badge>
                      )}
                      {ranking.formatCode && (
                        <Badge>{ranking.formatCode}</Badge>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-zinc-400">
                      {ranking.gamesPlayed} jogos · {ranking.wins} vitórias ·{" "}
                      {ranking.losses} derrotas · {ranking.winRate.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      {[ranking.teamName, ranking.poleName]
                        .filter(Boolean)
                        .join(" · ") || "Classificação individual"}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="font-display text-ur-gold text-2xl font-black">
                      {ranking.totalPoints} pts
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-xs text-zinc-500 sm:justify-end">
                      <MovementIcon size={14} aria-hidden="true" />
                      {change === 0
                        ? "estável"
                        : `${Math.abs(change)} posição(ões)`}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-zinc-400">
            Seu histórico competitivo começará a ser construído a partir das
            suas participações oficiais.
          </p>
        </Card>
      )}

      {publicRankingsError ? (
        <AthleteSourceHealth
          errors={[`public_rankings: ${publicRankingsError.message}`]}
        />
      ) : publicRankings && publicRankings.length > 0 ? (
        <section className="grid gap-4" aria-labelledby="league-ranking-title">
          <div>
            <p className="text-ur-gold text-xs font-bold tracking-[.2em] uppercase">
              Temporada em campo
            </p>
            <h2
              id="league-ranking-title"
              className="font-display mt-2 text-2xl font-black uppercase"
            >
              Ranking geral da liga
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Classificação publicada pelo motor oficial, mesmo enquanto seu
              histórico pessoal ainda está começando.
            </p>
          </div>
          <div className="grid gap-3">
            {publicRankings.map((ranking) => (
              <Card key={ranking.id} className="flex items-center gap-4 py-4">
                <p className="font-display text-ur-gold w-10 text-center text-2xl font-black">
                  #{ranking.current_position ?? "—"}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{ranking.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {[
                      ranking.level,
                      ranking.category_code,
                      ranking.format_code,
                      ranking.pole_name,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Classificação individual"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-ur-gold text-lg font-black">
                    {ranking.total_points} pts
                  </p>
                  <p className="text-xs text-zinc-500">
                    {ranking.games_played} jogos
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
