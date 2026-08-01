import Link from "next/link";
import { PageHeader, Card, Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { searchAthletes } from "@/server/repositories/athlete360.repository";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const page = Math.max(1, Number(p.page) || 1),
    pageSize = [25, 50, 100].includes(Number(p.pageSize))
      ? Number(p.pageSize)
      : 25;
  const { rows, count } = await searchAthletes(await createClient(), {
    query: p.q,
    status: p.status,
    gender: p.gender,
    account: p.account,
    level: p.level,
    poleId: p.poleId,
    teamId: p.teamId,
    page,
    pageSize,
    sort: p.sort,
  });
  const optionClient = await createClient();
  const [{ data: poles }, { data: teams }] = await Promise.all([
    optionClient.from("poles").select("id,name").order("name"),
    optionClient.from("teams").select("id,name").order("name"),
  ]);
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Atleta 360"
        title="Atletas"
        description={`${count} cadastros encontrados`}
      />
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/athletes/new">
          <Button>Novo atleta</Button>
        </Link>
        <Link
          href="/admin/athletes/import"
          className="rounded-ur border px-4 py-3"
        >
          Importar CSV
        </Link>
      </div>
      <Card>
        <form className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
          <input
            name="q"
            aria-label="Buscar atletas"
            placeholder="Código ou nome"
            defaultValue={p.q}
            className="rounded-ur border bg-black p-3 md:col-span-2"
          />
          <select
            name="status"
            aria-label="Status"
            defaultValue={p.status ?? ""}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos status</option>
            {["draft", "active", "inactive", "suspended", "archived"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
          <select
            name="gender"
            aria-label="Gênero"
            defaultValue={p.gender ?? ""}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos gêneros</option>
            <option value="female">Feminino</option>
            <option value="male">Masculino</option>
            <option value="undisclosed">Não informado</option>
          </select>
          <select
            name="account"
            aria-label="Conta"
            defaultValue={p.account ?? ""}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Com/sem conta</option>
            <option value="yes">Com conta</option>
            <option value="no">Sem conta</option>
          </select>
          <select
            name="level"
            aria-label="Nível"
            defaultValue={p.level ?? ""}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos níveis</option>
            <option value="leveling">Em nivelamento</option>
            <option value="n3">N3</option>
            <option value="n2">N2</option>
            <option value="n1">N1</option>
          </select>
          <select
            name="poleId"
            aria-label="Polo"
            defaultValue={p.poleId ?? ""}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todos polos</option>
            {poles?.map((row) => (
              <option value={row.id} key={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <select
            name="teamId"
            aria-label="Equipe"
            defaultValue={p.teamId ?? ""}
            className="rounded-ur border bg-black p-3"
          >
            <option value="">Todas equipes</option>
            {teams?.map((row) => (
              <option value={row.id} key={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <select
            name="sort"
            aria-label="Ordenação"
            defaultValue={p.sort ?? "name"}
            className="rounded-ur border bg-black p-3"
          >
            <option value="name">Nome</option>
            <option value="created">Cadastro</option>
            <option value="code">Código UR</option>
            <option value="status">Status</option>
          </select>
          <select
            name="pageSize"
            aria-label="Itens por página"
            defaultValue={String(pageSize)}
            className="rounded-ur border bg-black p-3"
          >
            <option value="25">25 por página</option>
            <option value="50">50 por página</option>
            <option value="100">100 por página</option>
          </select>
          <Button type="submit">Filtrar</Button>
        </form>
      </Card>
      <div className="rounded-ur overflow-x-auto border">
        <table className="w-full text-left text-sm">
          <thead className="bg-ur-panel text-zinc-400">
            <tr>
              {["Código UR", "Nome", "Status", "Conta", "Cadastro", ""].map(
                (h) => (
                  <th className="p-4" key={h}>
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t" key={row.id}>
                <td className="text-ur-gold p-4 font-bold">
                  {row.athlete_code}
                </td>
                <td className="p-4">
                  <strong>{row.public_name}</strong>
                  <span className="block text-zinc-500">{row.full_name}</span>
                </td>
                <td className="p-4">{row.status}</td>
                <td className="p-4">
                  {row.profile_id ? "Vinculada" : "Sem conta"}
                </td>
                <td className="p-4">
                  {new Date(row.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="p-4">
                  <Link
                    href={`/admin/athletes/${row.id}`}
                    className="text-ur-gold"
                  >
                    Visualizar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="flex items-center justify-between">
        <Link
          aria-disabled={page === 1}
          href={{ query: { ...p, page: Math.max(1, page - 1) } }}
        >
          Anterior
        </Link>
        <span>
          Página {page} de {pages}
        </span>
        <Link
          aria-disabled={page === pages}
          href={{ query: { ...p, page: Math.min(pages, page + 1) } }}
        >
          Próxima
        </Link>
      </nav>
    </div>
  );
}
