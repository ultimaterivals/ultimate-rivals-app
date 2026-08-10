"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const reviewSchema = z.object({
  rowId: z.string().uuid(),
  fullName: z.string().trim().min(2),
  publicName: z.string().trim().optional(),
  birthDate: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  pole: z.string().trim().optional(),
  categories: z.string().trim().optional(),
  status: z.enum(["ready", "review", "blocked", "skipped"]),
  note: z.string().trim().min(3),
});

const importSchema = z.object({ rowId: z.string().uuid() });
const batchSchema = z.object({ batchId: z.string().uuid() });

function resultUrl(result: string) {
  return `/admin/atletas/importacao?result=${encodeURIComponent(result)}`;
}

export async function reviewAthleteImportRowAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = reviewSchema.safeParse({
    rowId: formData.get("rowId"),
    fullName: formData.get("fullName"),
    publicName: formData.get("publicName"),
    birthDate: formData.get("birthDate"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    pole: formData.get("pole"),
    categories: formData.get("categories"),
    status: formData.get("status"),
    note: formData.get("note"),
  });
  if (!parsed.success) redirect(resultUrl("review-invalid"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_athlete_import_row", {
    p_row_id: parsed.data.rowId,
    p_patch: {
      full_name: parsed.data.fullName,
      public_name: parsed.data.publicName || null,
      birth_date: parsed.data.birthDate || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      pole_text: parsed.data.pole || null,
      categories_text: parsed.data.categories || null,
    },
    p_validation_status: parsed.data.status,
    p_resolution: {
      note: parsed.data.note,
      decision: parsed.data.status,
      source: "admin_import_review",
    },
  });
  if (error) redirect(resultUrl("review-error"));
  revalidatePath("/admin/atletas/importacao");
  redirect(resultUrl("reviewed"));
}

export async function importAthleteStagingRowAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = importSchema.safeParse({ rowId: formData.get("rowId") });
  if (!parsed.success) redirect(resultUrl("import-invalid"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_import_athlete_staging_row", {
    p_row_id: parsed.data.rowId,
  });
  if (error) {
    if (error.message.includes("IMPORT_POLE_NOT_FOUND")) {
      redirect(resultUrl("pole-not-configured"));
    }
    if (error.message.includes("IMPORT_DUPLICATE_ATHLETE")) {
      redirect(resultUrl("duplicate"));
    }
    redirect(resultUrl("import-error"));
  }

  revalidatePath("/admin/atletas/importacao");
  revalidatePath("/admin/atletas");
  redirect(resultUrl("imported"));
}

export async function importReadyAthleteBatchAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = batchSchema.safeParse({ batchId: formData.get("batchId") });
  if (!parsed.success) redirect(resultUrl("batch-invalid"));

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_import_ready_athlete_batch", {
    p_batch_id: parsed.data.batchId,
  });
  if (error) {
    if (error.message.includes("IMPORT_POLE_NOT_FOUND")) {
      redirect(resultUrl("pole-not-configured"));
    }
    if (error.message.includes("IMPORT_DUPLICATE_ATHLETE")) {
      redirect(resultUrl("duplicate"));
    }
    redirect(resultUrl("batch-import-error"));
  }

  revalidatePath("/admin/atletas/importacao");
  revalidatePath("/admin/atletas");
  redirect(resultUrl("batch-imported"));
}
