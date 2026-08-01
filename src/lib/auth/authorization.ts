import type { AppRole } from "@/types/auth";

export class AuthorizationError extends Error {
  override readonly name = "AuthorizationError";
}

export function assertAnyRole(
  actual: AppRole,
  allowed: readonly AppRole[],
): void {
  if (!allowed.includes(actual))
    throw new AuthorizationError("Operação não autorizada.");
}
