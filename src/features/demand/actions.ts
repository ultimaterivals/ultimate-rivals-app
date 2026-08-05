"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { normalizeAttributionSource } from "@/lib/validation/demand";
import { getCurrentAthleteId } from "@/server/repositories/demand.repository";

const val = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

async function insertAcquisitionEvent(
  eventName: string,
  objectType: string,
  objectId: string,
) {
  const client = await createClient();
  const { data: athlete } = await client
    .from("athletes")
    .select("id,profile_id")
    .maybeSingle();
  await client.from("acquisition_events").insert({
    event_name: eventName,
    source: "essential_operational",
    object_type: objectType,
    object_id: objectId,
    athlete_id: athlete?.id ?? null,
    profile_id: athlete?.profile_id ?? null,
  });
}

export async function createInterestAction(form: FormData) {
  await requireRole("athlete");
  const client = await createClient();
  const athleteId = await getCurrentAthleteId(client);
  if (!athleteId) throw new Error("Atleta autenticado não encontrado.");

  const opportunityId = val(form, "opportunityId");
  const { error } = await client.from("session_interests").upsert(
    {
      opportunity_id: opportunityId,
      athlete_id: athleteId,
      interest_mode: val(form, "interestMode") || "individual_interest",
      show_identity: form.get("showIdentity") === "on",
      status: "active",
      source: "athlete",
    },
    { onConflict: "opportunity_id,athlete_id" },
  );
  if (error) throw error;
  await insertAcquisitionEvent(
    "interest_created",
    "demand_opportunity",
    opportunityId,
  );
  revalidatePath("/athlete/agenda");
  revalidatePath("/admin/demand");
}

export async function cancelInterestAction(form: FormData) {
  await requireRole("athlete");
  const client = await createClient();
  const athleteId = await getCurrentAthleteId(client);
  if (!athleteId) throw new Error("Atleta autenticado não encontrado.");

  const opportunityId = val(form, "opportunityId");
  const { error } = await client
    .from("session_interests")
    .update({ status: "cancelled" })
    .eq("opportunity_id", opportunityId)
    .eq("athlete_id", athleteId);
  if (error) throw error;
  await insertAcquisitionEvent(
    "interest_cancelled",
    "demand_opportunity",
    opportunityId,
  );
  revalidatePath("/athlete/agenda");
  revalidatePath("/admin/demand");
}

export async function createReservationAction(form: FormData) {
  await requireRole("athlete");
  const client = await createClient();
  const athleteId = await getCurrentAthleteId(client);
  if (!athleteId) throw new Error("Atleta autenticado não encontrado.");

  const opportunityId = val(form, "opportunityId");
  const { data: opportunity, error: opportunityError } = await client
    .from("athlete_agenda_opportunities")
    .select("remaining_capacity")
    .eq("id", opportunityId)
    .single();
  if (opportunityError) throw opportunityError;

  const status =
    Number(opportunity.remaining_capacity ?? 0) > 0 ? "reserved" : "waitlisted";
  const { error } = await client.from("activity_reservations").upsert(
    {
      opportunity_id: opportunityId,
      athlete_id: athleteId,
      status,
      eligibility: "eligible",
    },
    { onConflict: "opportunity_id,athlete_id" },
  );
  if (error) throw error;
  await insertAcquisitionEvent(
    status === "waitlisted" ? "waitlist_joined" : "reservation_completed",
    "demand_opportunity",
    opportunityId,
  );
  revalidatePath("/athlete/agenda");
  revalidatePath("/admin/demand");
}

export async function createTrainingInterestAction(form: FormData) {
  await requireRole("athlete");
  const client = await createClient();
  const athleteId = await getCurrentAthleteId(client);
  if (!athleteId) throw new Error("Atleta autenticado não encontrado.");

  const { error } = await client.from("training_interests").upsert(
    {
      window_id: val(form, "windowId") || null,
      athlete_id: athleteId,
      pole_id: val(form, "poleId") || null,
      day_of_week: Number(val(form, "dayOfWeek") || 1),
      time_preference: val(form, "timePreference") || "morning",
      starts_at: val(form, "startsAt") || null,
      ends_at: val(form, "endsAt") || null,
      level: val(form, "level") || null,
      training_focus: val(form, "trainingFocus") || null,
      status: "active",
    },
    { onConflict: "window_id,athlete_id" },
  );
  if (error) throw error;
  await insertAcquisitionEvent(
    "training_interest_created",
    "training_interest",
    athleteId,
  );
  revalidatePath("/athlete/agenda");
  revalidatePath("/admin/demand");
}

