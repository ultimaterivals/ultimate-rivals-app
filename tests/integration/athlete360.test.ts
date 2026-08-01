import { describe, expect, it } from "vitest";
import { clientFor, ids } from "./helpers";
describe("Athlete 360 remote DEV", () => {
  it("admin manages accountless athlete, profile, status, notes and level transaction", async () => {
    const admin = await clientFor("admin");
    const athleteId = crypto.randomUUID();
    try {
      const created = await admin
        .from("athletes")
        .insert({
          id: athleteId,
          public_name: "[TEST] Athlete 360",
          full_name: "Fictitious Integration Athlete",
          gender: "undisclosed",
          email_contact: `test-${athleteId}@example.invalid`,
        })
        .select("athlete_code,profile_id")
        .single();
      expect(created.error).toBeNull();
      expect(created.data?.athlete_code).toMatch(/^UR-\d{6}$/);
      expect(created.data?.profile_id).toBeNull();
      expect(
        (
          await admin
            .from("athletes")
            .update({ athlete_code: "UR-999999" })
            .eq("id", athleteId)
        ).error?.code,
      ).toBe("23514");
      expect(
        (
          await admin
            .from("athletes")
            .update({ profile_id: "a0000000-0000-4000-8000-000000000002" })
            .eq("id", athleteId)
        ).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("athletes")
            .update({
              profile_id: null,
              status: "archived",
              archived_at: new Date().toISOString(),
            })
            .eq("id", athleteId)
        ).error,
      ).toBeNull();
      expect(
        (
          await admin
            .from("athletes")
            .update({ status: "active", archived_at: null })
            .eq("id", athleteId)
        ).error,
      ).toBeNull();
      const level = await admin.rpc("assign_athlete_level", {
        target_athlete_id: athleteId,
        target_season_id: ids.season,
        target_level: "n3",
        effective_at: new Date().toISOString(),
        assignment_reason: "[TEST] initial leveling",
      });
      expect(level.error).toBeNull();
      const later = new Date(Date.now() + 1000).toISOString();
      expect(
        (
          await admin.rpc("assign_athlete_level", {
            target_athlete_id: athleteId,
            target_season_id: ids.season,
            target_level: "n2",
            effective_at: later,
            assignment_reason: "[TEST] progression",
          })
        ).error,
      ).toBeNull();
      const levels =
        (
          await admin
            .from("athlete_levels")
            .select("status,ends_at")
            .eq("athlete_id", athleteId)
        ).data ?? [];
      expect(levels.length).toBeGreaterThanOrEqual(2);
      expect(levels.filter((v) => v.status === "active")).toHaveLength(1);
      expect(
        (
          await admin.from("athlete_notes").insert({
            athlete_id: athleteId,
            author_user_id: ids.admin,
            note_type: "technical",
            content: "[TEST] fictitious note",
            visibility: "internal",
          })
        ).error,
      ).toBeNull();
    } finally {
      await admin.from("athlete_notes").delete().eq("athlete_id", athleteId);
      await admin.from("athlete_levels").delete().eq("athlete_id", athleteId);
      await admin.from("athletes").delete().eq("id", athleteId);
    }
  });
  it("athlete updates only own allowed fields", async () => {
    const athlete = await clientFor("athlete");
    expect(
      (
        await athlete
          .from("athletes")
          .update({ bio: "[TEST] own bio", city: "Betim", state: "MG" })
          .eq("id", ids.athleteA)
      ).error,
    ).toBeNull();
    expect(
      (
        await athlete
          .from("athletes")
          .update({ status: "suspended" })
          .eq("id", ids.athleteA)
      ).error?.code,
    ).toBe("42501");
    expect(
      (await athlete.from("athletes").select("id").eq("id", ids.athleteB))
        .data ?? [],
    ).toHaveLength(0);
  });
  it("managers and anon cannot read athlete PII", async () => {
    for (const role of ["teammanager", "polemanager"] as const) {
      const client = await clientFor(role);
      expect(
        (await client.from("athletes").select("id,full_name,email_contact"))
          .data ?? [],
      ).toHaveLength(0);
    }
  });
  it("storage restricts avatar folders", async () => {
    const athlete = await clientFor("athlete");
    const own = `${ids.athleteA}/${crypto.randomUUID()}.png`;
    const other = `${ids.athleteB}/${crypto.randomUUID()}.png`;
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(
      (
        await athlete.storage
          .from("athlete-avatars")
          .upload(own, bytes, { contentType: "image/png" })
      ).error,
    ).toBeNull();
    expect(
      (
        await athlete.storage
          .from("athlete-avatars")
          .upload(other, bytes, { contentType: "image/png" })
      ).error,
    ).not.toBeNull();
    const admin = await clientFor("admin");
    const managed = `${ids.athleteB}/${crypto.randomUUID()}.png`;
    expect(
      (
        await admin.storage
          .from("athlete-avatars")
          .upload(managed, bytes, { contentType: "image/png" })
      ).error,
    ).toBeNull();
    await admin.storage.from("athlete-avatars").remove([managed]);
    await athlete.storage.from("athlete-avatars").remove([own]);
  });
  it("imports valid CSV batches atomically and rolls back mixed batches", async () => {
    const admin = await clientFor("admin");
    const marker = crypto.randomUUID();
    const valid = [
      {
        public_name: `[TEST] CSV A ${marker}`,
        full_name: `Fictitious CSV A ${marker}`,
        birth_date: "",
        gender: "undisclosed",
        email_contact: "",
        phone: "",
        city: "Betim",
        state: "MG",
      },
      {
        public_name: `[TEST] CSV B ${marker}`,
        full_name: `Fictitious CSV B ${marker}`,
        birth_date: "",
        gender: "undisclosed",
        email_contact: "",
        phone: "",
        city: "Betim",
        state: "MG",
      },
    ];
    const inserted = await admin.rpc("import_athletes_csv", { rows: valid });
    expect(inserted.error).toBeNull();
    expect(inserted.data).toHaveLength(2);
    const badMarker = crypto.randomUUID();
    const mixed = await admin.rpc("import_athletes_csv", {
      rows: [
        {
          ...valid[0],
          public_name: `[TEST] MIX ${badMarker}`,
          full_name: `Fictitious MIX ${badMarker}`,
        },
        { ...valid[1], public_name: "x", gender: "invalid" },
      ],
    });
    expect(mixed.error).not.toBeNull();
    expect(
      (
        await admin
          .from("athletes")
          .select("id")
          .ilike("public_name", `%${badMarker}%`)
      ).data ?? [],
    ).toHaveLength(0);
    await admin.from("athletes").delete().ilike("public_name", `%${marker}%`);
  });
});
