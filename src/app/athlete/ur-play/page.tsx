import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listUrPlaySessions } from "@/server/repositories/ur-play.repository";
export default async function Page() {
  const rows = (await listUrPlaySessions(await createClient())).filter((s) =>
    [
      "published",
      "registration_open",
      "registration_closed",
      "checkin_open",
    ].includes(s.status),
  );
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Experiência semanal"
        title="UR Play"
        description="Próximas sessões, vagas e inscrições."
      />
      {rows.map((s) => {
        const confirmed = s.ur_play_registrations.filter(
          (r) => r.registration_status === "confirmed",
        ).length;
        return (
          <Card key={s.id}>
            <p className="text-ur-gold font-bold">
              {new Date(s.starts_at).toLocaleDateString("pt-BR", {
                weekday: "short",
                day: "2-digit",
                month: "short",
              })}
            </p>
            <h2 className="text-2xl font-black">{s.name}</h2>
            <p>
              {new Date(s.starts_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              —{" "}
              {new Date(s.ends_at).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p>
              {confirmed}/{s.capacity} vagas ·{" "}
              {
                s.ur_play_registrations.filter(
                  (r) => r.registration_status === "waitlisted",
                ).length
              }{" "}
              na espera
            </p>
            <Link
              href={`/athlete/ur-play/${s.id}`}
              className="mt-3 inline-block font-black"
            >
              VER SESSÃO →
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
