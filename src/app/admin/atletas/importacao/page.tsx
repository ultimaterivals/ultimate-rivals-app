import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash2,
  FileUp,
  UserCheck,
} from "lucide-react";
import {
  importAthleteStagingRowAction,
  importReadyAthleteBatchAction,
  reviewAthleteImportRowAction,
} from "@/app/admin/atletas/importacao/actions";
import { Button, Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getAdminAthleteImportSnapshot } from "@/server/services/admin-athlete-import-service";

type SearchParams = Promise<{
  status?: string | string[];
  q?: string | string[];
  result?: string | string[];
}>;

const single = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const resultMessages: Record<string, string> = {
  reviewed: "Revisão salva e auditada.",
  imported:
    "Atleta criado como draft. Nenhuma conta foi criada e o atleta ainda não está ativo.",
  "batch-imported":
    "Linhas prontas importadas como draft em uma única transação atômica.",
  "batch-import-error":
    "O lote não foi importado. A transação foi revertida integralmente.",
  "batch-invalid":
    "Confirmação do lote inválida. Digite exatamente IMPORTAR DRAFTS.",
  "pole-not-configured":
    "Importação bloqueada: o polo informado ainda não existe na configuração do UR.",
  duplicate: "Importação bloqueada: existe atleta potencialmente duplicado.",
  "review-invalid": "Revisão inválida. Verifique os campos e a justificativa.",
  "review-error": "Não foi possível salvar a revisão.",
  "import-error": "Não foi possível importar esta linha.",
  "import-invalid": "Linha de importação inválida.",
};

function badge(status: string) {
  if (status === "ready")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "review")
    return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  if (status === "blocked")
    return "border-red-500/30 bg-red-500/10 text-red-300";
  if (status === "imported")
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-zinc-700 bg-zinc-900 text-zinc-400";
}

