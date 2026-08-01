"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAnyRole, requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import * as sessions from "@/server/services/ur-play-sessions.service";
import * as registrations from "@/server/services/ur-play-registration.service";
import * as checkins from "@/server/services/ur-play-checkin.service";
import * as attendance from "@/server/services/ur-play-attendance.service";
import * as payments from "@/server/services/ur-play-payment-status.service";
const val = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export async function createUrPlaySessionAction(f: FormData) {
  const a = await requireRole("admin"),
    c = await createClient(),
    courtIds = f.getAll("courtIds").map(String),
    scope = {
      formatId: val(f, "formatId") || null,
      categoryId: val(f, "categoryId") || null,
      level: val(f, "level") || null,
    };
  const row = await sessions.createSession(
    c,
    a,
    {
      seasonId: f.get("seasonId"),
      seasonCycleId: val(f, "seasonCycleId") || null,
      poleId: f.get("poleId"),
      venueId: f.get("venueId"),
      name: f.get("name"),
      sessionDate: f.get("sessionDate"),
      startsAt: new Date(val(f, "startsAt")).toISOString(),
      endsAt: new Date(val(f, "endsAt")).toISOString(),
      registrationOpensAt: val(f, "registrationOpensAt")
        ? new Date(val(f, "registrationOpensAt")).toISOString()
        : null,
      registrationClosesAt: val(f, "registrationClosesAt")
        ? new Date(val(f, "registrationClosesAt")).toISOString()
        : null,
      checkinOpensAt: val(f, "checkinOpensAt")
        ? new Date(val(f, "checkinOpensAt")).toISOString()
        : null,
      checkinClosesAt: val(f, "checkinClosesAt")
        ? new Date(val(f, "checkinClosesAt")).toISOString()
        : null,
      capacity: f.get("capacity"),
      waitlistCapacity: f.get("waitlistCapacity"),
      priceAmount: f.get("priceAmount"),
      notes: val(f, "notes") || null,
    },
    courtIds,
    [scope],
  );
  redirect(`/admin/ur-play/${row.id}`);
}
export async function transitionUrPlayAction(f: FormData) {
  const a = await requireAnyRole(["admin", "operator"]),
    id = val(f, "sessionId");
  await sessions.transitionSession(await createClient(), a, {
    sessionId: id,
    status: f.get("status"),
    reason: val(f, "reason") || null,
  });
  revalidatePath(`/admin/ur-play/${id}`);
  revalidatePath(`/ops/ur-play/${id}`);
}
export async function registerUrPlayAction(f: FormData) {
  const a = await requireAnyRole(["admin", "operator", "athlete"]),
    id = val(f, "sessionId");
  await registrations.register(await createClient(), a, {
    sessionId: id,
    athleteId: f.get("athleteId"),
    source: f.get("source"),
    operationId: crypto.randomUUID(),
  });
  revalidatePath(`/admin/ur-play/${id}`);
  revalidatePath(`/athlete/ur-play/${id}`);
}
export async function cancelUrPlayRegistrationAction(f: FormData) {
  const a = await requireAnyRole(["admin", "operator", "athlete"]);
  await registrations.cancel(await createClient(), a, {
    registrationId: f.get("registrationId"),
    reason: val(f, "reason") || "Cancelamento solicitado",
    operationId: crypto.randomUUID(),
  });
  revalidatePath("/athlete/ur-play");
  revalidatePath("/admin/ur-play");
}
export async function checkinUrPlayAction(f: FormData) {
  const a = await requireAnyRole(["admin", "operator"]);
  await checkins.checkIn(await createClient(), a, {
    registrationId: f.get("registrationId"),
    method: f.get("method") ?? "manual",
    operationId: crypto.randomUUID(),
  });
  revalidatePath(`/ops/ur-play/${val(f, "sessionId")}`);
}
export async function addWalkInAction(f: FormData) {
  const actor = await requireAnyRole(["admin", "operator"]);
  const sessionId = val(f, "sessionId");
  await checkins.addWalkIn(await createClient(), actor, {
    sessionId,
    athleteId: f.get("athleteId"),
    source: actor.role === "admin" ? "admin" : "operator",
    operationId: crypto.randomUUID(),
  });
  revalidatePath(`/ops/ur-play/${sessionId}`);
}
export async function undoCheckinAction(f: FormData) {
  const a = await requireAnyRole(["admin", "operator"]);
  await checkins.undo(await createClient(), a, {
    registrationId: f.get("registrationId"),
  });
  revalidatePath(`/ops/ur-play/${val(f, "sessionId")}`);
}
export async function setAttendanceAction(f: FormData) {
  const a = await requireAnyRole(["admin", "operator"]);
  await attendance.setAttendance(await createClient(), a, {
    registrationId: f.get("registrationId"),
    status: f.get("status"),
  });
  revalidatePath(`/ops/ur-play/${val(f, "sessionId")}`);
}
export async function setPaymentAction(f: FormData) {
  const a = await requireAnyRole(["admin", "operator"]);
  await payments.setPayment(await createClient(), a, {
    registrationId: f.get("registrationId"),
    status: f.get("status"),
    method: val(f, "method") || null,
    reference: val(f, "reference") || null,
  });
  revalidatePath(`/admin/ur-play/${val(f, "sessionId")}`);
}
