import {
  CalendarRange,
  Handshake,
  Landmark,
  Store,
  Target,
  WalletCards,
} from "lucide-react";
import { CommandSection } from "@/components/admin/command-section";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminCommercialSnapshot } from "@/server/services/admin-commercial-service";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function CommercialPage() {
  await requireAdminModule("commercial");
  const snapshot = await getAdminCommercialSnapshot();
  const metrics = [
    ["Patrocinadores", snapshot.metrics.sponsors, Handshake],
    ["Valor ativo", money.format(snapshot.metrics.activeSponsorCash), WalletCards],
    ["Entregas pendentes", snapshot.metrics.pendingDeliveries, Target],
    ["Quadras parceiras", snapshot.metrics.venues, Store],
    ["Janelas disponíveis", snapshot.metrics.availableWindows, CalendarRange],
    ["Margem quadras", money.format(snapshot.metrics.venueMargin), Landmark],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Negócio"
        title="Comercial e Parcerias"
        description="Quadras e patrocinadores conectados às entregas, capacidade operacional e valor econômico do ecossistema."
        action={<Badge>Dados reais</Badge>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <CommandSection
        title="Patrocinadores"
        description="O valor comercial só está completo quando as entregas planejadas também estão sendo cumpridas."
      >
        {snapshot.sponsors && snapshot.sponsors.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {snapshot.sponsors.map((sponsor) => (
              <Card key={sponsor.id} className={sponsor.pendingDeliveries > 0 ? "border-ur-gold/40" : undefined}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{sponsor.brandName ?? sponsor.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{sponsor.category ?? "Categoria não definida"}</p>
                  </div>
                  <Badge>{sponsor.status}</Badge>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <div><p className="font-display text-xl font-black">{sponsor.agreements}</p><p className="text-[0.62rem] text-zinc-600 uppercase">Acordos</p></div>
                  <div><p className="font-display text-xl font-black">{sponsor.deliveredItems}/{sponsor.plannedDeliveries}</p><p className="text-[0.62rem] text-zinc-600 uppercase">Entregas</p></div>
                  <div><p className="font-display text-lg font-black">{money.format(sponsor.activeCashValue)}</p><p className="text-[0.62rem] text-zinc-600 uppercase">Ativo</p></div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card><p className="text-sm text-zinc-400">Nenhum patrocinador operacional registrado.</p></Card>
        )}
      </CommandSection>

      <CommandSection
        title="Quadras e parceiros"
        description="Capacidade física, eventos ativos e margem verificada por parceiro."
      >
        {snapshot.venues && snapshot.venues.length > 0 ? (
          <div className="overflow-x-auto rounded-ur border">
            <table className="min-w-[60rem] w-full text-left text-sm">
              <thead className="bg-ur-panel text-[0.68rem] tracking-wider text-zinc-500 uppercase">
                <tr><th className="px-4 py-3">Parceiro</th><th className="px-4 py-3">Polo</th><th className="px-4 py-3">Modelo</th><th className="px-4 py-3">Quadras</th><th className="px-4 py-3">Janelas</th><th className="px-4 py-3">Eventos</th><th className="px-4 py-3">Margem</th></tr>
              </thead>
              <tbody className="divide-y">
                {snapshot.venues.map((venue) => (
                  <tr key={venue.id} className="bg-ur-graphite/50">
                    <td className="px-4 py-3"><p className="font-bold">{venue.name}</p><p className="text-xs text-zinc-600">{venue.partnershipStatus}</p></td>
                    <td className="px-4 py-3 text-zinc-400">{venue.poleName ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-400">{venue.billingModel ?? "—"}</td>
                    <td className="px-4 py-3 font-bold">{venue.courtCount}</td>
                    <td className="px-4 py-3">{venue.availableWindows}</td>
                    <td className="px-4 py-3">{venue.activeEvents}</td>
                    <td className={`px-4 py-3 font-bold ${venue.verifiedMargin < 0 ? "text-red-300" : "text-ur-gold"}`}>{money.format(venue.verifiedMargin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card><p className="text-sm text-zinc-400">Nenhuma quadra parceira registrada.</p></Card>
        )}
      </CommandSection>

      {snapshot.sourceErrors.length > 0 && (
        <Card><p className="font-bold">Leitura parcial</p><ul className="mt-2 text-sm text-zinc-500">{snapshot.sourceErrors.map((error) => <li key={error}>{error}</li>)}</ul></Card>
      )}
    </div>
  );
}
