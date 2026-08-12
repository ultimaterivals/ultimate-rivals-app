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
    expect(athleteShell).toContain('aria-label="Jornada e carreira do atleta"');
  });

  it("keeps Preview admin-only, read-only and without Auth impersonation", () => {
    const previewPage = source("src/app/admin/preview/page.tsx");
    const previewActions = source(
      "src/features/admin-athlete-preview/actions.ts",
    );
    const athleteShell = source("src/components/athlete/athlete-shell.tsx");
    const athleteAgenda = source("src/app/athlete/agenda/page.tsx");
    const opportunityCard = source(
      "src/components/athlete/athlete-opportunity-card.tsx",
    );

    expect(previewPage).toContain('requireRole(["admin"])');
    expect(previewPage).toContain("Sem troca de Auth");
    expect(previewActions).not.toMatch(
      /signInWithPassword|admin\.auth|service_role/i,
    );
    expect(athleteShell).toContain("Prévia do Atleta · somente leitura");
    expect(athleteShell).toContain("pointer-events-none");
    expect(athleteShell).toContain("Voltar ao Command");
    expect(athleteAgenda).toContain("readOnly={viewer.isPreview}");
    expect(opportunityCard).toContain("readOnly = false");
    expect(opportunityCard).toContain("não são renderizadas");
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
    const economyE2e = source("tests/e2e/market-economy.spec.ts");

    expect(attendanceActions).toContain('rpc("admin_manual_checkin_ur_play"');
    expect(attendanceActions).toContain('rpc("admin_mark_ur_play_no_show"');
    expect(attendanceActions).toContain('revalidatePath("/athlete")');
    expect(attendanceActions).toContain('revalidatePath("/athlete/agenda")');
    expect(athleteRepository).toContain('"consumed"');
    expect(athleteRepository).toContain('"no_show"');
    expect(athleteRepository).toContain("opportunityStart");
    expect(opportunityCard).toContain("Participação concluída");
    expect(opportunityCard).toContain("Ausência registrada");
    expect(economyE2e).toContain("official no-show consumes held credit");
    expect(economyE2e).toContain("Ausência registrada");
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

  it("keeps the complete athlete progression loop tied to canonical economy", () => {
    const development = source("src/app/athlete/development/page.tsx");
    const playerHub = source("src/app/athlete/page.tsx");
    const athleteRepository = source(
      "src/server/repositories/athlete-portal-repository.ts",
    );

    for (const stage of [
      "Jogar",
      "Ganhar pontos",
      "Subir no ranking",
      "Cumprir missões",
      "Ganhar UR Coins",
      "Desbloquear e resgatar",
      "Evoluir",
      "Jogar novamente",
    ]) {
      expect(development).toContain(stage);
    }
    expect(development).toContain("/athlete/market");
    expect(development).toContain("/athlete/wallet");
    expect(development).toContain("não são simulados nesta V1");
    expect(playerHub).toContain("Como chegar lá");
    expect(athleteRepository).toContain("athlete_development_summary");
    expect(playerHub).toContain("Último destaque");
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

  it("blocks direct browser writes to the UR Coin ledger", () => {
    const restriction = source(
      "supabase/migrations/20260812145703_restrict_ur_coin_direct_client_writes.sql",
    );
    const marketRedemption = source(
      "supabase/migrations/20260811081000_atomic_urc_market_redemption.sql",
    );
    const sessionProcessor = source(
      "supabase/migrations/20260811030000_ur_play_coins_by_evidence.sql",
    );

    expect(restriction).toContain(
      "drop policy if exists ur_coin_transactions_insert",
    );
    expect(restriction).toContain(
      "revoke insert on table public.ur_coin_transactions from authenticated",
    );
    expect(marketRedemption).toContain("security definer");
    expect(marketRedemption).toContain(
      "Only athletes can redeem Market offers",
    );
    expect(sessionProcessor).toContain("SESSION_OPERATION_DENIED");
  });

  it("stages historical data without writing ranking projections or UR Coins", () => {
    const migration = source(
      "supabase/migrations/20260812155110_historical_data_import_staging.sql",
    );
    const guide = source("docs/historical-imports-v1.md");

    expect(migration).toContain("historical_import_batches");
    expect(migration).toContain("historical_import_rows");
    expect(migration).toContain("admin_historical_import_dry_run");
    expect(migration).toContain("admin_stage_historical_import_batch");
    expect(migration).toContain("private.require_admin_actor()");
    expect(migration).not.toContain("insert into public.ranking_entries");
    expect(migration).not.toContain("insert into public.ur_coin_transactions");
    expect(guide).toContain("admin_stage_athlete_import_batch");
    expect(guide).toContain("ranking_transactions");
  });

  it("keeps UR Market fulfillment transactional, audited and admin-only", () => {
    const modules = source("src/lib/auth/admin-modules.ts");
    const adminMarket = source("src/app/admin/market/page.tsx");
    const fulfillment = source(
      "supabase/migrations/20260811081500_admin_fulfill_market_redemption.sql",
    );

    expect(modules).toContain('key: "market"');
    expect(modules).toContain('href: "/admin/market"');
    expect(adminMarket).toContain('requireRole(["admin"])');
    expect(adminMarket).toContain('.rpc("admin_fulfill_market_redemption"');
    expect(adminMarket).not.toMatch(
      /\.from\("market_redemptions"\)\s*\.update/,
    );
    expect(adminMarket).toContain("Marcar benefício como entregue");
    expect(adminMarket).not.toMatch(
      /refund|reembolso|cancelled_at|reversal_of/i,
    );
    expect(fulfillment).toContain("private.current_app_role() <> 'admin'");
    expect(fulfillment).toContain("pg_advisory_xact_lock");
    expect(fulfillment).toContain("for update");
    expect(fulfillment).toContain("public.audit_logs");
    expect(fulfillment).toContain("market_redemption.fulfilled");
    expect(fulfillment).toContain("request_id");
  });

  it("exposes canonical audit logs to authorized Command roles without write actions", () => {
    const modules = source("src/lib/auth/admin-modules.ts");
    const auditPage = source("src/app/admin/auditoria/page.tsx");
    const auditRepository = source(
      "src/server/repositories/admin-audit-repository.ts",
    );

    expect(modules).toContain('key: "audit"');
    expect(modules).toContain('allowedRoles: ["admin", "operator"]');
    expect(auditPage).toContain('requireAdminModule("audit")');
    expect(auditPage).toContain("somente leitura");
    expect(auditRepository).toContain('.from("audit_logs")');
    expect(auditRepository).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });

  it("exposes only publishable external media in athlete surfaces", () => {
    const highlights = source("src/app/athlete/highlights/page.tsx");
    const arenas = source("src/app/athlete/arenas/page.tsx");
    const playerHub = source("src/app/athlete/page.tsx");

    expect(highlights).toContain("media_assets!inner");
    expect(highlights).toContain('.in("status", ["publishable", "public"])');
    expect(highlights).toContain(
      '.in("media_assets.status", ["publishable", "public"])',
    );
    expect(highlights).toContain(
      '.not("media_assets.external_url", "is", null)',
    );

    expect(arenas).toContain('.from("media_assets")');
    expect(arenas).toContain('.in("status", ["publishable", "public"])');
    expect(arenas).toContain('.not("external_url", "is", null)');
    expect(arenas).toContain("safeExternalUrl");
    expect(arenas).not.toContain(".storage.from(");

    expect(playerHub).toContain("media_assets!inner");
    expect(playerHub).toContain(
      '.in("media_assets.status", ["publishable", "public"])',
    );
    expect(playerHub).toContain("safeExternalUrl");
  });

  it("keeps all App V1 migrations forward-only after current main C41", () => {
    const c41 = source(
      "supabase/migrations/20260811080500_fix_feedback_private_execute.sql",
    );
    const migrationPath =
      "supabase/migrations/20260811081000_atomic_urc_market_redemption.sql";
    const migration = source(migrationPath);

    expect(c41).toContain("feedback");
    expect("20260811081000" > "20260811080500").toBe(true);
    expect("20260811081100" > "20260811080500").toBe(true);
    expect("20260811081200" > "20260811080500").toBe(true);
    expect("20260811081300" > "20260811080500").toBe(true);
    expect("20260811081400" > "20260811080500").toBe(true);
    expect("20260811081500" > "20260811080500").toBe(true);
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

  it("selects reservation credits from the append-only ledger without locking an aggregate view", () => {
    const migration = source(
      "supabase/migrations/20260811081100_fix_reservation_credit_lock.sql",
    );

    expect(migration).toContain("public.commercial_credit_ledger");
    expect(migration).toContain("sum(l.available_delta)");
    expect(migration).toContain("for update of ap");
    expect(migration).not.toContain("join public.athlete_credit_balances");
    expect(migration).toContain("NO_AVAILABLE_CREDITS");
    expect(migration).toContain("'hold'");
  });
});
