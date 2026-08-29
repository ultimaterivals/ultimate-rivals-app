import {
  ArrowRight,
  CircleDot,
  Layers3,
  MapPin,
  Shield,
  Target,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";

type TeamContribution = {
  formation_id: string;
  formation_name: string;
  total_points: number;
  games_played: number;
  wins: number;
  losses: number;
};

type TeamFormation = {
  id: string;
  team_id: string | null;
  display_name: string;
  format_id: string;
  category_id: string | null;
  level: string | null;
  pole_id: string | null;
};

const professionalizationTrack = [
  "Formar",
  "Organizar",
  "Competir",
  "Crescer",
  "Profissionalizar",
  "Tornar-se referência",
] as const;

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

  const seasonResult = await client
    .from("seasons")
    .select("id,name")
    .eq("status", "active")
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const memberships = membershipResult.data ?? [];
  const officialTeams = officialTeamsResult.data ?? [];
  const teamIds = memberships.map((row) => row.team_id);

  const [membersResult, rankingsResult, formatsResult, categoriesResult] =
    await Promise.all([
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
      client
        .from("competitive_formats")
        .select("id,code,name")
        .eq("status", "active"),
      client
        .from("competitive_categories")
        .select("id,name")
        .eq("status", "active"),
    ]);

  const formationsResult =
    teamIds.length && seasonResult.data?.id
      ? await client
          .from("competition_formations")
          .select("id,team_id,display_name,format_id,category_id,level,pole_id")
          .eq("season_id", seasonResult.data.id)
          .eq("status", "active")
          .in("team_id", teamIds)
          .order("display_name", { ascending: true })
      : { data: [], error: null };

  const contributionResults = await Promise.all(
    teamIds.map(async (teamId) => {
      const result = await client.rpc("get_athlete_team_contributions", {
        p_team_id: teamId,
      });
      return { teamId, ...result };
    }),
  );

  const contributionByTeam = new Map<string, TeamContribution[]>(
    contributionResults.map((result) => [
      result.teamId,
      (result.data ?? []) as TeamContribution[],
    ]),
  );
  const formats = new Map(
    (formatsResult.data ?? []).map((format) => [format.id, format]),
  );
  const categories = new Map(
    (categoriesResult.data ?? []).map((category) => [category.id, category]),
  );
  const formations = (formationsResult.data ?? []) as TeamFormation[];

  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Equipe · núcleo do ecossistema"
        title="Seu time em campo"
        description="Sua carreira no UR também é coletiva. Aqui você acompanha identidade, elenco, formações, ranking e contribuição competitiva sem apagar a história temporal de cada vínculo."
      />

      <Card className="border-ur-gold/25">
        <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
          Trilha de profissionalização
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {professionalizationTrack.map((stage, index) => (
            <div
              key={stage}
              className="rounded-2xl border border-white/[.08] bg-white/[.02] p-3"
            >
              <p className="text-[.65rem] font-black text-zinc-600 uppercase">
                Etapa {index + 1}
              </p>
              <p className="mt-1 text-sm font-black">{stage}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-500">
          A trilha é conceitual. O App não atribui estágio, nota ou score à sua
          equipe sem critérios oficiais publicados e calculáveis.
        </p>
      </Card>

      {memberships.length === 0 ? (
        <Card>
          <Users className="text-ur-gold" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Sem equipe vinculada</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Você pode competir sem equipe. Quando existir vínculo homologado, a
            equipe passa a aparecer aqui a partir da vigência correta, sem
            transferir automaticamente jogos ou pontos anteriores.
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
          const teamFormations = formations.filter(
            (formation) => formation.team_id === membership.team_id,
          );

          return (
            <section key={membership.team_id} className="grid gap-4">
              <Card className="ranking-hero border-ur-gold/25 overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {team.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- published team logos may use different approved hosts.
                      <img
                        src={team.logo_url}
                        alt=""
                        className="border-ur-gold/30 size-16 rounded-full border object-cover"
                      />
                    ) : (
                      <span className="border-ur-gold/20 bg-ur-gold/[.04] text-ur-gold grid size-16 place-items-center rounded-full border">
                        <Shield size={34} aria-hidden="true" />
                      </span>
                    )}
                    <div>
                      <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">
                        Equipe oficial
                      </p>
                      <h2 className="font-display mt-1 text-3xl font-black uppercase sm:text-4xl">
                        {team.name}
                      </h2>
                      <p className="mt-2 flex items-center gap-1 text-sm text-zinc-400">
                        <MapPin size={14} aria-hidden="true" />
                        {team.poles
                          ? `${team.poles.name} · ${team.poles.city}`
                          : "Polo em atualização"}
                      </p>
                    </div>
                  </div>
                  <Badge>{team.short_name ?? "Equipe UR"}</Badge>
                </div>

                {ranking ? (
                  <div className="mt-6 grid gap-3 border-y border-white/10 py-4 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Posição</p>
                      <p className="font-display text-ur-gold text-3xl font-black">
                        #{ranking.current_position ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Pontos</p>
                      <p className="font-display text-3xl font-black">
                        {ranking.total_points}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">
                        Campanha
                      </p>
                      <p className="mt-1 font-black">
                        {ranking.wins}V · {ranking.losses}D
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">
                        Aproveitamento
                      </p>
                      <p className="mt-1 font-black">
                        {Number(ranking.win_rate).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-zinc-500">
                    Ranking de equipe ainda não publicado para este contexto.
                  </p>
                )}
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <div className="flex items-center gap-3">
                    <UsersRound className="text-ur-gold" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                        Integrantes
                      </p>
                      <h3 className="mt-1 text-xl font-black">
                        Quem representa a equipe agora
                      </h3>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {members.length > 0 ? (
                      members.map((member, index) => (
                        <Badge key={`${membership.team_id}-${index}`}>
                          {
                            (
                              member.athletes as unknown as {
                                public_name: string;
                              }
                            ).public_name
                          }
                          {member.membership_type === "reserve"
                            ? " · reserva"
                            : ""}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Elenco publicável ainda não disponível.
                      </p>
                    )}
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-3">
                    <Layers3 className="text-ur-gold" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                        Formações da temporada
                      </p>
                      <h3 className="mt-1 text-xl font-black">
                        Duplas e quartetos oficiais
                      </h3>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {teamFormations.length > 0 ? (
                      teamFormations.map((formation) => {
                        const format = formats.get(formation.format_id);
                        const category = formation.category_id
                          ? categories.get(formation.category_id)
                          : null;
                        return (
                          <div
                            key={formation.id}
                            className="rounded-2xl border border-white/[.08] p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-black">
                                {formation.display_name}
                              </p>
                              <Badge>{format?.name ?? "Formação"}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              {category?.name ?? "Categoria a confirmar"}
                              {formation.level
                                ? ` · ${formation.level.toUpperCase()}`
                                : ""}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-zinc-500">
                        Nenhuma formação ativa publicada para a temporada atual.
                      </p>
                    )}
                  </div>
                  <p className="mt-4 text-xs leading-5 text-zinc-600">
                    Formações são temporais. Uma dupla ou quarteto só representa
                    a equipe dentro da vigência homologada da temporada.
                  </p>
                </Card>
              </div>

              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black tracking-[.16em] text-zinc-500 uppercase">
                      Contribuição das formações
                    </p>
                    <h3 className="mt-1 text-xl font-black">
                      Como as formações ajudam a equipe
                    </h3>
                  </div>
                  <Trophy className="text-ur-gold" aria-hidden="true" />
                </div>
                {contributions.length > 0 ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {contributions.map((contribution) => (
                      <div
                        key={contribution.formation_id}
                        className="rounded-2xl border border-white/[.08] p-4"
                      >
                        <p className="font-black">
                          {contribution.formation_name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {`${contribution.games_played} jogos · ${contribution.wins}V · ${contribution.losses}D`}
                        </p>
                        <p className="font-display text-ur-gold mt-2 text-2xl font-black">
                          {contribution.total_points} pts
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-500">
                    Ainda não há contribuição competitiva publicada para esta
                    equipe.
                  </p>
                )}
                <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-zinc-400">
                  <CircleDot
                    className="text-ur-gold mt-1 shrink-0"
                    size={14}
                    aria-hidden="true"
                  />
                  O ranking usa somente contribuições canônicas atribuídas à
                  equipe no momento efetivo de cada jogo. Vínculo novo não move
                  resultado antigo.
                </p>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-ur-gold/20">
                  <Target className="text-ur-gold" aria-hidden="true" />
                  <h3 className="mt-3 text-xl font-black">
                    Próximos objetivos
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Continue jogando, fortalecendo as formações e acompanhando o
                    ranking. Critérios de estágio, vaga, repasse ou oportunidade
                    só aparecem como conquistados quando houver regra oficial e
                    publicação canônica.
                  </p>
                  <Link
                    href="/athlete/season"
                    className="text-ur-gold mt-4 inline-flex items-center gap-2 text-sm font-black"
                  >
                    Ver campanha da temporada
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </Card>
                <Card>
                  <Shield className="text-ur-gold" aria-hidden="true" />
                  <h3 className="mt-3 text-xl font-black">
                    Premiações, repasses e oportunidades
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Esta área não antecipa valores ou elegibilidade. Premiações,
                    repasses e oportunidades da equipe devem ser mostrados aqui
                    somente quando estiverem homologados e publicáveis pelo
                    backend oficial.
                  </p>
                </Card>
              </div>
            </section>
          );
        })
      )}

      {officialTeams.length > 0 && (
        <Card>
          <h2 className="text-xl font-black">
            Equipes oficiais do ecossistema
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Visão pública mínima das equipes ativas cadastradas no UR. Nenhum
            dado interno, candidatura ou operação administrativa é exposto.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
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
        seasonResult.error ||
        membersResult.error ||
        rankingsResult.error ||
        formatsResult.error ||
        categoriesResult.error ||
        formationsResult.error ||
        contributionResults.some((result) => result.error)) && (
        <p className="text-sm text-zinc-500">
          Uma informação da equipe está temporariamente indisponível.
        </p>
      )}
    </div>
  );
}
