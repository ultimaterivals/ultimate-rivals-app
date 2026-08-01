import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listUrPlaySessions } from "@/server/repositories/ur-play.repository";
export default async function Page() {
  const rows = await listUrPlaySessions(await createClient()),
    today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Court Ops"
        title="Sessões de hoje"
        description="Operação rápida de presença e check-in."
      />
      {rows
        .filter(
          (s) =>
            s.session_date === today ||
            ["checkin_open", "in_progress"].includes(s.status),
        )
        .map((s) => (
          <Link key={s.id} href={`/ops/ur-play/${s.id}`}>
            <Card>
              <strong className="text-2xl">{s.name}</strong>
              <p>
                {s.status} · {s.ur_play_registrations.length} participantes
              </p>
            </Card>
          </Link>
        ))}
    </div>
  );
}
