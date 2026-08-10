import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { requireAdminModule } from "@/lib/auth/admin-module-access";

export default async function EcosystemPage() {
  await requireAdminModule("ecosystem");
  return (
    <AdminModulePlaceholder
      title="Saúde do Ecossistema"
      description="Sistema de condução, evidências e conclusão das áreas que sustentam o Ultimate Rivals."
      nextItems={[
        "Playbooks orientados por evidências",
        "Ciclos mensal, trimestral e anual",
        "Score de saúde e gargalos do ecossistema",
      ]}
    />
  );
}
