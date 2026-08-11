import { Clock3, DatabaseZap, ShieldCheck } from "lucide-react";
import type { AdminCommandSnapshot } from "@/features/admin-command/types";
import { CommandSection } from "@/components/admin/command-section";
import { Badge, Card } from "@/components/ui";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "medium",
});

export function CommandSourceAudit({
  snapshot,
}: {
  snapshot: AdminCommandSnapshot;
}) {
  const statusLabel =
    snapshot.status === "ready"
      ? "Leitura completa"
      : snapshot.status === "partial"
        ? "Leitura parcial"
        : "Base sem registros";

  return (
    <CommandSection
      title="Rastreabilidade das leituras"
      description="Transparência sobre o momento em que o Command consolidou as fontes. Este horário representa a geração da leitura, não a data de atualização de cada registro individual."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              Leitura gerada
            </p>
            <Clock3 className="text-ur-gold" size={18} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-xl font-black text-white">
            {dateTime.format(new Date(snapshot.generatedAt))}
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Horário da consolidação executiva exibida nesta abertura do Command.
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              Estado da leitura
            </p>
            <DatabaseZap
              className="text-ur-gold"
              size={18}
              aria-hidden="true"
            />
          </div>
          <div className="mt-3">
            <Badge>{statusLabel}</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {snapshot.sourceErrors.length === 0
              ? "Nenhuma falha de fonte foi reportada pelo snapshot principal."
              : `${snapshot.sourceErrors.length} fonte(s) reportaram falha e permanecem explicitadas no Command.`}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase">
              Regra de confiança
            </p>
            <ShieldCheck
              className="text-ur-gold"
              size={18}
              aria-hidden="true"
            />
          </div>
          <p className="mt-3 font-bold text-white">
            Fonte real acima de inferência
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-500">
            O Command não transforma dado ausente em número estimado. Valores
            indisponíveis continuam como ausência, leitura parcial ou projeção
            identificada.
          </p>
        </Card>
      </div>
    </CommandSection>
  );
}
