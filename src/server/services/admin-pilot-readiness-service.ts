import type {
  AdminPilotReadinessSnapshot,
  PilotReadinessGate,
  PilotReadinessState,
} from "@/features/admin-pilot-readiness/types";
import { getAdminAthleteWavesSnapshot } from "@/server/services/admin-athlete-waves-service";
import { getAdminCourtOpsSnapshot } from "@/server/services/admin-court-ops-service";
import { getAdminPolesInfrastructureSnapshot } from "@/server/services/admin-poles-infrastructure-service";
import { getAdminQuarterSeasonSnapshot } from "@/server/services/admin-quarter-season-service";

const sessionOrder = [
  "in_progress",
  "checkin_open",
  "registration_closed",
  "registration_open",
  "published",
] as const;

function gate(
  key: string,
  label: string,
  state: PilotReadinessState,
  detail: string,
  href: string,
  actionLabel: string,
): PilotReadinessGate {
  return { key, label, state, detail, href, actionLabel };
}

export async function getAdminPilotReadinessSnapshot(
  now = new Date(),
): Promise<AdminPilotReadinessSnapshot> {
  const [quarterSeason, waves, infrastructure, courtOps] = await Promise.all([
    getAdminQuarterSeasonSnapshot(now),
    getAdminAthleteWavesSnapshot(now),
    getAdminPolesInfrastructureSnapshot(),
    getAdminCourtOpsSnapshot(now),
  ]);

  const operationalSeason = quarterSeason.currentSeason;
  const seasonOperational = Boolean(
    operationalSeason?.structureReady &&
      ["registration", "active"].includes(operationalSeason.status),
  );

  const statusPriority = new Map([
    ["running", 0],
    ["preparing", 1],
    ["draft", 2],
  ]);
  const currentWave =
    waves.waves
      .filter((wave) => !["completed", "cancelled"].includes(wave.status))
      .sort(
        (a, b) =>
          (statusPriority.get(a.status) ?? 9) -
            (statusPriority.get(b.status) ?? 9) ||
          b.createdAt.localeCompare(a.createdAt),
      )[0] ?? null;

  const targetInfrastructure = currentWave?.poleId
    ? (infrastructure.poles.find((pole) => pole.id === currentWave.poleId) ??
      null)
    : (infrastructure.poles.find((pole) => pole.infrastructureReady) ?? null);

  const candidateSessions = courtOps.sessions
    .filter(
      (session) =>
        session.status !== "cancelled" && session.status !== "completed",
    )
    .filter(
      (session) =>
        !currentWave?.poleId || session.poleId === currentWave.poleId,
    )
    .filter((session) => session.courts.length > 0)
    .sort((a, b) => {
      const statusDifference =
        sessionOrder.indexOf(a.status as (typeof sessionOrder)[number]) -
        sessionOrder.indexOf(b.status as (typeof sessionOrder)[number]);
      if (statusDifference !== 0) return statusDifference;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  const targetSession = candidateSessions.find((session) =>
    sessionOrder.includes(session.status as (typeof sessionOrder)[number]),
  );

  const formatCodes = new Set(courtOps.formats.map((format) => format.code));
  const categoryCodes = new Set(
    courtOps.categories.map((category) => category.code),
  );
  const engineReady =
    formatCodes.has("doubles") &&
    formatCodes.has("fours") &&
    categoryCodes.has("female") &&
    categoryCodes.has("male") &&
    categoryCodes.has("mixed");

  const sourceErrors = [
    ...new Set([
      ...quarterSeason.sourceErrors,
      ...waves.sourceErrors,
      ...infrastructure.sourceErrors,
      ...courtOps.sourceErrors,
    ]),
  ];

  const gates: PilotReadinessGate[] = [
    gate(
      "season",
      "Temporada operacional",
      seasonOperational
        ? "ready"
        : operationalSeason?.structureReady
          ? "attention"
          : "blocked",
      operationalSeason
        ? seasonOperational
          ? `${operationalSeason.name} · 13/13 semanas · status ${operationalSeason.status}${operationalSeason.currentWeek ? ` · W${operationalSeason.currentWeek.weekNumber}` : ""}.`
          : `${operationalSeason.name} possui 13 semanas, mas ainda precisa de homologação institucional.`
        : "Nenhuma temporada trimestral com W1–W13 foi criada.",
      "/admin/agenda/temporada",
      operationalSeason ? "Revisar temporada" : "Criar temporada",
    ),
    gate(
      "wave",
      "Onda definida",
      currentWave ? "ready" : "blocked",
      currentWave
        ? `${currentWave.name} · alvo ${currentWave.targetSize} atleta(s).`
        : "Nenhuma onda aberta define quem participará do primeiro piloto.",
      "/admin/atletas/ondas",
      currentWave ? "Abrir onda" : "Criar onda",
    ),
    gate(
      "selection",
      "Grupo selecionado",
      currentWave && currentWave.selectedCount >= currentWave.targetSize
        ? "ready"
        : currentWave && currentWave.selectedCount > 0
          ? "attention"
          : "blocked",
      currentWave
        ? `${currentWave.selectedCount}/${currentWave.targetSize} atleta(s) selecionado(s) com motivo auditado.`
        : "A seleção só começa depois da criação da onda.",
      "/admin/atletas/ondas",
      "Selecionar atletas",
    ),
    gate(
      "athletes",
      "Atletas operacionais",
      currentWave && currentWave.readyCount >= currentWave.targetSize
        ? "ready"
        : currentWave && currentWave.readyCount > 0
          ? "attention"
          : "blocked",
      currentWave
        ? `${currentWave.readyCount}/${currentWave.targetSize} atleta(s) já cumprem homologação, conta, categoria e disponibilidade.`
        : "Sem onda, não existe grupo-alvo para validar prontidão.",
      "/admin/atletas/ondas",
      "Resolver gates dos atletas",
    ),
    gate(
      "infrastructure",
      "Infraestrutura física",
      targetInfrastructure?.infrastructureReady ? "ready" : "blocked",
      targetInfrastructure?.infrastructureReady
        ? `${targetInfrastructure.name}: ${targetInfrastructure.activeVenueCount} local(is) e ${targetInfrastructure.activeCourtCount} quadra(s) ativos.`
        : currentWave?.poleName
          ? `${currentWave.poleName} ainda não possui local e quadra ativos para operação.`
          : "Nenhum polo possui local e quadra ativos para operação real.",
      "/admin/agenda/polos",
      "Preparar infraestrutura",
    ),
    gate(
      "session",
      "Sessão publicada",
      targetSession ? "ready" : "blocked",
      targetSession
        ? `${targetSession.name} · ${targetSession.status} · ${targetSession.courts.length} quadra(s) vinculada(s).`
        : "Não existe sessão UR Play publicada/aberta com quadra vinculada para o grupo-alvo.",
      "/admin/agenda",
      "Preparar sessão",
    ),
    gate(
      "engine",
      "Motor esportivo",
      engineReady ? "ready" : "blocked",
      engineReady
        ? "Duplas, quartetos e categorias Feminino, Masculino e Misto estão ativos no motor oficial."
        : "Falta configuração oficial de formato ou categoria antes de criar partidas.",
      "/admin/ur-play/quadra",
      "Ver operação de quadra",
    ),
    gate(
      "sources",
      "Saúde das fontes",
      sourceErrors.length === 0 ? "ready" : "blocked",
      sourceErrors.length === 0
        ? "Leituras críticas concluídas sem erro nesta verificação."
        : `${sourceErrors.length} fonte(s) crítica(s) não puderam ser lidas com segurança.`,
      "/admin",
      "Revisar fontes",
    ),
  ];

  const readyGates = gates.filter((item) => item.state === "ready").length;
  const nextAction = gates.find((item) => item.state !== "ready") ?? null;

  return {
    generatedAt: now.toISOString(),
    status: readyGates === gates.length ? "go" : "no_go",
    readyGates,
    totalGates: gates.length,
    currentWave: currentWave
      ? {
          id: currentWave.id,
          name: currentWave.name,
          status: currentWave.status,
          targetSize: currentWave.targetSize,
          selectedCount: currentWave.selectedCount,
          readyCount: currentWave.readyCount,
          poleId: currentWave.poleId,
          poleName: currentWave.poleName,
        }
      : null,
    targetSession: targetSession
      ? {
          id: targetSession.id,
          name: targetSession.name,
          status: targetSession.status,
          startsAt: targetSession.startsAt,
          poleId: targetSession.poleId,
          poleName: targetSession.poleName,
          venueName: targetSession.venueName,
          courts: targetSession.courts.length,
        }
      : null,
    gates,
    nextAction,
    sourceErrors,
  };
}
