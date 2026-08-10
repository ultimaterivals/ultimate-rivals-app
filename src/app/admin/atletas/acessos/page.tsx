import { Link2, ShieldCheck, UserRoundCheck, UserRoundX } from "lucide-react";
import { AthleteInviteForm } from "@/app/admin/atletas/acessos/invite-form";
import { revokeAthleteInviteAction } from "@/app/admin/atletas/acessos/actions";
import { CommandSection } from "@/components/admin/command-section";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireAdminModule } from "@/lib/auth/admin-module-access";
import { getAdminAthleteAccessSnapshot } from "@/server/services/admin-athlete-access-service";

type Params = Promise<{ q?: string | string[] }>;
const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AthleteAccessPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireAdminModule("athletes");
  const params = await searchParams;
  const query = (single(params.q) ?? "").trim().toLowerCase();
  const snapshot = await getAdminAthleteAccessSnapshot();
  const rows = (snapshot.athletes ?? []).filter((athlete) => {
    if (!query) return true;
    return [
      athlete.publicName,
      athlete.athleteCode,
      athlete.emailContact ?? "",
      athlete.phone ?? "",
    ].some((value) => value.toLowerCase().includes(query));
  });

  const metrics = [
    ["Ativos", snapshot.metrics.totalActive, UserRoundCheck],
    ["Com conta", snapshot.metrics.linked, ShieldCheck],
    ["Sem conta", snapshot.metrics.unlinked, UserRoundX],
    ["Convites ativos", snapshot.metrics.activeInvites, Link2],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Atletas"
        title="Primeiro acesso"
        description="Vincule cada conta autenticada ao cadastro esportivo correto sem criar contas duplicadas nem armazenar o token bruto do convite."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {label}
              </p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">
              {value ?? "—"}
            </p>
          </Card>
        ))}
      </div>

      <form
        className="rounded-ur flex flex-wrap gap-2 border p-3"
        role="search"
      >
        <input
          name="q"
          defaultValue={single(params.q) ?? ""}
          placeholder="Buscar atleta, código, e-mail ou telefone"
          className="rounded-ur bg-ur-black min-h-10 min-w-64 flex-1 border px-3 text-sm text-white"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <CommandSection
        title={`${rows.length} atleta(s)`}
        description="Gerar um novo convite revoga automaticamente o token anterior. Convites usados não podem ser reutilizados."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-xs font-bold text-zinc-500 uppercase">
                <th className="px-3 py-3">Atleta</th>
                <th className="px-3 py-3">Contato</th>
                <th className="px-3 py-3">Conta</th>
                <th className="px-3 py-3">Convite</th>
                <th className="px-3 py-3">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((athlete) => (
                <tr
                  key={athlete.id}
                  className="border-b align-top last:border-0"
                >
                  <td className="px-3 py-4">
                    <p className="font-bold text-white">{athlete.publicName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {athlete.athleteCode}
                    </p>
                  </td>
                  <td className="px-3 py-4 text-xs leading-5 text-zinc-400">
                    <p>{athlete.emailContact ?? "Sem e-mail"}</p>
                    <p>{athlete.phone ?? "Sem telefone"}</p>
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-bold ${athlete.linked ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200"}`}
                    >
                      {athlete.linked ? "Vinculada" : "Pendente"}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-xs leading-5 text-zinc-400">
                    {athlete.inviteActive ? (
                      <>
                        <p className="text-ur-gold font-bold">Ativo</p>
                        <p>Expira {formatDate(athlete.inviteExpiresAt)}</p>
                        {athlete.inviteId && (
                          <form
                            action={revokeAthleteInviteAction}
                            className="mt-2"
                          >
                            <input
                              type="hidden"
                              name="inviteId"
                              value={athlete.inviteId}
                            />
                            <Button
                              type="submit"
                              variant="secondary"
                              className="min-h-10 px-3 py-2 text-sm"
                            >
                              Revogar convite
                            </Button>
                          </form>
                        )}
                      </>
                    ) : (
                      <span>Sem convite ativo</span>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    {athlete.linked ? (
                      <p className="text-xs leading-5 text-zinc-500">
                        Nenhuma ação necessária. O cadastro esportivo já está
                        associado a uma conta.
                      </p>
                    ) : (
                      <AthleteInviteForm
                        athleteId={athlete.id}
                        hasActiveInvite={athlete.inviteActive}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="rounded-ur mt-3 border border-dashed p-8 text-center text-sm text-zinc-500">
              Nenhum atleta encontrado.
            </div>
          )}
        </div>
      </CommandSection>

      {snapshot.sourceErrors.length > 0 && (
        <Card>
          <p className="font-bold">Leitura parcial</p>
          <ul className="mt-2 text-sm text-zinc-500">
            {snapshot.sourceErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
