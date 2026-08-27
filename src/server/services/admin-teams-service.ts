import type {
  AdminTeamsSnapshot,
  TeamDoubleCategory,
} from "@/features/admin-teams/types";
import { fetchAdminTeamsRepositoryData } from "@/server/repositories/admin-teams-repository";

export async function getAdminTeamsSnapshot(): Promise<AdminTeamsSnapshot> {
  const raw = await fetchAdminTeamsRepositoryData();
  const poleNames = new Map(
    (raw.poles ?? []).map((pole) => [pole.id, pole.name]),
  );
  const summaryByTeam = new Map(
    (raw.summaries ?? []).map((summary) => [summary.team_id, summary]),
  );
  const doublesFormatIds = new Set(
    (raw.formats ?? [])
      .filter((format) => format.code === "doubles")
      .map((format) => format.id),
  );
  const doublesParameters = (raw.parameters ?? []).find(
    (parameter) => parameter.format_code === "doubles",
  );
  const categories = (raw.categories ?? [])
    .filter(
      (category) => category.status === "active" || category.status === "draft",
    )
    .map((category) => ({
      id: category.id,
      code: category.code,
      name: category.name,
    }));

  const teams = (raw.teams ?? []).map((team) => {
    const summary = summaryByTeam.get(team.id);
    const teamRosters = (raw.rosters ?? []).filter(
      (roster) => roster.team_id === team.id,
    );
    const teamFormations = (raw.formations ?? []).filter(
      (formation) =>
        formation.team_id === team.id &&
        formation.status === "active" &&
        doublesFormatIds.has(formation.format_id),
    );
    const doubles: TeamDoubleCategory[] = categories.map((category) => {
      const registered = teamFormations.filter(
        (formation) => formation.category_id === category.id,
      );
      return {
        categoryId: category.id,
        categoryCode: category.code,
        categoryName: category.name,
        registeredDoubles: registered.length,
        activeDoubles: registered.length,
        limit: doublesParameters?.max_formations_per_team_category ?? null,
        maxReserves: doublesParameters?.max_reserves ?? 0,
      };
    });
    return {
      id: team.id,
      name: team.name,
      shortName: team.short_name,
      status: team.status,
      poleId: team.primary_pole_id,
      poleName: team.primary_pole_id
        ? (poleNames.get(team.primary_pole_id) ?? null)
        : null,
      activeAthletes: summary?.active_athletes ?? 0,
      rosterCount: summary?.rosters ?? teamRosters.length,
      tournamentRegistrations: summary?.tournament_registrations ?? 0,
      doubles,
    };
  });

  const activeMembershipAthletes = new Set(
    (raw.memberships ?? []).map((membership) => membership.athlete_id),
  );
  const freeAgents = (raw.athletes ?? []).filter(
    (athlete) => !activeMembershipAthletes.has(athlete.id),
  ).length;
  const registeredDoubles = teams.reduce(
    (total, team) =>
      total +
      team.doubles.reduce((sub, item) => sub + item.registeredDoubles, 0),
    0,
  );
  const openDoubleSlots = teams.reduce(
    (total, team) =>
      total +
      team.doubles.reduce(
        (sub, item) =>
          item.limit === null
            ? sub
            : sub + Math.max(item.limit - item.registeredDoubles, 0),
        0,
      ),
    0,
  );

  return {
    teams,
    metrics: {
      officialTeams: teams.length,
      activeAthletes: teams.reduce(
        (total, team) => total + team.activeAthletes,
        0,
      ),
      registeredDoubles,
      openDoubleSlots,
      freeAgents,
    },
    categories,
    sourceErrors: raw.errors,
  };
}
