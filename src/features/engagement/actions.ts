"use server";

import { createClient } from "@/lib/supabase/server";
import {
  engagementEventNames,
  sanitizeEngagementMetadata,
  type EngagementEventName,
  type EngagementMetadata,
} from "@/lib/analytics/engagement-events";
import { getSessionIdentity } from "@/lib/auth/session";

export async function trackEngagementEvent(input: {
  eventName: EngagementEventName;
  athleteId?: string | null;
  objectType?: string | null;
  objectId?: string | null;
  anonymousSessionId?: string | null;
  metadata?: EngagementMetadata;
}) {
  if (!engagementEventNames.includes(input.eventName)) return;
  const client = await createClient();
  const identity = await getSessionIdentity();
  if (identity?.role === "admin") return;
  const metadata = sanitizeEngagementMetadata(input.metadata);
  const { error } = await client.from("acquisition_events").insert({
    event_name: input.eventName,
    source: "essential_operational",
    profile_id: identity?.userId ?? null,
    athlete_id: input.athleteId ?? null,
    anonymous_session_id: input.anonymousSessionId ?? null,
    object_type: input.objectType ?? null,
    object_id: input.objectId ?? null,
    metadata,
  });
  if (error) {
    // Analytics must never break the sports or product flow.
    console.warn("engagement_event_dropped", input.eventName);
  }
}
