import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { requireAdminModule } from "@/lib/auth/admin-module-access";

export default async function FinancePage() {
  await requireAdminModule("finance");
  return (
    <AdminModulePlaceholder
      title="Financeiro"
      description="Visão econômica conectada aos produtos, sessões, competições e obrigações do ecossistema."
      nextItems={[
        "Pacotes, créditos e pagamentos",
        "Receita, custo e margem por operação",
        "Premiações, repasses e cobertura financeira",
      ]}
    />
  );
}
