import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listUrPlaySessions } from "@/server/repositories/ur-play.repository";
export default async function Page() {
  const rows = await listUrPlaySessions(await createClient());
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operação semanal"
        title="UR Play"
        description="Sessões, inscrições, lista de espera e presença."
      />
      <Link
        href="/admin/ur-play/new"
        className="rounded-ur bg-ur-gold w-fit px-5 py-3 font-black text-black"
      >
        Nova sessão
      </Link>
      {rows.map((s) => (
        <Card key={s.id}>
          <p className="text-ur-gold text-xs font-bold uppercase">{s.status}</p>
          <h2 className="text-2xl font-black">{s.name}</h2>
          <p>
            {new Date(s.starts_at).toLocaleString("pt-BR")} ·{" "}
            {
              s.ur_play_registrations.filter(
                (r) => r.registration_status === "confirmed",
              ).length
            }
            /{s.capacity} confirmados ·{" "}
            {
              s.ur_play_registrations.filter(
                (r) => r.registration_status === "waitlisted",
              ).length
            }{" "}
            waitlist
          </p>
          <Link href={`/admin/ur-play/${s.id}`} className="font-bold">
            Abrir dashboard →
          </Link>
        </Card>
      ))}
    </div>
  );
}
