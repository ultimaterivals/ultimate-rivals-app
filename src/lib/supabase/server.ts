import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabaseDeploymentSafety } from "./deployment-safety";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const env = getSupabaseEnv();
  assertSupabaseDeploymentSafety({
    deploymentEnvironment: process.env.VERCEL_ENV,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
  });
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* Server Components cannot write cookies; proxy handles refresh. */
          }
        },
      },
    },
  );
}
