import { Button, Card, PageHeader } from "@/components/ui";
import { createMatchAction } from "@/features/court-ops/actions";
import { createClient } from "@/lib/supabase/server";
import { getCourtOpsDashboard } from "@/server/repositories/court-ops.repository";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ court?: string; error?: string }>;
}) {
  const { id } = await params,
    { court, error } = await searchParams,
    client = await createClient(),
    data = await getCourtOpsDashboard(client, id),
    available = data.queue.filter((row) =>
      ["waiting", "resting"].includes(row.status),
    ),
    { data: formats } = await client
      .from("competitive_formats")
      .select("id,code,name"),
    { data: categories } = await client
      .from("competitive_categories")
      .select("id,code,name");
  return (
    <div className="grid gap-5">
      <PageHeader
        eyebrow="Court Ops"
        title="NOVO JOGO"
        description="Bloqueios críticos são validados novamente no banco."
      />
      {error && <Card className="border-red-500 text-red-300">{error}</Card>}
      <Card>
        <form action={createMatchAction} className="grid gap-4">
          <input type="hidden" name="sessionId" value={id} />
          <label>
            Formato
            <select
              name="formatId"
              className="rounded-ur block w-full border bg-black p-3"
            >
              {formats?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select
              name="categoryId"
              className="rounded-ur block w-full border bg-black p-3"
            >
              {categories?.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Nível
            <select
              name="level"
              className="rounded-ur block w-full border bg-black p-3"
            >
              <option value="leveling">Nivelamento</option>
              <option value="n3">N3</option>
              <option value="n2">N2</option>
              <option value="n1">N1</option>
            </select>
          </label>
          {["sideA", "sideA", "sideB", "sideB"].map((name, index) => (
            <label key={`${name}-${index}`}>
              {name === "sideA" ? "LADO A" : "LADO B"} · atleta{" "}
              {(index % 2) + 1}
              <select
                name={name}
                className="rounded-ur block w-full border bg-black p-3"
              >
                {available.map((row) => {
                  const athlete = Array.isArray(row.athletes)
                    ? row.athletes[0]
                    : row.athletes;
                  return (
                    <option key={row.athlete_id} value={row.athlete_id}>
                      {athlete?.athlete_code} · {athlete?.public_name}
                    </option>
                  );
                })}
              </select>
            </label>
          ))}
          <label>
            Quadra
            <select
              name="courtId"
              defaultValue={court}
              className="rounded-ur block w-full border bg-black p-3"
            >
              {data.session.ur_play_session_courts?.map((row) => (
                <option key={row.court_id} value={row.court_id}>
                  {
                    (Array.isArray(row.courts) ? row.courts[0] : row.courts)
                      ?.name
                  }
                </option>
              ))}
            </select>
          </label>
          <Button type="submit">CRIAR JOGO NA FILA</Button>
        </form>
      </Card>
    </div>
  );
}
