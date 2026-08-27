import { MapPin, Shield, Trophy, Users } from "lucide-react";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

export default async function AthleteTeamPage() {
  const viewer = await requireAthleteViewer();
  const client = await createClient();
  const now = new Date().toISOString();
  const membershipResult = await client
    .from("team_memberships")
    .select(
      "team_id,teams!inner(id,name,short_name,logo_url,primary_pole_id,poles(name,city))",
    )
    .eq("athlete_id", viewer.athleteId)
    .eq("status", "active")
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gt.${now}`);
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
          .lte("starts_at", now)
          .or(`ends_at.is.null,ends_at.gt.${now}`)
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
  const contributionResults = await Promise.all(
    teamIds.map(async (teamId) => {
      const result = await client.rpc("get_athlete_team_contributions", {
        p_team_id: teamId,
      });
      return { teamId, ...result };
    }),
  );
  const contributionByTeam = new Map(
    contributionResults.map((result) => [result.teamId, result.data ?? []]),
  );

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Equipe e dupla"
        title="Seu time em campo"
        description="Acompanhe seu elenco, posição, campanha e a contribuição competitiva das formações da equipe."
      />
      {memberships.length === 0 ? (
        <Card>
          <Users className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Sem equipe vinculada</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Sua dupla pode competir de forma independente. Quando houver um
            vínculo homologado com uma equipe, ele aparecerá aqui sem apagar o
            histórico da formação.
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
          const contributions =
            contributionByTeam.get(membership.team_id) ?? [];
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
                  Integrantes
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
              {contributions.length > 0 && (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                    Contribuição das formações
                  </p>
                  <div className="mt-3 grid gap-2">
                    {contributions.map((contribution) => (
                      <div
                        key={contribution.formation_id}
                        className="border-b border-white/10 py-3"
                      >
                        <p className="font-bold">
                          {contribution.formation_name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {`${contribution.games_played} jogos · ${contribution.wins}V · ${contribution.losses}D`}
                        </p>
                        <p className="font-display text-ur-gold mt-2 font-black">
                          {contribution.total_points} pts
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
                <Trophy className="text-ur-gold" size={16} aria-hidden="true" />{" "}
                O ranking da equipe usa apenas contribuições canônicas atribuídas
                à equipe no momento efetivo de cada jogo.
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
        rankingsResult.error ||
        contributionResults.some((result) => result.error)) && (
        <p className="text-sm text-zinc-500">
          Uma informação da equipe está temporariamente indisponível.
        </p>
      )}
    </div>
  );
}
