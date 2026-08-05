import { Badge, Card, EmptyState, PageHeader, StatCard } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { listCommercialAdmin } from "@/server/repositories/commercial.repository";
import { Banknote, Package, Receipt } from "lucide-react";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export default async function AdminPaymentsPage() {
  const { products, rules, packages, charges } = await listCommercialAdmin(
    await createClient(),
  );
  const openAmount = charges
    .filter((charge) => ["pending", "submitted"].includes(charge.status))
    .reduce((sum, charge) => sum + Number(charge.amount ?? 0), 0);

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Comercial"
        title="Preços e pagamentos"
        description="Produtos, pacotes, regras configuráveis e pagamentos manuais. Sem gateway externo e sem dados sensíveis."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Produtos"
          value={String(products.length)}
          hint="UR Play, pacotes e torneios"
          icon={Package}
        />
        <StatCard
          label="Regras de preço"
          value={String(rules.length)}
          hint="Configuráveis por admin"
          icon={Receipt}
        />
        <StatCard
          label="A receber"
          value={brl(openAmount)}
          hint="Charges pendentes/submitted"
          icon={Banknote}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Produtos e pacotes
          </h2>
          <div className="mt-4 grid gap-3">
            {products.map((product) => (
              <div key={product.id} className="rounded-ur border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{product.name}</p>
                    <p className="text-sm text-zinc-400">{product.code}</p>
                  </div>
                  <Badge>{product.product_type}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3">
            {packages.map((item) => (
              <div key={item.id} className="rounded-ur bg-black/20 p-4">
                <p className="font-bold">{item.name}</p>
                <p className="text-sm text-zinc-400">
                  {item.included_units
                    ? `${item.included_units} unidades`
                    : "Benefícios configuráveis"}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-xl font-black uppercase">
            Regras Q1
          </h2>
          <div className="mt-4 grid gap-3">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-ur border p-4">
                <p className="font-bold">{rule.scope}</p>
                <p className="text-sm text-zinc-400">
                  {brl(rule.unit_amount)} • snapshot/config em JSON
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card>
        <h2 className="font-display text-xl font-black uppercase">
          Pagamentos manuais
        </h2>
        {charges.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs tracking-wider text-zinc-500 uppercase">
                <tr>
                  <th className="py-2">Descrição</th>
                  <th>Atleta/equipe</th>
                  <th>Produto</th>
                  <th>Valor</th>
                  <th>Pago</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {charges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="py-3 font-bold">{charge.description}</td>
                    <td>{charge.athlete_name ?? charge.team_name ?? "—"}</td>
                    <td>{charge.product_name ?? charge.package_name ?? "—"}</td>
                    <td>{brl(charge.amount)}</td>
                    <td>{brl(charge.paid_amount)}</td>
                    <td>
                      <Badge>{charge.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sem cobranças registradas"
            description="Charges e pagamentos manuais aparecerão aqui quando admin/operator registrar valores."
          />
        )}
      </Card>
    </div>
  );
}
