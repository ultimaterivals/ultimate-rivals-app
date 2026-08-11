import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminMediaRepositoryData } from "@/server/repositories/admin-ur-play-media-repository";
import { getAdminMediaSnapshot } from "./admin-ur-play-media-service";

vi.mock("@/server/repositories/admin-ur-play-media-repository", () => ({
  fetchAdminMediaRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminMediaRepositoryData);

function row(
  key: string,
  status: "pending" | "in_progress" | "published" | "waived",
  blocking = true,
) {
  return {
    id: `delivery-${key}`,
    session_id: "session-1",
    deliverable_key: key,
    status,
    blocking,
    due_at: "2099-08-12T22:00:00.000Z",
    channel: status === "published" ? "instagram_post" : null,
    publication_url:
      status === "published" ? `https://example.com/${key}` : null,
    media_asset_id: null,
    notes: null,
    published_at:
      status === "published" ? "2026-08-11T20:00:00.000Z" : null,
    waiver_reason: status === "waived" ? "Entrega não aplicável" : null,
  };
}

describe("admin UR Play media service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("only marks a session ready when the five blocking deliveries are resolved", async () => {
    repositoryMock.mockResolvedValue({
      deliverables: [
        row("result_summary", "published"),
        row("photo_carousel", "published"),
        row("athlete_highlights", "waived"),
        row("best_moments", "published"),
        row("ranking_update", "published"),
        row("next_event_announcement", "pending", false),
      ],
      sessions: [
        {
          id: "session-1",
          name: "UR Play 01",
          ends_at: "2026-08-11T18:00:00.000Z",
        },
      ],
      closures: [],
      errors: [],
    });

    const snapshot = await getAdminMediaSnapshot();
    expect(snapshot.sessions[0]?.counts).toMatchObject({
      blocking: 5,
      pending: 0,
      ready: true,
    });
    expect(snapshot.metrics).toMatchObject({
      total: 6,
      published: 4,
      pending: 1,
      readySessions: 1,
    });
  });

  it("does not invent media work when there are no deliverables", async () => {
    repositoryMock.mockResolvedValue({
      deliverables: [],
      sessions: [],
      closures: [],
      errors: [],
    });

    const snapshot = await getAdminMediaSnapshot();
    expect(snapshot.sessions).toEqual([]);
    expect(snapshot.metrics.total).toBe(0);
    expect(snapshot.metrics.readySessions).toBe(0);
  });
});