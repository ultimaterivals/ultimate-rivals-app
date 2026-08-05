import { Card, PageHeader } from "@/components/ui";

export default function AthleteCompetitionDetailPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6">
      <PageHeader
        eyebrow="Competicao"
        title="Detalhe competitivo"
        description="Produto, divisao, sede, preco, elegibilidade, roster, tabela, standings e resultados."
      />
      <Card>
        <p className="text-sm text-zinc-400">
          Esta tela consome as divisoes e inscricoes oficiais da Sprint 12 sob
          RLS do atleta.
        </p>
      </Card>
    </div>
  );
}
