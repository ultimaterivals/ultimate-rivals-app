import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, content) => {
  const target = path.join(root, p);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};
const replace = (p, from, to) => {
  const current = read(p);
  if (!current.includes(from)) {
    throw new Error(`Expected source not found in ${p}: ${from.slice(0, 120)}`);
  }
  write(p, current.replace(from, to));
};

// Pure policy kept separate so unit tests do not depend on next/headers.
write(
  "src/lib/auth/athlete-mirror-policy.ts",
  `export const ATHLETE_MIRROR_COOKIE = "ur_admin_athlete_mirror";\n\nexport function canUseAthleteMirror(role: string) {\n  return role === "admin";\n}\n\nexport function isAthleteMirrorId(value: string) {\n  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);\n}\n`,
);

write(
  "src/lib/auth/athlete-viewer.ts",
  `import { cookies } from "next/headers";\nimport { redirect } from "next/navigation";\nimport { ATHLETE_MIRROR_COOKIE } from "@/lib/auth/athlete-mirror-policy";\nimport { requireAnyRole } from "@/lib/auth/session";\nimport { createClient } from "@/lib/supabase/server";\n\nexport interface AthleteViewerContext {\n  athleteId: string;\n  profileId: string | null;\n  isMirror: boolean;\n  identity: {\n    userId: string;\n    email: string | null;\n    role: "admin" | "athlete";\n  };\n  athlete: {\n    id: string;\n    publicName: string;\n    athleteCode: string;\n  };\n}\n\nexport async function requireAthleteViewer(): Promise<AthleteViewerContext> {\n  const identity = await requireAnyRole(["athlete", "admin"]);\n  const client = await createClient();\n\n  if (identity.role === "athlete") {\n    const { data: athlete, error } = await client\n      .from("athletes")\n      .select("id,profile_id,public_name,athlete_code")\n      .eq("profile_id", identity.userId)\n      .maybeSingle();\n    if (error) throw error;\n    if (!athlete) redirect("/athlete/profile");\n    return {\n      athleteId: athlete.id,\n      profileId: athlete.profile_id,\n      isMirror: false,\n      identity,\n      athlete: {\n        id: athlete.id,\n        publicName: athlete.public_name,\n        athleteCode: athlete.athlete_code,\n      },\n    };\n  }\n\n  const athleteId = (await cookies()).get(ATHLETE_MIRROR_COOKIE)?.value;\n  if (!athleteId) redirect("/admin/mirror");\n  const { data: athlete, error } = await client\n    .from("athletes")\n    .select("id,profile_id,public_name,athlete_code")\n    .eq("id", athleteId)\n    .maybeSingle();\n  if (error) throw error;\n  if (!athlete) redirect("/admin/mirror?invalid=1");\n\n  return {\n    athleteId: athlete.id,\n    profileId: athlete.profile_id,\n    isMirror: true,\n    identity,\n    athlete: {\n      id: athlete.id,\n      publicName: athlete.public_name,\n      athleteCode: athlete.athlete_code,\n    },\n  };\n}\n`,
);

write(
  "src/features/admin-athlete-mirror/actions.ts",
  `"use server";\n\nimport { cookies } from "next/headers";\nimport { redirect } from "next/navigation";\nimport { ATHLETE_MIRROR_COOKIE, isAthleteMirrorId } from "@/lib/auth/athlete-mirror-policy";\nimport { requireRole } from "@/lib/auth/session";\nimport { createClient } from "@/lib/supabase/server";\n\nexport async function startAthleteMirrorAction(formData: FormData) {\n  await requireRole("admin");\n  const athleteId = String(formData.get("athleteId") ?? "");\n  if (!isAthleteMirrorId(athleteId)) redirect("/admin/mirror?invalid=1");\n\n  const client = await createClient();\n  const { data: athlete, error } = await client\n    .from("athletes")\n    .select("id,status")\n    .eq("id", athleteId)\n    .maybeSingle();\n  if (error || !athlete) redirect("/admin/mirror?invalid=1");\n\n  (await cookies()).set(ATHLETE_MIRROR_COOKIE, athlete.id, {\n    httpOnly: true,\n    sameSite: "lax",\n    secure: process.env.NODE_ENV === "production",\n    path: "/",\n    maxAge: 60 * 60 * 4,\n  });\n  redirect("/athlete");\n}\n\nexport async function stopAthleteMirrorAction() {\n  await requireRole("admin");\n  (await cookies()).delete(ATHLETE_MIRROR_COOKIE);\n  redirect("/admin");\n}\n`,
);

