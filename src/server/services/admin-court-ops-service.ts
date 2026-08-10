import type {
  AdminCourtOpsSnapshot,
  CourtOpsMatch,
  CourtOpsSession,
} from "@/features/admin-court-ops/types";
import { fetchAdminCourtOpsRepositoryData } from "@/server/repositories/admin-court-ops-repository";

function number(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getAdminCourtOpsSnapshot(
  now = new Date(),
): Promise<AdminCourtOpsSnapshot> {
  const raw = await fetchAdminCourtOpsRepositoryData();
  const athletePublic = new Map(
    (raw.athletePublic ?? []).map((athlete) => [athlete.athlete_id, athlete]),
  );
  const athleteGenders = new Map(
    (raw.athleteGenders ?? []).map((athlete) => [athlete.id, athlete.gender]),
  );
  const poles = new Map((raw.poles ?? []).map((pole) => [pole.id, pole.name]));
  const venues = new Map((raw.venues ?? []).map((venue) => [venue.id, venue]));
  const courts = new Map((raw.courts ?? []).map((court) => [court.id, court]));
  const formats = new Map(
    (raw.formats ?? []).map((format) => [format.id, format]),
  );
  const categories = new Map(
    (raw.categories ?? []).map((category) => [category.id, category]),
  );
  const scoreboards = new Map(
    (raw.scoreboards ?? []).map((scoreboard) => [
      scoreboard.match_id,
      scoreboard,
    ]),
  );
  const results = new Map(
    (raw.results ?? []).map((result) => [result.match_id, result]),
  );
  const latestRankingRun = new Map<
    string,
    NonNullable<typeof raw.rankingRuns>[number]
  >();
  for (const run of raw.rankingRuns ?? []) {
    if (!latestRankingRun.has(run.source_id))
      latestRankingRun.set(run.source_id, run);
  }

  const matches: CourtOpsMatch[] = (raw.matches ?? []).map((match) => {
    const matchSides = (raw.sides ?? [])
      .filter((side) => side.match_id === match.id)
      .sort((a, b) => a.side.localeCompare(b.side));
    const mappedSides = matchSides.map((side) => ({
      id: side.id,
      code: side.side,
      label: side.label?.trim() || `Lado ${side.side}`,
      participants: (raw.participants ?? [])
        .filter(
          (participant) =>
            participant.match_id === match.id &&
            participant.side_id === side.id &&
            participant.status === "active",
        )
        .sort((a, b) => a.position_order - b.position_order)
        .map((participant) => {
          const profile = athletePublic.get(participant.athlete_id);
          return {
            id: participant.athlete_id,
            athleteCode: profile?.athlete_code ?? "—",
            publicName: profile?.public_name ?? "Atleta",
            gender: athleteGenders.get(participant.athlete_id) ?? null,
          };
        }),
    }));
    const scoreboard = scoreboards.get(match.id);
    const result = results.get(match.id);
    const rankingRun = latestRankingRun.get(match.id);
    const format = formats.get(match.format_id);
    const category = match.category_id
      ? categories.get(match.category_id)
      : undefined;
    const court = courts.get(match.court_id);

    return {
      id: match.id,
      code: match.match_code,
      sessionId: match.session_id,
      courtId: match.court_id,
      courtName: court?.name ?? "Quadra",
      formatId: match.format_id,
      formatCode: format?.code ?? "—",
      formatName: format?.name ?? "Formato",
      categoryId: match.category_id,
      categoryCode: category?.code ?? null,
      categoryName: category?.name ?? null,
      level: match.level,
      status: match.status,
      scheduledOrder: match.scheduled_order,
      calledAt: match.called_at,
      readyAt: match.ready_at,
      startedAt: match.started_at,
      endedAt: match.ended_at,
      sides: mappedSides,
      scoreboard: scoreboard
        ? {
            pointsToWin: scoreboard.points_to_win ?? 11,
            winBy: scoreboard.win_by ?? 1,
            maxPoints: scoreboard.max_points,
            scoreA: scoreboard.score_a ?? 0,
            scoreB: scoreboard.score_b ?? 0,
            validRallies: scoreboard.valid_rallies ?? 0,
            nextRallyNumber: scoreboard.next_rally_number ?? 1,
            isGameOver: scoreboard.is_game_over ?? false,
            winnerSideId: scoreboard.winner_side_id,
          }
        : null,
      result: result
        ? {
            status: result.result_status,
            winnerSideId: result.winner_side_id,
            scoreA: result.score_a,
            scoreB: result.score_b,
            homologatedAt: result.homologated_at,
          }
        : null,
      rallies: (raw.rallies ?? [])
        .filter((rally) => rally.match_id === match.id)
        .map((rally) => ({
          id: rally.id,
          rallyNumber: rally.rally_number,
          winningSideId: rally.winning_side_id,
          status: rally.status,
          recordedAt: rally.recorded_at,
        })),
      technicalSummary: (raw.technical ?? [])
        .filter((row) => row.match_id === match.id)
        .map((row) => {
          const profile = athletePublic.get(row.athlete_id);
          return {
            athleteId: row.athlete_id,
            athleteCode: profile?.athlete_code ?? "—",
            publicName: profile?.public_name ?? "Atleta",
            sideId: row.side_id,
            aces: row.aces ?? 0,
            attacks: row.attacks ?? 0,
            blocks: row.blocks ?? 0,
            defenses: row.defenses ?? 0,
            assists: row.assists ?? 0,
          };
        }),
      rankingRun: rankingRun
        ? {
            status: rankingRun.status,
            transactionCount: rankingRun.transaction_count ?? 0,
            completedAt: rankingRun.completed_at,
          }
        : null,
    };
  });

  const sessions: CourtOpsSession[] = (raw.sessions ?? []).map((session) => {
    const sessionQueue = (raw.queue ?? [])
      .filter((entry) => entry.session_id === session.id)
      .map((entry) => {
        const profile = athletePublic.get(entry.athlete_id);
        return {
          id: entry.id,
          athleteId: entry.athlete_id,
          athleteCode: profile?.athlete_code ?? "—",
          publicName: profile?.public_name ?? "Atleta",
          gender: athleteGenders.get(entry.athlete_id) ?? null,
          status: entry.status,
          priorityScore: number(entry.priority_score),
          queuedAt: entry.queued_at,
          lastMatchEndedAt: entry.last_match_ended_at,
          currentMatchId: entry.current_match_id,
        };
      })
      .sort((a, b) => {
        const priority = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
        if (priority !== 0) return priority;
        return new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime();
      });
    const sessionCourts = (raw.sessionCourts ?? [])
      .filter(
        (sessionCourt) =>
          sessionCourt.session_id === session.id &&
          sessionCourt.status === "active",
      )
      .map((sessionCourt) => ({
        id: sessionCourt.court_id,
        name: courts.get(sessionCourt.court_id)?.name ?? "Quadra",
        position: sessionCourt.position,
      }))
      .sort((a, b) => a.position - b.position);
    const venue = venues.get(session.venue_id);

    return {
      id: session.id,
      name: session.name,
      status: session.status,
      startsAt: session.starts_at,
      endsAt: session.ends_at,
      readyForMatchmaking: session.ready_for_matchmaking,
      poleId: session.pole_id,
      poleName: poles.get(session.pole_id) ?? "Polo",
      venueId: session.venue_id,
      venueName: venue?.name ?? "Local",
      courts: sessionCourts,
      queue: sessionQueue,
      matches: matches
        .filter((match) => match.sessionId === session.id)
        .sort(
          (a, b) => (a.scheduledOrder ?? 9999) - (b.scheduledOrder ?? 9999),
        ),
    };
  });

  const allMatches = sessions.flatMap((session) => session.matches);
  const activeVenueIds = new Set(
    (raw.venues ?? [])
      .filter((venue) => venue.status === "active")
      .map((venue) => venue.id),
  );
  const infrastructureReady = (raw.courts ?? []).some(
    (court) => court.status === "active" && activeVenueIds.has(court.venue_id),
  );

  return {
    generatedAt: now.toISOString(),
    sessions,
    formats: (raw.formats ?? []).map((format) => ({
      id: format.id,
      code: format.code,
      name: format.name,
    })),
    categories: (raw.categories ?? []).map((category) => ({
      id: category.id,
      code: category.code,
      name: category.name,
    })),
    metrics: {
      sessionsInProgress: sessions.filter(
        (session) => session.status === "in_progress",
      ).length,
      waiting: sessions.reduce(
        (sum, session) =>
          sum +
          session.queue.filter((entry) =>
            ["waiting", "resting"].includes(entry.status),
          ).length,
        0,
      ),
      called: allMatches.filter((match) =>
        ["called", "ready"].includes(match.status),
      ).length,
      playing: allMatches.filter((match) => match.status === "in_progress")
        .length,
      pendingReview: allMatches.filter(
        (match) => match.status === "pending_review",
      ).length,
      completed: allMatches.filter((match) => match.status === "completed")
        .length,
    },
    infrastructureReady,
    sourceErrors: raw.errors,
  };
}

export async function getAdminCourtOpsMatch(matchId: string) {
  const snapshot = await getAdminCourtOpsSnapshot();
  const session = snapshot.sessions.find((item) =>
    item.matches.some((match) => match.id === matchId),
  );
  const match = session?.matches.find((item) => item.id === matchId) ?? null;
  return { snapshot, session: session ?? null, match };
}
