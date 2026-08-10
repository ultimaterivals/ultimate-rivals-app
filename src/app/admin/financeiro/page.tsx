import { AlertTriangle, CircleCheck } from "lucide-react";
import { FinanceMetrics } from "@/components/admin/finance/finance-metrics";
import { CommandSection } from "@/components/admin/command-section";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminFinanceSnapshot } from "@/server/services/admin-finance-service";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function FinancePage() {
  await requireAdminModule("finance");
  const snapshot = await getAdminFinanceSnapshot();
  const openObligations = (snapshot.obligations ?? []).filter(
    (item) => item.status !== "paid" && item.status !== "void",
  );
  const openPayments = (snapshot.payments ?? []).filter(
    (item) => item.status === "pending" || item.status === "submitted",
  );

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Negócio"
        title="Financeiro"
        description="Receita, custos, cobranças, premiações e repasses conectados às operações reais do ecossistema."
        action={<Badge>Dados reais</Badge>}
      />

      <FinanceMetrics snapshot={snapshot} />

      <div className="grid gap-6 xl:grid-cols-2">
        <CommandSection title="Cobranças abertas">
          <Card>
            {openPayments.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-zinc-400">
                <CircleCheck
                  className="text-ur-gold"
                  size={16}
                  aria-hidden="true"
                />
                Nenhuma cobrança aberta na fonte atual.
              </p>
            ) : (
              <div className="grid divide-y">
                {openPayments.slice(0, 12).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-bold">{item.description}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {[
                          item.athleteName,
                          item.teamName,
                          item.packageName,
                          item.productName,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Cobrança operacional"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {money.format(
                          Math.max(item.amount - item.paidAmount, 0),
                        )}
                      </p>
                      <Badge>{item.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </CommandSection>

        <CommandSection title="Premiações e repasses">
          <Card>
            {openObligations.length === 0 ? (
              <p className="text-sm text-zinc-400">
                Nenhuma obrigação aberta registrada.
              </p>
            ) : (
              <div className="grid divide-y">
                {openObligations.slice(0, 12).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-bold">{item.label}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {[item.sourceName, item.teamName, item.athleteName]
                          .filter(Boolean)
                          .join(" · ") || item.type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{money.format(item.amount)}</p>
                      <Badge>{item.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </CommandSection>
      </div>

      <CommandSection title="Controle operacional">
        <Card
          className={
            snapshot.metrics.verifiedMargin < 0
              ? "border-red-500/50"
              : undefined
          }
        >
          <div className="flex items-start gap-3">
            {snapshot.metrics.verifiedMargin < 0 ? (
              <AlertTriangle
                className="mt-0.5 text-red-300"
                size={18}
                aria-hidden="true"
              />
            ) : (
              <CircleCheck
                className="text-ur-gold mt-0.5"
                size={18}
                aria-hidden="true"
              />
            )}
            <div>
              <p className="font-bold">
                {snapshot.metrics.verifiedMargin < 0
                  ? "Margem verificada negativa"
                  : "Financeiro conectado à operação"}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Valores verificados e projetados permanecem separados.
                Obrigações só são consideradas pagas quando a fonte oficial
                registra status `paid`.
              </p>
            </div>
          </div>
        </Card>
      </CommandSection>

      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 grid gap-1 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
