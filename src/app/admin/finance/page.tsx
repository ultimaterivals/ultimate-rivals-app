import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listFinanceOperations } from "@/server/repositories/finance.repository";
import { Banknote, HandCoins, ReceiptText } from "lucide-react";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export default async function AdminFinancePage() {
  const {
    revenues,
    expenses,
    eventSummaries,
    venueSummaries,
    sponsorSummaries,
    prizeObligations,
    repassObligations,
  } = await listFinanceOperations(await createClient());

  const verifiedRevenue = revenues
    .filter((entry) => ["verified", "reconciled"].includes(entry.status))
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  const verifiedExpense = expenses
    .filter((entry) => ["verified", "reconciled"].includes(entry.status))
    .reduce((sum, entry) => sum + Number(entry.amount ?? 0), 0);
  const projectedPayable = [...prizeObligations, ...repassObligations]
    .filter((item) =>
      ["projected", "eligible", "approved", "announced"].includes(item.status),
    )
    .reduce((sum, item) => sum + Number(item.amount ?? 0), 0);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Financeiro"
        title="Cockpit operacional"
        description="Receitas, despesas, margem, prêmios e repasses. Escopo deliberadamente menor que um ERP."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Receita verificada"
          value={brl(verifiedRevenue)}
          hint="Entradas verified/reconciled"
          icon={Banknote}
        />
        <StatCard
          label="Despesa verificada"
          value={brl(verifiedExpense)}
          hint="Custos operacionais"
          icon={ReceiptText}
        />
        <StatCard
          label="A pagar projetado"
          value={brl(projectedPayable)}
          hint="Prêmios e repasses abertos"
          icon={HandCoins}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Receitas
          </h2>
          {revenues.length ? (
            <div className="mt-4 grid gap-3">
              {revenues.slice(0, 8).map((entry) => (
                <div key={entry.id} className="rounded-ur border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{entry.description}</p>
                      <p className="text-sm text-zinc-400">
                        {entry.source} • {entry.category}
                      </p>
                    </div>
                    <Badge>{entry.status}</Badge>
                  </div>
                  <p className="font-display mt-3 text-2xl font-black">
                    {brl(entry.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem receitas lançadas"
              description="Receitas verificadas de UR Play, torneios, sponsors e Market aparecerão aqui."
            />
          )}
        </Card>

        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Despesas
          </h2>
          {expenses.length ? (
            <div className="mt-4 grid gap-3">
              {expenses.slice(0, 8).map((entry) => (
                <div key={entry.id} className="rounded-ur border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{entry.description}</p>
                      <p className="text-sm text-zinc-400">{entry.category}</p>
                    </div>
                    <Badge>{entry.status}</Badge>
                  </div>
                  <p className="font-display mt-3 text-2xl font-black">
                    {brl(entry.amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sem despesas lançadas"
              description="Quadras, staff, mídia, materiais, prêmios e repasses aparecerão aqui quando registrados."
            />
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <SummaryCard title="Eventos" items={eventSummaries.length} />
        <SummaryCard title="Quadras" items={venueSummaries.length} />
        <SummaryCard title="Patrocínios" items={sponsorSummaries.length} />
      </section>
    </div>
  );
}

function SummaryCard({ title, items }: { title: string; items: number }) {
  return (
    <Card>
      <h2 className="font-display text-lg font-black uppercase">{title}</h2>
      <p className="font-display mt-3 text-3xl font-black">{items}</p>
      <p className="mt-1 text-sm text-zinc-400">
        read model financeiro disponível
      </p>
    </Card>
  );
}
