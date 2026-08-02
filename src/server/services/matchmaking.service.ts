import type { SupabaseClient } from "@supabase/supabase-js";
import {
  requiredSideSize,
  requestMatchSuggestionSchema,
  suggestSides,
  type MatchmakingCandidate,
} from "@/lib/validation/court-ops";

export async function suggestNextMatch(client: SupabaseClient, input: unknown) {
  const value = requestMatchSuggestionSchema.parse(input);
  const { data: queue, error } = await client
    .from("match_queue_entries")
    .select(
      "athlete_id,queued_at,last_match_ended_at,athletes(gender),ur_play_registrations(snapshot_level)",
    )
    .eq("session_id", value.sessionId)
    .in("status", ["waiting", "resting"])
    .is("current_match_id", null);
  if (error) throw error;
  const { data: history, error: historyError } = await client
    .from("match_participants")
    .select(
      "athlete_id,match_id,matches!inner(session_id,status,ended_at),match_sides!inner(side)",
    )
    .eq("matches.session_id", value.sessionId);
  if (historyError) throw historyError;
  const eligible = (queue ?? []).filter((row) => {
    const athlete = Array.isArray(row.athletes)
        ? row.athletes[0]
        : row.athletes,
      registration = Array.isArray(row.ur_play_registrations)
        ? row.ur_play_registrations[0]
        : row.ur_play_registrations;
    return (
      (registration?.snapshot_level === value.level ||
        registration?.snapshot_level === "leveling") &&
      (value.category === "mixed" || athlete?.gender === value.category)
    );
  });
  const rows = history ?? [];
  const candidates: MatchmakingCandidate[] = eligible.map((row) => {
    const ownHistory = rows.filter(
      (h) =>
        h.athlete_id === row.athlete_id &&
        ["in_progress", "completed", "abandoned"].includes(
          (Array.isArray(h.matches) ? h.matches[0] : h.matches)?.status ?? "",
        ),
    );
    const latest = ownHistory.at(-1);
    const latestSide = latest?.match_sides?.[0]?.side;
    const sameMatch = latest
      ? rows.filter(
          (h) =>
            h.match_id === latest.match_id && h.athlete_id !== row.athlete_id,
        )
      : [];
    return {
      athleteId: row.athlete_id,
      gamesPlayed: ownHistory.length,
      queuedAt: row.queued_at,
      lastMatchEndedAt: row.last_match_ended_at,
      recentPartners: sameMatch
        .filter((h) => h.match_sides?.[0]?.side === latestSide)
        .map((h) => h.athlete_id),
      recentOpponents: sameMatch
        .filter((h) => h.match_sides?.[0]?.side !== latestSide)
        .map((h) => h.athlete_id),
    };
  });
  if (value.category === "mixed") {
    const required = requiredSideSize(value.format) / 2;
    const ordered = suggestSides(candidates, value.format);
    const all = [...ordered.sideA, ...ordered.sideB];
    const genderOf = (athleteId: string) => {
      const row = eligible.find((entry) => entry.athlete_id === athleteId),
        athlete = Array.isArray(row?.athletes)
          ? row?.athletes[0]
          : row?.athletes;
      return athlete?.gender;
    };
    const female = all.filter((row) => genderOf(row.athleteId) === "female"),
      male = all.filter((row) => genderOf(row.athleteId) === "male");
    if (female.length < required * 2 || male.length < required * 2)
      return { ...ordered, warnings: ["composição mixed insuficiente"] };
    return {
      ...ordered,
      sideA: [...female.slice(0, required), ...male.slice(0, required)],
      sideB: [
        ...female.slice(required, required * 2),
        ...male.slice(required, required * 2),
      ],
      warnings: [],
    };
  }
  return suggestSides(candidates, value.format);
}
