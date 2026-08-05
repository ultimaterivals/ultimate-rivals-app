import { CalendarDays, Trophy } from "lucide-react";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listTournaments } from "@/server/repositories/tournaments.repository";
import {
  productLabel,
  recommendTournamentFormat,
} from "@/lib/validation/tournament";

export default async function AdminTournamentsPage() {
  const rows = await listTournaments(await createClient());
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Series, Cup e Legends"
        title="Torneios"
        description="Eventos, divisoes, inscricoes, elegibilidade, chaveamento, agenda e resultados oficiais."
      />
      <Link
        href="/admin/tournaments/new"
        className="rounded-ur bg-ur-gold w-fit px-5 py-3 font-black text-black"
      >
        Novo torneio
      </Link>
      {rows.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map((tournament) => (
            <Link
              key={tournament.id}
              href={`/admin/tournaments/${tournament.id}`}
            >
              <Card className="hover:border-ur-gold/40 grid gap-3 transition-colors">
                <p className="text-ur-gold flex items-center gap-2 text-xs font-black uppercase">
                  <Trophy size={15} />
                  {productLabel(tournament.product)}
                </p>
                <h2 className="text-2xl font-black">{tournament.name}</h2>
                <p className="text-sm text-zinc-400">
                  {tournament.status} ·{" "}
                  {tournament.poles?.name ?? "Sede a definir"}
                </p>
                <p className="flex items-center gap-2 text-sm text-zinc-500">
                  <CalendarDays size={15} />
                  {tournament.starts_at
                    ? new Date(tournament.starts_at).toLocaleString("pt-BR")
                    : "Data a definir"}
                </p>
                <p className="text-xs font-bold text-zinc-500 uppercase">
                  {tournament.tournament_divisions?.length ?? 0} divisao(oes) ·
                  recomendacao por campo: {recommendTournamentFormat(4)}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum torneio criado"
          description="Crie a primeira Series, Cup ou Legends quando o campo competitivo estiver pronto."
        />
      )}
    </div>
  );
}
