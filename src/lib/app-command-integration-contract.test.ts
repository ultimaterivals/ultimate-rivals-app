import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

// This suite intentionally guards architecture-level integration contracts by
// inspecting the canonical source paths. It complements runtime/E2E coverage.
describe("App V1 ↔ Command integration contracts", () => {
  it("keeps the athlete app shell separate from the Command shell", () => {
    const athleteLayout = source("src/app/athlete/layout.tsx");
    const adminLayout = source("src/app/admin/layout.tsx");

    expect(athleteLayout).toContain("AthleteShell");
    expect(athleteLayout).not.toContain("PortalShell");
    expect(adminLayout).toContain("PortalShell");
  });

  it("keeps Preview admin-only, read-only and without Auth impersonation", () => {
    const previewPage = source("src/app/admin/preview/page.tsx");
    const previewActions = source("src/features/admin-athlete-preview/actions.ts");
    const athleteShell = source("src/components/athlete/athlete-shell.tsx");

    expect(previewPage).toContain('requireRole(["admin"])');
    expect(previewActions).toContain('requireRole(["admin"])');
    expect(previewActions).toContain("ATHLETE_PREVIEW_COOKIE");
    expect(previewActions).not.toContain("signInWithPassword");
    expect(previewActions).not.toContain("service_role");
    expect(athleteShell).toContain("Prévia do Atleta · somente leitura");
    expect(athleteShell).toContain("pointer-events-none");
  });

  it("keeps athlete feedback in AthleteShell and sends support cases through the canonical flow", () => {
    const athleteShell = source("src/components/athlete/athlete-shell.tsx");
    const feedbackPage = source("src/app/athlete/feedback/page.tsx");
    const feedbackActions = source("src/app/athlete/feedback/actions.ts");
    const feedbackMigration = source(
      "supabase/migrations/20260812160000_athlete_feedback_cases.sql",
    );

    expect(athleteShell).toContain("/athlete/feedback");
    expect(feedbackPage).toContain("Feedback e suporte");
    expect(feedbackPage).toContain("Protocolo");
    for (const category of [
      "App",
      "Jogo",
      "Arbitragem",
      "Arena",
      "Equipe",
      "Sugestão",
      "Financeiro",
      "Outro",
    ]) {
      expect(feedbackPage).toContain(category);
    }
    expect(feedbackActions).toContain("requireWritableAthleteViewer");
    expect(feedbackActions).toContain("requireAthleteViewer");
    expect(feedbackActions).toContain("viewer.isPreview");
    expect(feedbackActions).toContain("submit_my_athlete_feedback_case");
    expect(feedbackActions).not.toContain('redirect("/admin")');
    expect(feedbackMigration).toContain("enable row level security");
    expect(feedbackMigration).toContain("athlete_feedback_cases_select");
    expect(feedbackMigration).toContain("athlete_feedback_case.submitted");
  });

  it("allows an admin with a competitive identity to use the Athlete App", () => {
    const session = source("src/lib/auth/session.ts");
    const viewer = source("src/lib/auth/athlete-viewer.ts");
    const login = source("src/features/auth/actions.ts");

    expect(session).toContain("profileRole");
    expect(viewer).toContain("profile_id");
    expect(viewer).toContain("identity.userId");
    expect(login).toContain("athlete");
    expect(login).toContain('redirect("/athlete")');
  });

  it("reflects official UR Play attendance outcomes back into the athlete App", () => {
    const agenda = source("src/app/athlete/agenda/page.tsx");
    const attendanceMigration = source(
      "supabase/migrations/20260812080200_admin_attendance_ops.sql",
    );

    expect(agenda).toContain("checkin");
    expect(agenda).toContain("no_show");
    expect(attendanceMigration).toContain("admin_manual_checkin_ur_play");
    expect(attendanceMigration).toContain("admin_mark_ur_play_no_show");
  });

  it("preserves C23 matchmaking readiness without breaking Preview", () => {
    const profile = source("src/app/athlete/perfil/page.tsx");
    const profileAction = source("src/app/athlete/perfil/actions.ts");

    expect(profile).toContain("matchmaking");
    expect(profileAction).toContain("update_my_athlete_competitive_profile");
  });

  it("keeps the complete athlete progression loop tied to canonical economy", () => {
    const development = source("src/app/athlete/development/page.tsx");
    const wallet = source("src/app/athlete/wallet/page.tsx");
    const market = source("src/app/athlete/market/page.tsx");

    for (const step of [
      "Jogar",
      "Ganhar pontos",
      "Subir no ranking",
      "Cumprir missões",
      "Ganhar UR Coins",
      "Desbloquear e resgatar",
      "Evoluir",
      "Jogar novamente",
    ]) {
      expect(development).toContain(step);
    }
    expect(wallet).toContain("UR Coins");
    expect(market).toContain("redeem_market_offer_urc");
  });

  it("keeps the league ranking visible when an athlete has no personal entry", () => {
    const ranking = source("src/app/athlete/ranking/page.tsx");

    expect(ranking).toContain("public_rankings");
    expect(ranking).toContain("Ranking geral da liga");
    expect(ranking).toContain("Você ainda não tem posição");
  });

  it("keeps competitive result and team surfaces sourced from published data", () => {
    const results = source("src/app/athlete/results/page.tsx");
    const team = source("src/app/athlete/team/page.tsx");

    expect(results).toContain("match_results");
    expect(results).toContain("ranking_transactions");
    expect(team).toContain("team_memberships");
    expect(team).toContain("public_rankings");
  });

  it("keeps athlete Market writes behind the transactional RPC", () => {
    const action = source("src/app/athlete/market/actions.ts");

    expect(action).toContain("redeem_market_offer_urc");
    expect(action).not.toContain('.from("ur_coin_transactions").insert');
  });

  it("blocks direct browser writes to the UR Coin ledger", () => {
    const migration = source(
      "supabase/migrations/20260812145703_restrict_ur_coin_direct_client_writes.sql",
    );

    expect(migration).toContain("ur_coin_transactions");
    expect(migration).toContain("revoke insert");
  });

  it("stages historical data without writing ranking projections or UR Coins", () => {
    const migration = source(
      "supabase/migrations/20260812155110_historical_data_import_staging.sql",
    );

    expect(migration).toContain("historical_import_batches");
    expect(migration).toContain("admin_historical_import_dry_run");
    expect(migration).not.toContain('insert into public.ranking_entries');
    expect(migration).not.toContain('insert into public.ur_coin_transactions');
  });

  it("keeps UR Market fulfillment transactional, audited and admin-only", () => {
    const migration = source(
      "supabase/migrations/20260812093000_admin_market_fulfillment.sql",
    );

    expect(migration).toContain("admin_fulfill_market_redemption");
    expect(migration).toContain("audit_logs");
    expect(migration).toContain("require_admin_actor");
  });

  it("exposes canonical audit logs to authorized Command roles without write actions", () => {
    const auditPage = source("src/app/admin/auditoria/page.tsx");
    const auditService = source("src/server/services/admin-audit-service.ts");

    expect(auditPage).toContain("getAdminAuditSnapshot");
    expect(auditService).toContain("audit_logs");
    expect(auditPage).not.toContain("action=");
  });

  it("exposes only publishable external media in athlete surfaces", () => {
    const media = source("src/app/athlete/highlights/page.tsx");

    expect(media).toContain("published");
    expect(media).not.toContain("storage_path");
  });

  it("keeps all App V1 migrations forward-only after current main C41", () => {
    const migration = source(
      "supabase/migrations/20260812160000_athlete_feedback_cases.sql",
    );

    expect(migration).toContain("create table public.athlete_feedback_cases");
  });

  it("selects reservation credits from the append-only ledger without locking an aggregate view", () => {
    const migration = source(
      "supabase/migrations/20260812115000_reservation_credit_ledger_fix.sql",
    );

    expect(migration).toContain("commercial_credit_ledger");
    expect(migration).not.toContain("for update of commercial_credit_balances");
  });
});
