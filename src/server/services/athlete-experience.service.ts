import type { SupabaseClient } from "@supabase/supabase-js";
import { getDevelopment } from "@/server/repositories/progression.repository";
import { getAthleteRanking } from "@/server/repositories/rankings.repository";

export const athleteLevels = {
  leveling: { short: "NÃVEL", name: "Em nivelamento" },
  n3: { short: "N3", name: "Desenvolvimento" },
  n2: { short: "N2", name: "AvanÃ§ado" },
  n1: { short: "N1", name: "Elite" },
} as const;

export type AthleteLevel = keyof typeof athleteLevels;

export function formatAthleteLevel(level: string | null | undefined) {
  return athleteLevels[level as AthleteLevel] ?? athleteLevels.leveling;
}

export function dashboardPriority(input: {
  currentMatch?: { status: string } | null;
  nextSession?: unknown;
  ranking?: unknown;
}) {
  if (
    input.currentMatch &&
    ["queued", "called", "ready", "in_progress"].includes(
      input.currentMatch.status,
    )
  )
    return "current_match" as const;
  if (input.nextSession) return "next_session" as const;
  if (input.ranking) return "ranking" as const;
  return "onboarding" as const;
}

export function rankingTargetLabel(
  position: number | null | undefined,
  target: { pointsBehind: number } | null,
) {
  if (position === 1) return "LÃDER DO RANKING";
  if (!target) return null;
  return `${target.pointsBehind} pts para a prÃ³xima posiÃ§Ã£o`;
}

