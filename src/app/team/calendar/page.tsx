import { redirect } from "next/navigation";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTeamCalendar } from "@/server/repositories/team-portal.repository";
import { getManagedTeamId } from "@/server/repositories/team360.repository";

export default async function TeamCalendarPage() {
  const identity = await requireRole("team_manager");
  const client = await createClient();
  const teamId = await getManagedTeamId(client, identity.userId);
  if (!teamId) redirect("/");
  const events = await getTeamCalendar(client);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Equipe"
        title="Calendário"
        description="Compromissos de UR Play, treinos e competições visíveis ao gestor. Sem permissões de ranking ou nível."
      />
      {events.length ? (
        events.map((event) => (
          <Card key={event.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-ur-gold text-xs font-bold uppercase">
                  {event.event_type}
                </p>
                <h2 className="text-xl font-black">{event.name}</h2>
                <p className="text-zinc-400">
                  {new Date(event.starts_at).toLocaleString("pt-BR")}
                </p>
              </div>
              <Badge>{event.status}</Badge>
            </div>
          </Card>
        ))
      ) : (
        <EmptyState
          title="Sem compromissos no calendário"
          description="Quando houver treinos, UR Play ou competições vinculadas, elas aparecerão aqui."
        />
      )}
    </div>
  );
}
