import { Badge, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminAuditSnapshot } from "@/server/services/admin-audit-service";

function shortId(value: string | null) {
  if (!value) return "—";
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminAuditPage() {
  await requireAdminModule("audit");
  const snapshot = await getAdminAuditSnapshot();

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Gestão"
        title="Auditoria operacional"
        description="Últimas 100 alterações rastreáveis das entidades canônicas. Esta trilha é somente leitura."
        action={<Badge>Somente leitura</Badge>}
      />

      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Leitura parcial da trilha de auditoria</p>
          <ul className="mt-2 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Card>
      )}

      {snapshot.entries.length === 0 ? (
        <Card>
          <p className="font-bold">Nenhuma alteração registrada</p>
          <p className="mt-1 text-sm text-zinc-500">
            As alterações críticas aparecerão aqui quando forem realizadas.
          </p>
        </Card>
      ) : (
        <div className="rounded-ur overflow-x-auto border">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="bg-ur-panel text-[0.68rem] tracking-wider text-zinc-500 uppercase">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Ação</th>
                <th className="px-4 py-3">Entidade</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3">Correlação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {snapshot.entries.map((entry) => (
                <tr key={entry.id} className="bg-ur-graphite/50 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                  <td className="px-4 py-3 font-bold">{entry.action}</td>
                  <td className="px-4 py-3">
                    <p>{entry.entityType}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-500">{shortId(entry.entityId)}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{shortId(entry.actorUserId)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{shortId(entry.requestId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
