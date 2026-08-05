import { Shield, Trophy, UsersRound } from "lucide-react";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listPublicTeams } from "@/server/repositories/public-experience.repository";

export default async function PublicTeamsPage() {
  const teams = await listPublicTeams(await createClient());

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-5 py-8 sm:px-8">
      <PageHeader
        eyebrow="Equipes"
        title="Times Ultimate Rivals"
        description="Perfis publicos de equipes com polo e posicao esportiva. Sem contatos, gestores, financeiro ou observacoes internas."
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teams.length ? (
          teams.map((team) => (
            <Card key={team.id} className="hover:border-ur-gold/40">
              <div className="flex items-start justify-between gap-4">
                <div
                  className="border-ur-gold text-ur-gold grid size-12 shrink-0 place-items-center border-2 font-black"
                  aria-hidden="true"
                >
                  {team.short_name?.slice(0, 2) ??
                    team.name.slice(0, 2).toUpperCase()}
                </div>
                <Badge>{team.status}</Badge>
              </div>
              <h2 className="mt-5 text-2xl font-black">{team.name}</h2>
              <p className="mt-2 text-sm text-zinc-400">
                {team.description ?? "Equipe oficial da temporada."}
              </p>
              <div className="mt-5 grid gap-2 text-sm font-bold text-zinc-300">
                <p className="flex items-center gap-2">
                  <Shield size={16} className="text-ur-gold" />
                  {team.pole_name ?? "Polo a definir"}
                </p>
                <p className="flex items-center gap-2">
                  <Trophy size={16} className="text-ur-gold" />
                  Ranking equipe:{" "}
                  {team.team_ranking_position
                    ? `#${team.team_ranking_position}`
                    : "em formacao"}
                </p>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            title="Equipes publicas em preparacao"
            description="Equipes ativas aparecerao aqui quando houver dados DEV publicados."
            action={
              <Link
                href="/rankings/teams"
                className="text-ur-gold inline-flex min-h-11 items-center gap-2 font-black"
              >
                Ver ranking de equipes <UsersRound size={16} />
              </Link>
            }
          />
        )}
      </div>
    </main>
  );
}
