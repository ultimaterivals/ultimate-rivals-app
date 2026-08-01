import { DataTable } from "@/components/ui";
import { EntitySection } from "@/components/admin/entity-section";
import { TeamCreateForm } from "@/features/admin/create-forms";
import { createClient } from "@/lib/supabase/server";
import { listPoles } from "@/server/repositories/poles.repository";
import { listTeams } from "@/server/repositories/teams.repository";

export default async function TeamsPage() {
  const client = await createClient();
  const [rows, poles] = await Promise.all([
    listTeams(client),
    listPoles(client),
  ]);
  return (
    <EntitySection
      title="Equipes"
      description="Organizações oficiais vinculadas a um polo."
      form={<TeamCreateForm poles={poles} />}
      empty={rows.length === 0}
    >
      <DataTable
        caption="Equipes"
        rows={rows}
        getRowKey={(row) => row.id}
        columns={[
          { key: "name", header: "Nome", render: (row) => row.name },
          { key: "slug", header: "Slug", render: (row) => row.slug },
          { key: "status", header: "Status", render: (row) => row.status },
        ]}
      />
    </EntitySection>
  );
}
