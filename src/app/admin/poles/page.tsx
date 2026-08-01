import { DataTable } from "@/components/ui";
import { EntitySection } from "@/components/admin/entity-section";
import { PoleCreateForm } from "@/features/admin/create-forms";
import { createClient } from "@/lib/supabase/server";
import { listPoles } from "@/server/repositories/poles.repository";

export default async function PolesPage() {
  const rows = await listPoles(await createClient());
  return (
    <EntitySection
      title="Polos"
      description="Unidades oficiais do ecossistema."
      form={<PoleCreateForm />}
      empty={rows.length === 0}
    >
      <DataTable
        caption="Polos"
        rows={rows}
        getRowKey={(row) => row.id}
        columns={[
          { key: "name", header: "Nome", render: (row) => row.name },
          {
            key: "location",
            header: "Local",
            render: (row) => `${row.city}/${row.state}`,
          },
          { key: "status", header: "Status", render: (row) => row.status },
        ]}
      />
    </EntitySection>
  );
}
