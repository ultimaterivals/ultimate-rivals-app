import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { requireAdminModule } from "@/lib/auth/admin-module-access";

export default async function CommercialPage() {
  await requireAdminModule("commercial");
  return (
    <AdminModulePlaceholder
      title="Comercial e Parcerias"
      description="Gestão de quadras, patrocinadores e ativos comerciais conectados à experiência dos atletas."
      nextItems={[
        "Quadras e modelos de parceria",
        "Patrocinadores, acordos e ativos",
        "Ativações, entregas e valor gerado",
      ]}
    />
  );
}
