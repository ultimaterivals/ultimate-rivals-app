import type {
  AdminFeedbackSnapshot,
  FeedbackChannel,
  FeedbackRequest,
  FeedbackRequestStatus,
  FeedbackSession,
} from "@/features/admin-ur-play-feedback/types";
import { fetchAdminFeedbackRepositoryData } from "@/server/repositories/admin-ur-play-feedback-repository";

function aggregate(requests: FeedbackRequest[]) {
  const eligible = requests.length;
  const sent = requests.filter((item) => item.status === "sent").length;
  const responded = requests.filter((item) => item.status === "responded").length;
  const waived = requests.filter((item) => item.status === "waived").length;
  const pending = requests.filter((item) => item.status === "pending").length;
  const scored = requests.filter(
    (item): item is FeedbackRequest & { score: number } => item.score !== null,
  );
  const promoters = scored.filter((item) => item.score >= 9).length;
  const passives = scored.filter(
    (item) => item.score >= 7 && item.score <= 8,
  ).length;
  const detractors = scored.filter((item) => item.score <= 6).length;
  const averageRecommendationScore =
    scored.length > 0
      ? Number(
          (
            scored.reduce((sum, item) => sum + item.score, 0) / scored.length
          ).toFixed(2),
        )
      : null;
  const standardNpsScore =
    scored.length > 0
      ? Number(
          (((promoters - detractors) / scored.length) * 100).toFixed(2),
        )
      : null;

  return {
    eligible,
    sent,
    responded,
    waived,
    pending,
    responseRatePct:
      eligible > 0 ? Number(((responded / eligible) * 100).toFixed(2)) : 0,
    averageRecommendationScore,
    standardNpsScore,
    promoters,
    passives,
    detractors,
    targetAbove8:
      averageRecommendationScore === null
        ? null
        : averageRecommendationScore > 8,
    ready: pending === 0,
  };
}

export async function getAdminFeedbackSnapshot(): Promise<AdminFeedbackSnapshot> {
  const generatedAt = new Date().toISOString();
  const raw = await fetchAdminFeedbackRepositoryData();
  const athleteMap = new Map(raw.athletes.map((row) => [row.id, row]));
  const sessionMap = new Map(raw.sessions.map((row) => [row.id, row]));
  const closedSessions = new Set(
    raw.closures
      .filter((row) => row.status === "closed")
      .map((row) => row.session_id),
  );
  const bySession = new Map<string, FeedbackRequest[]>();

  for (const row of raw.requests) {
    const athlete = athleteMap.get(row.athlete_id);
    const request: FeedbackRequest = {
      id: row.id,
      sessionId: row.session_id,
      athleteId: row.athlete_id,
      athleteName: athlete?.public_name ?? "Atleta",
      athleteCode: athlete?.athlete_code ?? "—",
      status: row.status as FeedbackRequestStatus,
      channel: row.channel as FeedbackChannel | null,
      dispatchMode:
        row.dispatch_mode === "system" || row.dispatch_mode === "human"
          ? row.dispatch_mode
          : null,
      dispatchEvidence: row.dispatch_evidence,
      sentAt: row.sent_at,
      score: row.recommendation_score,
      comment: row.response_comment,
      respondedAt: row.responded_at,
      waiverReason: row.waiver_reason,
    };
    bySession.set(row.session_id, [
      ...(bySession.get(row.session_id) ?? []),
      request,
    ]);
  }

  const sessions: FeedbackSession[] = [...bySession.entries()]
    .map(([sessionId, requests]) => ({
      id: sessionId,
      name: sessionMap.get(sessionId)?.name ?? "UR Play",
      endsAt: sessionMap.get(sessionId)?.ends_at ?? generatedAt,
      closed: closedSessions.has(sessionId),
      requests,
      metrics: aggregate(requests),
    }))
    .sort(
      (a, b) =>
        new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
    );

  const all = sessions.flatMap((session) => session.requests);
  const total = aggregate(all);

  return {
    generatedAt,
    sessions,
    metrics: {
      eligible: total.eligible,
      pendingDispatch: total.pending,
      responses: total.responded,
      responseRatePct: total.responseRatePct,
      averageRecommendationScore: total.averageRecommendationScore,
      standardNpsScore: total.standardNpsScore,
      detractors: total.detractors,
    },
    sourceErrors: raw.errors,
  };
}
