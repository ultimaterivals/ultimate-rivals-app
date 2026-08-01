import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getUrPlaySession } from "@/server/repositories/ur-play.repository";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireRole("admin");
  const { id } = await params,
    d = await getUrPlaySession(await createClient(), id),
    header =
      "athlete_code,public_name,level,team,pole,registration_status,attendance_status,payment_status",
    rows = d.registrations.map((r) => {
      const a = Array.isArray(r.athlete_public_profiles)
          ? r.athlete_public_profiles[0]
          : r.athlete_public_profiles,
        t = Array.isArray(r.teams) ? r.teams[0] : r.teams,
        p = Array.isArray(r.poles) ? r.poles[0] : r.poles,
        l = r.snapshot_level ?? "";
      return [
        a?.athlete_code,
        a?.public_name,
        l,
        t?.name,
        p?.name,
        r.registration_status,
        r.attendance_status,
        r.payment_status,
      ]
        .map((x) => `"${String(x ?? "").replaceAll('"', '""')}"`)
        .join(",");
    });
  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ur-play-${id}.csv"`,
    },
  });
}
