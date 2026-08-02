export function deriveCourtState(
  matches: { court_id: string; status: string }[],
  courtId: string,
) {
  const match = matches.find(
    (row) =>
      row.court_id === courtId &&
      ["queued", "called", "ready", "in_progress"].includes(row.status),
  );
  if (!match) return "free";
  return match.status === "in_progress" ? "playing" : "reserved";
}
