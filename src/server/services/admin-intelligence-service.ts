import type {
  AcquisitionSource,
  AdminIntelligenceSnapshot,
  IntelligenceInsight,
} from "@/features/admin-intelligence/types";
import { fetchAdminIntelligenceRepositoryData } from "@/server/repositories/admin-intelligence-repository";

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function getAdminIntelligenceSnapshot(): Promise<AdminIntelligenceSnapshot> {
  const raw = await fetchAdminIntelligenceRepositoryData();
  const sources: AcquisitionSource[] | null = raw.acquisition
    ? raw.acquisition.map((row) => {
        const visitors = row.visitors ?? 0,
          signups = row.signups ?? 0,
          interests = row.interests ?? 0,
          reservations = row.reservations ?? 0,
          first = row.first_participation ?? 0,
          second = row.second_participation ?? 0,
          returning = row.returning ?? 0;
        return {
          source: row.source,
          visitors,
          signups,
          interests,
          reservations,
          firstParticipation: first,
          secondParticipation: second,
          returning,
          signupToFirstRate: rate(first, signups),
          firstToSecondRate: rate(second, first),
        };
      })
    : null;
  const engagement = raw.engagement;
  const firstOnly = engagement
    ? engagement.filter(
        (row) => row.first_participation_at && !row.second_participation_at,
      ).length
    : null;
  const active30 = engagement
    ? engagement.filter((row) => row.active_30d).length
    : null;
  const atRisk = engagement
    ? engagement.filter(
        (row) =>
          row.days_since_last_participation !== null &&
          row.days_since_last_participation >= 14 &&
          row.days_since_last_participation <= 30,
      ).length
    : null;
  const inactive = engagement
    ? engagement.filter(
        (row) =>
          row.days_since_last_participation !== null &&
          row.days_since_last_participation > 30,
      ).length
    : null;
  const demand = raw.demand
    ? raw.demand.map((row) => ({
        id: row.id,
        title: row.title,
        poleName: row.pole_name,
        signal: row.demand_signal,
        interested: row.interested_count ?? 0,
        readyFormations: row.ready_formations ?? 0,
        targetFormations: row.target_formations,
        waitlist: row.waitlist_count ?? 0,
      }))
    : null;
  const secondCourtSignals = demand
    ? demand.filter((item) => item.signal === "SECOND_COURT_OPPORTUNITY").length
    : null;
  const insights: IntelligenceInsight[] = [];
  if (firstOnly && firstOnly > 0)
    insights.push({
      id: "activation",
      type: "activation",
      title: "Segunda participação exige ação",
      detail: `${firstOnly} atleta(s) fizeram a primeira participação e ainda não chegaram à segunda.`,
      href: "/admin/atletas?segment=first-only",
    });
  if (atRisk && atRisk > 0)
    insights.push({
      id: "retention",
      type: "retention",
      title: "Atletas em risco de inatividade",
      detail: `${atRisk} atleta(s) estão entre 14 e 30 dias sem nova participação.`,
      href: "/admin/atletas?segment=at-risk",
    });
  if (secondCourtSignals && secondCourtSignals > 0)
    insights.push({
      id: "demand",
      type: "demand",
      title: "Demanda reprimida detectada",
      detail: `${secondCourtSignals} oportunidade(s) indicam potencial para segunda quadra/capacidade adicional.`,
      href: "/admin/agenda",
    });
  const bestSource = sources
    ?.filter(
      (item) => item.firstParticipation > 0 && item.firstToSecondRate !== null,
    )
    .sort((a, b) => (b.firstToSecondRate ?? 0) - (a.firstToSecondRate ?? 0))[0];
  if (bestSource)
    insights.push({
      id: "acquisition",
      type: "acquisition",
      title: `Origem com melhor ativação: ${bestSource.source}`,
      detail: `${bestSource.firstToSecondRate}% dos atletas que fizeram a 1ª participação chegaram à 2ª nessa origem.`,
      href: "/admin/inteligencia",
    });
  return {
    sources,
    demand,
    metrics: {
      trackedSources: sources ? sources.length : null,
      signups: sources
        ? sources.reduce((sum, item) => sum + item.signups, 0)
        : null,
      firstParticipation: sources
        ? sources.reduce((sum, item) => sum + item.firstParticipation, 0)
        : null,
      secondParticipation: sources
        ? sources.reduce((sum, item) => sum + item.secondParticipation, 0)
        : null,
      firstOnlyAthletes: firstOnly,
      active30d: active30,
      atRisk,
      inactive,
      secondCourtSignals,
    },
    insights,
    sourceErrors: raw.errors,
  };
}
