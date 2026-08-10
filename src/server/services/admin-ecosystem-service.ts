import type {
  AdminEcosystemSnapshot,
  EcosystemArea,
  EcosystemEvidenceStatus,
  ManagementCycle,
} from "@/features/admin-ecosystem/types";
import {
  fetchAdminEcosystemEvidence,
  type EcosystemEvidenceKey,
} from "@/server/repositories/admin-ecosystem-repository";

type AreaDefinition = {
  id: string;
  name: string;
  purpose: string;
  href: string | null;
  evidenceKey: EcosystemEvidenceKey | null;
  source: string | null;
  emptyNote: string;
};

const definitions: readonly AreaDefinition[] = [
  {
    id: "direction",
    name: "Direção e Governança",
    purpose: "Temporada, prioridades, decisões e governança.",
    href: "/admin/ecossistema",
    evidenceKey: "seasons",
    source: "seasons",
    emptyNote: "Nenhuma temporada registrada.",
  },
  {
    id: "product",
    name: "Produto e Temporada",
    purpose: "Produtos e arquitetura da jornada esportiva.",
    href: "/admin/ecossistema",
    evidenceKey: "products",
    source: "products",
    emptyNote: "Nenhum produto registrado.",
  },
  {
    id: "acquisition",
    name: "Aquisição, CRM e Comunidade",
    purpose: "Entrada, ativação e recorrência dos atletas.",
    href: "/admin/atletas",
    evidenceKey: "acquisition",
    source: "acquisition_events",
    emptyNote: "Nenhum evento de aquisição registrado.",
  },
  {
    id: "digital",
    name: "Aplicativo, Dados e Automação",
    purpose: "Infraestrutura digital, auditoria e automações.",
    href: "/admin/inteligencia",
    evidenceKey: "audit",
    source: "audit_logs",
    emptyNote: "Sem evidência operacional de auditoria ainda.",
  },
  {
    id: "ur-play",
    name: "UR Play e Agenda",
    purpose: "Infraestrutura semanal de jogo e capacidade.",
    href: "/admin/ur-play",
    evidenceKey: "urPlay",
    source: "ur_play_sessions",
    emptyNote: "Nenhuma sessão UR Play registrada.",
  },
  {
    id: "leveling",
    name: "Nivelamento e Desenvolvimento",
    purpose: "Nível, avaliação e progressão técnica.",
    href: "/admin/atletas",
    evidenceKey: "leveling",
    source: "athlete_leveling_processes",
    emptyNote: "Nenhum processo de nivelamento registrado.",
  },
  {
    id: "ranking",
    name: "Ranking e Estatísticas",
    purpose: "Classificação, histórico e performance homologada.",
    href: "/admin/inteligencia",
    evidenceKey: "ranking",
    source: "ranking_snapshots",
    emptyNote: "Nenhum snapshot de ranking registrado.",
  },
  {
    id: "teams",
    name: "Equipes, Duplas e Polos",
    purpose: "Vínculos, formações, identidade e representação.",
    href: "/admin/equipes",
    evidenceKey: "teams",
    source: "teams",
    emptyNote: "Nenhuma equipe registrada.",
  },
  {
    id: "training",
    name: "Treinos e Academia",
    purpose: "Demanda e entrega de desenvolvimento esportivo.",
    href: "/admin/agenda",
    evidenceKey: "training",
    source: "training_sessions",
    emptyNote: "Nenhum treino registrado.",
  },
  {
    id: "competitions",
    name: "Series, Cup e Legends",
    purpose: "Competições, gates, inscrições e resultados.",
    href: "/admin/competicoes",
    evidenceKey: "competitions",
    source: "tournaments",
    emptyNote: "Nenhuma competição registrada.",
  },
  {
    id: "coins",
    name: "UR Coins e Gamificação",
    purpose: "Economia de engajamento e recompensas.",
    href: "/admin/ecossistema",
    evidenceKey: "coins",
    source: "ur_coin_transactions",
    emptyNote: "Nenhuma transação UR Coins registrada.",
  },
  {
    id: "market",
    name: "UR Market",
    purpose: "Benefícios, ofertas, parceiros e resgates.",
    href: "/admin/comercial",
    evidenceKey: "market",
    source: "market_offers",
    emptyNote: "Nenhuma oferta de Market registrada.",
  },
  {
    id: "sponsors",
    name: "Patrocínios",
    purpose: "Acordos, ativos, ativações e entregas.",
    href: "/admin/comercial",
    evidenceKey: "sponsors",
    source: "sponsors",
    emptyNote: "Nenhum patrocinador registrado.",
  },
  {
    id: "media",
    name: "Mídia e Storytelling",
    purpose: "Ativos de mídia, narrativas e cobertura.",
    href: null,
    evidenceKey: "media",
    source: "media_assets",
    emptyNote: "Nenhum ativo de mídia registrado.",
  },
  {
    id: "finance",
    name: "Financeiro e Repasses",
    purpose: "Receita, custo, margem e obrigações.",
    href: "/admin/financeiro",
    evidenceKey: "finance",
    source: "event_financial_summaries",
    emptyNote: "Nenhum resumo financeiro registrado.",
  },
  {
    id: "operations",
    name: "Operação, Quadras e Polos",
    purpose: "Capacidade física e execução operacional.",
    href: "/admin/agenda",
    evidenceKey: "venues",
    source: "venues",
    emptyNote: "Nenhuma quadra/local registrado.",
  },
  {
    id: "compliance",
    name: "Compliance, Segurança e Qualidade",
    purpose: "Políticas, incidentes, privacidade e controles.",
    href: null,
    evidenceKey: null,
    source: null,
    emptyNote: "A área ainda precisa de instrumentação própria.",
  },
  {
    id: "people",
    name: "Pessoas, SOPs e Delegação",
    purpose: "Papéis, responsáveis, checklists e operação escalável.",
    href: "/admin/ecossistema",
    evidenceKey: "staff",
    source: "staff_profile_roles",
    emptyNote: "Nenhum papel de staff registrado.",
  },
] as const;

