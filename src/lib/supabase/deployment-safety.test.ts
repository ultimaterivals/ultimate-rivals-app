import { describe, expect, it } from "vitest";
import {
  assertSupabaseDeploymentSafety,
  getSupabaseDeploymentSafetyIssue,
} from "./deployment-safety";

const productionUrl = "https://szruhujkgwveilgvfgnl.supabase.co";
const developmentUrl = "https://jrzmqlhfkhaejvmiyxzy.supabase.co";

describe("Supabase deployment safety", () => {
  it("blocks Preview deployments backed by Production", () => {
    expect(
      getSupabaseDeploymentSafetyIssue({
        deploymentEnvironment: "preview",
        supabaseUrl: productionUrl,
      }),
    ).toContain("Preview bloqueado");

    expect(() =>
      assertSupabaseDeploymentSafety({
        deploymentEnvironment: "preview",
        supabaseUrl: productionUrl,
      }),
    ).toThrow("Supabase de desenvolvimento");
  });

  it("allows Preview with Development and Production with Production", () => {
    expect(
      getSupabaseDeploymentSafetyIssue({
        deploymentEnvironment: "preview",
        supabaseUrl: developmentUrl,
      }),
    ).toBeNull();
    expect(
      getSupabaseDeploymentSafetyIssue({
        deploymentEnvironment: "production",
        supabaseUrl: productionUrl,
      }),
    ).toBeNull();
  });
});
