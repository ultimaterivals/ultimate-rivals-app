import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("App V1 ↔ Command integration contracts", () => {
  it("keeps the athlete app shell separate from the Command shell", () => {
    const athleteLayout = source("src/app/athlete/layout.tsx");
    const athleteShell = source("src/components/athlete/athlete-shell.tsx");

    expect(athleteLayout).toContain("AthleteShell");
    expect(athleteLayout).not.toContain("PortalShell");
    expect(athleteShell).toContain("App do Atleta");
    expect(athleteShell).toContain('aria-label="Navegação do atleta"');
    expect(athleteShell).toContain("Jornada e carreira");
  });

  it("keeps Preview admin-only, read-only and without Auth impersonation", () => {
    const previewPage = source("src/app/admin/preview/page.tsx");
    const previewActions = source(
      "src/features/admin-athlete-preview/actions.ts",
    );
    const athleteShell = source("src/components/athlete/athlete-shell.tsx");

    expect(previewPage).toContain('requireRole(["admin"])');
    expect(previewPage).toContain("Sem troca de Auth");
    expect(previewActions).not.toMatch(
      /signInWithPassword|admin\.auth|service_role/i,
    );
    expect(athleteShell).toContain("Prévia do Atleta · somente leitura");
    expect(athleteShell).toContain("pointer-events-none");
    expect(athleteShell).toContain("Voltar ao Command");
  });

  it("reflects official UR Play attendance outcomes back into the athlete App", () => {
    const attendanceActions = source(
      "src/app/admin/ur-play/presenca/actions.ts",
    );
    const athleteRepository = source(
      "src/server/repositories/athlete-portal-repository.ts",
    );
    const opportunityCard = source(
      "src/components/athlete/athlete-opportunity-card.tsx",
    );

    expect(attendanceActions).toContain('rpc("admin_manual_checkin_ur_play"');
    expect(attendanceActions).toContain('rpc("admin_mark_ur_play_no_show"');
    expect(attendanceActions).toContain('revalidatePath("/athlete")');
    expect(attendanceActions).toContain('revalidatePath("/athlete/agenda")');
    expect(athleteRepository).toContain('"consumed"');
    expect(athleteRepository).toContain('"no_show"');
    expect(athleteRepository).toContain("opportunityStart");
    expect(opportunityCard).toContain("Participação concluída");
    expect(opportunityCard).toContain("Ausência registrada");
  });

  it("preserves C23 matchmaking readiness without breaking Preview", () => {
    const profile = source("src/app/athlete/perfil/page.tsx");
    const action = source("src/app/athlete/perfil/actions.ts");
    const repository = source(
      "src/server/repositories/athlete-portal-repository.ts",
    );
    const types = source("src/features/athlete-portal/types.ts");

    expect(profile).toContain("Preparação para matchmaking");
    expect(profile).toContain("requireAthleteViewer");
    expect(profile).toContain("viewer.isPreview");
    expect(profile).toContain("getAthleteSnapshotForViewer");
    expect(profile).toContain("getAthleteAvailabilitySnapshot");
    expect(action).toContain('requireRole(["athlete"])');
    expect(action).toContain("update_own_athlete_matchmaking_identity");
    expect(repository).toContain("primary_pole_id,gender");
    expect(types).toContain("gender: string");
  });

  it("keeps athlete Market writes behind the transactional RPC", () => {
    const athleteMarket = source("src/app/athlete/market/page.tsx");

    expect(athleteMarket).toContain('requireRole(["athlete"])');
    expect(athleteMarket).toContain('.rpc("redeem_market_offer_urc"');
    expect(athleteMarket).not.toMatch(
      /\.from\("ur_coin_transactions"\)\.insert/,
    );
    expect(athleteMarket).not.toMatch(/\.from\("market_redemptions"\)\.insert/);
    expect(athleteMarket).toContain("viewer.isPreview");
  });

  it("keeps UR Market operational controls inside admin Command only", () => {
    const modules = source("src/lib/auth/admin-modules.ts");
    const adminMarket = source("src/app/admin/market/page.tsx");

    expect(modules).toContain('key: "market"');
    expect(modules).toContain('href: "/admin/market"');
    expect(adminMarket).toContain('requireRole(["admin"])');
    expect(adminMarket).toContain("Marcar benefício como entregue");
    expect(adminMarket).not.toMatch(
      /refund|reembolso|cancelled_at|reversal_of/i,
    );
  });

  it("uses a forward-only, atomic and idempotent URC Market migration", () => {
    const c32StartFix = source(
      "supabase/migrations/20260811003500_fix_ur_play_start_format_status.sql",
    );
    const migrationPath =
      "supabase/migrations/20260811004000_atomic_urc_market_redemption.sql";
    const migration = source(migrationPath);

    expect(c32StartFix).toContain("ur_play");
    expect("20260811004000" > "20260811003500").toBe(true);
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("market_redemption:");
    expect(migration).toContain("for update");
    expect(migration).toContain("inventory_limit");
    expect(migration).toContain("per_athlete_limit");
    expect(migration).toContain("Insufficient UR Coins balance");
    expect(migration).toContain("public.ur_coin_transactions");
    expect(migration).toContain("'debit'::public.ur_coin_direction");
    expect(migration).toContain(
      "revoke all on function public.redeem_market_offer_urc(uuid, text) from public, anon",
    );
    expect(migration).toContain(
      "grant execute on function public.redeem_market_offer_urc(uuid, text) to authenticated",
    );
  });
});
