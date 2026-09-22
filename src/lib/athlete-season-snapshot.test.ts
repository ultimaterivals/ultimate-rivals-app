import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { resolveAthleteSeasonContext } from "@/server/services/athlete-season-context-service";

describe("canonical season communication", () => {
  const season = {
    id: "test-season",
    name: "[QA] Published season",
    starts_at: "2026-08-01T03:00:00Z",
    ends_at: "2026-11-01T03:00:00Z",
  };

  it("does not turn an unavailable calendar into an active campaign", () => {
    const snapshot = resolveAthleteSeasonContext(null);
    expect(snapshot.source).toBe("fallback");
    expect(snapshot.phasePublished).toBe(false);
    expect(
      snapshot.stages.every((stage) => stage.state === "unpublished"),
    ).toBe(true);
    expect(snapshot.stages.every((stage) => stage.startsAt === null)).toBe(
      true,
    );
  });

  it("uses the published name and interval without inventing the current phase", () => {
    const snapshot = resolveAthleteSeasonContext(season);
    expect(snapshot.title).toBe(season.name);
    expect(snapshot.startsAt).toBe(season.starts_at);
    expect(snapshot.endsAt).toBe(season.ends_at);
    expect(snapshot.phasePublished).toBe(false);
    expect(snapshot.stages.filter((stage) => stage.state === "active")).toEqual(
      [],
    );
  });

  it("uses a published phase without treating the week as an entire stage interval", () => {
    const snapshot = resolveAthleteSeasonContext(season, {
      phase: "Competição",
      primary_product: "UR Series",
      starts_at: "2026-09-01T03:00:00Z",
      ends_at: "2026-09-08T03:00:00Z",
    });
    expect(snapshot.phaseLabel).toBe("Competição");
    expect(snapshot.phasePublished).toBe(true);
    expect(
      snapshot.stages
        .filter((stage) => stage.state === "active")
        .map((stage) => stage.code),
    ).toEqual(["series"]);
    expect(
      snapshot.stages.every(
        (stage) => stage.startsAt === null && stage.endsAt === null,
      ),
    ).toBe(true);
  });
});
