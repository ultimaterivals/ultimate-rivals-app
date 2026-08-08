import Link from "next/link";
import { AthleteAvatar } from "@/components/athlete/athlete-avatar";
import { Card, EmptyState } from "@/components/ui";
import { EngagementClick } from "@/features/engagement/engagement-client";
import { RankingMovement } from "./ranking-movement";

export function RankingTable({
  rows,
  publicProfiles = false,
}: {
  rows: Array<Record<string, unknown>>;
  publicProfiles?: boolean;
}) {
  if (!rows.length)
    return (
      <EmptyState
        title="Ranking ainda sem classificados"
        description="A classificação aparece após a primeira transação homologada neste recorte."
      />
    );

  return (
    <div className="grid gap-3" role="table" aria-label="Classificação oficial">
      {rows.map((row) => {
        const code = String(row.entity_code ?? "");
        const name = String(row.display_name ?? "Participante");
        const athleteId = String(row.entity_id ?? "");
        const currentPosition = Number(row.current_position ?? 0);
        const nameNode =
          publicProfiles && code ? (
            <EngagementClick
              eventName="ranking_athlete_clicked"
              athleteId={athleteId || null}
              objectType="athlete"
              objectId={athleteId || null}
              metadata={{
                route: "/rankings",
                ranking_position: currentPosition,
                is_top_3: currentPosition <= 3,
                source: "ranking_table",
              }}
            >
              <Link
                className="hover:text-ur-gold text-lg font-black"
                href={`/athletes/${code}`}
              >
                {name}
              </Link>
            </EngagementClick>
          ) : (
            <strong className="text-lg">{name}</strong>
          );
        return (
          <Card
            key={String(row.id)}
            className="group hover:border-ur-gold/50 border-white/10"
          >
            <div className="grid items-center gap-4 sm:grid-cols-[5rem_auto_1fr_auto]">
              <div>
                <span className="font-display text-4xl font-black">
                  #{String(row.current_position ?? "—").padStart(2, "0")}
                </span>
                <div>
                  <RankingMovement
                    movement={String(row.movement)}
                    change={row.position_change as number | null}
                    compact
                  />
                </div>
              </div>
              <AthleteAvatar
                publicName={name}
                imageUrl={String(row.avatar_signed_url ?? "") || null}
                size="sm"
              />
              <div>
                {nameNode}
                <p className="text-sm text-zinc-400">
                  {[
                    row.level && String(row.level).toUpperCase(),
                    row.team_name,
                    row.pole_name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  J {String(row.games_played ?? 0)} · V{" "}
                  {String(row.wins ?? 0)} ·{" "}
                  {Number(row.win_rate ?? 0).toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                  %
                </p>
              </div>
              <div className="text-right">
                <strong className="text-ur-gold text-2xl">
                  {Number(row.total_points ?? 0).toLocaleString("pt-BR")}
                </strong>
                <p className="text-xs font-bold text-zinc-500">PTS</p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
