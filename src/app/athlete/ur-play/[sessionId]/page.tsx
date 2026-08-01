import { Button, Card, PageHeader } from "@/components/ui";
import {
  cancelUrPlayRegistrationAction,
  registerUrPlayAction,
} from "@/features/ur-play/actions";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getUrPlaySession } from "@/server/repositories/ur-play.repository";
export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params,
    a = await requireRole("athlete"),
    c = await createClient(),
    { data: athlete } = await c
      .from("athletes")
      .select("id")
      .eq("profile_id", a.userId)
      .single(),
    d = await getUrPlaySession(c, sessionId),
    mine = d.registrations.find((r) => r.athlete_id === athlete?.id);
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="UR Play" title={d.session.name} />
      <Card>
        <p>{new Date(d.session.starts_at).toLocaleString("pt-BR")}</p>
        <p>
          {
            d.registrations.filter((r) => r.registration_status === "confirmed")
              .length
          }
          /{d.session.capacity} confirmados
        </p>
        {mine ? (
          <>
            <strong className="text-ur-gold mt-3 block text-xl">
              {mine.registration_status === "confirmed"
                ? "✓ INSCRIÇÃO CONFIRMADA"
                : mine.registration_status === "waitlisted"
                  ? `LISTA DE ESPERA — POSIÇÃO ${mine.waitlist_position}`
                  : mine.registration_status}
            </strong>
            {["confirmed", "waitlisted"].includes(mine.registration_status) && (
              <form action={cancelUrPlayRegistrationAction} className="mt-3">
                <input name="registrationId" type="hidden" value={mine.id} />
                <input
                  name="reason"
                  type="hidden"
                  value="Cancelamento solicitado pelo atleta"
                />
                <Button variant="secondary">Cancelar inscrição</Button>
              </form>
            )}
          </>
        ) : d.session.status === "registration_open" && athlete ? (
          <form action={registerUrPlayAction} className="mt-3">
            <input name="sessionId" type="hidden" value={sessionId} />
            <input name="athleteId" type="hidden" value={athlete.id} />
            <input name="source" type="hidden" value="athlete" />
            <Button>INSCREVER-SE</Button>
          </form>
        ) : (
          <strong>INSCRIÇÕES ENCERRADAS</strong>
        )}
      </Card>
    </div>
  );
}
