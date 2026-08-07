import { describe, expect, it } from "vitest";
import {
  dashboardPriority,
  athleteEmptyStates,
  canReadPrivateAthleteContent,
  dedupeActivity,
  formatAthleteLevel,
  percentageChange,
  groupNotificationState,
  rankingTargetLabel,
} from "./athlete-experience.service";

describe("athlete experience rules", () => {
  it("prioritizes a current match over session and ranking", () => {
    expect(
      dashboardPriority({
        currentMatch: { status: "called" },
        nextSession: {},
        ranking: {},
      }),
    ).toBe("current_match");
    expect(dashboardPriority({ nextSession: {}, ranking: {} })).toBe(
      "next_session",
    );
    expect(dashboardPriority({ currentMatch: { status: "in_progress" } })).toBe(
      "current_match",
    );
    expect(dashboardPriority({ ranking: {} })).toBe("ranking");
    expect(dashboardPriority({})).toBe("onboarding");
  });

  it("formats levels and ranking targets without inventing a target", () => {
    expect(formatAthleteLevel("n2")).toEqual({
      short: "N2",
      name: "Avançado",
    });
    expect(rankingTargetLabel(1, null)).toBe("LÍDER DO RANKING");
    expect(rankingTargetLabel(8, null)).toBeNull();
    expect(rankingTargetLabel(8, { pointsBehind: 32 })).toContain("32 pts");
  });

  it("does not compare an absent prior sample", () => {
    expect(percentageChange(18, 0)).toBeNull();
    expect(percentageChange(118, 100)).toBe(18);
  });

  it("deduplicates feed events by stable key", () => {
    expect(
      dedupeActivity([
        { key: "ranking:1", value: 1 },
        { key: "ranking:1", value: 2 },
      ]),
    ).toEqual([{ key: "ranking:1", value: 2 }]);
  });

  it("groups notification state and exposes the right empty states", () => {
    expect(
      groupNotificationState([
        { id: "new", read_at: null },
        { id: "old", read_at: "2026-08-02T00:00:00Z" },
      ]),
    ).toEqual({
      fresh: [{ id: "new", read_at: null }],
      previous: [{ id: "old", read_at: "2026-08-02T00:00:00Z" }],
    });
    expect(
      athleteEmptyStates({ games: 0, hasRanking: false, hasTeam: false }),
    ).toEqual({ matches: true, ranking: true, team: true });
  });

  it("keeps private feed visibility scoped to owner or admin", () => {
    expect(
      canReadPrivateAthleteContent(
        { role: "athlete", athleteId: "athlete-a" },
        "athlete-a",
      ),
    ).toBe(true);
    expect(
      canReadPrivateAthleteContent(
        { role: "athlete", athleteId: "athlete-b" },
        "athlete-a",
      ),
    ).toBe(false);
    expect(
      canReadPrivateAthleteContent({ role: "team_manager" }, "athlete-a"),
    ).toBe(false);
    expect(canReadPrivateAthleteContent({ role: "admin" }, "athlete-a")).toBe(
      true,
    );
  });
});