write(
  "src/app/admin/mirror/page.tsx",
  `import { Eye, Search, ShieldCheck } from "lucide-react";\nimport { Button, Card, PageHeader } from "@/components/ui";\nimport { startAthleteMirrorAction } from "@/features/admin-athlete-mirror/actions";\nimport { requireRole } from "@/lib/auth/session";\nimport { createClient } from "@/lib/supabase/server";\nimport { searchAthletes } from "@/server/repositories/athlete360.repository";\n\nexport default async function AdminAthleteMirrorPage({\n  searchParams,\n}: {\n  searchParams: Promise<{ q?: string; invalid?: string }>;\n}) {\n  await requireRole("admin");\n  const query = await searchParams;\n  const { rows, count } = await searchAthletes(await createClient(), {\n    query: query.q,\n    page: 1,\n    pageSize: 50,\n    sort: "name",\n  });\n\n  return (\n    <div className="grid gap-6">\n      <PageHeader\n        eyebrow="Modo Espelho"\n        title="Ver como atleta"\n        description="Selecione um atleta e abra a experiência real da temporada em modo somente leitura. Sua sessão continua sendo administrativa."\n      />\n      <Card className="border-ur-gold/40">\n        <div className="flex items-start gap-3">\n          <ShieldCheck className="text-ur-gold mt-1" />\n          <div>\n            <h2 className="font-display text-xl font-black uppercase">Espelho seguro</h2>\n            <p className="mt-1 text-sm text-zinc-400">Sem troca de sessão, sem senha do atleta, sem service role no navegador e sem gravação por controles da experiência espelhada.</p>\n          </div>\n        </div>\n      </Card>\n      {query.invalid === "1" && (\n        <p role="alert" className="rounded-ur border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">Atleta inválido ou indisponível para o Espelho.</p>\n      )}\n      <Card>\n        <form className="flex flex-col gap-3 sm:flex-row">\n          <label className="sr-only" htmlFor="mirror-search">Buscar atleta</label>\n          <div className="relative flex-1">\n            <Search className="absolute top-3.5 left-3 text-zinc-600" size={18} />\n            <input id="mirror-search" name="q" defaultValue={query.q} placeholder="Nome ou código do atleta" className="rounded-ur min-h-12 w-full border bg-black pr-4 pl-10" />\n          </div>\n          <Button type="submit">Buscar</Button>\n        </form>\n        <p className="mt-3 text-xs text-zinc-500">{count} atleta(s) encontrado(s).</p>\n      </Card>\n      <div className="grid gap-3">\n        {rows.map((athlete) => (\n          <Card key={athlete.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">\n            <div>\n              <p className="text-ur-gold text-xs font-black tracking-[.18em] uppercase">{athlete.athlete_code}</p>\n              <h2 className="mt-1 text-xl font-black">{athlete.public_name}</h2>\n              <p className="text-sm text-zinc-500">{athlete.status} · {athlete.profile_id ? "conta vinculada" : "sem conta"}</p>\n            </div>\n            <form action={startAthleteMirrorAction}>\n              <input type="hidden" name="athleteId" value={athlete.id} />\n              <Button type="submit"><Eye size={17} /> Ver espelho</Button>\n            </form>\n          </Card>\n        ))}\n      </div>\n    </div>\n  );\n}\n`,
);

