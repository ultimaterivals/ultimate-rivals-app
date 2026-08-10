import type {
  AdminAthleteRow,
  AdminAthleteSegment,
  AdminAthletesSnapshot,
} from "@/features/admin-athletes/types";
import { fetchAdminAthletesRepositoryData } from "@/server/repositories/admin-athletes-repository";

const segments: readonly AdminAthleteSegment[] = [
  "all",
  "active30",
  "first-only",
  "at-risk",
  "inactive",
  "free-agents",
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function segmentMatches(row: AdminAthleteRow, segment: AdminAthleteSegment) {
  if (segment === "active30") return row.active30d;
  if (segment === "first-only")
    return Boolean(row.firstParticipationAt && !row.secondParticipationAt);
  if (segment === "at-risk")
    return (
      row.daysSinceLastParticipation !== null &&
      row.daysSinceLastParticipation >= 14 &&
      row.daysSinceLastParticipation <= 30
    );
  if (segment === "inactive")
    return (
      row.daysSinceLastParticipation !== null && row.daysSinceLastParticipation > 30
    );
  if (segment === "free-agents") return row.teamNames.length === 0;
  return true;
}

export async function getAdminAthletesSnapshot({
  search = "",
  segment = "all",
  poleId = null,
}: {
  search?: string;
  segment?: string;
  poleId?: string | null;
} = {}): Promise<AdminAthletesSnapshot> {
  const raw = await fetchAdminAthletesRepositoryData();
  const safeSegment: AdminAthleteSegment = segments.includes(
    segment as AdminAthleteSegment,
  )
    ? (segment as AdminAthleteSegment)
    : "all";

  const engagementByAthlete = new Map(
    (raw.engagement ?? []).map((item) => [item.athlete_id, item]),
  );
  const reportByAthlete = new Map(
    (raw.reports ?? []).map((item) => [item.athlete_id, item]),
  );
  const poleNames = new Map((raw.poles ?? []).map((pole) => [pole.id, pole.name]));
  const teamNames = new Map((raw.teams ?? []).map((team) => [team.id, team.name]));
  const teamsByAthlete = new Map<string, string[]>();
  for (const membership of raw.memberships ?? []) {
    const name = teamNames.get(membership.team_id);
    if (!name) continue;
    const current = teamsByAthlete.get(membership.athlete_id) ?? [];
    current.push(name);
    teamsByAthlete.set(membership.athlete_id, current);
  }

  const rows: AdminAthleteRow[] = (raw.athletes ?? []).map((athlete) => {
    const engagement = engagementByAthlete.get(athlete.id);
    const report = reportByAthlete.get(athlete.id);
    return {
      id: athlete.id,
      publicName: athlete.public_name,
      athleteCode: athlete.athlete_code,
      status: athlete.status,
      poleId: athlete.primary_pole_id,
      poleName: athlete.primary_pole_id
        ? (poleNames.get(athlete.primary_pole_id) ?? null)
        : null,
      level: report?.level ?? null,
      source: engagement?.source ?? null,
      participations30d: engagement?.participations_30d ?? 0,
      active30d: engagement?.active_30d ?? false,
      firstParticipationAt: engagement?.first_participation_at ?? null,
      secondParticipationAt: engagement?.second_participation_at ?? null,
      lastParticipationAt: engagement?.last_participation_at ?? null,
      daysSinceLastParticipation: engagement?.days_since_last_participation ?? null,
      returningAthlete: engagement?.returning_athlete ?? false,
      games: report?.games ?? 0,
      urCoinBalance: report?.ur_coin_balance ?? 0,
      teamNames: teamsByAthlete.get(athlete.id) ?? [],
    };
  });

  const searchTerm = normalize(search);
  const filteredRows = rows.filter((row) => {
    if (poleId && row.poleId !== poleId) return false;
    if (!segmentMatches(row, safeSegment)) return false;
    if (!searchTerm) return true;
    return normalize(`${row.publicName} ${row.athleteCode} ${row.teamNames.join(" ")}`).includes(
      searchTerm,
    );
  });

  return {
    rows,
    filteredRows,
    metrics: {
      total: rows.length,
      active30d: rows.filter((row) => row.active30d).length,
      firstOnly: rows.filter((row) => segmentMatches(row, "first-only")).length,
      atRisk: rows.filter((row) => segmentMatches(row, "at-risk")).length,
      inactive: rows.filter((row) => segmentMatches(row, "inactive")).length,
      freeAgents: rows.filter((row) => row.teamNames.length === 0).length,
    },
    poles: (raw.poles ?? []).map((pole) => ({ id: pole.id, name: pole.name })),
    query: { search, segment: safeSegment, poleId },
    sourceErrors: raw.errors,
  };
}
