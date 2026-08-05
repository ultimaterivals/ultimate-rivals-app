import { describe, expect, it } from "vitest";
import { clientFor } from "./helpers";

describe("Commercial pricing and manual payments", () => {
  it("exposes configurable Q1 products, packages and billing read models", async () => {
    const admin = await clientFor("admin");
    const { data: products, error: productsError } = await admin
      .from("products")
      .select("code,product_type")
      .order("code");
    expect(productsError).toBeNull();
    expect(products?.map((product) => product.code)).toEqual(
      expect.arrayContaining([
        "ur_play_single",
        "ur_play_pack_4",
        "ur_play_pack_8",
        "ur_play_development",
        "journey_ur_hunter",
        "tournament_q1_entry",
      ]),
    );

    const { data: rules, error: rulesError } = await admin
      .from("pricing_rules")
      .select("scope,unit_amount,rule_config");
    expect(rulesError).toBeNull();
    expect(rules?.some((rule) => rule.scope === "q1_default")).toBe(true);
    expect(
      rules?.some((rule) => rule.scope === "q1_tournament_multi_entry"),
    ).toBe(true);

    const { error: adminPaymentsError } = await admin
      .from("admin_payment_operations")
      .select("id,description,amount,status,paid_amount")
      .limit(5);
    expect(adminPaymentsError).toBeNull();
  });
});
