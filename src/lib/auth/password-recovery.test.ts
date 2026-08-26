import { describe, expect, it } from "vitest";
import {
  buildPasswordRecoveryRedirect,
  readRecoveryError,
  readRecoveryTokens,
} from "./password-recovery";

describe("password recovery URL", () => {
  it("builds a direct update-password redirect", () => {
    expect(buildPasswordRecoveryRedirect("https://app.example.com/")).toBe(
      "https://app.example.com/update-password",
    );
  });

  it("extracts an implicit recovery session from the URL fragment", () => {
    expect(
      readRecoveryTokens(
        "#access_token=access&refresh_token=refresh&type=recovery",
      ),
    ).toEqual({ accessToken: "access", refreshToken: "refresh" });
  });

  it("rejects incomplete recovery fragments", () => {
    expect(readRecoveryTokens("#access_token=access&type=recovery")).toBeNull();
  });

  it("reads a provider error without throwing", () => {
    expect(
      readRecoveryError("#error=access_denied&error_description=Link+expirado"),
    ).toBe("Link expirado");
  });
});
