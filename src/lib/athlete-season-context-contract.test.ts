import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const service = readFileSync(
  resolve(
    process.cwd(),
    "src/server/services/athlete-season-context-service.ts",
  ),
  "utf8",
);
const banner = readFileSync(
  resolve(process.cwd(), "src/components/athlete/season-context-banner.tsx"),
  "utf8",
);
const seasonPage = readFileSync(
  resolve(process.cwd(), "src/app/athlete/season/page.tsx"),
  "utf8",
);

const forbiddenPlaceholder = ["2026", "08", "28"].join("-");

const indexOfStage = (name: string) => service.indexOf(`name: "${name}"`);

describe("athlete season context contract", () => {
  it("preserves the Season 1 public context and roadmap in one backend service", () => {
    expect(service).toContain('title: "Temporada 1 · Agosto–Outubro 2026"');
    expect(service).toContain('phaseLabel: "Abertura + UR Play"');

    const roadmap = [
      "Abertura",
      "UR Play/Ranking",
      "Series",
      "Cup",
      "Legends",
      "Virada",
    ];
    roadmap.forEach((stage) => expect(indexOfStage(stage)).toBeGreaterThan(-1));
    for (let index = 1; index < roadmap.length; index += 1) {
      expect(indexOfStage(roadmap[index])).toBeGreaterThan(
        indexOfStage(roadmap[index - 1]),
      );
    }
  });

  it("uses a canonical season row when available and otherwise returns the safe fallback", () => {
    expect(service).toContain('.from("seasons")');
    expect(service).toContain('["registration", "active", "closing"]');
    expect(service).toContain('source: "fallback"');
    expect(service).toContain('source: "canonical"');
    expect(service).toContain(
      "if (result.error || !result.data) return fallback",
    );
    expect(service).toContain("seasonId: result.data.id");
  });

  it("keeps stage dates nullable and never invents the placeholder date", () => {
    expect(service).toContain("startsAt: string | null");
    expect(service).toContain("endsAt: string | null");
    expect(service).toContain("startsAt: null");
    expect(service).toContain("endsAt: null");
    expect(service).not.toContain(forbiddenPlaceholder);
    expect(banner).not.toContain(forbiddenPlaceholder);
    expect(seasonPage).not.toContain(forbiddenPlaceholder);
  });

  it("drives both athlete surfaces from the shared snapshot instead of duplicate context constants", () => {
    expect(banner).toContain("getAthleteSeasonContextSnapshot");
    expect(banner).toContain("season.title");
    expect(banner).toContain("season.phaseLabel");
    expect(seasonPage).toContain("getAthleteSeasonContextSnapshot");
    expect(seasonPage).toContain("season.title");
    expect(seasonPage).toContain("season.phaseLabel");
    expect(seasonPage).toContain("season.stages.map");
    expect(banner).not.toContain("Temporada 1 · Agosto–Outubro 2026");
    expect(seasonPage).not.toContain("Temporada 1 · Agosto–Outubro 2026");
  });
});
