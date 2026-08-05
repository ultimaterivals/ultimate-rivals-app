import { Card, PageHeader } from "@/components/ui";
import {
  productLabel,
  tournamentBestOfThreeRules,
  tournamentEntryPrice,
} from "@/lib/validation/tournament";

export default function NewTournamentPage() {
  return (
    <div className="mx-auto grid max-w-4xl gap-6">
      <PageHeader
        eyebrow="Wizard"
        title="Novo torneio"
        description="Blueprint operacional para publicacao controlada. Persistencia via admin action entra sobre o modelo versionado da Sprint 12."
      />
      <Card className="grid gap-5">
        {(["series", "cup", "legends"] as const).map((product) => (
          <section key={product} className="border-b pb-4 last:border-b-0">
            <p className="text-ur-gold text-xs font-black uppercase">
              {productLabel(product)}
            </p>
            <p className="text-sm text-zinc-400">
              Temporada, sede, formato, categoria, nivel N1/N2, inscricoes,
              seed, datas, quadras, preco e publicacao auditada.
            </p>
          </section>
        ))}
      </Card>
      <Card>
        <h2 className="text-xl font-black">Padroes Q1</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Melhor de 3 sets:{" "}
          {tournamentBestOfThreeRules
            .map((rule) => `${rule.pointsToWin} win_by ${rule.winBy}`)
            .join(" / ")}
          . Precos: 1a R${tournamentEntryPrice(1)}, 2a R$
          {tournamentEntryPrice(2)}, 3a+ R${tournamentEntryPrice(3)}.
        </p>
      </Card>
    </div>
  );
}