write(
  "src/app/admin/search/page.tsx",
  `import Link from "next/link";\nimport { Search } from "lucide-react";\nimport { Card, PageHeader } from "@/components/ui";\nimport { requireAnyRole } from "@/lib/auth/session";\nimport { createClient } from "@/lib/supabase/server";\n\nexport default async function AdminGlobalSearchPage({\n  searchParams,\n}: {\n  searchParams: Promise<{ q?: string }>;\n}) {\n  await requireAnyRole(["admin", "operator"]);\n  const { q = "" } = await searchParams;\n  const term = q.trim();\n  const client = await createClient();\n  const empty = { data: [] as any[] };\n  const [athletes, teams, poles, events] = term\n    ? await Promise.all([\n        client.from("athletes").select("id,athlete_code,public_name,status").or(\`public_name.ilike.%\${term}%,athlete_code.ilike.%\${term}%\`).limit(8),\n        client.from("teams").select("id,name,status").ilike("name", \`%\${term}%\`).limit(8),\n        client.from("poles").select("id,name,city,state,status").or(\`name.ilike.%\${term}%,city.ilike.%\${term}%\`).limit(8),\n        client.from("calendar_events").select("id,name,status,starts_at").ilike("name", \`%\${term}%\`).limit(8),\n      ])\n    : [empty, empty, empty, empty];\n\n  return (\n    <div className="grid gap-6">\n      <PageHeader eyebrow="Busca operacional" title="Busca global" description="Encontre atleta, equipe, polo ou atividade sem navegar por módulos." />\n      <Card>\n        <form className="flex gap-3">\n          <div className="relative flex-1">\n            <Search className="absolute top-3.5 left-3 text-zinc-600" size={18} />\n            <input name="q" defaultValue={q} placeholder="Buscar no ecossistema" className="rounded-ur min-h-12 w-full border bg-black pr-4 pl-10" />\n          </div>\n          <button className="rounded-ur bg-ur-gold text-ur-black px-5 font-black">Buscar</button>\n        </form>\n      </Card>\n      {term && (\n        <div className="grid gap-4 lg:grid-cols-2">\n          <ResultGroup title="Atletas" rows={(athletes.data ?? []).map((r: any) => ({ key: r.id, title: r.public_name, detail: \`\${r.athlete_code} · \${r.status}\`, href: \`/admin/athletes/\${r.id}\` }))} />\n          <ResultGroup title="Equipes" rows={(teams.data ?? []).map((r: any) => ({ key: r.id, title: r.name, detail: r.status, href: "/admin/teams" }))} />\n          <ResultGroup title="Polos" rows={(poles.data ?? []).map((r: any) => ({ key: r.id, title: r.name, detail: [r.city, r.state, r.status].filter(Boolean).join(" · "), href: "/admin/poles" }))} />\n          <ResultGroup title="Agenda" rows={(events.data ?? []).map((r: any) => ({ key: r.id, title: r.name, detail: r.starts_at ? new Date(r.starts_at).toLocaleString("pt-BR") : r.status, href: "/admin/calendar" }))} />\n        </div>\n      )}\n    </div>\n  );\n}\n\nfunction ResultGroup({ title, rows }: { title: string; rows: { key: string; title: string; detail: string; href: string }[] }) {\n  return (\n    <Card>\n      <h2 className="font-display text-xl font-black uppercase">{title}</h2>\n      <div className="mt-4 grid gap-2">\n        {rows.length ? rows.map((row) => (\n          <Link key={row.key} href={row.href} className="rounded-ur hover:border-ur-gold/40 border p-3">\n            <strong>{row.title}</strong>\n            <span className="block text-sm text-zinc-500">{row.detail}</span>\n          </Link>\n        )) : <p className="text-sm text-zinc-500">Nenhum resultado.</p>}\n      </div>\n    </Card>\n  );\n}\n`,
);

