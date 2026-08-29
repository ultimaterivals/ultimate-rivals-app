import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const teamPage = readFileSync(
  resolve(process.cwd(), "src/app/athlete/team/page.tsx"),
  "utf8",
);

describe("athlete team core contract", () => {
  const normalizedTeamPage = teamPage.replace(/\s+/g, " ");
  it("keeps team membership temporal and athlete scoped", () => {
    expect(teamPage).toContain('.from("team_memberships")');
    expect(teamPage).toContain('.eq("athlete_id", viewer.athleteId)');
    expect(teamPage).toContain('.lte("starts_at", now)');
    expect(teamPage).toContain("ends_at.is.null,ends_at.gt.");
  });

  it("shows canonical team ranking, roster, formations and contribution", () => {
    expect(teamPage).toContain('.eq("ranking_type", "team")');
    expect(teamPage).toContain('.from("competition_formations")');
    expect(teamPage).toContain("get_athlete_team_contributions");
    expect(teamPage).toContain("Duplas e quartetos oficiais");
    expect(teamPage).toContain("Contribuição competitiva");
  });

  it("does not invent professionalization scores, rewards or eligibility", () => {
    expect(normalizedTeamPage).toContain(
      "O App não atribui estágio, nota ou score à sua equipe sem critérios oficiais publicados e calculáveis.",
    );
    expect(normalizedTeamPage).toContain(
      "Premiações, repasses e oportunidades da equipe devem ser mostrados aqui somente quando estiverem homologados e publicáveis pelo backend oficial.",
    );
    expect(teamPage).not.toContain("progressPercent");
    expect(teamPage).not.toContain("teamScore");
  });

  it("preserves the conceptual professionalization journey without assigning a stage", () => {
    for (const stage of [
      "Formar",
      "Organizar",
      "Competir",
      "Crescer",
      "Profissionalizar",
      "Tornar-se referência",
    ]) {
      expect(teamPage).toContain(`"${stage}"`);
    }
  });
});
