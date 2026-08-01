import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for integration tests.`);
  return value;
}

export const testPassword = requiredEnv("UR_TEST_PASSWORD");
export const testUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
export const testKey = requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

export type TestRole =
  | "admin"
  | "operator"
  | "polemanager"
  | "teammanager"
  | "athlete"
  | "athlete2";
export async function clientFor(role: TestRole): Promise<SupabaseClient> {
  const client = createClient(testUrl, testKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: `${role}@test.ur.local`,
    password: testPassword,
  });
  if (error) throw error;
  return client;
}

export const ids = {
  admin: "a0000000-0000-4000-8000-000000000001",
  athleteA: "b0000000-0000-4000-8000-000000000001",
  athleteB: "b0000000-0000-4000-8000-000000000002",
  poleA: "20000000-0000-4000-8000-000000000001",
  poleB: "20000000-0000-4000-8000-000000000002",
  teamA: "c0000000-0000-4000-8000-000000000001",
  teamB: "c0000000-0000-4000-8000-000000000002",
  season: "10000000-0000-4000-8000-000000000001",
  rosterA: "11000000-0000-4000-8000-000000000001",
  rosterB: "11000000-0000-4000-8000-000000000002",
};