write(
  "src/lib/auth/athlete-mirror-policy.test.ts",
  `import { describe, expect, it } from "vitest";\nimport { canUseAthleteMirror, isAthleteMirrorId } from "./athlete-mirror-policy";\n\ndescribe("athlete mirror policy", () => {\n  it("allows only admin role", () => {\n    expect(canUseAthleteMirror("admin")).toBe(true);\n    expect(canUseAthleteMirror("athlete")).toBe(false);\n    expect(canUseAthleteMirror("operator")).toBe(false);\n  });\n\n  it("accepts UUID athlete ids only", () => {\n    expect(isAthleteMirrorId("10000000-0000-4000-8000-000000000001")).toBe(true);\n    expect(isAthleteMirrorId("../athlete")).toBe(false);\n    expect(isAthleteMirrorId("")).toBe(false);\n  });\n});\n`,
);

write(
  "tests/e2e/admin-athlete-mirror.spec.ts",
  `import { expect, test } from "@playwright/test";\nimport type { Page } from "@playwright/test";\n\nconst password = process.env.UR_TEST_PASSWORD ?? "";\nif (!password) throw new Error("UR_TEST_PASSWORD is required for authenticated E2E tests.");\n\nasync function login(page: Page, email: string) {\n  await page.context().clearCookies();\n  await page.goto("/login");\n  await page.getByLabel("E-mail").fill(email);\n  await page.getByLabel("Senha").fill(password);\n  await page.getByRole("button", { name: "Entrar" }).click();\n  await expect(page).not.toHaveURL(/\\/login$/);\n}\n\ntest("admin opens athlete mirror and keeps admin session", async ({ page }) => {\n  await login(page, "admin@test.ur.local");\n  await page.goto("/admin/mirror?q=Test%20Athlete%2001");\n  await page.getByRole("button", { name: "Ver espelho" }).first().click();\n  await expect(page).toHaveURL(/\\/athlete$/);\n  await expect(page.getByText("ESPELHO DO ATLETA")).toBeVisible();\n  await expect(page.getByText("Test Athlete 01")).toBeVisible();\n  await page.getByRole("link", { name: "Agenda" }).first().click();\n  await expect(page).toHaveURL(/\\/athlete\\/agenda$/);\n  await page.getByRole("link", { name: "Ranking" }).first().click();\n  await expect(page).toHaveURL(/\\/athlete\\/ranking$/);\n  await page.getByRole("link", { name: "Temporada" }).first().click();\n  await expect(page).toHaveURL(/\\/athlete\\/season$/);\n  await page.getByRole("link", { name: "Perfil" }).first().click();\n  await expect(page).toHaveURL(/\\/athlete\\/profile$/);\n  await page.getByRole("button", { name: "Voltar ao Controle" }).click();\n  await expect(page).toHaveURL(/\\/admin$/);\n});\n\ntest("athlete cannot access admin mirror selector", async ({ page }) => {\n  await login(page, "athlete@test.ur.local");\n  await page.goto("/admin/mirror");\n  await expect(page).toHaveURL(/\\/athlete$/);\n  await expect(page.getByText("Modo Espelho")).toHaveCount(0);\n});\n`,
);

// Dashboard lookup can now resolve either the real profile subject or an admin-selected athlete.
replace(
  "src/server/services/athlete-experience.service.ts",
  `export async function getAthleteDashboard(\n  client: SupabaseClient,\n  profileId: string,\n) {\n  const { data: athlete, error } = await client\n    .from("athletes")\n    .select(\n      "id,athlete_code,public_name,avatar_url,avatar_storage_path,created_at",\n    )\n    .eq("profile_id", profileId)\n    .maybeSingle();`,
  `export async function getAthleteDashboard(\n  client: SupabaseClient,\n  subjectId: string,\n  lookup: "profile" | "athlete" = "profile",\n) {\n  const athleteQuery = client\n    .from("athletes")\n    .select(\n      "id,athlete_code,public_name,avatar_url,avatar_storage_path,created_at",\n    );\n  const { data: athlete, error } = await (lookup === "athlete"\n    ? athleteQuery.eq("id", subjectId)\n    : athleteQuery.eq("profile_id", subjectId)\n  ).maybeSingle();`,
);

