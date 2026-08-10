import type {
  AdminAthleteWavesSnapshot,
  AthleteActivationWaveMember,
  AthleteWaveCandidate,
  AthleteWaveGate,
} from "@/features/admin-athlete-waves/types";
import { fetchAdminAthleteWavesRepositoryData } from "@/server/repositories/admin-athlete-waves-repository";
import { getAdminAthleteHomologationSnapshot } from "@/server/services/admin-athlete-homologation-service";

function currentDate(now: Date) {
  return now.toISOString().slice(0, 10);
}

export async function getAdminAthleteWavesSnapshot(
  now = new Date(),
): Promise<AdminAthleteWavesSnapshot> {
  const [raw, homologation] = await Promise.all([
    fetchAdminAthleteWavesRepositoryData(),
    getAdminAthleteHomologationSnapshot(),
  ]);

  const genderByAthlete = new Map(
    (raw.athletes ?? []).map((athlete) => [athlete.id, athlete.gender]),
  );
  const poleById = new Map(homologation.poles.map((pole) => [pole.id, pole]));
  const importByAthlete = new Map(
    (raw.importRows ?? [])
      .filter((row) => row.imported_athlete_id)
      .map((row) => [row.imported_athlete_id as string, row]),
  );
  const latestInviteByAthlete = new Map<
    string,
    NonNullable<typeof raw.invites>[number]
  >();
  for (const invite of raw.invites ?? []) {
    if (!latestInviteByAthlete.has(invite.athlete_id)) {
      latestInviteByAthlete.set(invite.athlete_id, invite);
    }
  }

  const today = currentDate(now);
  const availabilityCounts = new Map<string, number>();
  for (const window of raw.availability ?? []) {
    const valid =
      window.active &&
      window.valid_from <= today &&
      (!window.valid_until || window.valid_until >= today);
    if (!valid) continue;
    availabilityCounts.set(
      window.athlete_id,
      (availabilityCounts.get(window.athlete_id) ?? 0) + 1,
    );
  }

  const nowMs = now.getTime();
  const candidates: AthleteWaveCandidate[] = homologation.rows.map(
    (athlete) => {
      const invite = latestInviteByAthlete.get(athlete.id);
      const inviteActive = Boolean(
        invite &&
        !invite.used_at &&
        !invite.revoked_at &&
        new Date(invite.expires_at).getTime() > nowMs,
      );
      const imported = importByAthlete.get(athlete.id);
      return {
        athleteId: athlete.id,
        athleteCode: athlete.athleteCode,
        publicName: athlete.publicName,
        status: athlete.status,
        gender: genderByAthlete.get(athlete.id) ?? "undisclosed",
        poleId: athlete.poleId,
        poleName: athlete.poleName,
        readyToActivate: athlete.readyToActivate,
        activationBlockers: athlete.blockers.map((blocker) => blocker.code),
        linked: athlete.linked,
        inviteActive,
        inviteExpiresAt: invite?.expires_at ?? null,
        availabilityCount: availabilityCounts.get(athlete.id) ?? 0,
        importSourceRow: imported?.source_row ?? null,
        importValidationStatus: imported?.validation_status ?? null,
        selectionEvidence: "admin_decision_required",
      };
    },
  );
  const candidateByAthlete = new Map(
    candidates.map((candidate) => [candidate.athleteId, candidate]),
  );

  function buildGates(candidate: AthleteWaveCandidate): AthleteWaveGate[] {
    const categoryReady = ["female", "male"].includes(candidate.gender);
    const institutionalState =
      candidate.status === "active"
        ? "ready"
        : candidate.readyToActivate
          ? "pending"
          : "blocked";
    const institutionalDetail =
      candidate.status === "active"
        ? "Cadastro institucional ativo."
        : candidate.readyToActivate
          ? "Cadastro cumpre os critérios e aguarda homologação administrativa."
          : candidate.activationBlockers.length > 0
            ? `Bloqueios: ${candidate.activationBlockers.join(", ")}.`
            : `Status atual: ${candidate.status}.`;

    return [
      {
        key: "institutional",
        label: "Homologação",
        state: institutionalState,
        detail: institutionalDetail,
      },
      {
        key: "access",
        label: "Primeiro acesso",
        state: candidate.linked ? "ready" : "pending",
        detail: candidate.linked
          ? "Conta autenticada vinculada ao cadastro esportivo."
          : candidate.inviteActive
            ? "Convite ativo aguardando claim do atleta."
            : candidate.status === "active"
              ? "Atleta ativo e ainda sem convite vigente."
              : "Convite deve ser emitido somente após a homologação institucional.",
      },
      {
        key: "category",
        label: "Categoria",
        state: categoryReady ? "ready" : "review",
        detail: categoryReady
          ? candidate.gender === "female"
            ? "Feminino confirmado pelo cadastro do atleta."
            : "Masculino confirmado pelo cadastro do atleta."
          : "Categoria não será inferida. O atleta precisa confirmar a informação no próprio perfil ou passar por revisão operacional.",
      },
      {
        key: "availability",
        label: "Disponibilidade",
        state: candidate.availabilityCount > 0 ? "ready" : "pending",
        detail:
          candidate.availabilityCount > 0
            ? `${candidate.availabilityCount} janela(s) atual(is) registrada(s).`
            : "Nenhuma janela atual registrada no aplicativo.",
      },
    ];
  }

  const waves = (raw.waves ?? []).map((wave) => {
    const members: AthleteActivationWaveMember[] = (raw.members ?? [])
      .filter((member) => member.wave_id === wave.id && !member.removed_at)
      .flatMap((member) => {
        const candidate = candidateByAthlete.get(member.athlete_id);
        if (!candidate) return [];
        const categoryReady = ["female", "male"].includes(candidate.gender);
        const readyForPilot =
          candidate.status === "active" &&
          candidate.linked &&
          categoryReady &&
          candidate.availabilityCount > 0 &&
          Boolean(candidate.poleId);
        return [
          {
            ...candidate,
            selectionReason: member.selection_reason,
            priority: member.priority,
            selectedAt: member.selected_at,
            readyForPilot,
            gates: buildGates(candidate),
          },
        ];
      })
      .sort(
        (a, b) =>
          b.priority - a.priority || a.selectedAt.localeCompare(b.selectedAt),
      );
    return {
      id: wave.id,
      name: wave.name,
      targetSize: wave.target_size,
      poleId: wave.pole_id,
      poleName: wave.pole_id
        ? (poleById.get(wave.pole_id)?.name ?? null)
        : null,
      status: wave.status,
      notes: wave.notes,
      createdAt: wave.created_at,
      updatedAt: wave.updated_at,
      members,
      selectedCount: members.length,
      readyCount: members.filter((member) => member.readyForPilot).length,
    };
  });

  const selectedMembers = waves
    .filter((wave) => !["completed", "cancelled"].includes(wave.status))
    .flatMap((wave) => wave.members);

  return {
    generatedAt: now.toISOString(),
    waves,
    candidates,
    metrics: {
      wavesOpen: waves.filter(
        (wave) => !["completed", "cancelled"].includes(wave.status),
      ).length,
      selected: selectedMembers.length,
      active: selectedMembers.filter((member) => member.status === "active")
        .length,
      linked: selectedMembers.filter((member) => member.linked).length,
      categoryReady: selectedMembers.filter((member) =>
        ["female", "male"].includes(member.gender),
      ).length,
      availabilityReady: selectedMembers.filter(
        (member) => member.availabilityCount > 0,
      ).length,
      pilotReady: selectedMembers.filter((member) => member.readyForPilot)
        .length,
    },
    sourceErrors: [...raw.errors, ...homologation.sourceErrors],
  };
}
