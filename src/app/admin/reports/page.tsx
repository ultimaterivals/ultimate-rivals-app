import { Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listReportOperations } from "@/server/repositories/wallet-media-reports.repository";
import { BarChart3, Building2, Trophy, UsersRound } from "lucide-react";

export default async function AdminReportsPage() {
  const {
    athleteReports,
    teamReports,
    venueReports,
    sponsorReports,
    seasonReports,
  } = await listReportOperations(await createClient());

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Relatórios"
        title="Read models da Temporada 1"
        description="Dashboards resumidos para atleta, equipe, quadra, sponsor e temporada. CSV/PDF ficam como operação posterior se necessário."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Atletas"
          value={String(athleteReports.length)}
          hint="amostra carregada"
          icon={Trophy}
        />
        <StatCard
          label="Equipes"
          value={String(teamReports.length)}
          hint="rosters e inscrições"
          icon={UsersRound}
        />
        <StatCard
          label="Quadras"
          value={String(venueReports.length)}
          hint="sessões e financeiro"
          icon={Building2}
        />
        <StatCard
          label="Sponsors"
          value={String(sponsorReports.length)}
          hint="deliveries e Market"
          icon={BarChart3}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <ReportCard
          title="Atletas"
          rows={athleteReports.map((row) => ({
            id: row.athlete_id,
            name: row.public_name,
            detail: `${row.games} jogos • ${row.ur_coin_balance} URC`,
          }))}
        />
        <ReportCard
          title="Equipes"
          rows={teamReports.map((row) => ({
            id: row.team_id,
            name: row.name,
            detail: `${row.active_athletes} atletas • ${row.rosters} elencos`,
          }))}
        />
        <ReportCard
          title="Quadras"
          rows={venueReports.map((row) => ({
            id: row.venue_id,
            name: row.name,
            detail: `${row.ur_play_sessions} sessões • ${row.partner_events} eventos`,
          }))}
        />
        <ReportCard
          title="Temporada"
          rows={seasonReports.map((row) => ({
            id: row.season_id,
            name: row.name,
            detail: `${row.active_athletes} atletas • ${row.matches} partidas`,
          }))}
        />
      </section>
    </div>
  );
}

function ReportCard({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; name: string; detail: string }[];
}) {
  return (
    <Card>
      <h2 className="font-display text-xl font-black uppercase">{title}</h2>
      {rows.length ? (
        <div className="mt-4 grid gap-3">
          {rows.slice(0, 8).map((row) => (
            <div key={row.id} className="rounded-ur border p-4">
              <p className="font-bold">{row.name}</p>
              <p className="text-sm text-zinc-400">{row.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title={`Sem dados em ${title}`}
          description="O read model existe, mas ainda não há fixture visível para este recorte."
        />
      )}
    </Card>
  );
}
