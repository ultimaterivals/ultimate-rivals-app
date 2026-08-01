import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { TeamLogoUpload } from "@/features/teams/team-logo-upload";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  getManagedTeamId,
  getTeamDetail,
} from "@/server/repositories/team360.repository";
export default async function Page() {
  const identity = await requireRole("team_manager"),
    client = await createClient(),
    id = await getManagedTeamId(client, identity.userId);
  if (!id) redirect("/");
  const d = await getTeamDetail(client, id);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Clube esportivo"
        title={d.team.name}
        description="Identidade, escudo e composição atual do clube."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-xl font-black">Escudo</h2>
          <TeamLogoUpload teamId={id} />
        </Card>
        <Card>
          <h2 className="text-xl font-black">Categorias</h2>
          <p className="mt-3 text-zinc-300">Feminino · Masculino · Misto</p>
          <p className="mt-2 text-zinc-500">
            {d.memberships.filter((m) => m.status === "active").length} atletas
            · {d.rosters.filter((r) => r.status !== "archived").length}{" "}
            formações
          </p>
        </Card>
      </div>
    </div>
  );
}
