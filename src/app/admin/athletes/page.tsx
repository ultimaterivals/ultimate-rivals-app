import { DataTable } from "@/components/ui";
import { EntitySection } from "@/components/admin/entity-section";
import { AthleteCreateForm } from "@/features/admin/create-forms";
import { createClient } from "@/lib/supabase/server";
import { listAthletes } from "@/server/repositories/athletes.repository";

export default async function AthletesPage() {
  const rows = await listAthletes(await createClient());
  return (
    <EntitySection
      title="Atletas"
      description="Cadastro esportivo separado da identidade de acesso."
      form={<AthleteCreateForm />}
      empty={rows.length === 0}
    >
      <DataTable
        caption="Atletas"
        rows={rows}
        getRowKey={(row) => row.id}
        columns={[
          {
            key: "public",
            header: "Nome público",
            render: (row) => row.public_name,
          },
          {
            key: "full",
            header: "Nome completo",
            render: (row) => row.full_name,
          },
          { key: "status", header: "Status", render: (row) => row.status },
        ]}
      />
    </EntitySection>
  );
}
