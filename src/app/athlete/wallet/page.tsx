import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";
import { createClient } from "@/lib/supabase/server";
import { getAthleteWallet } from "@/server/repositories/wallet-media-reports.repository";
import { Coins, ShieldCheck, Trophy } from "lucide-react";

const date = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default async function AthleteWalletPage() {
  const viewer = await requireAthleteViewer();
  const { projection, transactions, activeRules } = await getAthleteWallet(
    await createClient(),
    viewer.athleteId,
  );

  const credits = transactions
    .filter((transaction) => transaction.direction === "credit")
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);
  const debits = transactions
    .filter((transaction) => transaction.direction === "debit")
    .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="UR Coins"
        title="Minha wallet"
        description="Saldo derivado de ledger append-only. UR Coins não são pontos de ranking e não alteram classificação oficial."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Saldo"
          value={`${projection?.balance ?? 0} URC`}
          hint="Calculado pelo ledger"
          icon={Coins}
        />
        <StatCard
          label="Ganhos"
          value={`+${credits} URC`}
          hint="Créditos homologados"
          icon={Trophy}
        />
        <StatCard
          label="Gastos"
          value={`-${debits} URC`}
          hint="Débitos e redemptions"
          icon={ShieldCheck}
        />
      </div>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Regras Q1 ativas
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {activeRules.map((rule) => (
            <div key={rule.code} className="rounded-ur border p-4">
              <Badge>{rule.source_type}</Badge>
              <p className="mt-3 font-bold">{rule.name}</p>
              <p className="text-ur-gold mt-2 text-2xl font-black">
                {rule.direction === "credit" ? "+" : "-"}
                {rule.amount} URC
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Histórico
        </h2>
        {transactions.length ? (
          <div className="mt-4 grid gap-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="rounded-ur border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {transaction.ur_coin_rules?.name ?? transaction.reason}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {date(transaction.created_at)} •{" "}
                      {transaction.source_type}
                    </p>
                  </div>
                  <strong
                    className={
                      transaction.direction === "credit"
                        ? "text-ur-gold"
                        : "text-zinc-300"
                    }
                  >
                    {transaction.direction === "credit" ? "+" : "-"}
                    {transaction.amount} URC
                  </strong>
                </div>
                <p className="mt-2 text-sm text-zinc-500">
                  {transaction.reason}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Wallet ainda sem movimentações"
            description="Participação, vitórias, grants administrativos e resgates auditados aparecerão aqui."
          />
        )}
      </Card>
    </div>
  );
}
