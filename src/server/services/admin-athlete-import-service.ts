import {
  fetchAdminAthleteImportData,
  type RawAthleteImportIssue,
} from "@/server/repositories/admin-athlete-import-repository";

export type AthleteImportStatus = "ready" | "review" | "blocked" | "imported" | "skipped";

export type AdminAthleteImportRow = {
  id: string;
  sourceRow: number;
  legacyId: string | null;
  fullName: string;
  publicName: string | null;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  pole: string | null;
  categories: string | null;
  days: string | null;
  shifts: string | null;
  team: string | null;
  experience: string | null;
  legacyStatus: string | null;
  legacyLevel: string | null;
  legacyCategories: string | null;
  activeCandidate: boolean;
  status: AthleteImportStatus;
  issues: RawAthleteImportIssue[];
  reviewResolution: Record<string, unknown>;
  importedAthleteId: string | null;
  reviewedAt: string | null;
};

export async function getAdminAthleteImportSnapshot(batchId?: string | null) {
  const data = await fetchAdminAthleteImportData();
  const batches = data.batches ?? [];
  const selectedBatch =
    batches.find((batch) => batch.id === batchId) ?? batches[0] ?? null;
  const rows = (data.rows ?? [])
    .filter((row) => !selectedBatch || row.batch_id === selectedBatch.id)
    .map<AdminAthleteImportRow>((row) => ({
      id: row.id,
      sourceRow: row.source_row,
      legacyId: row.legacy_id,
      fullName: row.full_name,
      publicName: row.public_name,
      birthDate: row.birth_date,
      phone: row.phone,
      email: row.email,
      pole: row.pole_text,
      categories: row.categories_text,
      days: row.days_text,
      shifts: row.shifts_text,
      team: row.team_text,
      experience: row.experience_text,
      legacyStatus: row.legacy_status,
      legacyLevel: row.legacy_level,
      legacyCategories: row.legacy_categories_text,
      activeCandidate: row.active_candidate,
      status: row.validation_status as AthleteImportStatus,
      issues: row.issues ?? [],
      reviewResolution: row.review_resolution ?? {},
      importedAthleteId: row.imported_athlete_id,
      reviewedAt: row.reviewed_at,
    }));

  const activePoles = (data.poles ?? []).filter((pole) => pole.status === "active");
  const readyPoleNames = new Set(
    rows
      .filter((row) => row.status === "ready" && row.pole)
      .map((row) => row.pole!.trim().toLowerCase()),
  );
  const matchedPoleNames = new Set<string>();
  for (const pole of activePoles) {
    matchedPoleNames.add(pole.name.trim().toLowerCase());
    matchedPoleNames.add(pole.city.trim().toLowerCase());
  }
  const missingReadyPoles = [...readyPoleNames].filter(
    (poleName) => !matchedPoleNames.has(poleName),
  );

  return {
    batches,
    selectedBatch,
    rows,
    metrics: {
      total: selectedBatch?.total_rows ?? rows.length,
      ready: selectedBatch?.ready_rows ?? rows.filter((row) => row.status === "ready").length,
      review:
        selectedBatch?.review_rows ?? rows.filter((row) => row.status === "review").length,
      blocked:
        selectedBatch?.blocked_rows ?? rows.filter((row) => row.status === "blocked").length,
      imported:
        selectedBatch?.imported_rows ?? rows.filter((row) => row.status === "imported").length,
      activeCandidates: rows.filter((row) => row.activeCandidate).length,
      activePoles: activePoles.length,
    },
    missingReadyPoles,
    sourceErrors: data.errors,
  };
}
