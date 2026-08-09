import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const write = (p, content) => {
  const target = path.join(root, p);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

const rankingPath = path.join(root, "src/app/athlete/ranking/page.tsx");
const ranking = fs.readFileSync(rankingPath, "utf8");
fs.writeFileSync(
  rankingPath,
  ranking.replace('import { notFound } from "next/navigation";\n', ""),
);

const viewerPath = path.join(root, "src/lib/auth/athlete-viewer.ts");
const viewer = fs.readFileSync(viewerPath, "utf8");
fs.writeFileSync(
  viewerPath,
  viewer.replace(
    `  identity: {\n    userId: string;\n    email: string | null;\n    role: "admin" | "athlete";\n  };`,
    `  identity: Awaited<ReturnType<typeof requireAnyRole>>;`,
  ),
);

write(
  "src/app/admin/search/page.tsx",
  `import Link from "next/link";
import { Search } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { requireAnyRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type AthleteResult = {
  id: string;
  athlete_code: string;
  public_name: string;
  status: string;
};
type TeamResult = { id: string; name: string; status: string };
type PoleResult = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  status: string;
};
type EventResult = {
  id: string;
  name: string;
  status: string;
  starts_at: string | null;
};
type ResultRow = { key: string; title: string; detail: string; href: string };

export default async function AdminGlobalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAnyRole(["admin", "operator"]);
  const { q = "" } = await searchParams;
  const term = q.trim();
  const client = await createClient();

  let athleteRows: AthleteResult[] = [];
  let teamRows: TeamResult[] = [];
  let poleRows: PoleResult[] = [];
  let eventRows: EventResult[] = [];

  if (term) {
    const safeTerm = term.replace(/[(),]/g, " ").trim();
    const [athletes, teams, poles, events] = await Promise.all([
      client
        .from("athletes")
        .select("id,athlete_code,public_name,status")
        .or(`public_name.ilike.%${safeTerm}%,athlete_code.ilike.%${safeTerm}%`)
        .limit(8),
      client
        .from("teams")
        .select("id,name,status")
        .ilike("name", `%${safeTerm}%`)
        .limit(8),
      client
        .from("poles")
        .select("id,name,city,state,status")
        .or(`name.ilike.%${safeTerm}%,city.ilike.%${safeTerm}%`)
        .limit(8),
      client
        .from("calendar_events")
        .select("id,name,status,starts_at")
        .ilike("name", `%${safeTerm}%`)
        .limit(8),
    ]);
    athleteRows = (athletes.data ?? []) as AthleteResult[];
    teamRows = (teams.data ?? []) as TeamResult[];
    poleRows = (poles.data ?? []) as PoleResult[];
    eventRows = (events.data ?? []) as EventResult[];
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Busca operacional"
        title="Busca global"
        description="Encontre atleta, equipe, polo ou atividade sem navegar por módulos."
      />
      <Card>
        <form className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-3.5 left-3 text-zinc-600" size={18} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar no ecossistema"
              className="rounded-ur min-h-12 w-full border bg-black pr-4 pl-10"
            />
          </div>
          <button className="rounded-ur bg-ur-gold text-ur-black px-5 font-black">
            Buscar
          </button>
        </form>
      </Card>
      {term && (
        <div className="grid gap-4 lg:grid-cols-2">
          <ResultGroup
            title="Atletas"
            rows={athleteRows.map((row) => ({
              key: row.id,
              title: row.public_name,
              detail: `${row.athlete_code} · ${row.status}`,
              href: `/admin/athletes/${row.id}`,
            }))}
          />
          <ResultGroup
            title="Equipes"
            rows={teamRows.map((row) => ({
              key: row.id,
              title: row.name,
              detail: row.status,
              href: "/admin/teams",
            }))}
          />
          <ResultGroup
            title="Polos"
            rows={poleRows.map((row) => ({
              key: row.id,
              title: row.name,
              detail: [row.city, row.state, row.status].filter(Boolean).join(" · "),
              href: "/admin/poles",
            }))}
          />
          <ResultGroup
            title="Agenda"
            rows={eventRows.map((row) => ({
              key: row.id,
              title: row.name,
              detail: row.starts_at
                ? new Date(row.starts_at).toLocaleString("pt-BR")
                : row.status,
              href: "/admin/calendar",
            }))}
          />
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, rows }: { title: string; rows: ResultRow[] }) {
  return (
    <Card>
      <h2 className="font-display text-xl font-black uppercase">{title}</h2>
      <div className="mt-4 grid gap-2">
        {rows.length ? (
          rows.map((row) => (
            <Link
              key={row.key}
              href={row.href}
              className="rounded-ur hover:border-ur-gold/40 border p-3"
            >
              <strong>{row.title}</strong>
              <span className="block text-sm text-zinc-500">{row.detail}</span>
            </Link>
          ))
        ) : (
          <p className="text-sm text-zinc-500">Nenhum resultado.</p>
        )}
      </div>
    </Card>
  );
}
`,
);

fs.rmSync(path.join(root, "scripts/fix-admin-mirror-lint.mjs"));
console.log("admin mirror lint/type fixes applied");
