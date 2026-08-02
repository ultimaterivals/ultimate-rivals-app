"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { processHomologatedMatch } from "@/server/services/ranking-engine.service";

export async function reprocessRankingAction(input: {
  matchId: string;
  operationId: string;
}) {
  await requireRole("admin");
  const result = await processHomologatedMatch(await createClient(), input);
  revalidatePath("/admin/ranking-engine");
  revalidatePath(`/admin/ranking-engine/matches/${input.matchId}`);
  revalidatePath("/athlete/points");
  return result;
}
