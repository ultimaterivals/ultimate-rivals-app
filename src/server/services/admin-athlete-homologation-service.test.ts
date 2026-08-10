import { describe, expect, it } from "vitest";
import { buildAthleteActivationBlockers } from "@/server/services/admin-athlete-homologation-service";
import type {
  RawHomologationAthlete,
  RawHomologationPole,
} from "@/server/repositories/admin-athlete-homologation-repository";

const athlete: RawHomologationAthlete = {
  id: "a0000000-0000-4000-8000-000000000001",
  athlete_code: "UR-000001",
  public_name: "Atleta",
  full_name: "Atleta Teste",
  birth_date: "1994-08-31",
  phone: "+5531999999999",
  email_contact: "atleta@example.com",
  primary_pole_id: "b0000000-0000-4000-8000-000000000001",
  profile_id: null,
  status: "draft",
};

const activePole: RawHomologationPole = {
  id: "b0000000-0000-4000-8000-000000000001",
  name: "Betim",
  city: "Betim",
  status: "active",
};

const today = new Date("2026-08-10T12:00:00Z");

describe("buildAthleteActivationBlockers", () => {
  it("allows an adult draft athlete with valid contacts and active pole", () => {
    expect(buildAthleteActivationBlockers(athlete, activePole, today)).toEqual(
      [],
    );
  });

  it("blocks a draft pole", () => {
    const blockers = buildAthleteActivationBlockers(
      athlete,
      { ...activePole, status: "draft" },
      today,
    );
    expect(blockers.map((item) => item.code)).toContain("POLE_NOT_ACTIVE");
  });

  it("blocks minors until guardian consent flow exists", () => {
    const blockers = buildAthleteActivationBlockers(
      { ...athlete, birth_date: "2011-03-01" },
      activePole,
      today,
    );
    expect(blockers.map((item) => item.code)).toContain(
      "MINOR_GUARDIAN_REQUIRED",
    );
  });

  it("blocks invalid contact data", () => {
    const blockers = buildAthleteActivationBlockers(
      { ...athlete, phone: "3199", email_contact: "invalid" },
      activePole,
      today,
    );
    expect(blockers.map((item) => item.code)).toEqual(
      expect.arrayContaining(["EMAIL_REQUIRED", "PHONE_REQUIRED"]),
    );
  });

  it("treats active athletes as already homologated", () => {
    expect(
      buildAthleteActivationBlockers(
        { ...athlete, status: "active" },
        null,
        today,
      ),
    ).toEqual([]);
  });
});
