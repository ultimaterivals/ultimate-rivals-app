import { describe, expect, it } from "vitest";
import {
  dashboardPriority,
  athleteEmptyStates,
  canReadPrivateAthleteContent,
  dedupeActivity,
  formatAthleteLevel,
  getAthleteNextAction,
  getAthleteSeasonStages,
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

  it("chooses the next action without granting points or rewards", () => {
    expect(
      getAthleteNextAction({
        currentMatch: { id: "match-1", status: "called" },
        nextRegistration: {
          id: "reg-1",
          registration_status: "confirmed",
          waitlist_position: null,
        },
        ranking: { current_position: 4, total_points: 100 },
      }),
    ).toMatchObject({
      type: "current_match",
      href: "/athlete/matches/match-1",
      priority: 100,
    });

    expect(
      getAthleteNextAction({
        nextRegistration: {
          id: "reg-2",
          registration_status: "waitlisted",
          waitlist_position: 2,
        },
        formations: [{ id: "formation-1", name: "Dupla A" }],
      }).type,
    ).toBe("waitlist");

    expect(
      getAthleteNextAction({
        formations: [],
        ranking: { current_position: 2, total_points: 100 },
      }).type,
    ).toBe("formation");
  });

  it("derives season stages from official states only", () => {
    const stages = getAthleteSeasonStages({
      hasRanking: true,
      matchCount: 3,
      hasUpcomingUrPlay: true,
      seasonStatus: "active",
      competitions: [
        {
          tournament_registrations: {
            status: "confirmed",
            tournament_divisions: {
              tournaments: { product: "series", status: "registration_open" },
            },
          },
        },
      ],
    });

    expect(stages.map((stage) => stage.code)).toEqual([
      "inicio",
      "ur_play",
      "series",
      "cup",
      "legends",
      "virada",
    ]);
    expect(stages.find((stage) => stage.code === "inicio")?.status).toBe(
      "completed",
    );
    expect(stages.find((stage) => stage.code === "ur_play")?.status).toBe(
      "registered",
    );
    expect(stages.find((stage) => stage.code === "series")?.status).toBe(
      "registered",
    );
    expect(stages.find((stage) => stage.code === "cup")?.status).toBe("locked");
  });
});
