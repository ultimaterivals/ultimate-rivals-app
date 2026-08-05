import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { clientFor, testKey, testUrl } from "./helpers";

describe("Season prizes, repasses and finance", () => {
  it("exposes configurable Q1 prize templates and the official repass plan", async () => {
    const admin = await clientFor("admin");

    const { data: templates, error: templatesError } = await admin
      .from("tournament_prize_plan_templates")
      .select("id,code,product")
      .order("code");
    expect(templatesError).toBeNull();
    expect(templates?.map((template) => template.code)).toEqual(
      expect.arrayContaining([
        "q1_ur_series_cash_prizes",
        "q1_ur_cup_cash_prizes",
        "q1_ur_legends_cash_prizes",
      ]),
    );

    const cupTemplate = templates?.find(
      (template) => template.code === "q1_ur_cup_cash_prizes",
    );
    expect(cupTemplate?.id).toBeTruthy();

    const { data: allocations, error: allocationsError } = await admin
      .from("tournament_prize_template_allocations")
      .select("template_id,award_code,amount");
    expect(allocationsError).toBeNull();
    expect(allocations?.length).toBe(12);
    expect(
      allocations?.some(
        (allocation) =>
          allocation.template_id === cupTemplate?.id &&
          allocation.award_code === "champion" &&
          Number(allocation.amount) === 1200,
      ),
    ).toBe(true);

    const { data: repassPlans, error: repassPlansError } = await admin
      .from("season_repass_plans")
      .select("code,total_amount,frozen_snapshot")
      .eq("code", "q1_official_repass_5000");
    expect(repassPlansError).toBeNull();
    expect(Number(repassPlans?.[0]?.total_amount)).toBe(5000);
    expect(repassPlans?.[0]?.frozen_snapshot).toMatchObject({
      team_allocations: [1500, 1000, 1000],
      athlete_allocations: [500, 500, 500],
    });

    const { data: repassAllocations, error: repassAllocationsError } =
      await admin
        .from("season_repass_allocations")
        .select("allocation_code,amount,beneficiary_type");
    expect(repassAllocationsError).toBeNull();
    expect(repassAllocations?.length).toBe(6);
    expect(
      repassAllocations?.reduce(
        (sum, allocation) => sum + Number(allocation.amount),
        0,
      ),
    ).toBe(5000);
  });

  it("keeps operational finance behind admin/operator RLS", async () => {
    const admin = await clientFor("admin");
    const anon = createClient(testUrl, testKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: adminRevenueError } = await admin
      .from("revenue_entries")
      .select("id,amount,status")
      .limit(5);
    expect(adminRevenueError).toBeNull();

    const { error: anonRevenueError } = await anon
      .from("revenue_entries")
      .select("id,amount,status")
      .limit(5);
    expect(anonRevenueError).not.toBeNull();
  });
});
