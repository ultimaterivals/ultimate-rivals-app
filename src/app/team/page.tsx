import { redirect } from "next/navigation";
import { PageHeader, Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  getManagedTeamId,
  getTeamDetail,
} from "@/server/repositories/team360.repository";
export default async function Page() {
  const a = await requireRole("team_manager"),
    client = await createClient(),
    id = await getManagedTeamId(client, a.userId);
  if (!id) redirect("/");
  const d = await getTeamDetail(client, id);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Clube oficial"
        title={d.team.name}
        description={`${d.team.status} · ${Array.isArray(d.team.poles) ? d.team.poles[0]?.name : "Polo oficial"}`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-zinc-500">Atletas ativos</p>
          <strong className="text-3xl">
            {d.memberships.filter((m) => m.status === "active").length}
          </strong>
        </Card>
        <Card>
          <p className="text-zinc-500">Formações</p>
          <strong className="text-3xl">{d.rosters.length}</strong>
        </Card>
        <Card>
          <p className="text-zinc-500">Responsáveis</p>
          <strong className="text-3xl">{d.managers.length}</strong>
        </Card>
      </div>
    </div>
  );
}