replace(
  "src/server/repositories/athletes.repository.ts",
  `export async function getAthleteProfile(\n  client: SupabaseClient,\n  profileId: string,\n): Promise<AthleteProfileView | null> {\n  const { data: athlete, error } = await client\n    .from("athletes")\n    .select(\n      "id,athlete_code,public_name,bio,avatar_url,avatar_storage_path,show_profile_photo_publicly,height_cm,dominant_hand,status",\n    )\n    .eq("profile_id", profileId)\n    .maybeSingle();`,
  `export async function getAthleteProfile(\n  client: SupabaseClient,\n  subjectId: string,\n  lookup: "profile" | "athlete" = "profile",\n): Promise<AthleteProfileView | null> {\n  const athleteQuery = client\n    .from("athletes")\n    .select(\n      "id,athlete_code,public_name,bio,avatar_url,avatar_storage_path,show_profile_photo_publicly,height_cm,dominant_hand,status",\n    );\n  const { data: athlete, error } = await (lookup === "athlete"\n    ? athleteQuery.eq("id", subjectId)\n    : athleteQuery.eq("profile_id", subjectId)\n  ).maybeSingle();`,
);

// Main athlete surfaces resolve a shared server-side viewer. The actual UI stays the same.
replace(
  "src/app/athlete/page.tsx",
  `import { requireRole } from "@/lib/auth/session";`,
  `import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";`,
);
replace(
  "src/app/athlete/page.tsx",
  `export default async function AthletePage() {\n  const identity = await requireRole("athlete");\n  const data = await getAthleteDashboard(await createClient(), identity.userId);`,
  `export default async function AthletePage() {\n  const viewer = await requireAthleteViewer();\n  const data = await getAthleteDashboard(\n    await createClient(),\n    viewer.isMirror ? viewer.athleteId : viewer.identity.userId,\n    viewer.isMirror ? "athlete" : "profile",\n  );`,
);

replace(
  "src/app/athlete/agenda/page.tsx",
  `import { requireRole } from "@/lib/auth/session";`,
  `import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";`,
);
replace(
  "src/app/athlete/agenda/page.tsx",
  `  getCurrentAthleteId,\n`,
  ``,
);
replace(
  "src/app/athlete/agenda/page.tsx",
  `  await requireRole("athlete");\n  const filters = await searchParams;\n  const client = await createClient();\n  const athleteId = await getCurrentAthleteId(client);`,
  `  const viewer = await requireAthleteViewer();\n  const filters = await searchParams;\n  const client = await createClient();\n  const athleteId = viewer.athleteId;`,
);

replace(
  "src/app/athlete/ranking/page.tsx",
  `import { requireRole } from "@/lib/auth/session";`,
  `import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";`,
);
replace(
  "src/app/athlete/ranking/page.tsx",
  `  const identity = await requireRole("athlete");\n  const client = await createClient();\n  const { data: athlete } = await client\n    .from("athletes")\n    .select("id")\n    .eq("profile_id", identity.userId)\n    .maybeSingle();\n  if (!athlete) notFound();\n  const data = await getAthleteRanking(client, athlete.id);`,
  `  const viewer = await requireAthleteViewer();\n  const client = await createClient();\n  const athlete = { id: viewer.athleteId };\n  const data = await getAthleteRanking(client, athlete.id);`,
);

