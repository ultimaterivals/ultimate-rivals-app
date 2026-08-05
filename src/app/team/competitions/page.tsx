import { redirect } from "next/navigation";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getTeamCompetitions } from "@/server/repositories/team-portal.repository";
import { getManagedTeamId } from "@/server/repositories/team360.repository";

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function TeamCompetitionsPage() {
  const identity = await requireRole("team_manager");
  const client = await createClient();
  const teamId = await getManagedTeamId(client, identity.userId);
  if (!teamId) redirect("/");
  const registrations = await getTeamCompetitions(client, teamId);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Equipe"
        title="Competições"
        description="Inscrições, elegibilidade e pendências da equipe em Series, Cup e Legends."
      />
      {registrations.length ? (
        registrations.map((registration) => {
          const division = first(registration.tournament_divisions);
          const tournament = first(division?.tournaments);
          return (
            <Card key={registration.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-ur-gold text-xs font-bold uppercase">
                    {tournament?.product ?? "competição"}
                  </p>
                  <h2 className="text-xl font-black">
                    {tournament?.name ?? "Torneio"}
                  </h2>
                  <p className="text-zinc-400">
                    {registration.eligibility_status} ·{" "}
                    {registration.payment_status}
                  </p>
                  {registration.eligibility_reasons?.length ? (
                    <p className="mt-2 text-sm text-zinc-500">
                      {registration.eligibility_reasons.join(", ")}
                    </p>
                  ) : null}
                </div>
                <Badge>{registration.status}</Badge>
              </div>
            </Card>
          );
        })
      ) : (
        <EmptyState
          title="Nenhuma inscrição de torneio"
          description="O gestor verá inscrições, pendências e elegibilidade quando a equipe participar."
        />
      )}
    </div>
  );
}