const cycles: ManagementCycle[] = [
  {
    cadence: "Diário",
    purpose: "Manter a operação sob controle.",
    items: [
      "Revisar agenda das próximas 48h",
      "Resolver alertas críticos e conflitos",
      "Acompanhar pagamentos e falhas operacionais",
      "Conduzir atletas prioritários para a próxima ação",
    ],
  },
  {
    cadence: "Semanal",
    purpose: "Dirigir demanda, capacidade e recorrência.",
    items: [
      "Analisar ocupação e demanda por polo/horário",
      "Revisar atletas em primeira participação e risco de churn",
      "Acompanhar equipes, formações e competição",
      "Revisar receita, margem, quadras e entregas comerciais",
    ],
  },
  {
    cadence: "Mensal",
    purpose: "Fechar o mês e corrigir a máquina.",
    items: [
      "Conciliação financeira e margem",
      "Funil e cohorts de retenção",
      "Entregas de patrocinadores e quadras",
      "Revisão de gargalos, SOPs e capacidade do mês seguinte",
    ],
  },
  {
    cadence: "Trimestral",
    purpose: "Concluir a temporada e iniciar o próximo ciclo.",
    items: [
      "Homologar ranking e resultados finais",
      "Executar premiações e repasses",
      "Relatório de atletas, equipes, polos e negócio",
      "Virada, renovação e construção do próximo trimestre",
    ],
  },
  {
    cadence: "Anual",
    purpose: "Transformar quatro ciclos em estratégia de escala.",
    items: [
      "Consolidar quatro trimestres",
      "Revisar CAC, retenção, margem e capacidade",
      "Avaliar parceiros, polos e necessidade de pessoas",
      "Definir expansão, contratos e plano do próximo ano",
    ],
  },
];

function areaStatus(
  count: number | null,
  instrumented: boolean,
): EcosystemEvidenceStatus {
  if (!instrumented) return "not-instrumented";
  if (count === null) return "unavailable";
  return count > 0 ? "evidence" : "no-evidence";
}

export async function getAdminEcosystemSnapshot(): Promise<AdminEcosystemSnapshot> {
  const raw = await fetchAdminEcosystemEvidence();
  const areas: EcosystemArea[] = definitions.map((definition) => {
    const count = definition.evidenceKey
      ? raw.evidence[definition.evidenceKey]
      : null;
    const status = areaStatus(count, Boolean(definition.evidenceKey));
    return {
      id: definition.id,
      name: definition.name,
      purpose: definition.purpose,
      href: definition.href,
      source: definition.source,
      evidenceCount: count,
      status,
      note:
        status === "evidence"
          ? `${count} registro(s) sustentam esta leitura.`
          : status === "no-evidence"
            ? definition.emptyNote
            : status === "not-instrumented"
              ? definition.emptyNote
              : "A fonte existe, mas não pôde ser lida pela sessão atual.",
    };
  });

  const instrumented = areas.filter(
    (area) => area.status !== "not-instrumented",
  );
  const readable = instrumented.filter((area) => area.status !== "unavailable");
  const withEvidence = readable.filter((area) => area.status === "evidence");

  return {
    areas,
    metrics: {
      totalAreas: areas.length,
      instrumentedAreas: instrumented.length,
      areasWithEvidence: withEvidence.length,
      areasWithoutEvidence: readable.filter(
        (area) => area.status === "no-evidence",
      ).length,
      notInstrumented: areas.filter(
        (area) => area.status === "not-instrumented",
      ).length,
      evidenceCoveragePercent:
        readable.length > 0
          ? Math.round((withEvidence.length / readable.length) * 100)
          : null,
    },
    cycles,
    sourceErrors: raw.errors,
  };
}
