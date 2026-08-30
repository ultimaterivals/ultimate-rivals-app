import { createClient } from "@/lib/supabase/server";

export type RawExecutiveWorkstream = {
  id: string;
  code: string;
  name: string;
  purpose: string;
  position: number;
};

export type RawExecutiveFunction = {
  id: string;
  workstream_id: string;
  code: string;
  title: string;
  mission: string;
  criticality: "critical" | "essential" | "support";
  expected_outcomes: string[];
  performance_indicators: string[];
  decision_authority: string;
  weekly_ritual: string | null;
};

export type RawExecutiveAssignment = {
  id: string;
  function_id: string;
  profile_id: string;
  status: "planned" | "active" | "paused" | "ended";
  review_due_at: string | null;
  allocation_percent: number;
};

export type RawExecutiveWorkItem = {
  id: string;
  workstream_id: string;
  function_id: string | null;
  assignee_profile_id: string | null;
  title: string;
  description: string | null;
  priority: "p0" | "p1" | "p2" | "p3";
  status:
    | "backlog"
    | "planned"
    | "in_progress"
    | "blocked"
    | "review"
    | "done"
    | "cancelled";
  signal: "green" | "yellow" | "red";
  due_at: string | null;
  acceptance_criteria: string;
  result_summary: string | null;
  evidence_url: string | null;
  blocked_reason: string | null;
};

export type RawExecutiveProfile = {
  id: string;
  display_name: string;
  role: string;
};

export type AdminExecutiveRepositoryData = {
  workstreams: RawExecutiveWorkstream[] | null;
  functions: RawExecutiveFunction[] | null;
  assignments: RawExecutiveAssignment[] | null;
  workItems: RawExecutiveWorkItem[] | null;
  profiles: RawExecutiveProfile[] | null;
  errors: string[];
};

export async function fetchAdminExecutiveRepositoryData(): Promise<AdminExecutiveRepositoryData> {
  const supabase = await createClient();
  const errors: string[] = [];
  const [
    workstreamsResult,
    functionsResult,
    assignmentsResult,
    workItemsResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from("command_workstreams")
      .select("id,code,name,purpose,position")
      .eq("active", true)
      .order("position", { ascending: true }),
    supabase
      .from("command_functions")
      .select(
        "id,workstream_id,code,title,mission,criticality,expected_outcomes,performance_indicators,decision_authority,weekly_ritual",
      )
      .eq("active", true)
      .order("title", { ascending: true }),
    supabase
      .from("command_function_assignments")
      .select(
        "id,function_id,profile_id,status,review_due_at,allocation_percent",
      )
      .in("status", ["planned", "active", "paused"])
      .is("ends_at", null),
    supabase
      .from("command_work_items")
      .select(
        "id,workstream_id,function_id,assignee_profile_id,title,description,priority,status,signal,due_at,acceptance_criteria,result_summary,evidence_url,blocked_reason",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("id,display_name,role")
      .eq("status", "active")
      .order("display_name", { ascending: true })
      .limit(500),
  ]);

  const results = [
    ["command_workstreams", workstreamsResult],
    ["command_functions", functionsResult],
    ["command_function_assignments", assignmentsResult],
    ["command_work_items", workItemsResult],
    ["profiles", profilesResult],
  ] as const;
  for (const [source, result] of results) {
    if (result.error) errors.push(`${source}: ${result.error.message}`);
  }

  return {
    workstreams: workstreamsResult.error
      ? null
      : ((workstreamsResult.data as RawExecutiveWorkstream[] | null) ?? []),
    functions: functionsResult.error
      ? null
      : ((functionsResult.data as RawExecutiveFunction[] | null) ?? []),
    assignments: assignmentsResult.error
      ? null
      : ((assignmentsResult.data as RawExecutiveAssignment[] | null) ?? []),
    workItems: workItemsResult.error
      ? null
      : ((workItemsResult.data as RawExecutiveWorkItem[] | null) ?? []),
    profiles: profilesResult.error
      ? null
      : ((profilesResult.data as RawExecutiveProfile[] | null) ?? []),
    errors,
  };
}
