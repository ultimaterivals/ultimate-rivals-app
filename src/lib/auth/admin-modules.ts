import type { AppRole } from "@/types/auth";

export const adminPortalRoles = [
  "admin",
  "operator",
  "pole_manager",
  "team_manager",
] as const satisfies readonly AppRole[];

export const adminModuleGroups = [
  "Comando",
  "Esportivo",
  "Negócio",
  "Gestão",
] as const;

export type AdminModuleGroup = (typeof adminModuleGroups)[number];

export type AdminModuleIcon =
  | "dashboard"
  | "calendar"
  | "athletes"
  | "teams"
  | "ur-play"
  | "competitions"
  | "finance"
  | "ecosystem"
  | "commercial"
  | "intelligence";

export type AdminModuleKey =
  | "command"
  | "agenda"
  | "athletes"
  | "teams"
  | "urPlay"
  | "competitions"
  | "finance"
  | "ecosystem"
  | "commercial"
  | "intelligence";

export type AdminModuleDefinition = {
  key: AdminModuleKey;
  label: string;
  href: string;
  description: string;
  group: AdminModuleGroup;
  allowedRoles: readonly AppRole[];
  icon: AdminModuleIcon;
};

const allAdminRoles = adminPortalRoles;

export const adminModules: readonly AdminModuleDefinition[] = [
  {
    key: "command",
    label: "Visão geral",
    href: "/admin",
    description: "Comando executivo e visão consolidada do ecossistema.",
    group: "Comando",
    allowedRoles: allAdminRoles,
    icon: "dashboard",
  },
  {
    key: "agenda",
    label: "Agenda",
    href: "/admin/agenda",
    description: "Calendário operacional, demanda, oportunidades e ocupação.",
    group: "Comando",
    allowedRoles: ["admin", "operator", "pole_manager"],
    icon: "calendar",
  },
  {
    key: "athletes",
    label: "Atletas",
    href: "/admin/atletas",
    description: "Ciclo de vida, recorrência, desenvolvimento e relacionamento.",
    group: "Esportivo",
    allowedRoles: allAdminRoles,
    icon: "athletes",
  },
  {
    key: "teams",
    label: "Equipes",
    href: "/admin/equipes",
    description: "Equipes oficiais, formações, atletas livres e vínculos.",
    group: "Esportivo",
    allowedRoles: ["admin", "pole_manager", "team_manager"],
    icon: "teams",
  },
  {
    key: "urPlay",
    label: "UR Play",
    href: "/admin/ur-play",
    description: "Sessões, formações, check-in e fechamento operacional.",
    group: "Esportivo",
    allowedRoles: ["admin", "operator", "pole_manager"],
    icon: "ur-play",
  },
  {
    key: "competitions",
    label: "Competições",
    href: "/admin/competicoes",
    description: "Series, Cup, Legends, gates, inscrições e resultados.",
    group: "Esportivo",
    allowedRoles: allAdminRoles,
    icon: "competitions",
  },
  {
    key: "finance",
    label: "Financeiro",
    href: "/admin/financeiro",
    description: "Receita, pacotes, créditos, margem, premiações e repasses.",
    group: "Negócio",
    allowedRoles: ["admin"],
    icon: "finance",
  },
  {
    key: "commercial",
    label: "Comercial",
    href: "/admin/comercial",
    description: "Quadras, patrocinadores, acordos, ativações e entregas.",
    group: "Negócio",
    allowedRoles: ["admin"],
    icon: "commercial",
  },
  {
    key: "ecosystem",
    label: "Ecossistema",
    href: "/admin/ecossistema",
    description: "Playbooks, evidências, ciclos de gestão e saúde do UR.",
    group: "Gestão",
    allowedRoles: ["admin"],
    icon: "ecosystem",
  },
  {
    key: "intelligence",
    label: "Inteligência",
    href: "/admin/inteligencia",
    description: "Funil, demanda, retenção, alertas e recomendações.",
    group: "Gestão",
    allowedRoles: ["admin", "pole_manager"],
    icon: "intelligence",
  },
] as const;

export function getAdminModule(key: AdminModuleKey) {
  const module = adminModules.find((item) => item.key === key);
  if (!module) throw new Error(`Módulo administrativo desconhecido: ${key}`);
  return module;
}

export function canAccessAdminModule(role: AppRole, key: AdminModuleKey) {
  return getAdminModule(key).allowedRoles.includes(role);
}

export function getAdminModulesForRole(role: AppRole) {
  return adminModules.filter((module) => module.allowedRoles.includes(role));
}
