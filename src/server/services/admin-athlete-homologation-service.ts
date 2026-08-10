import {
  fetchAdminAthleteHomologationData,
  type RawHomologationAthlete,
  type RawHomologationPole,
} from "@/server/repositories/admin-athlete-homologation-repository";

export type AthleteActivationBlocker = {
  code: string;
  detail: string;
};

function dateOnly(value: Date) {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function birthDate(value: string) {
  const parts = value.split("-").map(Number);
  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isInteger(part))
  ) {
    return null;
  }
  const [year, month, day] = parts as [number, number, number];
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function buildAthleteActivationBlockers(
  athlete: RawHomologationAthlete,
  pole: RawHomologationPole | null,
  today = new Date(),
): AthleteActivationBlocker[] {
  if (athlete.status === "active") return [];
  const blockers: AthleteActivationBlocker[] = [];
  if (athlete.status !== "draft") {
    blockers.push({
      code: "STATUS_NOT_DRAFT",
      detail: "Somente cadastros draft podem ser homologados por este fluxo.",
    });
  }
  if (!athlete.full_name.trim()) {
    blockers.push({
      code: "FULL_NAME_REQUIRED",
      detail: "Nome completo é obrigatório.",
    });
  }
  if (!athlete.public_name.trim()) {
    blockers.push({
      code: "PUBLIC_NAME_REQUIRED",
      detail: "Nome público é obrigatório.",
    });
  }
  if (!athlete.birth_date) {
    blockers.push({
      code: "BIRTH_DATE_REQUIRED",
      detail: "Data de nascimento é obrigatória para homologação.",
    });
  } else {
    const birth = birthDate(athlete.birth_date);
    if (!birth) {
      blockers.push({
        code: "BIRTH_DATE_INVALID",
        detail: "Data de nascimento inválida.",
      });
    } else {
      const reference = dateOnly(today);
      const adultAt = new Date(
        Date.UTC(
          birth.getUTCFullYear() + 18,
          birth.getUTCMonth(),
          birth.getUTCDate(),
        ),
      );
      if (birth > reference) {
        blockers.push({
          code: "BIRTH_DATE_INVALID",
          detail: "Data de nascimento não pode estar no futuro.",
        });
      } else if (adultAt > reference) {
        blockers.push({
          code: "MINOR_GUARDIAN_REQUIRED",
          detail:
            "Atleta menor de 18 anos exige fluxo de responsável e consentimento antes da ativação.",
        });
      }
    }
  }

  const email = athlete.email_contact?.trim() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    blockers.push({
      code: "EMAIL_REQUIRED",
      detail: "E-mail de contato válido é obrigatório.",
    });
  }
  const phoneDigits = (athlete.phone ?? "").replace(/\D/g, "");
  if (![12, 13].includes(phoneDigits.length) || !phoneDigits.startsWith("55")) {
    blockers.push({
      code: "PHONE_REQUIRED",
      detail: "WhatsApp/telefone brasileiro normalizado é obrigatório.",
    });
  }
  if (!athlete.primary_pole_id) {
    blockers.push({
      code: "POLE_REQUIRED",
      detail: "Polo principal é obrigatório.",
    });
  } else if (!pole || pole.status !== "active") {
    blockers.push({
      code: "POLE_NOT_ACTIVE",
      detail:
        "O polo principal precisa estar homologado/ativo antes da ativação do atleta.",
    });
  }
  return blockers;
}

export async function getAdminAthleteHomologationSnapshot() {
  const data = await fetchAdminAthleteHomologationData();
  const poles = data.poles ?? [];
  const poleById = new Map(poles.map((pole) => [pole.id, pole]));
  const rows = (data.athletes ?? []).map((athlete) => {
    const pole = athlete.primary_pole_id
      ? (poleById.get(athlete.primary_pole_id) ?? null)
      : null;
    const blockers = buildAthleteActivationBlockers(athlete, pole);
    return {
      id: athlete.id,
      athleteCode: athlete.athlete_code,
      publicName: athlete.public_name,
      fullName: athlete.full_name,
      birthDate: athlete.birth_date,
      phone: athlete.phone,
      email: athlete.email_contact,
      status: athlete.status,
      poleId: athlete.primary_pole_id,
      poleName: pole?.name ?? null,
      poleStatus: pole?.status ?? null,
      linked: Boolean(athlete.profile_id),
      blockers,
      readyToActivate: athlete.status === "draft" && blockers.length === 0,
    };
  });

  return {
    rows,
    metrics: {
      total: rows.length,
      draft: rows.filter((row) => row.status === "draft").length,
      ready: rows.filter((row) => row.readyToActivate).length,
      blockedDraft: rows.filter(
        (row) => row.status === "draft" && !row.readyToActivate,
      ).length,
      active: rows.filter((row) => row.status === "active").length,
      linked: rows.filter((row) => row.linked).length,
      activePoles: poles.filter((pole) => pole.status === "active").length,
      draftPoles: poles.filter((pole) => pole.status === "draft").length,
    },
    poles,
    sourceErrors: data.errors,
  };
}
