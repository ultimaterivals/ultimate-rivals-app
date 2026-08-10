import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { AthleteSourceHealth } from "@/components/athlete/athlete-source-health";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { getAthleteSnapshotForViewer } from "@/server/services/athlete-viewer-snapshot-service";

export default async function AthleteRankingPage() {
  const viewer = await requireAthleteViewer();
  const snapshot = await getAthleteSnapshotForViewer(viewer);

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
                      {ranking.formatCode && <Badge>{ranking.formatCode}</Badge>}
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
            Ainda não existe ranking publicado para este atleta.
          </p>
        </Card>
      )}

      <AthleteSourceHealth errors={snapshot.sourceErrors} />
    </div>
  );
}
