import { createClient } from "@/lib/supabase/server";

type RawDeliverable = {
  id: string;
  session_id: string;
  deliverable_key: string;
  status: string;
  blocking: boolean;
  due_at: string;
  channel: string | null;
  publication_url: string | null;
  media_asset_id: string | null;
  notes: string | null;
  published_at: string | null;
  waiver_reason: string | null;
};

type RawSession = { id: string; name: string; ends_at: string };
type RawClosure = { session_id: string; status: string };

export async function fetchAdminMediaRepositoryData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const deliverablesResult = await supabase
    .from("ur_play_media_deliverables")
    .select(
      "id,session_id,deliverable_key,status,blocking,due_at,channel,publication_url,media_asset_id,notes,published_at,waiver_reason",
    )
    .order("due_at", { ascending: true })
    .limit(2000);

  if (deliverablesResult.error) {
    errors.push(
      `ur_play_media_deliverables: ${deliverablesResult.error.message}`,
    );
    return {
      deliverables: [] as RawDeliverable[],
      sessions: [] as RawSession[],
      closures: [] as RawClosure[],
      errors,
    };
  }

  const deliverables =
    (deliverablesResult.data as RawDeliverable[] | null) ?? [];
  const sessionIds = [
    ...new Set(deliverables.map((row) => row.session_id)),
  ];

  if (sessionIds.length === 0) {
    return {
      deliverables,
      sessions: [] as RawSession[],
      closures: [] as RawClosure[],
      errors,
    };
  }

  const [sessionsResult, closuresResult] = await Promise.all([
    supabase
      .from("ur_play_sessions")
      .select("id,name,ends_at")
      .in("id", sessionIds),
    supabase
      .from("ur_play_post_session_closures")
      .select("session_id,status")
      .in("session_id", sessionIds),
  ]);

  if (sessionsResult.error)
    errors.push(`ur_play_sessions: ${sessionsResult.error.message}`);
  if (closuresResult.error)
    errors.push(`ur_play_post_session_closures: ${closuresResult.error.message}`);

  return {
    deliverables,
    sessions: sessionsResult.error
      ? []
      : ((sessionsResult.data as RawSession[] | null) ?? []),
    closures: closuresResult.error
      ? []
      : ((closuresResult.data as RawClosure[] | null) ?? []),
    errors,
  };
}