replace(
  "src/app/athlete/season/page.tsx",
  `import { requireRole } from "@/lib/auth/session";`,
  `import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";`,
);
replace(
  "src/app/athlete/season/page.tsx",
  `  const identity = await requireRole("athlete");\n  const client = await createClient();\n  const dashboard = await getAthleteDashboard(client, identity.userId);`,
  `  const viewer = await requireAthleteViewer();\n  const client = await createClient();\n  const dashboard = await getAthleteDashboard(\n    client,\n    viewer.isMirror ? viewer.athleteId : viewer.identity.userId,\n    viewer.isMirror ? "athlete" : "profile",\n  );`,
);

replace(
  "src/app/athlete/profile/page.tsx",
  `import { requireRole } from "@/lib/auth/session";`,
  `import { requireAthleteViewer } from "@/lib/auth/athlete-viewer";`,
);
replace(
  "src/app/athlete/profile/page.tsx",
  `  const identity = await requireRole("athlete");\n  const profile = await getAthleteProfile(\n    await createClient(),\n    identity.userId,\n  );`,
  `  const viewer = await requireAthleteViewer();\n  const profile = await getAthleteProfile(\n    await createClient(),\n    viewer.isMirror ? viewer.athleteId : viewer.identity.userId,\n    viewer.isMirror ? "athlete" : "profile",\n  );`,
);

write(
  "src/app/athlete/layout.tsx",
  `import type { ReactNode } from "react";\nimport { PortalShell } from "@/components/layout/portal-shell";\nimport { requireAthleteViewer } from "@/lib/auth/athlete-viewer";\nimport { createClient } from "@/lib/supabase/server";\n\nexport default async function AthleteLayout({ children }: { children: ReactNode }) {\n  const viewer = await requireAthleteViewer();\n  const client = await createClient();\n  const { count } = viewer.isMirror\n    ? { count: 0 }\n    : await client\n        .from("notifications")\n        .select("id", { count: "exact", head: true })\n        .eq("athlete_id", viewer.athleteId)\n        .is("read_at", null);\n\n  return (\n    <PortalShell\n      portal="Atleta"\n      userLabel={viewer.athlete.publicName}\n      notificationCount={count ?? 0}\n      athleteIdentity={{\n        publicName: viewer.athlete.publicName,\n        athleteCode: viewer.athlete.athleteCode,\n      }}\n      athleteMirror={viewer.isMirror ? {\n        athleteId: viewer.athleteId,\n        publicName: viewer.athlete.publicName,\n        athleteCode: viewer.athlete.athleteCode,\n      } : null}\n    >\n      {children}\n    </PortalShell>\n  );\n}\n`,
);

write(
  "src/app/admin/layout.tsx",
  `import type { ReactNode } from "react";\nimport { PortalShell } from "@/components/layout/portal-shell";\nimport { requireAnyRole } from "@/lib/auth/session";\n\nexport default async function AdminLayout({ children }: { children: ReactNode }) {\n  const user = await requireAnyRole(["admin", "operator"]);\n  return (\n    <PortalShell\n      portal="Administração"\n      userLabel={user.email ?? "Usuário autenticado"}\n      canUseAthleteMirror={user.role === "admin"}\n    >\n      {children}\n    </PortalShell>\n  );\n}\n`,
);

// Admin Athlete 360 gets the primary mirror action.
replace(
  "src/app/admin/athletes/[id]/page.tsx",
  `import Link from "next/link";`,
  `import Link from "next/link";\nimport { startAthleteMirrorAction } from "@/features/admin-athlete-mirror/actions";`,
);
replace(
  "src/app/admin/athletes/[id]/page.tsx",
  `      <Link className="text-ur-gold" href={\`/admin/athletes/\${id}/edit\`}>\n        Editar dados permitidos\n      </Link>`,
  `      <div className="flex flex-wrap items-center gap-3">\n        <Link className="text-ur-gold" href={\`/admin/athletes/\${id}/edit\`}>\n          Editar dados permitidos\n        </Link>\n        <form action={startAthleteMirrorAction}>\n          <input type="hidden" name="athleteId" value={id} />\n          <Button type="submit">Ver como atleta</Button>\n        </form>\n      </div>`,
);

