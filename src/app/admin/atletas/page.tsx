import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { requireAdminModule } from "@/lib/auth/admin-module-access";

export default async function AthletesPage() {
  await requireAdminModule("athletes");
  return (
    <AdminModulePlaceholder
      title="Atletas e Ciclo de Vida"
      description="Central esportiva e de relacionamento para acompanhar cada atleta da entrada à recorrência."
      nextItems={[
        "Perfil 360° e origem de aquisição",
        "Primeira e segunda participação",
        "Recorrência, evolução e risco de inatividade",
      ]}
    />
  );
}
