import { MapPin, Shield, Trophy, Users } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteTeamPage() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const membershipResult = await client
    .from("team_memberships")
    .select(
      "team_id,teams!inner(id,name,short_name,logo_url,primary_pole_id,poles(name,city))",
    )
    .eq("athlete_id", viewer.athleteId)
    .eq("status", "active");
  const officialTeamsResult = await client
    .from("teams")
    .select("id,name,short_name,primary_pole_id,poles(name,city)")
    .eq("status", "active")
    .order("name", { ascending: true });
  const memberships = membershipResult.data ?? [];
  const officialTeams = officialTeamsResult.data ?? [];
  const teamIds = memberships.map((row) => row.team_id);
  const [membersResult, rankingsResult] = await Promise.all([
    teamIds.length
      ? client
          .from("team_memberships")
          .select("team_id,membership_type,athletes!inner(public_name)")
          .in("team_id", teamIds)
          .eq("status", "active")
      : Promise.resolve({ data: [], error: null }),
    teamIds.length
      ? client
          .from("public_rankings")
          .select(
            "entity_id,current_position,total_points,games_played,wins,losses,win_rate",
          )
          .eq("ranking_type", "team")
          .in("entity_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Equipe e dupla"
        title="Seu time em campo"
        description="Acompanhe seu elenco, polo e campanha oficial da temporada."
      />
      {memberships.length === 0 ? (
        <Card>
          <Users className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Sem equipe vinculada</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Sua dupla pode competir de forma independente. Quando houver um vínculo
            homologado com uma equipe, ele aparecerá aqui sem apagar o histórico da
            formação.
          </p>
        </Card>
      ) : (
        memberships.map((membership) => {
          const team = membership.teams as unknown as {
            name: string;
            short_name: string | null;
            logo_url: string | null;
            poles: { name: string; city: string } | null;
          };
          const members = (membersResult.data ?? []).filter(
            (member) => member.team_id === membership.team_id,
          );
          const ranking = (rankingsResult.data ?? []).find(
            (row) => row.entity_id === membership.team_id,
          );
          return (
            <Card
              key={membership.team_id}
              className="ranking-hero border-ur-gold/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {team.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- published team logos may use different approved hosts.
                    <img
                      src={team.logo_url}
                      alt=""
                      className="border-ur-gold/30 size-14 rounded-full border object-cover"
                    />
                  ) : (
                    <Shield
                      className="text-ur-gold"
                      size={36}
                      aria-hidden="true"
                    />
                  )}
                  <h2 className="mt-3 text-2xl font-black">{team.name}</h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-zinc-400">
                    <MapPin size={14} aria-hidden="true" />
                    {team.poles
                      ? `${team.poles.name} · ${team.poles.city}`
                      : "Polo em atualização"}
                  </p>
                </div>
                <Badge>{team.short_name ?? "Equipe oficial"}</Badge>
              </div>
              {ranking && (
                <div className="mt-5 grid gap-3 border-y border-white/10 py-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Posição</p>
                    <p className="font-display text-ur-gold text-2xl font-black">
                      #{ranking.current_position ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Pontos</p>
                    <p className="font-display text-2xl font-black">
                      {ranking.total_points}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Campanha</p>
                    <p className="font-bold">
                      {ranking.wins}V · {ranking.losses}D
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">
                      Aproveitamento
                    </p>
                    <p className="font-bold">
                      {Number(ranking.win_rate).toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-5">
                <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                  Elenco
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
              <p className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
                <Trophy className="text-ur-gold" size={16} aria-hidden="true" />{" "}
                Resultados, contribuição e repasses aparecem aqui quando forem
                publicados para a equipe.
              </p>
            </Card>
          );
        })
      )}
      {officialTeams.length > 0 && (
        <Card>
          <h2 className="text-xl font-black">Equipes UR</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Equipes oficiais cadastradas no ecossistema.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {officialTeams.map((team) => {
              const pole = team.poles as unknown as {
                name: string;
                city: string;
              } | null;
              return (
                <Badge key={team.id}>
                  {team.name}
                  {pole ? ` · ${pole.city}` : ""}
                </Badge>
              );
            })}
          </div>
        </Card>
      )}
      {(membershipResult.error ||
        officialTeamsResult.error ||
        membersResult.error ||
        rankingsResult.error) && (
        <p className="text-sm text-zinc-500">
          Uma informação da equipe está temporariamente indisponível.
        </p>
      )}
    </div>
  );
}
