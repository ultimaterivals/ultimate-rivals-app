import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260827131000_harden_canonical_team_contribution.sql",
  ),
  "utf8",
);
const teamRanking = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260813183000_team_ranking_from_formations.sql",
  ),
  "utf8",
);
const historicalDoubles = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260827103000_harden_canonical_doubles_ranking.sql",
  ),
  "utf8",
);
const athleteTeamPage = readFileSync(
  resolve(process.cwd(), "src/app/athlete/team/page.tsx"),
  "utf8",
);
const adminTeamsService = readFileSync(
  resolve(process.cwd(), "src/server/services/admin-teams-service.ts"),
  "utf8",
);

describe("canonical team contribution contract", () => {
  it("aggregates only canonical formations with event-time team evidence", () => {
    expect(migration).toContain("v_event_at");
    expect(migration).toContain("from public.team_memberships tm");
    expect(migration).toContain("tm.starts_at <= v_event_at");
    expect(migration).toContain(
      "tm.ends_at is null or tm.ends_at > v_event_at",
    );
    expect(migration).toContain("competition_formation_members cfm");
    expect(migration).toContain("canonical_team_attribution");
    expect(migration).not.toContain(
      "select cf.team_id\n      into v_formation_team_id",
    );

    expect(teamRanking).toContain("rt.transaction_scope = 'side'");
    expect(teamRanking).toContain("rt.team_id is not null");
    expect(teamRanking).toContain("rt.formation_id is not null");
    expect(teamRanking).toContain(
      "rt.rule_code in ('WIN','LOSS','ACE','ATTACK')",
    );
  });

  it("keeps team changes non-retroactive and requires explicit linkage evidence", () => {
    expect(migration).toContain("team linkage evidence required");
    expect(migration).toContain("effective_at");
    expect(migration).toContain("explicit formation transfer required");
    expect(migration).toContain("'team_attribution_event_at', v_event_at");
    expect(migration).toContain(
      "v_related_side_transaction, v_formation_team_id",
    );
  });

  it("reads doubles and reserve limits from parameters rather than service constants", () => {
    expect(migration).toContain(
      "create table public.team_competition_parameters",
    );
    expect(migration).toContain("max_formations_per_team_category");
    expect(migration).toContain("required_starters");
    expect(migration).toContain("max_reserves");
    expect(migration).toContain("from public.team_competition_parameters");
    expect(adminTeamsService).toContain("raw.parameters");
    expect(adminTeamsService).toContain("raw.formations");
    expect(adminTeamsService).not.toContain("limit: 5");
  });

  it("shows roster, position, campaign and canonical contribution in the Athlete App", () => {
    expect(athleteTeamPage).toContain("Integrantes");
    expect(athleteTeamPage).toContain("Posição");
    expect(athleteTeamPage).toContain("Campanha");
    expect(athleteTeamPage).toContain("Contribuição das formações");
    expect(athleteTeamPage).toContain('"get_athlete_team_contributions"');
    expect(athleteTeamPage).toContain('eq("ranking_type", "team")');
    expect(migration).toContain("public.get_athlete_team_contributions");
    expect(migration).toContain("rt.team_id = p_team_id");
    expect(migration).toContain("rt.transaction_scope = 'side'");
  });

  it("does not manufacture historical teams without evidence", () => {
    expect(historicalDoubles).not.toMatch(/insert into public\.teams/i);
    expect(migration).not.toMatch(/insert into public\.teams/i);
    expect(migration).toContain("active team required");
    expect(migration).toContain("team linkage evidence required");
  });
});
