import { describe, expect, it } from "vitest";
import { clientFor } from "./helpers";

describe("Staff and refereeing operations", () => {
  it("exposes operational staff roles and officiating read models to admin", async () => {
    const admin = await clientFor("admin");

    const { data: roles, error: rolesError } = await admin
      .from("staff_role_catalog")
      .select("role,category,formal_officiating")
      .order("role");
    expect(rolesError).toBeNull();
    expect(roles?.map((role) => role.role)).toEqual(
      expect.arrayContaining([
        "technical_director",
        "pole_coordinator",
        "technical_evaluator",
        "referee",
        "assistant_referee",
        "score_operator",
        "performance_analyst",
        "media_operator",
        "coach",
      ]),
    );
    expect(
      roles?.filter((role) => role.formal_officiating).map((role) => role.role),
    ).toEqual(expect.arrayContaining(["referee", "assistant_referee"]));

    const { error: directoryError } = await admin
      .from("admin_staff_directory")
      .select("id,profile_id,display_name,role,pole_name")
      .limit(5);
    expect(directoryError).toBeNull();

    const { error: officiatingError } = await admin
      .from("match_officiating_operations")
      .select("match_id,match_code,role,assignment_status,match_scope")
      .limit(5);
    expect(officiatingError).toBeNull();
  });
});
