const PRODUCTION_SUPABASE_HOST = "szruhujkgwveilgvfgnl.supabase.co";

type DeploymentSafetyInput = {
  deploymentEnvironment?: string;
  supabaseUrl: string;
};

export function getSupabaseDeploymentSafetyIssue({
  deploymentEnvironment,
  supabaseUrl,
}: DeploymentSafetyInput) {
  if (deploymentEnvironment !== "preview") {
    return null;
  }

  const hostname = new URL(supabaseUrl).hostname;
  if (hostname !== PRODUCTION_SUPABASE_HOST) {
    return null;
  }

  return "Preview bloqueado: configure esta branch para usar o Supabase de desenvolvimento.";
}

export function assertSupabaseDeploymentSafety(input: DeploymentSafetyInput) {
  const issue = getSupabaseDeploymentSafetyIssue(input);
  if (issue) {
    throw new Error(issue);
  }
}
