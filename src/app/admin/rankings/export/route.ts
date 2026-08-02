import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  listRankings,
  type RankingType,
} from "@/server/repositories/rankings.repository";

const csv = (value: unknown) =>
  `"${String(value ?? "").replaceAll('"', '""')}"`;
export async function GET(request: NextRequest) {
  await requireRole("admin");
  const params = request.nextUrl.searchParams;
  const type = (params.get("type") ?? "individual") as RankingType;
  const rows = await listRankings(await createClient(), {
    type,
    seasonId: params.get("season") ?? undefined,
    cycleId:
      params.get("cycle") && params.get("cycle") !== "season"
        ? params.get("cycle")!
        : undefined,
    level:
      params.get("level") && params.get("level") !== "all"
        ? params.get("level")!
        : undefined,
    search: params.get("q") ?? undefined,
    limit: 5000,
  });
  const headers = [
    "position",
    "name",
    "level",
    "team",
    "pole",
    "points",
    "games",
    "wins",
    "losses",
    "win_rate",
    "movement",
  ];
  const body = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.current_position,
        r.display_name,
        r.level,
        r.team_name,
        r.pole_name,
        r.total_points,
        r.games_played,
        r.wins,
        r.losses,
        r.win_rate,
        r.movement,
      ]
        .map(csv)
        .join(","),
    ),
  ].join("\r\n");
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ranking-${type}.csv"`,
    },
  });
}
