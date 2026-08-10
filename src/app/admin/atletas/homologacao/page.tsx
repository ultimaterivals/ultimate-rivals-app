import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { activateAthleteAction } from "@/app/admin/atletas/homologacao/actions";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminAthleteHomologationSnapshot } from "@/server/services/admin-athlete-homologation-service";

type Params = Promise<{
  q?: string | string[];
  status?: string | string[];
  result?: string | string[];
}>;
const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const resultMessages: Record<string, string> = {
  activated:
    "Atleta homologado e ativado. O primeiro acesso pode ser emitido agora.",
  blocked:
    "Ativação bloqueada pelo backend. Resolva os critérios pendentes antes de tentar novamente.",
  invalid: "Atleta inválido.",
  error: "Não foi possível homologar o atleta.",
};

function statusClass(status: string, ready: boolean) {
  if (status === "active")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (ready)
    return "border-ur-gold/30 bg-ur-gold/10 text-ur-gold";
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

export default async function AthleteHomologationPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const query = (single(params.q) ?? "").trim().toLowerCase();
  const filter = single(params.status) ?? "draft";
  const result = single(params.result);
  const snapshot = await getAdminAthleteHomologationSnapshot();
  const rows = snapshot.rows.filter((row) => {
    if (filter === "draft" && row.status !== "draft") return false;
    if (filter === "ready" && !row.readyToActivate) return false;
    if (filter === "blocked" && !(row.status === "draft" && !row.readyToActivate))
      return false;
    if (filter === "active" && row.status !== "active") return false;
    if (!query) return true;
    return `${row.publicName} ${row.fullName} ${row.athleteCode} ${row.email ?? ""} ${row.phone ?? ""}`
      .toLowerCase()
      .includes(query);
  });

  const metrics = [
    ["Draft", snapshot.metrics.draft, CircleDot],
    ["Prontos", snapshot.metrics.ready, CheckCircle2],
    ["Com bloqueio", snapshot.metrics.blockedDraft, AlertTriangle],
    ["Ativos", snapshot.metrics.active, UserRoundCheck],
    ["Conta vinculada", snapshot.metrics.linked, ShieldCheck],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Atletas"
        title="Homologação"
        description="Transforme cadastro importado em atleta operacional somente depois de cumprir identidade, contato, maioridade e polo homologado. Ativação e criação de conta são etapas separadas."
      />

      {result && resultMessages[result] && (
        <Card className={result === "activated" ? "border-ur-gold/30" : "border-red-500/30"}>
          <p className="text-sm text-zinc-300">{resultMessages[result]}</p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">{label}</p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-bold text-white">Gate estrutural</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {snapshot.metrics.draftPoles} polo(s) ainda em draft ·{" "}
              {snapshot.metrics.activePoles} polo(s) homologado(s)/ativo(s).
            </p>
            {snapshot.metrics.activePoles === 0 && (
              <p className="mt-2 text-sm text-amber-200">
                Nenhum atleta pode ser ativado enquanto seu polo principal não estiver
                homologado. Os cadastros draft continuam preservados normalmente.
              </p>
            )}
          </div>
          <Link
            href="/admin/agenda/configuracao"
            className="rounded-ur hover:border-ur-gold border px-4 py-2 text-sm font-bold text-zinc-300 transition hover:text-white"
          >
            Configurar polos e quadras
          </Link>
        </div>
      </Card>

      <form className="rounded-ur flex flex-wrap gap-2 border p-3" role="search">
        <input
          name="q"
          defaultValue={single(params.q) ?? ""}
          placeholder="Buscar atleta, código, e-mail ou telefone"
          className="rounded-ur bg-ur-black min-h-10 min-w-64 flex-1 border px-3 text-sm text-white"
        />
        <select
          name="status"
          defaultValue={filter}
          className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
        >
          <option value="all">Todos</option>
          <option value="draft">Draft</option>
          <option value="ready">Prontos</option>
          <option value="blocked">Com bloqueio</option>
          <option value="active">Ativos</option>
        </select>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <div className="grid gap-4">
        {rows.map((row) => (
          <Card key={row.id}>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-white">{row.publicName}</p>
                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] font-bold uppercase ${statusClass(row.status, row.readyToActivate)}`}
                  >
                    {row.status === "active"
                      ? "ativo"
                      : row.readyToActivate
                        ? "pronto"
                        : "draft bloqueado"}
                  </span>
                  {row.linked && (
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-[11px] font-bold text-sky-300 uppercase">
                      conta vinculada
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {row.athleteCode} · {row.fullName} · {row.poleName ?? "sem polo"}
                  {row.poleStatus ? ` (${row.poleStatus})` : ""}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {row.email ?? "sem e-mail"} · {row.phone ?? "sem telefone"}
                </p>

                {row.blockers.length > 0 && row.status !== "active" && (
                  <div className="mt-4 grid gap-2">
                    {row.blockers.map((blocker) => (
                      <div
                        key={blocker.code}
                        className="rounded-ur border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-5 text-amber-100"
                      >
                        <span className="font-bold">{blocker.code}</span> —{" "}
                        {blocker.detail}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid min-w-48 gap-2">
                {row.readyToActivate && (
                  <form action={activateAthleteAction}>
                    <input type="hidden" name="athleteId" value={row.id} />
                    <Button type="submit" size="sm" className="w-full">
                      Homologar e ativar
                    </Button>
                  </form>
                )}
                {row.status === "active" && !row.linked && (
                  <Link
                    href="/admin/atletas/acessos"
                    className="rounded-ur border-ur-gold/30 text-ur-gold hover:bg-ur-gold/10 border px-3 py-2 text-center text-xs font-bold uppercase transition"
                  >
                    Emitir primeiro acesso
                  </Link>
                )}
                {row.status === "active" && row.linked && (
                  <span className="rounded-ur border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-center text-xs font-bold text-emerald-300 uppercase">
                    Operacional
                  </span>
                )}
              </div>
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card>
            <p className="text-center text-sm text-zinc-500">
              Nenhum atleta encontrado para este filtro.
            </p>
          </Card>
        )}
      </div>

      {snapshot.sourceErrors.length > 0 && (
        <Card className="border-red-500/30">
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
