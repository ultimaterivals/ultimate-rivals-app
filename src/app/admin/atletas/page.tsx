import { Activity, AlertTriangle, Repeat2, UserPlus, UsersRound, UserX } from "lucide-react";
import { AthleteFilters } from "@/components/admin/athletes/athlete-filters";
import { AthleteTable } from "@/components/admin/athletes/athlete-table";
import { CommandSection } from "@/components/admin/command-section";
import { Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminAthletesSnapshot } from "@/server/services/admin-athletes-service";

type Params = Promise<{ q?: string | string[]; segment?: string | string[]; pole?: string | string[] }>;
const single = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function AthletesPage({ searchParams }: { searchParams: Params }) {
  await requireAdminModule("athletes");
  const params = await searchParams;
  const pole = single(params.pole);
  const snapshot = await getAdminAthletesSnapshot({
    search: single(params.q) ?? "",
    segment: single(params.segment) ?? "all",
    poleId: pole && pole !== "all" ? pole : null,
  });

  const metrics = [
    ["Total", snapshot.metrics.total, UsersRound],
    ["Ativos 30d", snapshot.metrics.active30d, Activity],
    ["Só 1ª participação", snapshot.metrics.firstOnly, UserPlus],
    ["Em risco", snapshot.metrics.atRisk, AlertTriangle],
    ["Inativos", snapshot.metrics.inactive, UserX],
    ["Atletas livres", snapshot.metrics.freeAgents, Repeat2],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Esportivo" title="Atletas e Ciclo de Vida" description="Visão operacional dos atletas da entrada à recorrência, com atenção especial à segunda participação e ao risco de inatividade." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value, Icon]) => <Card key={label}><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-zinc-500 uppercase">{label}</p><Icon className="text-ur-gold" size={16} aria-hidden="true" /></div><p className="font-display mt-3 text-2xl font-black">{value}</p></Card>)}
      </div>
      <AthleteFilters snapshot={snapshot} />
      <CommandSection title={`${snapshot.filteredRows.length} atleta(s)`} description="A fonte de verdade é o cadastro oficial; engajamento complementa o perfil quando existe histórico de comportamento.">
        <AthleteTable rows={snapshot.filteredRows} />
      </CommandSection>
      {snapshot.sourceErrors.length > 0 && <Card><p className="font-bold">Leitura parcial</p><ul className="mt-2 text-sm text-zinc-500">{snapshot.sourceErrors.map((error) => <li key={error}>{error}</li>)}</ul></Card>}
    </div>
  );
}
