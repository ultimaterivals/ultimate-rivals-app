"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function captureRankingSnapshotAction(formData: FormData) {
  await requireRole("admin");
  const seasonId = String(formData.get("seasonId") ?? "");
  const cycleId = String(formData.get("cycleId") ?? "");
  const client = await createClient();
  const { error } = await client.rpc("capture_ranking_snapshot", {
    target_season_id: seasonId,
    target_cycle_id: cycleId || null,
    target_reason: "manual",
  });
  if (error) throw error;
  revalidatePath("/admin/rankings");
  revalidatePath("/athlete/ranking");
  revalidatePath("/rankings", "layout");
}

export async function publishRankingsAction(formData: FormData) {
  await requireRole("admin");
  const seasonId = String(formData.get("seasonId") ?? "");
  const cycleId = String(formData.get("cycleId") ?? "");
  const { error } = await (
    await createClient()
  ).rpc("publish_rankings", {
    target_season_id: seasonId,
    target_cycle_id: cycleId || null,
  });
  if (error) throw error;
  revalidatePath("/rankings", "layout");
  revalidatePath("/admin/rankings");
}
