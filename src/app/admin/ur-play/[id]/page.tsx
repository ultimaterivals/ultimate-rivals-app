import { Button, Card, PageHeader } from "@/components/ui";
import {
  registerUrPlayAction,
  setPaymentAction,
  transitionUrPlayAction,
} from "@/features/ur-play/actions";
import { createClient } from "@/lib/supabase/server";
import { getUrPlaySession } from "@/server/repositories/ur-play.repository";
const next: Record<string, string> = {
  draft: "published",
  published: "registration_open",
  registration_open: "registration_closed",
  registration_closed: "checkin_open",
  checkin_open: "in_progress",
  in_progress: "completed",
};
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params,
    c = await createClient(),
    d = await getUrPlaySession(c, id),
    { data: athletes } = await c
      .from("athlete_public_profiles")
      .select("athlete_id,athlete_code,public_name");
  const count = (status: string) =>
    d.registrations.filter(
      (r) => r.registration_status === status || r.attendance_status === status,
    ).length;
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={d.session.status}
        title={d.session.name}
        description={`${new Date(d.session.starts_at).toLocaleString("pt-BR")} · ${Array.isArray(d.session.venues) ? d.session.venues[0]?.name : d.session.venues?.name}`}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        {[
          ["Capacidade", d.session.capacity],
          ["Inscritos", count("confirmed")],
          ["Waitlist", count("waitlisted")],
          ["Check-in", count("checked_in")],
          [
            "Pagos",
            d.registrations.filter((r) => r.payment_status === "paid").length,
          ],
          [
            "Nivelamento",
            d.registrations.filter((r) => r.snapshot_level === "leveling")
              .length,
          ],
        ].map(([x, v]) => (
          <Card key={x}>
            <p className="text-xs text-zinc-500 uppercase">{x}</p>
            <strong className="text-3xl">{v}</strong>
          </Card>
        ))}
      </div>
      {next[d.session.status] && (
        <form action={transitionUrPlayAction}>
          <input name="sessionId" type="hidden" value={id} />
          <input name="status" type="hidden" value={next[d.session.status]} />
          <Button>Avançar para {next[d.session.status]}</Button>
        </form>
      )}
      {d.session.ready_for_matchmaking && (
        <Card className="border-ur-gold">
          <strong>READY FOR MATCHMAKING</strong>
          <p>A montagem de jogos será implementada na Sprint 7.</p>
        </Card>
      )}
      <Card>
        <h2 className="text-xl font-black">Adicionar atleta</h2>
        <form
          action={registerUrPlayAction}
          className="mt-3 flex flex-wrap gap-3"
        >
          <input name="sessionId" type="hidden" value={id} />
          <input name="source" type="hidden" value="admin" />
          <select name="athleteId" className="rounded-ur border bg-black p-3">
            {athletes?.map((a) => (
              <option key={a.athlete_id} value={a.athlete_id}>
                {a.athlete_code} · {a.public_name}
              </option>
            ))}
          </select>
          <Button>Adicionar</Button>
        </form>
      </Card>
      {["confirmed", "waitlisted", "cancelled"].map((group) => (
        <Card key={group}>
          <h2 className="text-xl font-black uppercase">{group}</h2>
          {d.registrations
            .filter((r) => r.registration_status === group)
            .map((r) => (
              <div
                key={r.id}
                className="grid gap-2 border-t py-3 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <strong>
                    {Array.isArray(r.athlete_public_profiles)
                      ? r.athlete_public_profiles[0]?.public_name
                      : r.athlete_public_profiles?.public_name}
                  </strong>
                  <p>
                    {r.attendance_status} · {r.payment_status}
                    {r.waitlist_position ? ` · #${r.waitlist_position}` : ""}
                  </p>
                </div>
                <form action={setPaymentAction} className="flex gap-2">
                  <input name="sessionId" type="hidden" value={id} />
                  <input name="registrationId" type="hidden" value={r.id} />
                  <input name="status" type="hidden" value="paid" />
                  <input name="method" type="hidden" value="pix" />
                  <Button variant="secondary">Marcar pago</Button>
                </form>
              </div>
            ))}
        </Card>
      ))}
      <a href={`/admin/ur-play/${id}/export`} className="font-bold">
        Exportar CSV operacional
      </a>
    </div>
  );
}
