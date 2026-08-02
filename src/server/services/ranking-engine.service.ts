import type { SupabaseClient } from "@supabase/supabase-js";
import {
  processHomologatedMatchSchema,
  type ProcessHomologatedMatchInput,
} from "@/lib/validation/ranking";

export const rankingPoints = {
  PARTICIPATION: 8,
  WIN: 6,
  LOSS: 2,
  ACE: 4,
  ATTACK: 2,
  BLOCK: 3,
  DEFENSE: 1,
  ASSIST: 1,
  GAME_POINT: 6,
} as const;

export type TechnicalMerit = keyof Pick<
  typeof rankingPoints,
  "ACE" | "ATTACK" | "BLOCK" | "DEFENSE" | "ASSIST"
>;

export function baseMatchMerits(won: boolean) {
  return [
    { ruleCode: "PARTICIPATION" as const, points: rankingPoints.PARTICIPATION },
    won
      ? { ruleCode: "WIN" as const, points: rankingPoints.WIN }
      : { ruleCode: "LOSS" as const, points: rankingPoints.LOSS },
  ];
}

export function technicalMerit(ruleCode: TechnicalMerit) {
  return { ruleCode, points: rankingPoints[ruleCode] };
}

export function explainRankingRule(ruleCode: string) {
  const labels: Record<string, string> = {
    PARTICIPATION: "Participação em jogo",
    WIN: "Vitória",
    LOSS: "Derrota",
    ACE: "Ace",
    ATTACK: "Ataque",
    BLOCK: "Bloqueio",
    DEFENSE: "Defesa",
    ASSIST: "Assistência",
    GAME_POINT: "Game point",
    STREAK_3: "Sequência de 3",
    STREAK_5: "Sequência de 5",
    COMEBACK: "Comeback",
    MVP: "MVP",
    FAIR_PLAY: "Fair Play",
    YELLOW_CARD: "Cartão amarelo",
    RED_CARD: "Cartão vermelho",
    SQUAD_RESERVE_PRESENT: "Reserva presente",
  };
  return labels[ruleCode] ?? "Ajuste de pontuação";
}

export async function processHomologatedMatch(
  client: SupabaseClient,
  input: ProcessHomologatedMatchInput,
) {
  const value = processHomologatedMatchSchema.parse(input);
  const { data, error } = await client.rpc("process_homologated_match", {
    target_match: value.matchId,
    operation_id: value.operationId,
  });
  if (error) throw error;
  return data;
}
