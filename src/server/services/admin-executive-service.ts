import type {
  AdminExecutiveSnapshot,
  ExecutiveFunction,
  ExecutiveWorkItem,
} from "@/features/admin-executive/types";
import {
  fetchAdminExecutiveRepositoryData,
  type AdminExecutiveRepositoryData,
} from "@/server/repositories/admin-executive-repository";

const priorityOrder = { p0: 0, p1: 1, p2: 2, p3: 3 } as const;
const closedStatuses = new Set(["done", "cancelled"]);

function compareWorkItems(left: ExecutiveWorkItem, right: ExecutiveWorkItem) {
  const priority = priorityOrder[left.priority] - priorityOrder[right.priority];
  if (priority !== 0) return priority;
  if (!left.dueAt) return 1;
  if (!right.dueAt) return -1;
  return left.dueAt.localeCompare(right.dueAt);
}

export function buildAdminExecutiveSnapshot(
  raw: AdminExecutiveRepositoryData,
  today = new Date().toISOString().slice(0, 10),
): AdminExecutiveSnapshot {
  const profiles = (raw.profiles ?? []).map((profile) => ({
    id: profile.id,
    displayName: profile.display_name,
    role: profile.role,
  }));
  const profileNames = new Map(
    profiles.map((profile) => [profile.id, profile.displayName]),
  );
  const activeAssignments = new Map(
    (raw.assignments ?? []).map((assignment) => [
      assignment.function_id,
      assignment,
    ]),
  );

  const functions: ExecutiveFunction[] = (raw.functions ?? []).map((item) => {
    const assignment = activeAssignments.get(item.id);
    return {
      id: item.id,
      workstreamId: item.workstream_id,
      code: item.code,
      title: item.title,
      mission: item.mission,
      criticality: item.criticality,
      expectedOutcomes: item.expected_outcomes,
      performanceIndicators: item.performance_indicators,
      decisionAuthority: item.decision_authority,
      weeklyRitual: item.weekly_ritual,
      assignment: assignment
        ? {
            id: assignment.id,
            profileId: assignment.profile_id,
            displayName:
              profileNames.get(assignment.profile_id) ??
              "Perfil sem nome disponível",
            status: assignment.status,
            reviewDueAt: assignment.review_due_at,
            allocationPercent: assignment.allocation_percent,
          }
        : null,
    };
  });

  const workItems: ExecutiveWorkItem[] = (raw.workItems ?? []).map((item) => ({
    id: item.id,
    workstreamId: item.workstream_id,
    functionId: item.function_id,
    assigneeProfileId: item.assignee_profile_id,
    assigneeName: item.assignee_profile_id
      ? (profileNames.get(item.assignee_profile_id) ??
        "Perfil sem nome disponível")
      : null,
    title: item.title,
    description: item.description,
    priority: item.priority,
    status: item.status,
    signal: item.signal,
    dueAt: item.due_at,
    acceptanceCriteria: item.acceptance_criteria,
    resultSummary: item.result_summary,
    evidenceUrl: item.evidence_url,
    blockedReason: item.blocked_reason,
  }));

  const workstreams = (raw.workstreams ?? []).map((item) => {
    const streamFunctions = functions.filter(
      (fn) => fn.workstreamId === item.id,
    );
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      purpose: item.purpose,
      position: item.position,
      functionCount: streamFunctions.length,
      coveredFunctionCount: streamFunctions.filter(
        (fn) => fn.assignment?.status === "active",
      ).length,
      openWorkItemCount: workItems.filter(
        (workItem) =>
          workItem.workstreamId === item.id &&
          !closedStatuses.has(workItem.status),
      ).length,
    };
  });

  const focusItems = workItems
    .filter((item) => item.status === "in_progress")
    .sort(compareWorkItems)
    .slice(0, 3);
  const criticalItems = workItems
    .filter(
      (item) =>
        (item.priority === "p0" || item.priority === "p1") &&
        !closedStatuses.has(item.status),
    )
    .sort(compareWorkItems);
  const availableSources = [
    raw.workstreams,
    raw.functions,
    raw.assignments,
    raw.workItems,
  ].filter((source) => source !== null).length;
  const hasRecords =
    workstreams.length + functions.length + workItems.length > 0;

  return {
    status:
      raw.errors.length > 0
        ? availableSources === 0
          ? "empty"
          : "partial"
        : hasRecords
          ? "ready"
          : "empty",
    workstreams,
    functions,
    workItems,
    profiles,
    focusItems,
    criticalItems,
    metrics: {
      workstreams: workstreams.length,
      functions: functions.length,
      coveredFunctions: functions.filter(
        (item) => item.assignment?.status === "active",
      ).length,
      criticalUncovered: functions.filter(
        (item) =>
          item.criticality === "critical" &&
          item.assignment?.status !== "active",
      ).length,
      activeFocus: focusItems.length,
      blocked: workItems.filter((item) => item.status === "blocked").length,
      overdue: workItems.filter(
        (item) =>
          item.dueAt && item.dueAt < today && !closedStatuses.has(item.status),
      ).length,
    },
    sourceErrors: raw.errors,
  };
}

export async function getAdminExecutiveSnapshot(): Promise<AdminExecutiveSnapshot> {
  return buildAdminExecutiveSnapshot(await fetchAdminExecutiveRepositoryData());
}
