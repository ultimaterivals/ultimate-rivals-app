"use server";
import { revalidatePath } from "next/cache";
import { requireAnyRole, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import * as service from "@/server/services/progression.service";
const val = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export async function transitionSeasonAction(f: FormData) {
  const a = await requireRole("admin");
  await service.transitionSeason(
    await createClient(),
    a,
    val(f, "seasonId"),
    val(f, "status"),
  );
  revalidatePath(`/admin/seasons/${val(f, "seasonId")}`);
}
export async function startLevelingAction(f: FormData) {
  const a = await requireRole("admin");
  await service.startLeveling(
    await createClient(),
    a,
    val(f, "athleteId"),
    val(f, "seasonId"),
  );
  revalidatePath("/admin/leveling");
}
export async function createAssessmentAction(f: FormData) {
  const a = await requireAnyRole(["admin", "operator"]),
    scores = Array.from(f.entries())
      .filter(([k, v]) => k.startsWith("score:") && String(v))
      .map(([k, v]) => ({ criterion_id: k.slice(6), score: v }));
  await service.createAssessment(
    await createClient(),
    a,
    {
      athleteId: f.get("athleteId"),
      seasonId: f.get("seasonId"),
      levelingProcessId: val(f, "levelingProcessId") || null,
      assessmentType: f.get("assessmentType"),
      scope: f.get("scope"),
      context: f.get("context"),
      notes: val(f, "notes") || null,
      athleteFeedback: val(f, "athleteFeedback") || null,
      athleteVisible: f.get("athleteVisible") === "on",
    },
    scores,
  );
  revalidatePath("/admin/assessments");
  revalidatePath("/admin/leveling");
}
export async function createReviewAction(f: FormData) {
  const a = await requireRole("admin"),
    c = await createClient(),
    review = await service.requestReview(c, a, {
      athleteId: f.get("athleteId"),
      seasonId: f.get("seasonId"),
      currentLevel: f.get("currentLevel"),
      proposedLevel: f.get("proposedLevel"),
      reviewType: f.get("reviewType"),
      decisionReason: f.get("decisionReason"),
      evidenceSummary: f.get("evidenceSummary"),
    });
  await service.approveReview(
    c,
    a,
    review.id,
    val(f, "protectionEndsAt")
      ? new Date(val(f, "protectionEndsAt")).toISOString()
      : null,
  );
  revalidatePath("/admin/leveling");
}
