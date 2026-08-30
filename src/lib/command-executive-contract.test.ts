import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("C40 executive management contracts", () => {
  it("keeps the module internal, admin-only and separate from Athlete App", () => {
    const modules = source("src/lib/auth/admin-modules.ts");
    const page = source("src/app/admin/gestao/page.tsx");

    expect(modules).toContain('key: "management"');
    expect(modules).toContain('href: "/admin/gestao"');
    expect(page).toContain('requireAdminModule("management")');
    expect(page).not.toContain("AthleteShell");
    expect(page).not.toContain("/athlete/");
  });

  it("enforces RLS, minimum grants, audit and one current assignment", () => {
    const migration = source(
      "supabase/migrations/20260829210000_command_executive_core.sql",
    );

    expect(migration.match(/enable row level security/g)).toHaveLength(4);
    expect(migration.match(/force row level security/g)).toHaveLength(4);
    expect(migration).toContain("private.has_any_role(array['admin']");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration.match(/private.capture_audit_log/g)).toHaveLength(4);
    expect(migration).toContain("command_function_assignments_one_current_idx");
    expect(migration).toContain("command focus limit exceeded");
    expect(migration).toContain("invalid command work item transition");
    expect(migration).toContain("command_work_items_function_workstream_fk");
    expect(migration).not.toContain(
      "function_id uuid references public.command_functions",
    );
    expect(migration).toContain("command_assignments_assigned_by_idx");
    expect(migration).toContain("command_work_items_function_idx");
    expect(migration).toContain("command_work_items_created_by_idx");
    expect(migration).toMatch(
      /create table public\.command_functions[\s\S]*constraint command_functions_id_workstream_unique unique \(id, workstream_id\)[\s\S]*create table public\.command_function_assignments/,
    );
    expect(migration).toMatch(
      /create table public\.command_work_items[\s\S]*constraint command_work_items_function_workstream_fk[\s\S]*foreign key \(function_id, workstream_id\)/,
    );
    expect(migration).toContain("security invoker");
    expect(migration).toContain(
      "assignment_time timestamptz := clock_timestamp()",
    );
    expect(migration).toContain("starts_at + interval '1 microsecond'");
    expect(migration).not.toContain("service_role_key");
  });

  it("does not seed people assignments, work items, results or evidence", () => {
    const migration = source(
      "supabase/migrations/20260829210000_command_executive_core.sql",
    );

    expect(
      migration.match(/insert into public\.command_function_assignments/gi),
    ).toHaveLength(1);
    expect(migration).not.toMatch(/insert into public\.command_work_items/i);
  });

  it("includes the operational data and technical development ownership seats", () => {
    const migration = source(
      "supabase/migrations/20260830152000_complete_command_function_catalog.sql",
    );

    expect(migration).toContain("Coordenação de Dados e Ranking");
    expect(migration).toContain("Coordenação Técnica e Desenvolvimento");
    expect(migration).toContain("on conflict (code) do update");
  });
});
