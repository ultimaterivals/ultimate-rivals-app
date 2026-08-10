import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { requireAdminModule } from "@/lib/auth/admin-module-access";

export default async function CompetitionsPage() {
  await requireAdminModule("competitions");
  return (
    <AdminModulePlaceholder
      title="Competições"
      description="Gestão do ciclo competitivo oficial do Ultimate Rivals."
      nextItems={[
        "UR Series, UR Cup e UR Legends",
        "Competition Gates e elegibilidade",
        "Inscrições, chaves, partidas e resultados homologados",
      ]}
    />
  );
}
