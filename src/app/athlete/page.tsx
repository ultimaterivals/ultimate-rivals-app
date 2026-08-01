import { UserRound } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";

export default function AthletePage() {
  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Meu jogo"
        title="Portal do atleta"
        description="Seu histórico esportivo será exibido aqui após a definição e implementação do domínio."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Perfil"
          value="Ativo"
          hint="Estrutura inicial"
          icon={UserRound}
        />
      </div>
      <EmptyState
        title="A jornada começa em breve"
        description="Partidas, estatísticas, pontuação e ranking aparecerão quando houver dados homologados."
      />
    </div>
  );
}
