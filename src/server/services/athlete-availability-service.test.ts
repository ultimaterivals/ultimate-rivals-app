import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAthleteAvailabilityRepositoryData } from "@/server/repositories/athlete-availability-repository";
import { getAthleteAvailabilitySnapshot } from "./athlete-availability-service";

vi.mock("@/server/repositories/athlete-availability-repository", () => ({
  fetchAthleteAvailabilityRepositoryData: vi.fn(),
}));

const repositoryMock = vi.mocked(fetchAthleteAvailabilityRepositoryData);

describe("athlete availability service", () => {
  beforeEach(() => repositoryMock.mockReset());

  it("maps recurring windows and pole names without creating reservations", async () => {
    repositoryMock.mockResolvedValue({
      athleteId: "a1",
      windows: [
        {
          id: "w1",
          day_of_week: 4,
          starts_at: "18:00:00",
          ends_at: "22:00:00",
          pole_id: "p1",
          modality: "beach_volleyball",
          format_codes: ["doubles"],
          category_codes: ["mixed"],
          valid_from: "2026-08-10",
          valid_until: null,
          active: true,
        },
      ],
      poles: [{ id: "p1", name: "Contagem" }],
      errors: [],
    });

    const snapshot = await getAthleteAvailabilitySnapshot("user-1");
    expect(snapshot.windows[0]?.poleName).toBe("Contagem");
    expect(snapshot.windows[0]?.formatCodes).toEqual(["doubles"]);
    expect(snapshot.windows[0]?.categoryCodes).toEqual(["mixed"]);
  });
});
