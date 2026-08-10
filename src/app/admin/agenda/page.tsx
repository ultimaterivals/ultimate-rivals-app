import { AdminModulePlaceholder } from "@/components/admin/admin-module-placeholder";
import { requireAdminModule } from "@/lib/auth/admin-module-access";

export default async function AgendaPage() {
  await requireAdminModule("agenda");
  return (
    <AdminModulePlaceholder
      title="Agenda e Demanda"
      description="Calendário operacional, disponibilidade, oportunidades, reservas e ocupação."
      nextItems={[
        "Agenda operacional das 06:00 às 00:00",
        "Visões diária, semanal e mensal",
        "Mapa de demanda, oportunidades, sessões e reservas",
      ]}
    />
  );
}
