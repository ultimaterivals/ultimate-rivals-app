import {
  athleteImportRowSchema,
  detectDuplicateCandidates,
} from "@/lib/validation/athlete";
export interface ImportPreviewRow {
  line: number;
  raw: Record<string, string>;
  valid: boolean;
  errors: string[];
  duplicate: boolean;
}
export function parseAthleteCsv(csv: string): ImportPreviewRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(",").map((v) => v.trim());
  const parsed = lines.slice(1).map((line, index) => {
    const values = line.split(",").map((v) => v.trim());
    const raw = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
    const input = {
      publicName: raw.public_name,
      fullName: raw.full_name,
      birthDate: raw.birth_date || null,
      gender: raw.gender,
      emailContact: raw.email_contact || null,
      phone: raw.phone || null,
      city: raw.city || null,
      state: raw.state || null,
    };
    const result = athleteImportRowSchema.safeParse(input);
    return {
      line: index + 2,
      raw,
      valid: result.success,
      errors: result.success ? [] : result.error.issues.map((i) => i.message),
      duplicate: false,
      input,
    };
  });
  const valid = parsed
    .filter((r) => r.valid)
    .map(
      (r) =>
        r.input as {
          fullName: string;
          birthDate?: string | null;
          emailContact?: string | null;
          phone?: string | null;
        },
    );
  for (const index of detectDuplicateCandidates(valid)) {
    let seen = -1;
    for (const row of parsed)
      if (row.valid && ++seen === index) row.duplicate = true;
  }
  return parsed.map((row) => ({
    line: row.line,
    raw: row.raw,
    valid: row.valid,
    errors: row.errors,
    duplicate: row.duplicate,
  }));
}
