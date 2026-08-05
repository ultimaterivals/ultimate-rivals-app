import { describe, expect, it } from "vitest";
import { clientFor } from "./helpers";

describe("Development, training and Hunter domains", () => {
  it("exposes PID, training and Hunter structures to admin", async () => {
    const admin = await clientFor("admin");

    const { count: themesCount, error: themesError } = await admin
      .from("hunter_themes")
      .select("id", { count: "exact", head: true });
    expect(themesError).toBeNull();
    expect(themesCount).toBe(12);

    for (const table of [
      "athlete_development_plans",
      "development_reviews",
      "training_programs",
      "training_sessions",
      "training_blocks",
      "training_attendance",
      "training_feedback",
      "hunter_missions",
      "athlete_hunter_progress",
    ]) {
      const { error } = await admin.from(table).select("id").limit(1);
      expect(error, table).toBeNull();
    }

    const { error: summaryError } = await admin
      .from("athlete_development_summary")
      .select("athlete_id,plan_id,hunter_theme")
      .limit(1);
    expect(summaryError).toBeNull();
  });
});
