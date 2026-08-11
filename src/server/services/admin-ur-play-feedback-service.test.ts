import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminFeedbackRepositoryData } from "@/server/repositories/admin-ur-play-feedback-repository";
import { getAdminFeedbackSnapshot } from "./admin-ur-play-feedback-service";

vi.mock("@/server/repositories/admin-ur-play-feedback-repository", () => ({
  fetchAdminFeedbackRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminFeedbackRepositoryData);

function request(
  id: string,
  status: "pending" | "sent" | "responded" | "waived",
  score: number | null = null,
) {
  return {
    id,
    session_id: "session-1",
    athlete_id: `athlete-${id}`,
    status,
    channel: status === "pending" ? null : "app",
    dispatch_mode: status === "pending" ? null : "system",
    dispatch_evidence: status === "pending" ? null : "athlete_portal",
    sent_at: status === "pending" ? null : "2026-08-11T20:00:00.000Z",
    recommendation_score: score,
    response_comment: null,
    responded_at: status === "responded" ? "2026-08-11T21:00:00.000Z" : null,
    waiver_reason: status === "waived" ? "Canal indisponível" : null,
  };
}

describe("admin UR Play feedback service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("separates UR average score from standard NPS", async () => {
    repositoryMock.mockResolvedValue({
      requests: [
        request("1", "responded", 10),
        request("2", "responded", 8),
        request("3", "responded", 5),
        request("4", "sent"),
      ],
      athletes: [
        { id: "athlete-1", public_name: "A", athlete_code: "ATL-1" },
        { id: "athlete-2", public_name: "B", athlete_code: "ATL-2" },
        { id: "athlete-3", public_name: "C", athlete_code: "ATL-3" },
        { id: "athlete-4", public_name: "D", athlete_code: "ATL-4" },
      ],
      sessions: [
        {
          id: "session-1",
          name: "UR Play",
          ends_at: "2026-08-11T18:00:00.000Z",
        },
      ],
      closures: [],
      errors: [],
    });

    const snapshot = await getAdminFeedbackSnapshot();
    expect(snapshot.sessions[0]?.metrics).toMatchObject({
      eligible: 4,
      pending: 0,
      responded: 3,
      responseRatePct: 75,
      averageRecommendationScore: 7.67,
      standardNpsScore: 0,
      promoters: 1,
      passives: 1,
      detractors: 1,
      targetAbove8: false,
      ready: true,
    });
  });

  it("keeps the session unready while a present athlete has no dispatched channel", async () => {
    repositoryMock.mockResolvedValue({
      requests: [request("1", "sent"), request("2", "pending")],
      athletes: [],
      sessions: [
        {
          id: "session-1",
          name: "UR Play",
          ends_at: "2026-08-11T18:00:00.000Z",
        },
      ],
      closures: [],
      errors: [],
    });

    const snapshot = await getAdminFeedbackSnapshot();
    expect(snapshot.sessions[0]?.metrics.ready).toBe(false);
    expect(snapshot.metrics.pendingDispatch).toBe(1);
  });
});