// Control Center wording and quick mirror entry.
replace(
  "src/app/admin/page.tsx",
  `  CheckCircle2,\n`,
  `  CheckCircle2,\n  Eye,\n`,
);
replace(
  "src/app/admin/page.tsx",
  `  { href: "/admin/ur-play/new", label: "Criar UR Play", icon: CalendarDays },`,
  `  { href: "/admin/mirror", label: "Espelho do atleta", icon: Eye },\n  { href: "/admin/ur-play/new", label: "Criar UR Play", icon: CalendarDays },`,
);
replace(
  "src/app/admin/page.tsx",
  `        eyebrow="Operacao hoje"\n        title="Central administrativa"\n        description="Cockpit da Temporada 1: agenda, pendencias, sinais de temporada e acoes rapidas sem depender de dashboard decorativo."`,
  `        eyebrow="Ultimate Rivals · Race Control"\n        title="Central de Controle"\n        description="Controle operacional da Temporada 1: movimente o ecossistema, valide o impacto e abra o Espelho do Atleta sem trocar de sessão."`,
);

// Tracking from an admin mirror must never contaminate athlete engagement.
replace(
  "src/features/engagement/actions.ts",
  `  const identity = await getSessionIdentity();\n  const metadata = sanitizeEngagementMetadata(input.metadata);`,
  `  const identity = await getSessionIdentity();\n  if (identity?.role === "admin") return;\n  const metadata = sanitizeEngagementMetadata(input.metadata);`,
);

// Navigation supports the read-only mirror and hides secondary athlete destinations in that mode.
replace(
  "src/components/athlete/athlete-navigation.tsx",
  `export function AthleteDesktopNavigation() {`,
  `export function AthleteDesktopNavigation({ mirror = false }: { mirror?: boolean }) {`,
);
replace(
  "src/components/athlete/athlete-navigation.tsx",
  `      <div className="border-t pt-5">\n        <p className="mb-2 px-3 text-[.65rem] font-black tracking-[.2em] text-zinc-600 uppercase">\n          Jornada e carreira\n        </p>\n        {secondary.map(({ href, label, icon: Icon }) => (`,
  `      {!mirror && (\n        <div className="border-t pt-5">\n          <p className="mb-2 px-3 text-[.65rem] font-black tracking-[.2em] text-zinc-600 uppercase">\n            Jornada e carreira\n          </p>\n          {secondary.map(({ href, label, icon: Icon }) => (`,
);
replace(
  "src/components/athlete/athlete-navigation.tsx",
  `        ))}\n      </div>\n    </nav>\n  );\n}\n\nexport function AthleteMobileNavigation()`,
  `          ))}\n        </div>\n      )}\n    </nav>\n  );\n}\n\nexport function AthleteMobileNavigation()`,
);

