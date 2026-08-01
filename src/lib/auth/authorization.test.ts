import { describe, expect, it } from "vitest";
import { assertAnyRole, AuthorizationError } from "./authorization";

describe("authorization", () => {
  it("allows an expected role", () => {
    expect(() => assertAnyRole("admin", ["admin"])).not.toThrow();
  });
  it("rejects privilege escalation", () => {
    expect(() => assertAnyRole("athlete", ["admin"])).toThrow(
      AuthorizationError,
    );
  });
});
