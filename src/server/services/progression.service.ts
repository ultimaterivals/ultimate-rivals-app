import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionIdentity } from "@/lib/auth/session";
import { assertAnyRole } from "@/lib/auth/authorization";
import {
  assessmentScoreSchema,
  createAssessmentSchema,
  levelReviewSchema,
} from "@/lib/validation/progression";
const admin = (a: SessionIdentity) => assertAnyRole(a.role, ["admin"]);
const evaluator = (a: SessionIdentity) =>
  assertAnyRole(a.role, ["admin", "operator"]);
export async function transitionSeason(
  c: SupabaseClient,
  a: SessionIdentity,
  id: string,
  status: string,
) {
  admin(a);
  const { error } = await c.rpc("transition_season", {
    target_season_id: id,
    target_status: status,
  });
  if (error) throw error;
}
export async function startLeveling(
  c: SupabaseClient,
  a: SessionIdentity,
  athleteId: string,
  seasonId: string,
) {
  admin(a);
  const { error } = await c.from("athlete_leveling_processes").insert({
    athlete_id: athleteId,
    season_id: seasonId,
    started_at: new Date().toISOString(),
  });
  if (error) throw error;
  const { data: current } = await c
    .from("athlete_levels")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("season_id", seasonId)
    .eq("status", "active")
    .maybeSingle();
  if (!current) {
    const { error: levelError } = await c.from("athlete_levels").insert({
      athlete_id: athleteId,
      season_id: seasonId,
      level: "leveling",
      starts_at: new Date().toISOString(),
      reason: "Entrada em processo de nivelamento",
      assigned_by: a.userId,
    });
    if (levelError) throw levelError;
  }
}
export async function createAssessment(
  c: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
  scores: unknown[],
) {
  evaluator(a);
  const v = createAssessmentSchema.parse(input),
    parsed = scores.map((x) => {
      const item = x as {
        criterion_id: string;
        score: unknown;
        notes?: string;
      };
      return { ...item, score: assessmentScoreSchema.parse(item.score) };
    });
  const { error } = await c.rpc("create_athlete_assessment", {
    target_athlete_id: v.athleteId,
    target_season_id: v.seasonId,
    target_process_id: v.levelingProcessId ?? null,
    target_type: v.assessmentType,
    target_scope: v.scope,
    assessment_context: v.context,
    assessment_notes: v.notes ?? null,
    feedback: v.athleteFeedback ?? null,
    is_athlete_visible: v.athleteVisible,
    scores: parsed,
  });
  if (error) throw error;
}
export async function requestReview(
  c: SupabaseClient,
  a: SessionIdentity,
  input: unknown,
) {
  admin(a);
  const v = levelReviewSchema.parse(input);
  const { data, error } = await c
    .from("level_change_reviews")
    .insert({
      athlete_id: v.athleteId,
      season_id: v.seasonId,
      current_level: v.currentLevel,
      proposed_level: v.proposedLevel,
      review_type: v.reviewType,
      requested_by: a.userId,
      decision_reason: v.decisionReason,
      evidence_summary: v.evidenceSummary,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
export async function approveReview(
  c: SupabaseClient,
  a: SessionIdentity,
  id: string,
  protectionEndsAt: string | null,
) {
  admin(a);
  const { error } = await c.rpc("approve_level_change", {
    target_review_id: id,
    effective_at: new Date().toISOString(),
    protection_ends_at: protectionEndsAt,
  });
  if (error) throw error;
}