// PortalShell is the single visual boundary between Control and the read-only Mirror.
replace(
  "src/components/layout/portal-shell.tsx",
  `import { InstallAppPrompt } from "@/components/athlete/install-app-prompt";\nimport { BrandMark } from "./brand-mark";`,
  `import { InstallAppPrompt } from "@/components/athlete/install-app-prompt";\nimport { stopAthleteMirrorAction } from "@/features/admin-athlete-mirror/actions";\nimport { BrandMark } from "./brand-mark";`,
);
replace(
  "src/components/layout/portal-shell.tsx",
  `  athleteIdentity,\n}: {\n  portal: "Administração" | "Atleta" | "Equipe";\n  userLabel: string;\n  children: ReactNode;\n  notificationCount?: number;\n  athleteIdentity?: { publicName: string; athleteCode: string } | null;\n}) {`,
  `  athleteIdentity,\n  athleteMirror = null,\n  canUseAthleteMirror = false,\n}: {\n  portal: "Administração" | "Atleta" | "Equipe";\n  userLabel: string;\n  children: ReactNode;\n  notificationCount?: number;\n  athleteIdentity?: { publicName: string; athleteCode: string } | null;\n  athleteMirror?: { athleteId: string; publicName: string; athleteCode: string } | null;\n  canUseAthleteMirror?: boolean;\n}) {`,
);
replace(
  "src/components/layout/portal-shell.tsx",
  `          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase lg:mt-3 lg:block">\n            Portal {portal}\n          </span>\n        </div>`,
  `          <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase lg:mt-3 lg:block">\n            Portal {portal}\n          </span>\n          {portal === "Administração" && canUseAthleteMirror && (\n            <div className="mt-4 hidden grid-cols-2 gap-2 lg:grid">\n              <Link href="/admin" className="rounded-ur bg-ur-gold text-ur-black px-3 py-2 text-center text-xs font-black uppercase">Controle</Link>\n              <Link href="/admin/mirror" className="rounded-ur border border-ur-gold/40 px-3 py-2 text-center text-xs font-black uppercase text-ur-gold">Espelho</Link>\n            </div>\n          )}\n          {portal === "Administração" && (\n            <form action="/admin/search" className="mt-3 hidden lg:block">\n              <input name="q" aria-label="Busca global" placeholder="Buscar no ecossistema" className="rounded-ur min-h-10 w-full border bg-black px-3 text-sm" />\n            </form>\n          )}\n        </div>`,
);
replace(
  "src/components/layout/portal-shell.tsx",
  `          <AthleteDesktopNavigation />`,
  `          <AthleteDesktopNavigation mirror={Boolean(athleteMirror)} />`,
);
replace(
  "src/components/layout/portal-shell.tsx",
  `      <div className="min-w-0">\n        {portal === "Atleta" && (`,
  `      <div className="min-w-0">\n        {athleteMirror && (\n          <div className="border-ur-gold/40 bg-ur-gold/10 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur sm:px-8 lg:px-10">\n            <div>\n              <p className="text-ur-gold text-[.65rem] font-black tracking-[.2em] uppercase">ESPELHO DO ATLETA</p>\n              <p className="text-sm font-black">Visualizando como: {athleteMirror.publicName} · {athleteMirror.athleteCode}</p>\n            </div>\n            <div className="flex flex-wrap gap-2">\n              <Link href="/admin/mirror" className="rounded-ur border border-ur-gold/40 px-3 py-2 text-xs font-black">Trocar atleta</Link>\n              <form action={stopAthleteMirrorAction}>\n                <button className="rounded-ur bg-ur-gold text-ur-black px-3 py-2 text-xs font-black">Voltar ao Controle</button>\n              </form>\n            </div>\n          </div>\n        )}\n        {portal === "Atleta" && (`,
);
replace(
  "src/components/layout/portal-shell.tsx",
  `            <NotificationLink count={notificationCount} />`,
  `            {!athleteMirror && <NotificationLink count={notificationCount} />}`,
);
replace(
  "src/components/layout/portal-shell.tsx",
  `          {children}\n        </main>`,
  `          {athleteMirror ? (\n            <div className="[&_a]:pointer-events-none [&_a]:opacity-70 [&_button]:pointer-events-none [&_button]:opacity-60 [&_form]:pointer-events-none [&_form]:opacity-70 [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none">\n              {children}\n            </div>\n          ) : children}\n        </main>`,
);
replace(
  "src/components/layout/portal-shell.tsx",
  `          <InstallAppPrompt />`,
  `          {!athleteMirror && <InstallAppPrompt />}`,
);

// One-shot utility cleans itself up so the final branch contains product code only.
fs.rmSync(path.join(root, "scripts/apply-admin-mirror.mjs"));
fs.rmSync(path.join(root, ".github/workflows/apply-admin-mirror.yml"));
console.log("admin mirror codemod applied");
