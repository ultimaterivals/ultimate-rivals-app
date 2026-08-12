import { Shield, Users } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteTeamPage() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const membershipResult = await client
    .from("team_memberships")
    .select(
      "team_id,teams!inner(id,name,short_name,primary_pole_id,poles(name,city))",
    )
    .eq("athlete_id", viewer.athleteId)
    .eq("status", "active");
  const memberships = membershipResult.data ?? [];
  const teamIds = memberships.map((row) => row.team_id);
  const membersResult = teamIds.length
    ? await client
        .from("team_memberships")
        .select("team_id,membership_type,athletes!inner(public_name)")
        .in("team_id", teamIds)
        .eq("status", "active")
    : { data: [], error: null };

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Equipe e dupla"
        title="Seus vínculos esportivos"
        description="Informações oficiais de equipe e integrantes disponíveis para você."
      />
      {memberships.length === 0 ? (
        <Card>
          <Users className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Sem equipe ou dupla ativa</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Quando houver um vínculo homologado, ele aparecerá aqui.
          </p>
        </Card>
      ) : (
        memberships.map((membership) => {
          const team = membership.teams as unknown as {
            name: string;
            short_name: string | null;
            poles: { name: string; city: string } | null;
          };
          const members = (membersResult.data ?? []).filter(
            (member) => member.team_id === membership.team_id,
          );
          return (
            <Card key={membership.team_id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Shield className="text-ur-gold" aria-hidden="true" />
                  <h2 className="mt-3 text-2xl font-black">{team.name}</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {team.poles
                      ? `${team.poles.name} · ${team.poles.city}`
                      : "Polo em atualização"}
                  </p>
                </div>
                <Badge>{team.short_name ?? "Equipe oficial"}</Badge>
              </div>
              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                  Integrantes publicados
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {members.map((member, index) => (
                    <Badge key={`${membership.team_id}-${index}`}>
                      {
                        (member.athletes as unknown as { public_name: string })
                          .public_name
                      }
                      {member.membership_type === "reserve" ? " · reserva" : ""}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="mt-5 text-sm text-zinc-500">
                Contribuições e posições exibidas no ranking permanecem as
                projeções oficiais já calculadas.
              </p>
            </Card>
          );
        })
      )}
      {(membershipResult.error || membersResult.error) && (
        <p className="text-sm text-zinc-500">
          Uma fonte de equipe está temporariamente indisponível.
        </p>
      )}
    </div>
  );
}
