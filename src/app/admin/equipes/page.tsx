import { Layers3, Shield, UserPlus, UsersRound, Warehouse } from "lucide-react";
import { TeamCard } from "@/components/admin/teams/team-card";
import { Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminTeamsSnapshot } from "@/server/services/admin-teams-service";

export default async function TeamsPage() {
  await requireAdminModule("teams");
  const snapshot = await getAdminTeamsSnapshot();
  const metrics = [
    ["Equipes", snapshot.metrics.officialTeams, Shield],
    ["Atletas vinculados", snapshot.metrics.activeAthletes, UsersRound],
    ["Duplas registradas", snapshot.metrics.registeredDoubles, Layers3],
    ["Vagas de duplas", snapshot.metrics.openDoubleSlots, Warehouse],
    ["Atletas livres", snapshot.metrics.freeAgents, UserPlus],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader eyebrow="Esportivo" title="Equipes Oficiais" description="Visão institucional das equipes, seus atletas e a ocupação das até 5 duplas permitidas por categoria e temporada." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([label, value, Icon]) => <Card key={label}><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-zinc-500 uppercase">{label}</p><Icon className="text-ur-gold" size={16} aria-hidden="true" /></div><p className="font-display mt-3 text-2xl font-black">{value}</p></Card>)}
      </div>
      <Card className="border-ur-gold/30"><p className="font-bold">Regra estrutural já protegida no banco</p><p className="mt-2 text-sm leading-6 text-zinc-400">O backend impede mais de 5 duplas por equipe/categoria/temporada. Uma dupla ativa exige exatamente 2 titulares e não aceita reserva próprio.</p></Card>
      {snapshot.teams.length === 0 ? <Card><p className="font-bold">Nenhuma Equipe Oficial cadastrada.</p><p className="mt-2 text-sm text-zinc-500">Quando os dados forem migrados, as equipes aparecerão aqui com a ocupação por categoria.</p></Card> : <div className="grid gap-4 xl:grid-cols-2">{snapshot.teams.map((team) => <TeamCard key={team.id} team={team} />)}</div>}
      {snapshot.sourceErrors.length > 0 && <Card><p className="font-bold">Leitura parcial</p><ul className="mt-2 text-sm text-zinc-500">{snapshot.sourceErrors.map((error) => <li key={error}>{error}</li>)}</ul></Card>}
    </div>
  );
}