export async function createDemandOpportunityAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]);
  const client = await createClient();
  const formatCode = val(form, "formatCode") || "doubles";
  const targetFormations = Number(val(form, "targetFormations") || 4);
  const athletesPerFormation = formatCode === "fours" ? 4 : 2;
  const { error } = await client.from("demand_opportunities").insert({
    title: val(form, "title"),
    opportunity_type: val(form, "opportunityType") || "ur_play",
    starts_at: val(form, "startsAt")
      ? new Date(val(form, "startsAt")).toISOString()
      : null,
    ends_at: val(form, "endsAt")
      ? new Date(val(form, "endsAt")).toISOString()
      : null,
    pole_id: val(form, "poleId") || null,
    venue_id: val(form, "venueId") || null,
    level: val(form, "level") || null,
    format_code: formatCode,
    category_code: val(form, "categoryCode") || null,
    target_formations: targetFormations,
    max_formations: Number(val(form, "maxFormations") || targetFormations),
    capacity_athletes: Number(
      val(form, "capacityAthletes") || targetFormations * athletesPerFormation,
    ),
    court_count: Number(val(form, "courtCount") || 1),
    created_by: actor.userId,
  });
  if (error) throw error;
  revalidatePath("/admin/demand");
  revalidatePath("/athlete/agenda");
}

export async function createTrainingWindowAction(form: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]);
  const client = await createClient();
  const { error } = await client.from("training_interest_windows").insert({
    title: val(form, "title"),
    pole_id: val(form, "poleId") || null,
    day_of_week: Number(val(form, "dayOfWeek") || 1),
    time_preference: val(form, "timePreference") || "morning",
    starts_at: val(form, "startsAt") || null,
    ends_at: val(form, "endsAt") || null,
    level: val(form, "level") || null,
    training_focus: val(form, "trainingFocus") || null,
    min_athletes: Number(val(form, "minAthletes") || 4),
    target_capacity: Number(val(form, "targetCapacity") || 8),
    created_by: actor.userId,
  });
  if (error) throw error;
  revalidatePath("/admin/demand");
  revalidatePath("/athlete/agenda");
}

export async function trackAcquisitionEventAction(form: FormData) {
  const client = await createClient();
  const anonymousSessionId =
    val(form, "anonymousSessionId") || crypto.randomUUID();
  const source = normalizeAttributionSource({
    utmSource: val(form, "utmSource") || null,
    referrerDomain: val(form, "referrerDomain") || null,
    athleteReferralCode: val(form, "athleteReferralCode") || null,
    teamReferralCode: val(form, "teamReferralCode") || null,
    venueCode: val(form, "venueCode") || null,
    sponsorCode: val(form, "sponsorCode") || null,
    eventCode: val(form, "eventCode") || null,
  });
  const { data: journey, error: journeyError } = await client
    .from("acquisition_journeys")
    .insert({
      anonymous_session_id: anonymousSessionId,
      landing_path: val(form, "landingPath") || null,
      referrer_domain: val(form, "referrerDomain") || null,
      utm_source: val(form, "utmSource") || null,
      utm_medium: val(form, "utmMedium") || null,
      utm_campaign: val(form, "utmCampaign") || null,
      utm_content: val(form, "utmContent") || null,
      first_touch: source,
      last_touch: source,
      marketing_attribution_allowed:
        form.get("marketingAttributionAllowed") === "on",
    })
    .select("id")
    .single();
  if (journeyError) throw journeyError;
  const { error } = await client.from("acquisition_events").insert({
    journey_id: journey.id,
    anonymous_session_id: anonymousSessionId,
    event_name: val(form, "eventName") || "landing_view",
    source: "optional_marketing",
    object_type: "landing",
  });
  if (error) throw error;
  revalidatePath("/admin/acquisition");
}