export function percentageChange(current: number, previous?: number | null) {
  if (!previous || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function dedupeActivity<T extends { key: string }>(events: T[]) {
  return [...new Map(events.map((event) => [event.key, event])).values()];
}

export function groupNotificationState<T extends { read_at: string | null }>(
  notifications: T[],
) {
  return {
    fresh: notifications.filter((item) => !item.read_at),
    previous: notifications.filter((item) => item.read_at),
  };
}

export function athleteEmptyStates(input: {
  games: number;
  hasRanking: boolean;
  hasTeam: boolean;
}) {
  return {
    matches: input.games === 0,
    ranking: !input.hasRanking,
    team: !input.hasTeam,
  };
}

export function canReadPrivateAthleteContent(
  viewer: { role: string; athleteId?: string | null },
  ownerAthleteId: string,
) {
  return (
    viewer.role === "admin" ||
    (viewer.role === "athlete" && viewer.athleteId === ownerAthleteId)
  );
}

export function usefulError() {
  return "NÃ£o foi possÃ­vel carregar sua experiÃªncia agora. Tente novamente em instantes.";
}

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

export interface AthleteMatchView {
  id: string;
  matchCode: string;
  status: string;
  level: string | null;
  formatCode: string | null;
  formatName: string | null;
  categoryName: string | null;
  courtName: string | null;
  sessionName: string | null;
  playedAt: string;
  ownSideId: string;
  ownRole: string;
  resultStatus: string | null;
  scoreA: number | null;
  scoreB: number | null;
  won: boolean | null;
  sides: {
    id: string;
    side: string;
    label: string | null;
    athletes: { id: string; name: string; role: string }[];
  }[];
  statistics: Record<
    "aces" | "attacks" | "blocks" | "defenses" | "assists",
    number
  >;
  ledger: { label: string; points: number }[];
  points: number | null;
}

export async function listAthleteMatches(
  client: SupabaseClient,
  athleteId: string,
): Promise<AthleteMatchView[]> {
  const { data: participations, error } = await client
    .from("match_participants")
    .select("match_id,side_id,level_snapshot,participation_role,status")
    .eq("athlete_id", athleteId)
    .eq("status", "active");
  if (error) throw error;
  const matchIds = (participations ?? []).map((row) => row.match_id);
  if (!matchIds.length) return [];

  const [matches, technical, transactions] = await Promise.all([
    client
      .from("matches")
      .select(
        "id,match_code,status,level,started_at,ended_at,created_at,courts(name),ur_play_sessions(name,starts_at),competitive_formats(code,name),competitive_categories(name),match_results(id,winner_side_id,score_a,score_b,result_status,homologated_at),match_sides!match_sides_match_id_fkey(id,side,label,match_participants(athlete_id,status,participation_role,athletes(id,public_name)))",
      )
      .in("id", matchIds)
      .order("created_at", { ascending: false }),
    client
      .from("match_technical_summary")
      .select("match_id,aces,attacks,blocks,defenses,assists")
      .eq("athlete_id", athleteId)
      .in("match_id", matchIds),
    client
      .from("ranking_transactions")
      .select(
        "match_id,rule_code,points_applied,point_category:ranking_rules(point_category,name)",
      )
      .eq("athlete_id", athleteId)
      .eq("status", "homologated")
      .in("match_id", matchIds),
  ]);
  for (const response of [matches, technical, transactions])
    if (response.error) throw response.error;

  const participantByMatch = new Map(
    (participations ?? []).map((row) => [row.match_id, row]),
  );
  return (matches.data ?? []).map((match) => {
    const participant = participantByMatch.get(match.id)!;
    const result = one(match.match_results);
    const summary = (technical.data ?? []).find(
      (row) => row.match_id === match.id,
    );
    const ledger = (transactions.data ?? [])
      .filter((row) => row.match_id === match.id)
      .map((row) => {
        const rule = one(row.point_category);
        return {
          label: rule?.name ?? row.rule_code.replaceAll("_", " "),
          points: row.points_applied,
        };
      });
    const sides = (match.match_sides ?? []).map((side) => ({
      id: side.id,
      side: side.side,
      label: side.label,
      athletes: (side.match_participants ?? [])
        .filter((member) => member.status === "active")
        .map((member) => {
          const athlete = one(member.athletes);
          return {
            id: member.athlete_id,
            name: athlete?.public_name ?? "Atleta",
            role: member.participation_role,
          };
        }),
    }));
    const points =
      result?.result_status === "homologated"
        ? ledger.reduce((sum, item) => sum + item.points, 0)
        : null;
    return {
      id: match.id,
      matchCode: match.match_code,
      status: match.status,
      level: participant.level_snapshot ?? match.level,
      formatCode: one(match.competitive_formats)?.code ?? null,
      formatName: one(match.competitive_formats)?.name ?? null,
      categoryName: one(match.competitive_categories)?.name ?? null,
      courtName: one(match.courts)?.name ?? null,
      sessionName: one(match.ur_play_sessions)?.name ?? null,
      playedAt:
        match.ended_at ??
        match.started_at ??
        one(match.ur_play_sessions)?.starts_at ??
        match.created_at,
      ownSideId: participant.side_id,
      ownRole: participant.participation_role,
      resultStatus: result?.result_status ?? null,
      scoreA: result?.score_a ?? null,
      scoreB: result?.score_b ?? null,
      won: result?.winner_side_id
        ? result.winner_side_id === participant.side_id
        : null,
      sides,
      statistics: {
        aces: summary?.aces ?? 0,
        attacks: summary?.attacks ?? 0,
        blocks: summary?.blocks ?? 0,
        defenses: summary?.defenses ?? 0,
        assists: summary?.assists ?? 0,
      },
      ledger,
      points,
    };
  });
}

export function aggregatePerformance(matches: AthleteMatchView[]) {
  const completed = matches.filter((match) => match.resultStatus !== null);
  const homologated = completed.filter(
    (match) => match.resultStatus === "homologated",
  );
  const base = (rows: AthleteMatchView[]) => ({
    games: rows.length,
    wins: rows.filter((row) => row.won).length,
    losses: rows.filter((row) => row.won === false).length,
    winRate: rows.length
      ? (rows.filter((row) => row.won).length / rows.length) * 100
      : null,
    aces: rows.reduce((sum, row) => sum + row.statistics.aces, 0),
    attacks: rows.reduce((sum, row) => sum + row.statistics.attacks, 0),
    blocks: rows.reduce((sum, row) => sum + row.statistics.blocks, 0),
    defenses: rows.reduce((sum, row) => sum + row.statistics.defenses, 0),
    assists: rows.reduce((sum, row) => sum + row.statistics.assists, 0),
    rankingPoints: rows.reduce((sum, row) => sum + (row.points ?? 0), 0),
  });
  return {
    total: base(homologated),
    byFormat: ["doubles", "fours"].map((format) => ({
      format,
      ...base(homologated.filter((row) => row.formatCode === format)),
    })),
    byLevel: ["n3", "n2", "n1"].map((level) => ({
      level,
      ...base(homologated.filter((row) => row.level === level)),
    })),
  };
}

export async function getAthleteDashboard(
  client: SupabaseClient,
  profileId: string,
) {
  const { data: athlete, error } = await client
    .from("athletes")
    .select("id,athlete_code,public_name,avatar_url,created_at")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  if (!athlete) return null;

  const now = new Date().toISOString();
  const [
    level,
    membership,
    season,
    registrations,
    rosterMemberships,
    ranking,
    development,
    notifications,
    matches,
    squadAssignments,
  ] = await Promise.all([
    client
      .from("athlete_levels")
      .select("level,starts_at,status")
      .eq("athlete_id", athlete.id)
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("team_memberships")
      .select(
        "team_id,membership_type,teams(name,logo_url,primary_pole_id,poles(name,city,state))",
      )
      .eq("athlete_id", athlete.id)
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client
      .from("seasons")
      .select(
        "id,name,starts_at,ends_at,status,season_cycles(id,name,cycle_number,starts_at,ends_at,status)",
      )
      .lte("starts_at", now)
      .gte("ends_at", now)
      .limit(1)
      .maybeSingle(),
    client
      .from("ur_play_registrations")
      .select(
        "id,registration_status,waitlist_position,confirmed_at,ur_play_sessions(id,name,starts_at,ends_at,status,venues(name,city,state),poles(name))",
      )
      .eq("athlete_id", athlete.id)
      .in("registration_status", ["confirmed", "waitlisted"])
      .order("registered_at", { ascending: false }),
    client
      .from("team_roster_members")
      .select(
        "role,status,team_rosters(id,name,level,status,competitive_formats(code,name),competitive_categories(name))",
      )
      .eq("athlete_id", athlete.id)
      .eq("status", "active"),
    getAthleteRanking(client, athlete.id),
    getDevelopment(client, athlete.id),
    client
      .from("notifications")
      .select("id,notification_type,title,body,action_href,occurred_at,read_at")
      .eq("athlete_id", athlete.id)
      .order("occurred_at", { ascending: false })
      .limit(8),
    listAthleteMatches(client, athlete.id),
    client
      .from("match_squad_members")
      .select(
        "match_id,side_id,squad_role,initial_squad_role,status,reserve_presence_status,matches(id,match_code,status,level,created_at,started_at,ended_at,courts(name),ur_play_sessions(name,starts_at),competitive_formats(code,name),competitive_categories(name),match_sides!match_sides_match_id_fkey(id,side,label,match_participants(athlete_id,status,participation_role,athletes(id,public_name))))",
      )
      .eq("athlete_id", athlete.id)
      .eq("status", "active"),
  ]);
  for (const response of [
    level,
    membership,
    season,
    registrations,
    rosterMemberships,
    notifications,
    squadAssignments,
  ])
    if (response.error) throw response.error;

  const team = one(membership.data?.teams);
  const pole = one(team?.poles);
  const teamId = membership.data?.team_id ?? null;
  const poleId = team?.primary_pole_id ?? null;
  const rosterIds = (rosterMemberships.data ?? []).flatMap((row) => {
    const roster = one(row.team_rosters);
    return roster ? [roster.id] : [];
  });
  const [teamRanking, poleRanking, formationRankings, teamContribution] =
    await Promise.all([
      teamId
        ? client
            .from("team_rankings")
            .select("current_position,total_points,position_change")
            .eq("entity_id", teamId)
            .is("cycle_id", null)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      poleId
        ? client
            .from("pole_rankings")
            .select("current_position,total_points,position_change")
            .eq("entity_id", poleId)
            .is("cycle_id", null)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      rosterIds.length
        ? client
            .from("formation_rankings")
            .select("entity_id,current_position,total_points,ranking_type")
            .in("entity_id", rosterIds)
            .is("cycle_id", null)
        : Promise.resolve({ data: [], error: null }),
      teamId && ranking.current
        ? client
            .from("ranking_contributions")
            .select("points")
            .eq("ranking_type", "team")
            .eq("entity_id", teamId)
            .eq("athlete_id", athlete.id)
            .eq("season_id", ranking.current.season_id)
            .is("cycle_id", null)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
  for (const response of [
    teamRanking,
    poleRanking,
    formationRankings,
    teamContribution,
  ])
    if (response.error) throw response.error;

  let currentMatch =
    matches.find((match) =>
      ["queued", "called", "ready", "in_progress"].includes(match.status),
    ) ?? null;
  let reserveState = false;
  if (!currentMatch) {
    const reserve = (squadAssignments.data ?? []).find((assignment) => {
      const match = one(assignment.matches);
      return (
        match &&
        ["queued", "called", "ready", "in_progress"].includes(match.status)
      );
    });
    const match = one(reserve?.matches);
    if (reserve && match) {
      reserveState = reserve.squad_role === "reserve";
      currentMatch = {
        id: match.id,
        matchCode: match.match_code,
        status: match.status,
        level: match.level,
        formatCode: one(match.competitive_formats)?.code ?? null,
        formatName: one(match.competitive_formats)?.name ?? null,
        categoryName: one(match.competitive_categories)?.name ?? null,
        courtName: one(match.courts)?.name ?? null,
        sessionName: one(match.ur_play_sessions)?.name ?? null,
        playedAt:
          match.started_at ??
          one(match.ur_play_sessions)?.starts_at ??
          match.created_at,
        ownSideId: reserve.side_id,
        ownRole: reserve.squad_role,
        resultStatus: null,
        scoreA: null,
        scoreB: null,
        won: null,
        sides: (match.match_sides ?? []).map((side) => ({
          id: side.id,
          side: side.side,
          label: side.label,
          athletes: (side.match_participants ?? [])
            .filter((member) => member.status === "active")
            .map((member) => ({
              id: member.athlete_id,
              name: one(member.athletes)?.public_name ?? "Atleta",
              role: member.participation_role,
            })),
        })),
        statistics: { aces: 0, attacks: 0, blocks: 0, defenses: 0, assists: 0 },
        ledger: [],
        points: null,
      };
    }
  }
  const futureRegistrations = (registrations.data ?? [])
    .map((registration) => ({
      ...registration,
      session: one(registration.ur_play_sessions),
    }))
    .filter(
      (registration) =>
        registration.session && registration.session.ends_at >= now,
    )
    .sort((a, b) => a.session!.starts_at.localeCompare(b.session!.starts_at));
  const currentCycle =
    (season.data?.season_cycles ?? [])
      .filter((cycle) => cycle.starts_at <= now && cycle.ends_at >= now)
      .sort((a, b) => a.cycle_number - b.cycle_number)[0] ?? null;
  const formationById = new Map(
    (formationRankings.data ?? []).map((entry) => [entry.entity_id, entry]),
  );
  const formations = (rosterMemberships.data ?? []).flatMap((row) => {
    const roster = one(row.team_rosters);
    if (!roster) return [];
    return [
      {
        id: roster.id,
        name: roster.name,
        level: roster.level,
        role: row.role,
        format: one(roster.competitive_formats),
        category: one(roster.competitive_categories),
        ranking: formationById.get(roster.id) ?? null,
      },
    ];
  });
  const activity = dedupeActivity([
    ...(notifications.data ?? []).map((item) => ({
      key: `notification:${item.id}`,
      title: item.title,
      detail: item.body,
      href: item.action_href,
      occurredAt: item.occurred_at,
      unread: !item.read_at,
    })),
    ...matches
      .filter((match) => match.resultStatus === "homologated")
      .slice(0, 3)
      .map((match) => ({
        key: `match:${match.id}`,
        title: "Resultado homologado",
        detail: `${match.won ? "VitÃ³ria" : "Partida"} ${match.scoreA} Ã— ${match.scoreB}${match.points !== null ? ` Â· +${match.points} pts` : ""}`,
        href: `/athlete/matches/${match.id}`,
        occurredAt: match.playedAt,
        unread: false,
      })),
  ]).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return {
    athlete,
    level: level.data?.level ?? "leveling",
    levelSince: level.data?.starts_at ?? athlete.created_at,
    season: season.data,
    currentCycle,
    nextRegistration: futureRegistrations[0] ?? null,
    currentMatch,
    reserveState,
    lastMatch: matches.find((match) => match.resultStatus !== null) ?? null,
    matches,
    performance: aggregatePerformance(matches),
    ranking,
    development,
    team: team
      ? {
          id: teamId!,
          name: team.name,
          logoUrl: team.logo_url,
          membershipType: membership.data?.membership_type,
          ranking: teamRanking.data,
          contribution: teamContribution.data?.points ?? null,
        }
      : null,
    pole: pole
      ? {
          id: poleId!,
          name: pole.name,
          city: pole.city,
          state: pole.state,
          ranking: poleRanking.data,
        }
      : null,
    formations,
    activity,
    unreadCount: (notifications.data ?? []).filter((item) => !item.read_at)
      .length,
    priority: dashboardPriority({
      currentMatch,
      nextSession: futureRegistrations[0],
      ranking: ranking.current,
    }),
  };
}

export async function getAthleteId(client: SupabaseClient, profileId: string) {
  const { data, error } = await client
    .from("athletes")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
