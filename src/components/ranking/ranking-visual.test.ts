import { describe, expect, it } from "vitest";

function visualSlices<T extends { current_position: number }>(rows: T[]) {
  return {
    podium: rows.slice(0, 3).map((row) => row.current_position),
    compact: rows
      .filter((row) => row.current_position > 3)
      .map((row) => row.current_position),
    unchanged: rows.map((row) => row.current_position),
  };
}

describe("ranking visual layer", () => {
  it("preserves engine positions while splitting podium and 4+ rows", () => {
    const before = [1, 2, 3, 4, 5, 6].map((current_position) => ({
      current_position,
    }));
    const result = visualSlices(before);
    expect(result.podium).toEqual([1, 2, 3]);
    expect(result.compact).toEqual([4, 5, 6]);
    expect(result.unchanged).toEqual(before.map((row) => row.current_position));
  });

  it("handles 0, 1, 2 and 3 athletes without inventing positions", () => {
    for (const count of [0, 1, 2, 3]) {
      const rows = Array.from({ length: count }, (_, index) => ({
        current_position: index + 1,
      }));
      expect(visualSlices(rows).unchanged).toEqual(
        rows.map((row) => row.current_position),
      );
    }
  });
});
