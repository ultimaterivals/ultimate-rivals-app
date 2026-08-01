import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listPoles } from "@/server/repositories/poles.repository";
import { searchTeams } from "@/server/repositories/team360.repository";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pole?: string; status?: string }>;
}) {
  const filters = await searchParams;
  const client = await createClient();
  const [teams, poles] = await Promise.all([
    searchTeams(client, {
      query: filters.q,
      poleId: filters.pole,
      status: filters.status,
    }),
    listPoles(client),
  ]);
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operação esportiva"
        title="Equipes"
        description="Clubes, polos oficiais, responsáveis, atletas e formações."
      />
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/teams/new"
          className="rounded-ur bg-ur-gold px-5 py-3 font-bold text-black"
        >
          Nova equipe
        </Link>
      </div>
      <Card>
        <form className="grid gap-3 md:grid-cols-4">
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="Buscar equipe"
            className="rounded-ur border bg-black p-3"
          />
          <select
            name="pole"
            defaultValue={filters.pole}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos os polos</option>
            {poles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={filters.status}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos os status</option>
            <option value="active">Ativa</option>
            <option value="inactive">Inativa</option>
            <option value="archived">Arquivada</option>
          </select>
          <button className="rounded-ur border px-4 font-bold">Filtrar</button>
        </form>
      </Card>
      {teams.length === 0 ? (
        <EmptyState
          title="Nenhuma equipe"
          description="Ajuste os filtros ou cadastre o primeiro clube."
        />
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <Card key={team.id} className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <p className="text-ur-gold text-xs font-bold uppercase">
                  {team.poles[0]?.name}
                </p>
                <h2 className="text-2xl font-black">{team.name}</h2>
                <p className="mt-2 text-zinc-400">
                  {team.status} · {team.athlete_count} atletas ·{" "}
                  {team.roster_count} formações
                </p>
                <p className="text-sm text-zinc-500">
                  Responsável: {team.manager ? "atribuído" : "não atribuído"}
                </p>
              </div>
              <Link
                href={`/admin/teams/${team.id}`}
                className="rounded-ur border px-5 py-3 text-center font-bold"
              >
                Visualizar
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
