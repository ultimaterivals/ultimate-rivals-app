export interface RankingSortable {
  id: string;
  totalPoints: number;
  wins: number;
  gamesPlayed: number;
  technicalPoints: number;
  disciplinaryBalance: number;
  reachedScoreAt: string;
}

export type RankingMovementState = "up" | "down" | "stable" | "new";

export function winRate(entry: Pick<RankingSortable, "wins" | "gamesPlayed">) {
  return entry.gamesPlayed > 0 ? (entry.wins * 100) / entry.gamesPlayed : 0;
}

export function compareIndividualRanking(
  a: RankingSortable,
  b: RankingSortable,
) {
  return (
    b.totalPoints - a.totalPoints ||
    b.wins - a.wins ||
    b.gamesPlayed - a.gamesPlayed ||
    winRate(b) - winRate(a) ||
    b.technicalPoints - a.technicalPoints ||
    b.disciplinaryBalance - a.disciplinaryBalance ||
    a.reachedScoreAt.localeCompare(b.reachedScoreAt) ||
    a.id.localeCompare(b.id)
  );
}

export function positionRanking<T extends RankingSortable>(entries: T[]) {
  return [...entries]
    .sort(compareIndividualRanking)
    .map((entry, index) => ({ ...entry, position: index + 1 }));
}

export function rankingMovement(
  currentPosition: number | null,
  previousPosition: number | null,
): { state: RankingMovementState; change: number | null } {
  if (currentPosition === null || previousPosition === null)
    return { state: "new", change: null };
  const change = previousPosition - currentPosition;
  return {
    state: change > 0 ? "up" : change < 0 ? "down" : "stable",
    change,
  };
}

export function nextPositionTarget(
  current: { current_position: number | null; total_points: number },
  entries: Array<{
    current_position: number | null;
    display_name: string;
    total_points: number;
  }>,
) {
  if (!current.current_position || current.current_position <= 1) return null;
  const target = entries.find(
    (entry) => entry.current_position === current.current_position! - 1,
  );
  return target
    ? {
        ...target,
        pointsBehind: Math.max(target.total_points - current.total_points, 0),
      }
    : null;
}

export function levelLabel(level: string | null) {
  return (
    {
      n1: "N1 · Elite",
      n2: "N2 · Avançado",
      n3: "N3 · Desenvolvimento",
      leveling: "Em Nivelamento",
    }[level ?? ""] ?? "Nível não informado"
  );
}
