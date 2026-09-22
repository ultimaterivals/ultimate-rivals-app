import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SeasonStageState = "active" | "next" | "locked" | "unpublished";

export type AthleteSeasonStage = {
  code:
    | "opening"
    | "ur_play_ranking"
    | "series"
    | "cup"
    | "legends"
    | "turnover";
  name: string;
  period: string;
  state: SeasonStageState;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
};

export type AthleteSeasonContextSnapshot = {
  source: "canonical" | "fallback";
  seasonId: string | null;
  title: string;
  phaseLabel: string;
  phasePublished: boolean;
  startsAt: string | null;
  endsAt: string | null;
  stages: AthleteSeasonStage[];
};

const stages: AthleteSeasonStage[] = [
  {
    code: "opening",
    name: "Abertura",
    period: "Entrada na temporada",
    state: "unpublished",
    description:
      "Entrada de atletas, nivelamento, disponibilidade e formação da base competitiva.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "ur_play_ranking",
    name: "UR Play/Ranking",
    period: "Ao longo do trimestre",
    state: "unpublished",
    description:
      "Os jogos da temporada constroem resultados, estatísticas e classificação.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "series",
    name: "Series",
    period: "Próxima etapa",
    state: "unpublished",
    description:
      "Etapa competitiva para atletas e formações elegíveis conforme a temporada.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "cup",
    name: "Cup",
    period: "Fase decisiva",
    state: "unpublished",
    description:
      "Competição superior da temporada. A abertura depende dos critérios publicados.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "legends",
    name: "Legends",
    period: "Fase decisiva",
    state: "unpublished",
    description:
      "Palco de destaque dos atletas elegíveis ao fechamento competitivo do ciclo.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "turnover",
    name: "Virada",
    period: "Final do trimestre",
    state: "unpublished",
    description:
      "Fechamento da temporada, reconhecimento dos resultados e início do próximo ciclo.",
    startsAt: null,
    endsAt: null,
  },
];

const fallback: AthleteSeasonContextSnapshot = {
  source: "fallback",
  seasonId: null,
  title: "Temporada 1 · Agosto–Outubro 2026",
  phaseLabel: "Abertura + UR Play",
  phasePublished: false,
  startsAt: null,
  endsAt: null,
  stages,
};

type CanonicalSeason = {
  id: string;
  name: string;
  starts_at: string | null;
  ends_at: string | null;
};

type PublishedWeek = {
  phase: string;
  primary_product: string | null;
  starts_at: string;
  ends_at: string;
};

export function resolveAthleteSeasonContext(
  season: CanonicalSeason | null,
  week: PublishedWeek | null = null,
): AthleteSeasonContextSnapshot {
  if (!season) return fallback;

  // A current published week may identify an active product. Do not infer future
  // eligibility, stage dates or completion from a season row alone.
  const productStage: Record<string, AthleteSeasonStage["code"]> = {
    "UR Play": "ur_play_ranking",
    "UR Series": "series",
    "UR Cup": "cup",
    "UR Legends": "legends",
    "Virada de Ranking": "turnover",
  };
  const activeCode = week?.primary_product
    ? productStage[week.primary_product]
    : undefined;

  return {
    ...fallback,
    source: "canonical",
    seasonId: season.id,
    title: season.name,
    startsAt: season.starts_at,
    endsAt: season.ends_at,
    phaseLabel: week?.phase || fallback.phaseLabel,
    phasePublished: Boolean(week?.phase),
    stages: stages.map((stage) => ({
      ...stage,
      state: stage.code === activeCode ? "active" : "unpublished",
    })),
  };
}

export const getAthleteSeasonContextSnapshot = cache(
  async (): Promise<AthleteSeasonContextSnapshot> => {
    const client = await createClient();
    const result = await client
      .from("seasons")
      .select("id,name,starts_at,ends_at,status")
      .in("status", ["registration", "active", "closing"])
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error || !result.data) return resolveAthleteSeasonContext(null);

    const now = new Date().toISOString();
    const week = await client
      .from("season_weeks")
      .select("phase,primary_product,starts_at,ends_at")
      .eq("season_id", result.data.id)
      .in("status", ["active", "closing"])
      .lte("starts_at", now)
      .gt("ends_at", now)
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return resolveAthleteSeasonContext(
      result.data,
      week.error ? null : week.data,
    );
  },
);
