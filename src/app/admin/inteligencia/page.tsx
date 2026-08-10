import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { requireAdminModule } from "@/lib/auth/admin-module-access";

export default async function IntelligencePage() {
  await requireAdminModule("intelligence");
  return (
    <AdminModulePlaceholder
      title="Inteligência UR"
      description="Camada de leitura do ecossistema para transformar dados em decisões operacionais."
      nextItems={[
        "Funil de aquisição e retenção",
        "Demanda e capacidade por polo e horário",
        "Alertas explicáveis e recomendações acionáveis",
      ]}
    />
  );
}
