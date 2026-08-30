import { describe, expect, it } from "vitest";
import type { AdminExecutiveRepositoryData } from "@/server/repositories/admin-executive-repository";
import { buildAdminExecutiveSnapshot } from "./admin-executive-service";

function fixture(): AdminExecutiveRepositoryData {
  return {
    workstreams: [
      {
        id: "stream",
        code: "operations",
        name: "Operações",
        purpose: "Executar o padrão operacional.",
        position: 1,
      },
    ],
    functions: [
      {
        id: "critical-covered",
        workstream_id: "stream",
        code: "operations-manager",
        title: "Gestão de Operações",
        mission: "Garantir prontidão operacional.",
        criticality: "critical",
        expected_outcomes: ["Sessões prontas"],
        performance_indicators: ["Prontidão"],
        decision_authority: "Comanda a operação.",
        weekly_ritual: "Revisão semanal.",
      },
      {
        id: "critical-open",
        workstream_id: "stream",
        code: "court-lead",
        title: "Liderança de Quadra",
        mission: "Executar o padrão em quadra.",
        criticality: "critical",
        expected_outcomes: [],
        performance_indicators: [],
        decision_authority: "Comanda a sessão.",
        weekly_ritual: null,
      },
    ],
    assignments: [
      {
        id: "assignment",
        function_id: "critical-covered",
        profile_id: "person",
        status: "active",
        review_due_at: null,
        allocation_percent: 100,
      },
    ],
    profiles: [{ id: "person", display_name: "Matheus", role: "admin" }],
    workItems: [
      {
        id: "p1",
        workstream_id: "stream",
        function_id: "critical-covered",
        assignee_profile_id: "person",
        title: "Fechar piloto",
        description: null,
        priority: "p1",
        status: "in_progress",
        signal: "yellow",
        due_at: "2026-08-28",
        acceptance_criteria: "Piloto homologado.",
        result_summary: null,
        evidence_url: null,
        blocked_reason: null,
      },
      {
        id: "p0",
        workstream_id: "stream",
        function_id: null,
        assignee_profile_id: null,
        title: "Remover bloqueio",
        description: null,
        priority: "p0",
        status: "blocked",
        signal: "red",
        due_at: "2026-08-30",
        acceptance_criteria: "Bloqueio removido.",
        result_summary: null,
        evidence_url: null,
        blocked_reason: "Falta a quadra.",
      },
    ],
    errors: [],
  };
}

describe("admin executive snapshot", () => {
  it("calculates coverage, critical gaps, focus, blocked and overdue from real rows", () => {
    const snapshot = buildAdminExecutiveSnapshot(fixture(), "2026-08-29");

    expect(snapshot.status).toBe("ready");
    expect(snapshot.metrics).toMatchObject({
      workstreams: 1,
      functions: 2,
      coveredFunctions: 1,
      criticalUncovered: 1,
      activeFocus: 1,
      blocked: 1,
      overdue: 1,
    });
    expect(snapshot.focusItems.map((item) => item.id)).toEqual(["p1"]);
    expect(snapshot.criticalItems.map((item) => item.id)).toEqual(["p0", "p1"]);
    expect(snapshot.functions[0]?.assignment?.displayName).toBe("Matheus");
    expect(snapshot.functions[0]?.expectedOutcomes).toEqual([
      "Sessões prontas",
    ]);
    expect(snapshot.functions[0]?.performanceIndicators).toEqual(["Prontidão"]);
    expect(snapshot.functions[0]?.weeklyRitual).toBe("Revisão semanal.");
  });

  it("reports a partial snapshot when any canonical source fails", () => {
    const data = fixture();
    data.workItems = null;
    data.errors = ["command_work_items: unavailable"];

    const snapshot = buildAdminExecutiveSnapshot(data, "2026-08-29");

    expect(snapshot.status).toBe("partial");
    expect(snapshot.workItems).toEqual([]);
    expect(snapshot.sourceErrors).toHaveLength(1);
  });
});
