import { Button, Card, PageHeader } from "@/components/ui";
import {
  addWalkInAction,
  checkinUrPlayAction,
  setAttendanceAction,
  transitionUrPlayAction,
  undoCheckinAction,
} from "@/features/ur-play/actions";
import { createClient } from "@/lib/supabase/server";
import { getUrPlaySession } from "@/server/repositories/ur-play.repository";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { id } = await params,
    { q = "" } = await searchParams,
    client = await createClient(),
    d = await getUrPlaySession(client, id),
    { data: athletes } = await client
      .from("athlete_public_profiles")
      .select("athlete_id,athlete_code,public_name")
      .order("public_name"),
    rows = d.registrations.filter((r) => {
      const a = Array.isArray(r.athlete_public_profiles)
        ? r.athlete_public_profiles[0]
        : r.athlete_public_profiles;
      return `${a?.athlete_code} ${a?.public_name}`
        .toLowerCase()
        .includes(q.toLowerCase());
    }),
    present = d.registrations.filter((r) =>
      ["checked_in", "present"].includes(r.attendance_status),
    ).length;
  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Court Ops"
        title={d.session.name}
        description={`${present} / ${d.session.capacity} PRESENTES · ${d.registrations.filter((r) => r.attendance_status === "expected").length} A CAMINHO · ${d.registrations.filter((r) => r.registration_status === "waitlisted").length} LISTA DE ESPERA`}
      />
      <form>
        <input
          name="q"
          defaultValue={q}
          placeholder="BUSCAR CÓDIGO UR OU NOME"
          className="rounded-ur min-h-14 w-full border bg-black p-4 text-lg"
        />
      </form>
      <Card>
        <h2 className="text-xl font-black">WALK-IN</h2>
        <form
          action={addWalkInAction}
          className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"
        >
          <input name="sessionId" type="hidden" value={id} />
          <select
            name="athleteId"
            className="rounded-ur min-h-14 border bg-black p-3"
          >
            {athletes?.map((athlete) => (
              <option key={athlete.athlete_id} value={athlete.athlete_id}>
                {athlete.athlete_code} · {athlete.public_name}
              </option>
            ))}
          </select>
          <Button className="min-h-14">ADICIONAR E FAZER CHECK-IN</Button>
        </form>
      </Card>
      {rows
        .filter((r) => r.registration_status === "confirmed")
        .map((r) => {
          const a = Array.isArray(r.athlete_public_profiles)
              ? r.athlete_public_profiles[0]
              : r.athlete_public_profiles,
            level = r.snapshot_level;
          return (
            <Card key={r.id}>
              <p className="text-ur-gold text-sm font-bold">
                {a?.athlete_code} · {level?.toUpperCase()}
                {level === "leveling" ? " · ATLETA EM NIVELAMENTO" : ""}
              </p>
              <h2 className="text-2xl font-black">{a?.public_name}</h2>
              <p>{r.attendance_status}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
                {r.attendance_status !== "checked_in" ? (
                  <form action={checkinUrPlayAction}>
                    <input name="sessionId" type="hidden" value={id} />
                    <input name="registrationId" type="hidden" value={r.id} />
                    <input name="method" type="hidden" value="manual" />
                    <Button className="min-h-14 w-full">CHECK-IN</Button>
                  </form>
                ) : (
                  <form action={undoCheckinAction}>
                    <input name="sessionId" type="hidden" value={id} />
                    <input name="registrationId" type="hidden" value={r.id} />
                    <Button variant="secondary" className="min-h-14 w-full">
                      DESFAZER
                    </Button>
                  </form>
                )}
                <form action={setAttendanceAction}>
                  <input name="sessionId" type="hidden" value={id} />
                  <input name="registrationId" type="hidden" value={r.id} />
                  <input name="status" type="hidden" value="absent" />
                  <Button variant="secondary" className="min-h-14 w-full">
                    AUSENTE
                  </Button>
                </form>
              </div>
            </Card>
          );
        })}
      {d.session.status === "checkin_open" && (
        <form action={transitionUrPlayAction}>
          <input name="sessionId" type="hidden" value={id} />
          <input name="status" type="hidden" value="in_progress" />
          <Button className="min-h-14">ENCERRAR CHECK-IN</Button>
        </form>
      )}
    </div>
  );
}
