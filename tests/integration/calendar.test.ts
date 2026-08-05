import { describe, expect, it } from "vitest";
import { clientFor } from "./helpers";

describe("Season calendar operations", () => {
  it("exposes Q1 templates and calendar operation read models to admin", async () => {
    const admin = await clientFor("admin");
    const { count, error } = await admin
      .from("calendar_q1_templates")
      .select("id", { count: "exact", head: true });
    expect(error).toBeNull();
    expect(count ?? 0).toBeGreaterThanOrEqual(12);

    const { error: operationsError } = await admin
      .from("admin_calendar_operations")
      .select("id,name,event_type,status,assigned_courts,open_checklist_items")
      .limit(5);
    expect(operationsError).toBeNull();
  });
});
