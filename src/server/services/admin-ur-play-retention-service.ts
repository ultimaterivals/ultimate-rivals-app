import type {
  AdminRetentionSnapshot,
  RetentionFollowup,
  RetentionFollowupStatus,
} from "@/features/admin-ur-play-retention/types";
import { fetchAdminRetentionRepositoryData } from "@/server/repositories/admin-ur-play-retention-repository";

export async function getAdminRetentionSnapshot(): Promise<AdminRetentionSnapshot> {
  const generatedAt = new Date().toISOString();
  const raw = await fetchAdminRetentionRepositoryData();
  const athletes = new Map(raw.athletes.map((row) => [row.id, row]));
  const sessions = new Map(raw.sessions.map((row) => [row.id, row]));
  const opportunities = new Map(raw.opportunities.map((row) => [row.id, row]));

  const followups: RetentionFollowup[] = raw.followups.map((row) => {
    const athlete = athletes.get(row.athlete_id);
    const sourceSession = sessions.get(row.source_session_id);
    const opportunity = row.suggested_opportunity_id
      ? opportunities.get(row.suggested_opportunity_id)
      : undefined;
    return {
      id: row.id,
      sourceSessionId: row.source_session_id,
      sourceSessionName: sourceSession?.name ?? "UR Play",
      sourceSessionEndsAt: sourceSession?.ends_at ?? row.due_at,
      athleteId: row.athlete_id,
      athleteName: athlete?.public_name ?? "Atleta",
      athleteCode: athlete?.athlete_code ?? "—",
      participationNumber: row.participation_number,
      cohort: row.cohort as RetentionFollowup["cohort"],
      status: row.status as RetentionFollowupStatus,
      dueAt: row.due_at,
      contactedAt: row.contacted_at,
      contactChannel: row.contact_channel,
      contactNotes: row.contact_notes,
      convertedAt: row.converted_at,
      convertedSessionId: row.converted_session_id,
      waiverReason: row.waiver_reason,
      suggestedOpportunityId: row.suggested_opportunity_id,
      suggestedOpportunityTitle: opportunity?.title ?? null,
      suggestedOpportunityStartsAt: opportunity?.starts_at ?? null,
    };
  });

  const converted = followups.filter(
    (row) => row.status === "converted",
  ).length;
  const contactedBase = followups.filter((row) =>
    ["contacted", "converted"].includes(row.status),
  ).length;

  return {
    generatedAt,
    followups,
    metrics: {
      total: followups.length,
      pending: followups.filter((row) => row.status === "pending").length,
      contacted: followups.filter((row) => row.status === "contacted").length,
      converted,
      waived: followups.filter((row) => row.status === "waived").length,
      overdue: followups.filter(
        (row) =>
          row.status === "pending" &&
          new Date(row.dueAt).getTime() < new Date(generatedAt).getTime(),
      ).length,
      conversionRate: contactedBase > 0 ? (converted / contactedBase) * 100 : 0,
    },
    sourceErrors: raw.errors,
  };
}
