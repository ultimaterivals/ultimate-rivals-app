import { Banknote, CircleDollarSign, Landmark, ReceiptText, Scale, WalletCards } from "lucide-react";
import type { AdminFinanceSnapshot } from "@/features/admin-finance/types";
import { Card } from "@/components/ui";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function FinanceMetrics({ snapshot }: { snapshot: AdminFinanceSnapshot }) {
  const items = [
    ["Receita verificada", snapshot.metrics.verifiedRevenue, CircleDollarSign],
    ["Despesa verificada", snapshot.metrics.verifiedExpense, ReceiptText],
    ["Margem verificada", snapshot.metrics.verifiedMargin, Scale],
    ["Cobranças abertas", snapshot.metrics.openChargeAmount, WalletCards],
    ["Obrigações abertas", snapshot.metrics.openObligationAmount, Landmark],
    ["Obrigações pagas", snapshot.metrics.paidObligationAmount, Banknote],
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map(([label, value, Icon]) => (
        <Card key={label}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
            <Icon className="text-ur-gold" size={16} aria-hidden="true" />
          </div>
          <p className="font-display mt-3 text-xl font-black">{money.format(value)}</p>
        </Card>
      ))}
    </div>
  );
}
