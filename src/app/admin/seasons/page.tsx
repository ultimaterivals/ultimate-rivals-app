import { DataTable } from "@/components/ui";
import { EntitySection } from "@/components/admin/entity-section";
import { SeasonCreateForm } from "@/features/admin/create-forms";
import { createClient } from "@/lib/supabase/server";
import { listSeasons } from "@/server/repositories/seasons.repository";

export default async function SeasonsPage() {
  const rows = await listSeasons(await createClient());
  return (
    <EntitySection
      title="Temporadas"
      description="Calendário competitivo sem regras de ranking nesta etapa."
      form={<SeasonCreateForm />}
      empty={rows.length === 0}
    >
      <DataTable
        caption="Temporadas"
        rows={rows}
        getRowKey={(row) => row.id}
        columns={[
          { key: "name", header: "Nome", render: (row) => row.name },
          { key: "code", header: "Código", render: (row) => row.code },
          { key: "status", header: "Status", render: (row) => row.status },
        ]}
      />
    </EntitySection>
  );
}
