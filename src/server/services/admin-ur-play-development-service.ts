import type {
  AdminDevelopmentSnapshot,
  DevelopmentCase,
  DevelopmentCaseStatus,
  DevelopmentSession,
} from "@/features/admin-ur-play-development/types";
import { fetchAdminDevelopmentRepositoryData } from "@/server/repositories/admin-ur-play-development-repository";

function reasons(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function getAdminDevelopmentSnapshot(): Promise<AdminDevelopmentSnapshot> {
  const generatedAt = new Date().toISOString();
  const raw = await fetchAdminDevelopmentRepositoryData();
  const athletes = new Map(raw.athletes.map((row) => [row.id, row]));
  const caseRowsBySession = new Map<string, DevelopmentCase[]>();

  for (const row of raw.cases) {
    const athlete = athletes.get(row.athlete_id);
    const session = raw.sessions.find((item) => item.id === row.session_id);
    const item: DevelopmentCase = {
      id: row.id,
      sessionId: row.session_id,
      sessionName: session?.name ?? "UR Play",
      sessionEndsAt: session?.ends_at ?? row.due_at,
      athleteId: row.athlete_id,
      athleteName: athlete?.public_name ?? "Atleta",
      athleteCode: athlete?.athlete_code ?? "—",
      currentLevel: row.current_level,
      levelingProcessId: row.leveling_process_id,
      reasons: reasons(row.reasons),
      evidence: row.evidence ?? {},
      status: row.status as DevelopmentCaseStatus,
      recommendedAction: row.recommended_action,
      resolutionAction: row.resolution_action,
      resolutionNotes: row.resolution_notes,
      dueAt: row.due_at,
      resolvedAt: row.resolved_at,
      waiverReason: row.waiver_reason,
    };
    caseRowsBySession.set(row.session_id, [
      ...(caseRowsBySession.get(row.session_id) ?? []),
      item,
    ]);
  }

  const now = new Date(generatedAt).getTime();
  const sessions: DevelopmentSession[] = raw.sessions.map((session) => {
    const cases = caseRowsBySession.get(session.id) ?? [];
    return {
      id: session.id,
      name: session.name,
      endsAt: session.ends_at,
      cases,
      counts: {
        total: cases.length,
        pending: cases.filter((item) => item.status === "pending").length,
        inProgress: cases.filter((item) => item.status === "in_progress").length,
        resolved: cases.filter((item) => item.status === "resolved").length,
        waived: cases.filter((item) => item.status === "waived").length,
        overdue: cases.filter(
          (item) =>
            ["pending", "in_progress"].includes(item.status) &&
            new Date(item.dueAt).getTime() < now,
        ).length,
      },
    };
  });

  const allCases = sessions.flatMap((session) => session.cases);
  return {
    generatedAt,
    sessions,
    metrics: {
      total: allCases.length,
      pending: allCases.filter((item) => item.status === "pending").length,
      inProgress: allCases.filter((item) => item.status === "in_progress").length,
      resolved: allCases.filter((item) => item.status === "resolved").length,
      waived: allCases.filter((item) => item.status === "waived").length,
      overdue: allCases.filter(
        (item) =>
          ["pending", "in_progress"].includes(item.status) &&
          new Date(item.dueAt).getTime() < now,
      ).length,
    },
    sourceErrors: raw.errors,
  };
}
