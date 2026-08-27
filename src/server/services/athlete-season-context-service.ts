import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SeasonStageState = "active" | "next" | "locked";

export type AthleteSeasonStage = {
  code: "opening" | "ur_play_ranking" | "series" | "cup" | "legends" | "turnover";
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
  startsAt: string | null;
  endsAt: string | null;
  stages: AthleteSeasonStage[];
};

const stages: AthleteSeasonStage[] = [
  {
    code: "opening",
    name: "Abertura",
    period: "Agosto",
    state: "active",
    description:
      "Entrada de atletas, nivelamento, disponibilidade e formação da base competitiva.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "ur_play_ranking",
    name: "UR Play/Ranking",
    period: "Agosto–Outubro",
    state: "active",
    description:
      "Os jogos da temporada constroem resultados, estatísticas e classificação.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "series",
    name: "Series",
    period: "Próxima etapa",
    state: "next",
    description:
      "Etapa competitiva para atletas e formações elegíveis conforme a temporada.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "cup",
    name: "Cup",
    period: "Fase decisiva",
    state: "locked",
    description:
      "Competição superior da temporada. A abertura depende dos critérios publicados.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "legends",
    name: "Legends",
    period: "Fase decisiva",
    state: "locked",
    description:
      "Palco de destaque dos atletas elegíveis ao fechamento competitivo do ciclo.",
    startsAt: null,
    endsAt: null,
  },
  {
    code: "turnover",
    name: "Virada",
    period: "Final do trimestre",
    state: "locked",
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
  startsAt: null,
  endsAt: null,
  stages,
};

export const getAthleteSeasonContextSnapshot = cache(
  async (): Promise<AthleteSeasonContextSnapshot> => {
    const client = await createClient();
    const result = await client
      .from("seasons")
      .select("id,starts_at,ends_at,status")
      .in("status", ["registration", "active", "closing"])
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (result.error || !result.data) return fallback;

    return {
      ...fallback,
      source: "canonical",
      seasonId: result.data.id,
      startsAt: result.data.starts_at ?? null,
      endsAt: result.data.ends_at ?? null,
    };
  },
);
