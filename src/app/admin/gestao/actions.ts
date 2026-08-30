"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { createClient } from "@/lib/supabase/server";

const optionalUuid = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable(),
);
const optionalDate = z.preprocess(
  (value) => (value === "" ? null : value),
  z.iso.date().nullable(),
);

export async function createExecutiveWorkItemAction(formData: FormData) {
  const user = await requireAdminModule("management");
  const parsed = z
    .object({
      workstreamId: z.string().uuid(),
      functionId: optionalUuid,
      assigneeProfileId: optionalUuid,
      title: z.string().trim().min(3).max(180),
      description: z.string().trim().max(4000),
      priority: z.enum(["p0", "p1", "p2", "p3"]),
      dueAt: optionalDate,
      acceptanceCriteria: z.string().trim().min(5).max(2000),
    })
    .safeParse({
      workstreamId: formData.get("workstreamId"),
      functionId: formData.get("functionId"),
      assigneeProfileId: formData.get("assigneeProfileId"),
      title: formData.get("title"),
      description: formData.get("description"),
      priority: formData.get("priority"),
      dueAt: formData.get("dueAt"),
      acceptanceCriteria: formData.get("acceptanceCriteria"),
    });
  if (!parsed.success) redirect("/admin/gestao?error=invalid-work-item");

  const supabase = await createClient();
  const { error } = await supabase.from("command_work_items").insert({
    workstream_id: parsed.data.workstreamId,
    function_id: parsed.data.functionId,
    assignee_profile_id: parsed.data.assigneeProfileId,
    title: parsed.data.title,
    description: parsed.data.description || null,
    priority: parsed.data.priority,
    status: "planned",
    signal: "green",
    due_at: parsed.data.dueAt,
    acceptance_criteria: parsed.data.acceptanceCriteria,
    created_by: user.userId,
  });
  if (error) redirect("/admin/gestao?error=save-work-item");
  revalidatePath("/admin");
  revalidatePath("/admin/gestao");
  redirect("/admin/gestao?success=work-item-created");
}

export async function updateExecutiveWorkItemAction(formData: FormData) {
  await requireAdminModule("management");
  const parsed = z
    .object({
      workItemId: z.string().uuid(),
      status: z.enum([
        "backlog",
        "planned",
        "in_progress",
        "blocked",
        "review",
        "done",
        "cancelled",
      ]),
      signal: z.enum(["green", "yellow", "red"]),
      blockedReason: z.string().trim().max(1000),
      resultSummary: z.string().trim().max(4000),
      evidenceUrl: z.union([z.literal(""), z.url().startsWith("https://")]),
    })
    .safeParse({
      workItemId: formData.get("workItemId"),
      status: formData.get("status"),
      signal: formData.get("signal"),
      blockedReason: formData.get("blockedReason"),
      resultSummary: formData.get("resultSummary"),
      evidenceUrl: formData.get("evidenceUrl"),
    });
  if (!parsed.success) redirect("/admin/gestao?error=invalid-update");
  if (parsed.data.status === "blocked" && !parsed.data.blockedReason)
    redirect("/admin/gestao?error=blocked-reason-required");
  if (parsed.data.status === "done" && !parsed.data.resultSummary)
    redirect("/admin/gestao?error=result-required");

  const supabase = await createClient();
  const { error } = await supabase
    .from("command_work_items")
    .update({
      status: parsed.data.status,
      signal: parsed.data.signal,
      blocked_reason:
        parsed.data.status === "blocked" ? parsed.data.blockedReason : null,
      result_summary: parsed.data.resultSummary || null,
      evidence_url: parsed.data.evidenceUrl || null,
      completed_at:
        parsed.data.status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.workItemId);
  if (error) redirect("/admin/gestao?error=save-update");
  revalidatePath("/admin");
  revalidatePath("/admin/gestao");
  redirect("/admin/gestao?success=work-item-updated");
}

export async function assignExecutiveFunctionAction(formData: FormData) {
  await requireAdminModule("management");
  const parsed = z
    .object({
      functionId: z.string().uuid(),
      profileId: z.string().uuid(),
      status: z.enum(["planned", "active", "paused"]),
      allocationPercent: z.coerce.number().int().min(1).max(100),
      reviewDueAt: optionalDate,
      mandate: z.string().trim().max(1000),
    })
    .safeParse({
      functionId: formData.get("functionId"),
      profileId: formData.get("profileId"),
      status: formData.get("status"),
      allocationPercent: formData.get("allocationPercent"),
      reviewDueAt: formData.get("reviewDueAt"),
      mandate: formData.get("mandate"),
    });
  if (!parsed.success) redirect("/admin/gestao?error=invalid-assignment");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_assign_command_function", {
    target_function_id: parsed.data.functionId,
    target_profile_id: parsed.data.profileId,
    target_status: parsed.data.status,
    target_allocation_percent: parsed.data.allocationPercent,
    target_review_due_at: parsed.data.reviewDueAt,
    target_mandate: parsed.data.mandate || null,
  });
  if (error) redirect("/admin/gestao?error=save-assignment");
  revalidatePath("/admin");
  revalidatePath("/admin/gestao");
  redirect("/admin/gestao?success=function-assigned");
}
