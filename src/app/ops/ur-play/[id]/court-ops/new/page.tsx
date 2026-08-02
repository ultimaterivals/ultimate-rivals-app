import { Card, PageHeader } from "@/components/ui";
import { MatchBuilder } from "@/features/court-ops/match-builder";
import { createClient } from "@/lib/supabase/server";
import {
  getCourtOpsDashboard,
  getOfficialRostersForSession,
} from "@/server/repositories/court-ops.repository";

const first = <T,>(value: T | T[] | null | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ court?: string; error?: string }>;
}) {
  const { id } = await params,
    { court, error } = await searchParams,
    client = await createClient(),
    data = await getCourtOpsDashboard(client, id),
    rosters = await getOfficialRostersForSession(client, data.session.season_id),
    { data: formats } = await client
      .from("competitive_formats")
      .select("id,code,name")
      .in("code", ["doubles", "fours"]),
    { data: categories } = await client
      .from("competitive_categories")
      .select("id,code,name")
      .in("code", ["female", "male", "mixed"]),
    activeMatches = data.matches.filter((match) =>
      ["queued", "called", "ready", "in_progress"].includes(match.status),
    ),
    playedMatches = data.matches.filter((match) =>
      ["in_progress", "completed", "abandoned"].includes(match.status),
    ),
    available = data.queue.filter((row) =>
      ["waiting", "resting"].includes(row.status),
    ),
    candidates = available.map((row) => {
      const athlete = first(row.athletes),
        registration = first(row.ur_play_registrations),
        team = first(registration?.teams),
        gamesPlayed = playedMatches.filter((match) =>
          match.match_sides?.some((side: {
            match_participants?: { athlete_id: string }[] | null;
          }) =>
            side.match_participants?.some(
              (participant: { athlete_id: string }) =>
                participant.athlete_id === row.athlete_id,
            ),
          ),
        ).length;
      return {
        athleteId: row.athlete_id,
        code: athlete?.athlete_code ?? "UR",
        name: athlete?.public_name ?? "Atleta",
        gender: athlete?.gender ?? "",
        level: registration?.snapshot_level ?? "leveling",
        team: team?.name ?? "Avulso",
        gamesPlayed,
        waitMinutes: row.wait_minutes,
        lastMatchEndedAt: row.last_match_ended_at,
      };
    }),
    freeCourts = (data.session.ur_play_session_courts ?? [])
      .filter(
        (sessionCourt) =>
          sessionCourt.status === "active" &&
          !activeMatches.some((match) => match.court_id === sessionCourt.court_id),
      )
      .map((sessionCourt) => ({
        id: sessionCourt.court_id,
        name: first(sessionCourt.courts)?.name ?? "Quadra",
      }));

  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Court Ops"
        title="NOVO JOGO"
        description="Titulares entram em quadra; reservas permanecem no squad até uma promoção confirmada."
      />
      {error && <Card className="border-red-500 text-red-300">{error}</Card>}
      <MatchBuilder
        sessionId={id}
        initialCourtId={court}
        minRestMinutes={data.session.min_rest_minutes}
        candidates={candidates}
        formats={formats ?? []}
        categories={categories ?? []}
        courts={freeCourts}
        rosters={rosters.map((roster) => ({
          id: roster.id,
          name: roster.name,
          teamName: first(roster.teams)?.name ?? "Equipe",
          formatId: roster.format_id,
          categoryId: roster.category_id,
          level: roster.level,
          members: roster.team_roster_members ?? [],
        }))}
      />
    </div>
  );
}
