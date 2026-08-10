import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { requireAdminModule } from "@/lib/auth/admin-module-access";

export default async function UrPlayPage() {
  await requireAdminModule("urPlay");
  return (
    <AdminModulePlaceholder
      title="UR Play"
      description="Infraestrutura semanal de jogo, dados, recorrência e entrada esportiva no ecossistema."
      nextItems={[
        "Sessões e capacidade por formação",
        "Matchmaking, reservas e check-in",
        "Operação e fechamento da sessão",
      ]}
    />
  );
}
