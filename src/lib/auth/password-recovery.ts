export type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
};

export function buildPasswordRecoveryRedirect(origin: string) {
  return `${origin.replace(/\/$/, "")}/update-password`;
}

export function readRecoveryTokens(hash: string): RecoveryTokens | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
}

export function readRecoveryError(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("error_description");
}
