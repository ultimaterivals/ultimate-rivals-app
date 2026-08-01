import { describe, expect, it } from "vitest";
import { clientFor, ids, type TestRole } from "./helpers";

describe("audit trail", () => {
  it("records actor and before/after data", async () => {
    const client = await clientFor("admin");
    const id = crypto.randomUUID();
    await client.from("athletes").insert({
      id,
      public_name: "Audit Test",
      full_name: "Audit Test",
      gender: "undisclosed",
      status: "draft",
    });
    await client.from("athletes").update({ status: "active" }).eq("id", id);
    const { data } = await client
      .from("audit_logs")
      .select(
        "actor_user_id,action,entity_type,entity_id,before_data,after_data,metadata,created_at",
      )
      .eq("entity_id", id)
      .order("created_at");
    expect(data?.length).toBe(2);
    expect(data?.every((row) => row.actor_user_id === ids.admin)).toBe(true);
    expect(data?.[1]?.before_data).toBeTruthy();
    expect(data?.[1]?.after_data).toBeTruthy();
    expect(data?.[1]?.metadata).toBeTruthy();
  });

  it("is append-only for every application role", async () => {
    const roles: TestRole[] = [
      "admin",
      "operator",
      "polemanager",
      "teammanager",
      "athlete",
    ];
    for (const role of roles) {
      const client = await clientFor(role);
      const update = await client
        .from("audit_logs")
        .update({ action: "tampered" })
        .not("id", "is", null);
      const remove = await client
        .from("audit_logs")
        .delete()
        .not("id", "is", null);
      expect(update.error).not.toBeNull();
      expect(remove.error).not.toBeNull();
    }
  });
});
