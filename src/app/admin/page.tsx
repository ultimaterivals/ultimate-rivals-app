import { ShieldCheck } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";

export default function AdminPage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Operação"
        title="Central administrativa"
        description="A estrutura está pronta para receber os módulos operacionais quando suas regras forem especificadas."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Ambiente"
          value="Base"
          hint="Sem dados de produção"
          icon={ShieldCheck}
        />
      </div>
      <EmptyState
        title="Módulos em preparação"
        description="Atletas, equipes, polos, sessões e partidas serão adicionados nas próximas etapas, com regras validadas."
      />
    </div>
  );
}
