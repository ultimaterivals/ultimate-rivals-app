import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { listAthleteBilling } from "@/server/repositories/commercial.repository";
import { notFound } from "next/navigation";

function brl(value: number | string | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export default async function AthleteBillingPage() {
  const identity = await requireRole("athlete");
  const client = await createClient();
  const { data: athlete } = await client
    .from("athletes")
    .select("id")
    .eq("profile_id", identity.userId)
    .single();
  if (!athlete) notFound();

  const items = await listAthleteBilling(client, athlete.id);

  return (
    <div className="grid gap-7">
      <PageHeader
        eyebrow="Pagamentos"
        title="Meus valores"
        description="Valores, status, prazo e pacote/benefício visíveis para você. Dados administrativos internos ficam privados."
      />
      {items.length ? (
        <div className="grid gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-bold">{item.description}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {item.product_name ??
                      item.package_name ??
                      "Ultimate Rivals"}
                  </p>
                  {item.due_at && (
                    <p className="mt-1 text-sm text-zinc-500">
                      Prazo: {new Date(item.due_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <strong className="text-2xl">{brl(item.amount)}</strong>
                  <div className="mt-2">
                    <Badge>{item.status}</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum pagamento pendente"
          description="Suas cobranças de UR Play, pacotes e inscrições aparecerão aqui quando existirem."
        />
      )}
    </div>
  );
}
