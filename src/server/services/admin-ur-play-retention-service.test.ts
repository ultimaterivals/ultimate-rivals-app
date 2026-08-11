import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminRetentionRepositoryData } from "@/server/repositories/admin-ur-play-retention-repository";
import { getAdminRetentionSnapshot } from "./admin-ur-play-retention-service";

vi.mock("@/server/repositories/admin-ur-play-retention-repository", () => ({
  fetchAdminRetentionRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminRetentionRepositoryData);

function row(
  status: "pending" | "contacted" | "converted" | "waived",
  id: string,
) {
  return {
    id,
    source_session_id: "session-1",
    athlete_id: `athlete-${id}`,
    participation_number: 1,
    cohort: "first_time",
    status,
    suggested_opportunity_id: "opp-1",
    due_at: "2026-08-12T22:00:00.000Z",
    contacted_at: status === "contacted" ? "2026-08-11T12:00:00.000Z" : null,
    contact_channel: status === "contacted" ? "whatsapp" : null,
    contact_notes: null,
    converted_at: status === "converted" ? "2026-08-18T22:00:00.000Z" : null,
    converted_session_id: status === "converted" ? "session-2" : null,
    waiver_reason:
      status === "waived" ? "Contato não aplicável neste caso" : null,
  };
}

describe("admin UR Play retention service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("measures first-to-second participation without treating contact as conversion", async () => {
    repositoryMock.mockResolvedValue({
      followups: [
        row("contacted", "1"),
        row("converted", "2"),
        row("pending", "3"),
      ],
      athletes: [
        { id: "athlete-1", public_name: "Ana", athlete_code: "ATL-001" },
        { id: "athlete-2", public_name: "Bia", athlete_code: "ATL-002" },
        { id: "athlete-3", public_name: "Caio", athlete_code: "ATL-003" },
      ],
      sessions: [
        {
          id: "session-1",
          name: "UR Play 01",
          ends_at: "2026-08-10T22:00:00.000Z",
        },
        {
          id: "session-2",
          name: "UR Play 02",
          ends_at: "2026-08-18T22:00:00.000Z",
        },
      ],
      opportunities: [
        {
          id: "opp-1",
          title: "UR Play seguinte",
          starts_at: "2026-08-18T20:00:00.000Z",
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminRetentionSnapshot();
    expect(snapshot.metrics).toMatchObject({
      total: 3,
      pending: 1,
      contacted: 1,
      converted: 1,
      conversionRate: 50,
    });
    expect(snapshot.followups[0]).toMatchObject({
      athleteName: "Ana",
      suggestedOpportunityTitle: "UR Play seguinte",
      status: "contacted",
    });
  });

  it("returns an empty operational desk without inventing followups", async () => {
    repositoryMock.mockResolvedValue({
      followups: [],
      athletes: [],
      sessions: [],
      opportunities: [],
      errors: [],
    });

    const snapshot = await getAdminRetentionSnapshot();
    expect(snapshot.followups).toEqual([]);
    expect(snapshot.metrics.total).toBe(0);
    expect(snapshot.metrics.conversionRate).toBe(0);
  });
});
