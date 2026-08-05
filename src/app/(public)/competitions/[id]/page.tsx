import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { getPublicTournament } from "@/server/repositories/tournaments.repository";
import { productLabel } from "@/lib/validation/tournament";

export default async function PublicCompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await getPublicTournament(await createClient(), id);
  if (!tournament) notFound();
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        eyebrow={productLabel(tournament.product)}
        title={tournament.name}
        description={`${tournament.pole_name ?? "Sede a definir"} · ${tournament.status}`}
      />
      <Card>
        <h2 className="text-xl font-black">Tabela e standings</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Esta pagina publica usa somente dados publicados, resultados
          homologados e classificacao sem PII.
        </p>
      </Card>
    </div>
  );
}