export default async function AthleteImportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const status = single(params.status) ?? "all";
  const query = (single(params.q) ?? "").trim().toLowerCase();
  const result = single(params.result);
  const snapshot = await getAdminAthleteImportSnapshot();
  const rows = snapshot.rows.filter((row) => {
    if (status !== "all" && row.status !== status) return false;
    if (!query) return true;
    return [
      row.fullName,
      row.publicName ?? "",
      row.email ?? "",
      row.phone ?? "",
      row.legacyId ?? "",
    ].some((value) => value.toLowerCase().includes(query));
  });

  const metrics = [
    ["Total", snapshot.metrics.total, FileUp],
    ["Prontos", snapshot.metrics.ready, CheckCircle2],
    ["Revisão", snapshot.metrics.review, AlertTriangle],
    ["Bloqueados", snapshot.metrics.blocked, CircleSlash2],
    ["Importados", snapshot.metrics.imported, UserCheck],
  ] as const;

  return (
    <div className="grid gap-8">
      <PageHeader
        eyebrow="Atletas"
        title="Importação controlada"
        description="Staging auditável da Planilha Mestre. Revisar não cria atleta; importar cria somente um cadastro draft, sem conta e sem ativação automática."
      />

      {result && resultMessages[result] && (
        <Card
          className={
            result.includes("error") || result.includes("blocked")
              ? "border-red-500/30"
              : "border-ur-gold/30"
          }
        >
          <p className="text-sm text-zinc-300">{resultMessages[result]}</p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, Icon]) => (
          <Card key={label}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-zinc-500 uppercase">
                {label}
              </p>
              <Icon className="text-ur-gold" size={16} aria-hidden="true" />
            </div>
            <p className="font-display mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-bold text-white">Gate de polos</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {snapshot.metrics.configuredPoles} polo(s) configurado(s) ·{" "}
              {snapshot.metrics.activePoles} homologado(s)/ativo(s).
            </p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Um atleta draft pode ser relacionado a polo draft. Para ativar o
              atleta e operar sessões reais, o polo continua sujeito à
              homologação operacional.
            </p>
            {snapshot.missingReadyPoles.length > 0 && (
              <p className="mt-2 text-sm text-amber-200">
                Polos ainda não configurados para linhas prontas:{" "}
                {snapshot.missingReadyPoles.join(", ")}.
              </p>
            )}
          </div>
          <Link
            href="/admin/agenda/configuracao"
            className="rounded-ur hover:border-ur-gold border px-4 py-2 text-sm font-bold text-zinc-300 transition hover:text-white"
          >
            Abrir configuração operacional
          </Link>
        </div>
      </Card>

      {snapshot.selectedBatch && snapshot.metrics.ready > 0 && (
        <Card className="border-ur-gold/30">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-bold text-white">
                Importar {snapshot.metrics.ready} registros prontos como draft
              </p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-zinc-500">
                A operação é atômica: se uma linha falhar por duplicidade, polo
                ou validação, nenhuma linha do lote é persistida. Conta, nível,
                equipe e status ativo não são criados nesta etapa.
              </p>
            </div>
            <form action={importReadyAthleteBatchAction} className="grid gap-2">
              <input
                type="hidden"
                name="batchId"
                value={snapshot.selectedBatch.id}
              />
              <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                Confirmação
                <input
                  name="confirmation"
                  required
                  placeholder="IMPORTAR DRAFTS"
                  autoComplete="off"
                  className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
                />
              </label>
              <Button
                type="submit"
                disabled={snapshot.missingReadyPoles.length > 0}
              >
                Importar lote pronto
              </Button>
            </form>
          </div>
        </Card>
      )}

      <form
        className="rounded-ur flex flex-wrap gap-2 border p-3"
        role="search"
      >
        <input
          name="q"
          defaultValue={single(params.q) ?? ""}
          placeholder="Buscar nome, e-mail, telefone ou ID legado"
          className="rounded-ur bg-ur-black min-h-10 min-w-64 flex-1 border px-3 text-sm text-white"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
        >
          <option value="all">Todos</option>
          <option value="ready">Prontos</option>
          <option value="review">Revisão</option>
          <option value="blocked">Bloqueados</option>
          <option value="imported">Importados</option>
          <option value="skipped">Ignorados</option>
        </select>
        <Button type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <div className="grid gap-4">
        {rows.map((row) => (
          <Card key={row.id} className="overflow-hidden p-0">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-white">
                    {row.publicName || row.fullName}
                  </p>
                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] font-bold uppercase ${badge(row.status)}`}
                  >
                    {row.status}
                  </span>
                  {row.activeCandidate && (
                    <span className="border-ur-gold/30 bg-ur-gold/10 text-ur-gold rounded-full border px-2 py-1 text-[11px] font-bold uppercase">
                      ativo legado
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Linha {row.sourceRow} · {row.legacyId ?? "sem ID legado"} ·{" "}
                  {row.pole ?? "sem polo"}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {row.email ?? "sem e-mail"} · {row.phone ?? "sem telefone"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {row.categories ||
                    row.legacyCategories ||
                    "categorias pendentes"}
                  {row.legacyLevel ? ` · nível legado ${row.legacyLevel}` : ""}
                </p>
              </div>

              {row.status === "ready" && (
                <form action={importAthleteStagingRowAction}>
                  <input type="hidden" name="rowId" value={row.id} />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={snapshot.missingReadyPoles.length > 0}
                  >
                    Importar como draft
                  </Button>
                </form>
              )}
              {row.status === "imported" && row.importedAthleteId && (
                <Link
                  href="/admin/atletas"
                  className="text-sm font-bold text-sky-300 hover:text-sky-200"
                >
                  Cadastro criado
                </Link>
              )}
            </div>

            {row.issues.length > 0 && (
              <div className="border-t px-5 py-4">
                <p className="text-xs font-bold text-zinc-500 uppercase">
                  Evidências do dry-run
                </p>
                <div className="mt-2 grid gap-2">
                  {row.issues.map((issue, index) => (
                    <div
                      key={`${issue.code ?? "issue"}-${index}`}
                      className="rounded-ur bg-black/20 px-3 py-2 text-xs leading-5 text-zinc-400"
                    >
                      <span className="font-bold text-zinc-300">
                        {issue.code ?? "SINAL"}
                      </span>
                      {issue.detail ? ` — ${issue.detail}` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {row.status !== "imported" && (
              <details className="border-t px-5 py-4">
                <summary className="text-ur-gold cursor-pointer text-sm font-bold">
                  Revisar / corrigir linha
                </summary>
                <form
                  action={reviewAthleteImportRowAction}
                  className="mt-4 grid gap-3 lg:grid-cols-2"
                >
                  <input type="hidden" name="rowId" value={row.id} />
                  <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                    Nome completo
                    <input
                      name="fullName"
                      defaultValue={row.fullName}
                      required
                      className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                    Nome público
                    <input
                      name="publicName"
                      defaultValue={row.publicName ?? ""}
                      className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                    Data de nascimento
                    <input
                      type="date"
                      name="birthDate"
                      defaultValue={row.birthDate ?? ""}
                      className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                    Polo
                    <input
                      name="pole"
                      defaultValue={row.pole ?? ""}
                      className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                    E-mail
                    <input
                      type="email"
                      name="email"
                      defaultValue={row.email ?? ""}
                      className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                    Telefone
                    <input
                      name="phone"
                      defaultValue={row.phone ?? ""}
                      className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase lg:col-span-2">
                    Categorias declaradas
                    <input
                      name="categories"
                      defaultValue={row.categories ?? ""}
                      className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase">
                    Decisão
                    <select
                      name="status"
                      defaultValue={row.status}
                      className="rounded-ur bg-ur-black min-h-10 border px-3 text-sm text-white"
                    >
                      <option value="ready">Pronto para importar</option>
                      <option value="review">Continuar em revisão</option>
                      <option value="blocked">Bloqueado</option>
                      <option value="skipped">Ignorar nesta migração</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-bold text-zinc-500 uppercase lg:col-span-2">
                    Justificativa da decisão
                    <textarea
                      name="note"
                      required
                      minLength={3}
                      placeholder="O que foi confirmado ou corrigido?"
                      className="rounded-ur bg-ur-black min-h-24 border px-3 py-2 text-sm text-white"
                    />
                  </label>
                  <div className="lg:col-span-2">
                    <Button type="submit" size="sm">
                      Salvar revisão
                    </Button>
                  </div>
                </form>
              </details>
            )}
          </Card>
        ))}

        {rows.length === 0 && (
          <Card>
            <p className="text-center text-sm text-zinc-500">
              Nenhuma linha encontrada para este filtro.
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
