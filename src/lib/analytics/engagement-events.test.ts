import { describe, expect, it } from "vitest";
import {
  fileSizeBucket,
  safeFailureReason,
  sanitizeEngagementMetadata,
} from "./engagement-events";

describe("engagement analytics safety", () => {
  it("removes PII and storage secrets from event metadata", () => {
    expect(
      sanitizeEngagementMetadata({
        email: "athlete@example.invalid",
        phone: "+550000000",
        storage_path: "athlete/private.webp",
        signed_url: "https://example.invalid/token",
        route: "/rankings",
        ranking_scope: "individual",
        position: 1,
      }),
    ).toEqual({
      route: "/rankings",
      ranking_scope: "individual",
      position: 1,
    });
  });

  it("normalizes file size and failure reason without raw error leakage", () => {
    expect(fileSizeBucket(80_000)).toBe("0_100kb");
    expect(fileSizeBucket(800_000)).toBe("500kb_1mb");
    expect(safeFailureReason("FILE_TOO_LARGE")).toBe("FILE_TOO_LARGE");
    expect(safeFailureReason("postgres://secret-token")).toBe(
      "PROCESSING_FAILED",
    );
  });
});
