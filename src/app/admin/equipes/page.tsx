import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { requireAdminModule } from "@/lib/auth/admin-module-access";

export default async function TeamsPage() {
  await requireAdminModule("teams");
  return (
    <AdminModulePlaceholder
      title="Equipes Oficiais"
      description="Filiação, identidade, formações e vínculo institucional das equipes com a liga."
      nextItems={[
        "Masculino, Feminino e Misto",
        "Até 5 duplas oficiais por categoria",
        "Atletas livres, equipes de formação UR e vínculo com polos",
      ]}
    />
  );
}
