import { AthleteHistoricalResults } from "@/components/athlete/athlete-historical-results";
import { AthleteLiveResults } from "@/components/athlete/athlete-live-results";
import { PageHeader } from "@/components/ui";

export function AthleteResultsContent() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6">
      <PageHeader
        eyebrow="Sua trajetória competitiva"
        title="Resultados"
        description="Acompanhe os jogos registrados no aplicativo e o histórico oficial já homologado, sem misturar operação atual com registros importados."
      />
      <AthleteLiveResults />
      <AthleteHistoricalResults />
    </div>
  );
}
