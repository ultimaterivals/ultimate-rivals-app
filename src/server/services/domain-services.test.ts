import { describe, expect, it } from "vitest";
import { AuthorizationError } from "@/lib/auth/authorization";
import { createPole } from "./domain-services";

describe("domain services", () => {
  it("rejects writes before reaching the repository for a non-admin", async () => {
    const client = {};
    await expect(
      createPole(
        client as never,
        { userId: "user", email: null, role: "athlete" },
        { name: "Polo", slug: "polo", city: "Betim", state: "MG" },
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
