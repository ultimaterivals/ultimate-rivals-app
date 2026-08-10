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
    const previewActions = source("src/features/admin-athlete-preview/actions.ts");
    const athleteShell = source("src/components/athlete/athlete-shell.tsx");

    expect(previewPage).toContain('requireRole(["admin"])');
    expect(previewPage).toContain("Sem troca de Auth");
    expect(previewActions).not.toMatch(/signInWithPassword|admin\.auth|service_role/i);
    expect(athleteShell).toContain("Prévia do Atleta · somente leitura");
    expect(athleteShell).toContain("pointer-events-none");
    expect(athleteShell).toContain("Voltar ao Command");
  });

  it("keeps athlete Market writes behind the transactional RPC", () => {
    const athleteMarket = source("src/app/athlete/market/page.tsx");

    expect(athleteMarket).toContain('requireRole(["athlete"])');
    expect(athleteMarket).toContain('.rpc("redeem_market_offer_urc"');
    expect(athleteMarket).not.toMatch(/\.from\("ur_coin_transactions"\)\.insert/);
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
    expect(adminMarket).not.toMatch(/refund|reembolso|cancelled_at|reversal_of/i);
  });

  it("uses a forward-only, atomic and idempotent URC Market migration", () => {
    const migrationPath =
      "supabase/migrations/20260810202000_atomic_urc_market_redemption.sql";
    const migration = source(migrationPath);

    expect("20260810202000" > "20260810192333").toBe(true);
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
    expect(migration).toContain("revoke all on function public.redeem_market_offer_urc(uuid, text) from public, anon");
    expect(migration).toContain("grant execute on function public.redeem_market_offer_urc(uuid, text) to authenticated");
  });
});
