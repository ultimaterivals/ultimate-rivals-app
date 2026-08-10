import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminAttendanceRepositoryData } from "@/server/repositories/admin-attendance-repository";
import { getAdminAttendanceSnapshot } from "./admin-attendance-service";

vi.mock("@/server/repositories/admin-attendance-repository", () => ({
  fetchAdminAttendanceRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAdminAttendanceRepositoryData);

describe("admin attendance service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("aggregates official attendance and commercial reservation state", async () => {
    repositoryMock.mockResolvedValue({
      sessions: [
        {
          id: "session-1",
          name: "UR Play",
          status: "in_progress",
          starts_at: "2026-08-10T22:00:00.000Z",
          ends_at: "2026-08-11T00:00:00.000Z",
          venue_id: "venue-1",
          capacity: 8,
        },
      ],
      registrations: [
        {
          id: "reg-1",
          session_id: "session-1",
          athlete_id: "athlete-1",
          registration_status: "confirmed",
          attendance_status: "checked_in",
          payment_status: "not_required",
        },
        {
          id: "reg-2",
          session_id: "session-1",
          athlete_id: "athlete-2",
          registration_status: "confirmed",
          attendance_status: "expected",
          payment_status: "not_required",
        },
      ],
      athletes: [
        { id: "athlete-1", public_name: "Ana", athlete_code: "UR-000001" },
        { id: "athlete-2", public_name: "Bia", athlete_code: "UR-000002" },
      ],
      venues: [{ id: "venue-1", name: "Arena" }],
      activities: [
        {
          id: "activity-1",
          ur_play_registration_id: "reg-1",
          status: "consumed",
        },
        {
          id: "activity-2",
          ur_play_registration_id: "reg-2",
          status: "reserved",
        },
      ],
      errors: [],
    });

    const snapshot = await getAdminAttendanceSnapshot(
      new Date("2026-08-10T21:00:00.000Z"),
    );

    expect(snapshot.sessions).toHaveLength(1);
    expect(snapshot.sessions?.[0]?.checkedInCount).toBe(1);
    expect(snapshot.sessions?.[0]?.pendingAttendanceCount).toBe(1);
    expect(snapshot.sessions?.[0]?.registrations[0]?.activityStatus).toBe(
      "consumed",
    );
  });

  it("preserves source failure instead of fabricating attendance", async () => {
    repositoryMock.mockResolvedValue({
      sessions: null,
      registrations: null,
      athletes: null,
      venues: null,
      activities: null,
      errors: ["ur_play_sessions: unavailable"],
    });

    const snapshot = await getAdminAttendanceSnapshot();
    expect(snapshot.sessions).toBeNull();
    expect(snapshot.sourceErrors).toEqual(["ur_play_sessions: unavailable"]);
  });
});
